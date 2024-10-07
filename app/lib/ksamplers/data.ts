import { connectionPool } from '@/db';
import {
    KsamplerInput,
    CheckpointLoaderSimpleInput,
    CLIPTextEncodeInput,
    RawComfyUIJson,
} from '../generations/definitions';
import {
    getCheckpointIdsForKSamplers,
    getSeedsForKSamplers,
} from '../generations/utils';

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
    const ids: number[] = [];

    // Insert kSamplers
    if (kSamplers.length > 0) {
        // Map corresponding checkpoint ids
        const chkptIds = getCheckpointIdsForKSamplers(kSamplers, ckptsWithIds, jsonData);

        // Map corresponding positive prompt ids
        const positivePromptIds = kSamplers.map((kSampler) => {
            const foundObject = promptsWithIds.find((obj) => obj.key === kSampler.positive[0]);
            
            return foundObject ? foundObject.id : null;
        });

        // Map corresponding negative prompt ids
        const negativePromptIds = kSamplers.map((kSampler) => {
            const foundObject = promptsWithIds.find((obj) => obj.key === kSampler.negative[0]);
            
            return foundObject ? foundObject.id : null;
        });

        // Map corresponding seeds
        const seeds = getSeedsForKSamplers(kSamplers, jsonData);

        const insertQuery = `
            INSERT INTO k_samplers (checkpoint_id, positive_prompt_id, negative_prompt_id, seed, steps, cfg, sampler_name, scheduler, denoise)
            VALUES ${kSamplers.map((_, i) => `($${i * 9 + 1}, $${i * 9 + 2}, $${i * 9 + 3}, $${i * 9 + 4}, $${i * 9 + 5}, $${i * 9 + 6}, $${i * 9 + 7}, $${i * 9 + 8}, $${i * 9 + 9})`).join(', ')}
            RETURNING id
        `;

        const insertParams = kSamplers.flatMap((kSampler, i) => [chkptIds[i], positivePromptIds[i], negativePromptIds[i], seeds[i], kSampler.steps, kSampler.cfg, kSampler.sampler_name, kSampler.scheduler, kSampler.denoise]);

        const insertResult = await connectionPool.query(insertQuery, insertParams);

        // Store the new IDs in the ids array
        insertResult.rows.forEach((row) => {
            ids.push(row.id);
        });
    }

    // Step 4: Return the updated ksamplers array with ids
    return kSamplers.map((kSampler, i) => ({
        ...kSampler,
        id: ids[i],
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