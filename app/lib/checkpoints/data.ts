import { connectionPool } from '@/db';
import { Auto1111CheckpointInput, CheckpointLoaderSimpleInput } from '@/app/lib/generations/definitions'
import { getOrCreateFileType } from '@/app/lib/file-types/data';

export async function getListOfCheckpoints(
    exif: string,
    checkpoints: string,
    loras: string
) {
    if (!exif && !checkpoints && !loras) {
        try {
            const result = await connectionPool.query<{value: string, label: string}>(`
                SELECT
                    checkpoints.id::text AS value,
                    checkpoints.name AS label
                FROM checkpoints;
            `);
    
            return result.rows;
        } catch (error) {
            console.error('Database Error:', error);
            throw new Error('Failed to fetch checkpoints.');
        }
    }
    
    let query = `
        SELECT
            checkpoints.id::text as value,
            checkpoints.name as label
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

    if (joins) {
        query += joins;
    }

    query += `
        JOIN generation_checkpoints ON generations.id = generation_checkpoints.generation_id
        JOIN checkpoints ON generation_checkpoints.checkpoint_id = checkpoints.id
    `;

    if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(' AND ');
    }

    query += `
        GROUP BY checkpoints.id;
    `;

    try {
        const result = await connectionPool.query<{value: string, label: string}>(
            query,
            params
        );

        return result.rows;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch checkpoints.');
    }
}

// Helper function to get ids or insert new checkpoints if they don't exist
export async function getOrCreateComfyCheckpoints(checkpoints: CheckpointLoaderSimpleInput[]): Promise<Array<CheckpointLoaderSimpleInput & { id: number }>> {
    const ids = await getOrCreateCheckpoints(checkpoints);

    return checkpoints.map((checkpoint) => ({
        ...checkpoint,
        id: ids[checkpoint.ckpt_name],
    }));
}

export async function getOrCreateAuto1111Checkpoints(checkpoints: Auto1111CheckpointInput[]): Promise<Array<Auto1111CheckpointInput & { id: number }>> {
    const ids = await getOrCreateCheckpoints(checkpoints);

    return checkpoints.map((checkpoint) => ({
        ...checkpoint,
        id: ids[checkpoint.ckpt_name],
    }));
}

async function getOrCreateCheckpoints(checkpoints: { ckpt_name: string }[]) {
    const ids: Record<string, number> = {}; // Object to store ids with names as keys

    // Extract checkpoint names
    const checkpointNames = checkpoints.map((ckpt) => ckpt.ckpt_name);

    // Step 1: Query to find existing checkpoints by name
    const result = await connectionPool.query(
        'SELECT id, name FROM checkpoints WHERE name = ANY($1::text[])',
        [checkpointNames]
    );

    const existingCheckpoints = result.rows;

    // Store the existing IDs in the ids object using the name as the key
    existingCheckpoints.forEach((row) => {
        ids[row.name] = row.id;
    });

    // Step 2: Find objects where the 'name' is not in the database
    const missingCheckpoints = checkpoints.filter((ckpt) => !ids[ckpt.ckpt_name]);

    // Step 3: Insert missing checkpoints with file_type_id
    if (missingCheckpoints.length > 0) {
        // Extract the file extension and find or create the file_type_id
        const fileTypeIds = await Promise.all(
            missingCheckpoints.map(async (checkpoint) => {
                const fileExtension = checkpoint.ckpt_name.split('\\').pop()?.split('.').pop();
                return await getOrCreateFileType(fileExtension);
            })
        );

        const insertQuery = `
            INSERT INTO checkpoints (name, file_type_id)
            VALUES ${missingCheckpoints.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ')}
            RETURNING id, name
        `;

        const insertParams = missingCheckpoints.flatMap((checkpoint, i) => [checkpoint.ckpt_name, fileTypeIds[i]]);

        const insertResult = await connectionPool.query(insertQuery, insertParams);

        // Store the new IDs in the ids object using the name as the key
        insertResult.rows.forEach((row) => {
            ids[row.name] = row.id;
        });
    }

    return ids;
}

export async function linkCheckpointsToGeneration(checkpointsWithIds: (CheckpointLoaderSimpleInput & { id: number })[], generationId: number): Promise<void> {
    if (checkpointsWithIds.length === 0) {
        throw new Error('No checkpoint IDs provided');
    }

    // Construct the query to insert links between checkpoint_ids and generation_id
    const insertQuery = `
        INSERT INTO generation_checkpoints (generation_id, checkpoint_id)
        VALUES ${checkpointsWithIds.map((_, i) => `($1, $${i + 2})`).join(', ')}
    `;
    const insertParams = [generationId, ...checkpointsWithIds.flatMap((chkpt) => [chkpt.id])];

    // Execute the query
    await connectionPool.query(insertQuery, insertParams);
}

