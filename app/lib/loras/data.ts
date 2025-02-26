import { connectionPool } from '@/db';
import { LoraBase } from '@/app/lib/generations/definitions'
import { getOrCreateFileType } from '@/app/lib/file-types/data';

export async function getListOfLoras(
    exif: string,
    checkpoints: string,
    loras: string,
    nodes: string
) {
    if (!exif && !checkpoints && !loras && !nodes) {
        try {
            const result = await connectionPool.query<{value: string, label: string}>(`
                SELECT
                    loras.id::text as value,
                    loras.name as label
                FROM loras;
            `);
    
            return result.rows;
        } catch (error) {
            console.error('Database Error:', error);
            throw new Error('Failed to fetch loras.');
        }
    }

    let query = `
        SELECT
            loras.id::text as value,
            loras.name as label
        FROM generations
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

    query += `
        JOIN generation_loras ON generations.id = generation_loras.generation_id
        JOIN loras ON generation_loras.lora_id = loras.id
    `;

    if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(' AND ');
    }

    query += `
        GROUP BY loras.id;
    `;

    try {
        const result = await connectionPool.query<{value: string, label: string}>(
            query,
            params
        );

        return result.rows;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch loras.');
    }
}

// Helper function to get ids or insert new loras if they don't exist
export async function getOrCreateLoras(loras: LoraBase[]): Promise<Array<LoraBase & { id: number }>> {
    const ids: Record<string, number> = {}; // Object to store ids with names as keys

    // Extract lora names
    const loraNames = loras.map((l) => l.lora_name);

    // Step 1: Query to find existing loras by name
    const result = await connectionPool.query(
        'SELECT id, name FROM loras WHERE name = ANY($1::text[])',
        [loraNames]
    );

    const existingLoras = result.rows;

    // Store the existing IDs in the ids object using the name as the key
    existingLoras.forEach((row) => {
        ids[row.name] = row.id;
    });

    // Step 2: Find objects where the 'name' is not in the database
    const missingLoras = loras.filter((l) => !ids[l.lora_name]);

    // Step 3: Insert missing loras with file_type_id
    if (missingLoras.length > 0) {
        // Extract the file extension and find or create the file_type_id
        const fileTypeIds = await Promise.all(
            missingLoras.map(async (lora) => {
                const fileExtension = lora.lora_name.split('\\').pop()?.split('.').pop();
                return await getOrCreateFileType(fileExtension);
            })
        );

        const insertQuery = `
            INSERT INTO loras (name, file_type_id)
            VALUES ${missingLoras.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ')}
            RETURNING id, name
        `;

        const insertParams = missingLoras.flatMap((lora, i) => [lora.lora_name, fileTypeIds[i]]);

        const insertResult = await connectionPool.query(insertQuery, insertParams);

        // Store the new IDs in the ids object using the name as the key
        insertResult.rows.forEach((row) => {
            ids[row.name] = row.id;
        });
    }

    // Step 4: Return the updated loras array with ids
    return loras.map((lora) => ({
        ...lora,
        id: ids[lora.lora_name],
    }));
}

export async function linkLorasToGeneration(lorasWithIds: (LoraBase & { id: number })[], generationId: number): Promise<void> {
    if (lorasWithIds.length === 0) {
        throw new Error('No lora IDs provided');
    }

    // Construct the query to insert links between lora_ids and generation_id
    const insertQuery = `
        INSERT INTO generation_loras (generation_id, lora_id, model_strength, clip_strength)
        VALUES ${lorasWithIds.map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`).join(', ')}
    `;
    
    const insertParams = [generationId, ...lorasWithIds.flatMap((lora) => [lora.id, lora.strength_model, lora.strength_clip])];

    // Execute the query
    await connectionPool.query(insertQuery, insertParams);
}
