import { connectionPool } from '@/db';

export async function getListOfNodes(
    exif: string,
    checkpoints: string,
    loras: string,
    nodes: string
) {
    if (!exif && !checkpoints && !loras && !nodes) {
        try {
            const result = await connectionPool.query<{value: string, label: string}>(`
                SELECT
                    nodes.name as value,
                    nodes.name as label
                FROM nodes;
            `);
    
            return result.rows;
        } catch (error) {
            console.error('Database Error:', error);
            throw new Error('Failed to fetch nodes.');
        }
    }

    let query = `
        SELECT
            jsonb_value->>'class_type' as value,
            jsonb_value->>'class_type' as label
        FROM
            (SELECT id, raw_json FROM generations
    `;

    let joins: string = '';
    const conditions: string[] = [];
    const params: (string | number[] | number)[] = [];

    if (exif) {
        conditions.push(`generations.raw_json::text ILIKE $${params.length + 1}`);
        params.push(`%${exif}%`);
    }

    if (checkpoints) {
        const checkpointIds = decodeURIComponent(checkpoints)
            .split(',')
            .map(id => Number(id))
            .filter(id => !isNaN(id));
        joins += `
            JOIN (
                SELECT generation_id
                FROM generation_checkpoints
                WHERE checkpoint_id = ANY($${params.length + 1}::int[])
                GROUP BY generation_id
                HAVING COUNT(DISTINCT checkpoint_id) = ${checkpointIds.length}
            ) checkpoint_filter
            ON generations.id = checkpoint_filter.generation_id
        `;
        params.push(checkpointIds);
    }

    if (loras) {
        const loraIds = decodeURIComponent(loras)
            .split(',')
            .map(id => Number(id))
            .filter(id => !isNaN(id));
        joins += `
            JOIN (
                SELECT generation_id
                FROM generation_loras
                WHERE lora_id = ANY($${params.length + 1}::int[])
                GROUP BY generation_id
                HAVING COUNT(DISTINCT lora_id) = ${loraIds.length}
            ) lora_filter
            ON generations.id = lora_filter.generation_id
        `;
        params.push(loraIds);
    }

    if (nodes) {
        const nodeStrings = decodeURIComponent(nodes)
            .split(',');
        joins += `
            JOIN (
                SELECT
                    generations.id AS generation_id
                FROM
                    generations,
                    LATERAL jsonb_each(raw_json->'prompt') AS prompt(key, jsonb_value)
                WHERE
                    jsonb_value->>'class_type' IS NOT NULL
                    AND jsonb_typeof(raw_json->'prompt') = 'object'
                    AND jsonb_value->>'class_type' IN (${nodeStrings.map((_, i) => `$${params.length + 1 + i}`).join(', ')})
                GROUP BY
                    generations.id  -- Group by generation ID
                HAVING
                    COUNT(DISTINCT jsonb_value->>'class_type') = ${nodeStrings.length}
            ) node_filter
            ON generations.id = node_filter.generation_id
        `;
        nodeStrings.forEach((nodeString) => params.push(nodeString));
    }

    if (joins) {
        query += joins;
    }

    if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(' AND ');
    }

    query += `
        ) AS filtered_generations,
        LATERAL jsonb_each(filtered_generations.raw_json->'prompt') AS prompt(key, jsonb_value)
    `;

    query += `
        GROUP BY jsonb_value->>'class_type';
    `;

    try {
        const result = await connectionPool.query<{value: string, label: string}>(
            query,
            params
        );

        return result.rows;
    } catch (error) {
        console.log(query);
        console.log(params);
        console.error('Database Error:', error);
        throw new Error('Failed to fetch nodes.');
    }
}

export async function saveNodesIfNotExisting(nodes: string[]) {
    const ids: Record<string, number> = {}; // Object to store ids with names as keys

    // Step 1: Query to find existing nodes by name
    const result = await connectionPool.query(
        'SELECT id, name FROM nodes WHERE name = ANY($1::text[])',
        [nodes]
    );

    const existingNodes = result.rows;

    // Store the existing IDs in the ids object using the name as the key
    existingNodes.forEach((row) => {
        ids[row.name] = row.id;
    });

    // Step 2: Find objects where the 'name' is not in the database
    const missingNodes = nodes.filter((node) => !ids[node]);

    // Step 3: Insert missing nodes
    if (missingNodes.length > 0) {
        const insertQuery = `
            INSERT INTO nodes (name)
            VALUES ${missingNodes.map((_, i) => `($${i + 1})`).join(', ')}
            RETURNING id, name
        `;

        const insertParams = missingNodes.flatMap((node) => [node]);

        const insertResult = await connectionPool.query(insertQuery, insertParams);

        // Store the new IDs in the ids object using the name as the key
        insertResult.rows.forEach((row) => {
            ids[row.name] = row.id;
        });
    }

    return ids;
}
