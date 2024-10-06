import { connectionPool } from '@/db';
import { CLIPTextEncodeInput } from '../generations/definitions';

export async function getOrCreatePrompts(prompts: CLIPTextEncodeInput[]): Promise<Array<CLIPTextEncodeInput & { id: number }>> {
    const ids: Record<string, number> = {}; // Object to store ids with names as keys

    // Extract prompts
    const promptStrings = prompts.map((prompt) => prompt.text);

    // Step 1: Query to find existing prompts
    const result = await connectionPool.query(
        'SELECT id, text FROM prompts WHERE text = ANY($1::text[])',
        [promptStrings]
    );

    const existingPrompts = result.rows;

    // Store the existing IDs in the ids object using the prompt as the key
    existingPrompts.forEach((row) => {
        ids[row.text] = row.id;
    });

    // Step 2: Find objects where the prompt is not in the database
    const missingPrompts = prompts.filter((prompt) => !ids[prompt.text]);

    // Step 3: Insert missing prompts
    if (missingPrompts.length > 0) {
        const insertQuery = `
            INSERT INTO prompts (text)
            VALUES ${missingPrompts.map((_, i) => `($${i + 1})`).join(', ')}
            RETURNING id, text
        `;

        const insertParams = missingPrompts.flatMap((prompt) => [prompt.text]);

        const insertResult = await connectionPool.query(insertQuery, insertParams);

        // Store the new IDs in the ids object using the prompt as the key
        insertResult.rows.forEach((row) => {
            ids[row.text] = row.id;
        });
    }

    // Step 4: Return the updated prompts array with ids
    return prompts.map((prompt) => ({
        ...prompt,
        id: ids[prompt.text],
    }));
}