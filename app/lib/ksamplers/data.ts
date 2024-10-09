import { connectionPool } from '@/db';
import {
    KsamplerInput,
    CheckpointLoaderSimpleInput,
    CLIPTextEncodeInput,
    RawComfyUIJson,
} from '../generations/definitions';
import {
    getCheckpointIdsForKSamplers,
    getPromptIdsForKSamplers,
    getSeedsForKSamplers,
} from '../generations/utils';
import { linkNegativePromptsToKSampler, linkPositivePromptsToKSampler } from '../prompts/data';

// Helper function to get ids or insert new loras if they don't exist
export async function createKSamplers(
    kSamplers: KsamplerInput[], 
    ckptsWithIds: (CheckpointLoaderSimpleInput & {
        id: number;
    })[],
    promptsWithIds: (CLIPTextEncodeInput & {
        id: number;
    })[],
    jsonData: RawComfyUIJson
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

export async function linkKSamplersToGeneration(ksamplersWithIds: (KsamplerInput & { id: number })[], generationId: number): Promise<void> {
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