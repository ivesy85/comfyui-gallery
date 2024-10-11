import { connectionPool } from '@/db';
import {
    KsamplerInput,
    CheckpointLoaderSimpleInput,
    CLIPTextEncodeInput,
    RawExifJson,
    Auto1111PromptInput,
    Auto1111CheckpointInput,
} from '../generations/definitions';
import {
    getCheckpointIdsForKSamplers,
    getPromptIdsForKSamplers,
    getSeedsForKSamplers,
} from '../generations/utils';
import { linkNegativePromptsToKSampler, linkPositivePromptsToKSampler } from '../prompts/data';

export async function createComfyKSamplers(
    kSamplers: KsamplerInput[], 
    ckptsWithIds: (CheckpointLoaderSimpleInput & {
        id: number;
    })[],
    promptsWithIds: (CLIPTextEncodeInput & {
        id: number;
    })[],
    jsonData: RawExifJson
): Promise<Array<KsamplerInput & { id: number }>> {
    const savedKSamplerIds: number[] = [];

    // Insert kSamplers
    if (kSamplers.length > 0) {
        // Map corresponding checkpoint ids
        const chkptIds = getCheckpointIdsForKSamplers(kSamplers, ckptsWithIds, jsonData);

        // Map corresponding positive & negative prompt ids
        const { positivePromptIds, negativePromptIds } = getPromptIdsForKSamplers(kSamplers, promptsWithIds, jsonData);

        // Map corresponding seeds
        const seeds = getSeedsForKSamplers(kSamplers, jsonData);

        const insertQuery = `
            INSERT INTO k_samplers (checkpoint_id, seed, steps, cfg, sampler_name, scheduler, denoise)
            VALUES ${kSamplers.map((_, i) => `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`).join(', ')}
            RETURNING id
        `;

        const insertParams = kSamplers.flatMap((kSampler, i) => [chkptIds[i], seeds[i], kSampler.steps, kSampler.cfg, kSampler.sampler_name, kSampler.scheduler, kSampler.denoise]);

        const insertResult = await connectionPool.query(insertQuery, insertParams);

        // Store the new IDs in the ids array
        insertResult.rows.forEach((row) => {
            savedKSamplerIds.push(row.id);
        });

        if (positivePromptIds.length > 0) {
            await linkPositivePromptsToKSampler(positivePromptIds, savedKSamplerIds);
        }
        if (positivePromptIds.length > 0) {
            await linkNegativePromptsToKSampler(negativePromptIds, savedKSamplerIds);
        }
    }

    // Return the updated ksamplers array with ids
    return kSamplers.map((kSampler, i) => ({
        ...kSampler,
        id: savedKSamplerIds[i],
    }));
}

export async function createAuto1111KSamplers(
    ckptsWithIds: (Auto1111CheckpointInput & {
        id: number;
    })[],
    promptsWithIds: (Auto1111PromptInput & {
        id: number;
    })[],
    jsonData: RawExifJson
): Promise<Array<{ id: number }>> {
    const savedKSamplerIds: number[] = [];

    // Insert kSamplers
    if (ckptsWithIds.length > 0 && promptsWithIds.length > 0) {
        let seed = 0;
        let steps = 0;
        let cfgScale = 0;
        let sampler = 0;
        let denoise = 0;
        const positivePromptIds: number[] = [];
        const negativePromptIds: number[] = [];

        if (typeof jsonData.parameters === 'object') {
            // Loop through each key in the 'parameters' object
            for (const key in jsonData.parameters) {
                if (key === 'Seed') {
                    seed = jsonData.parameters[key]!;
                }
                if (key === 'Steps') {
                    steps = jsonData.parameters[key]!;
                }
                if (key === 'CFG scale') {
                    cfgScale = jsonData.parameters[key]!;
                }
                if (key === 'Sampler') {
                    sampler = jsonData.parameters[key]!;
                }
                if (key === 'Denoising strength') {
                    denoise = jsonData.parameters[key]!;
                }
            }
        }
        // Map corresponding positive & negative prompt ids
        for (const key in promptsWithIds) {
            if (promptsWithIds[key].key === 'Positive prompt') {
                positivePromptIds.push(promptsWithIds[key]!.id);
            }
            if (promptsWithIds[key].key === 'Hires prompt') {
                positivePromptIds.push(promptsWithIds[key]!.id);
            }
            if (promptsWithIds[key].key === 'Negative prompt') {
                negativePromptIds.push(promptsWithIds[key]!.id);
            }
        }

        const insertQuery = `
            INSERT INTO k_samplers (checkpoint_id, seed, steps, cfg, sampler_name, scheduler, denoise)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `;

        const insertParams = [ckptsWithIds[0].id, seed, steps, cfgScale, sampler, '', denoise];

        try {
            const insertResult = await connectionPool.query(insertQuery, insertParams);

            // Store the new IDs in the ids array
            insertResult.rows.forEach((row) => {
                savedKSamplerIds.push(row.id);
            });

            if (positivePromptIds.length > 0) {
                await linkPositivePromptsToKSampler([positivePromptIds], savedKSamplerIds);
            }
            if (positivePromptIds.length > 0) {
                await linkNegativePromptsToKSampler([negativePromptIds], savedKSamplerIds);
            }
        } catch (error) {
            console.warn(error);
            throw new Error('Failed to save KSampler');
        }
    }

    // Return the updated ksamplers array with ids
    return savedKSamplerIds.map((savedKSamplerId) => ({
        id: savedKSamplerId,
    }));
}

export async function linkKSamplersToGeneration(ksamplersWithIds: { id: number }[], generationId: number): Promise<void> {
    if (ksamplersWithIds.length === 0) {
        throw new Error('No lora KSamplers provided');
    }

    // Construct the query to insert links between KSamplers and generation_id
    const insertQuery = `
        INSERT INTO generation_k_samplers (generation_id, k_sampler_id)
        VALUES ${ksamplersWithIds.map((_, i) => `($1, $${i + 2})`).join(', ')}
    `;
    
    const insertParams = [generationId, ...ksamplersWithIds.flatMap((kSampler) => [kSampler.id])];

    // Execute the query
    await connectionPool.query(insertQuery, insertParams);
}