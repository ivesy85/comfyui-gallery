import { connectionPool } from '@/db';
import { Auto1111PromptInput, CLIPTextEncodeInput } from '../generations/definitions';

export async function getOrCreateComfyPrompts(prompts: CLIPTextEncodeInput[]): Promise<Array<CLIPTextEncodeInput & { id: number }>> {
    const ids = await getOrCreatePrompts(prompts);

    return prompts.map((prompt) => ({
        ...prompt,
        id: ids[prompt.text],
    }));
}

export async function getOrCreateAuto1111Prompts(prompts: Auto1111PromptInput[]): Promise<Array<Auto1111PromptInput & { id: number }>> {
    const ids = await getOrCreatePrompts(prompts);

    return prompts.map((prompt) => ({
        ...prompt,
        id: ids[prompt.text],
    }));
}

async function getOrCreatePrompts(prompts: { text: string }[]) {
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

    return ids;
}

export async function linkPositivePromptsToKSampler(positivePromptIds: number[][], savedKSamplerIds: number[]): Promise<void> {
    if (positivePromptIds.length === 0) {
        throw new Error('No positive prompts provided');
    }

    // Construct the query to insert links between KSamplers and prompts
    let counter = 1;

    // Generate the value placeholders with correct numbering for each (k_sampler_id, prompt_id) pair
    const valuePlaceholders = positivePromptIds
    .map((prompts) => 
        prompts.map(() => `($${counter++}, $${counter++})`).join(', ')
    )
    .join(', ');
    
    const insertQuery = `
        INSERT INTO k_sampler_positive_prompts (k_sampler_id, prompt_id)
        VALUES ${valuePlaceholders}
    `;
    
    // Flatten the arrays to build the values array that corresponds to the placeholders
    const insertParams: number[] = [];
    positivePromptIds.forEach((prompts, i) => {
        prompts.forEach((promptId) => {
            insertParams.push(savedKSamplerIds[i], promptId);
        });
    });

    // Execute the query
    await connectionPool.query(insertQuery, insertParams);
}

export async function linkNegativePromptsToKSampler(negativePromptIds: number[][], savedKSamplerIds: number[]): Promise<void> {
    if (negativePromptIds.length === 0) {
        throw new Error('No negative prompts provided');
    }

    // Construct the query to insert links between KSamplers and prompts
    let counter = 1;

    // Generate the value placeholders with correct numbering for each (k_sampler_id, prompt_id) pair
    const valuePlaceholders = negativePromptIds
    .map((prompts) => 
        prompts.map(() => `($${counter++}, $${counter++})`).join(', ')
    )
    .join(', ');
    
    const insertQuery = `
        INSERT INTO k_sampler_negative_prompts (k_sampler_id, prompt_id)
        VALUES ${valuePlaceholders}
    `;
    
    // Flatten the arrays to build the values array that corresponds to the placeholders
    const insertParams: number[] = [];
    negativePromptIds.forEach((prompts, i) => {
        prompts.forEach((promptId) => {
            insertParams.push(savedKSamplerIds[i], promptId);
        });
    });

    // Execute the query
    await connectionPool.query(insertQuery, insertParams);
}
