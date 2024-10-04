import { connectionPool } from '@/db';
import { LoraBase } from '@/app/lib/generations/definitions'
import { getOrCreateFileType } from '@/app/lib/file-types/data';

export async function getListOfLoras() {
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
