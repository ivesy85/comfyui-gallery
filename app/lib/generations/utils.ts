/* eslint-disable @typescript-eslint/no-explicit-any */
import exifr from 'exifr';
import fs from 'fs';
import path from 'path';
import {
    RawExifJson,
    LoraBase,
    KsamplerInput,
    CheckpointLoaderSimpleInput,
    CLIPTextEncodeInput,
    RawAutomatic1111ParametersJson,
    Auto1111PromptInput,
    Auto1111CheckpointInput,
} from '@/app/lib/generations/definitions';

export const getExifDataFromImage = async (imagePath: string) => {
    const resolvedImagePath = path.resolve(process.cwd(), imagePath);

    try {
        // Read the image file as a buffer
        const imageBuffer = fs.readFileSync(resolvedImagePath);
    
        // Extract metadata from the image buffer
        const metadata: RawExifJson = await exifr.parse(imageBuffer);

        const sanitizeJsonString = (jsonString: string) => {
            // Replace any "NaN" occurrences with a valid value, such as `null`
            return jsonString.replace(/NaN/g, 'null');
        };

        if (metadata.prompt && typeof metadata.prompt === 'string') {
            try {
                const sanitizedPrompt = sanitizeJsonString(metadata.prompt);
                // Unescape and parse the prompt string as JSON
                const unescapedPrompt = JSON.parse(sanitizedPrompt);
                // Replace the original prompt string with the parsed object
                metadata.prompt = unescapedPrompt;
            } catch (error) {
                console.error('Failed to parse the prompt field:', error);
            }
        }
        if (metadata.workflow && typeof metadata.workflow === 'string') {
            try {
                const sanitizedPrompt = sanitizeJsonString(metadata.workflow);
                // Unescape and parse the workflow string as JSON
                const unescapedPrompt = JSON.parse(sanitizedPrompt);
                // Replace the original workflow string with the parsed object
                metadata.workflow = unescapedPrompt;
            } catch (error) {
                console.error('Failed to parse the workflow field:', error);
            }
        }
        if (metadata.parameters && typeof metadata.parameters === 'string') {
            const paramsString = metadata.parameters;

            // Split based on 'Negative prompt:'
            const [positivePromptPart, rest] = paramsString.split('Negative prompt:');

            // Extract the negative part (if it exists) and additional details
            const [negativePromptPart, ...details] = rest ? rest.split('\n') : [''];

            // Build key-value pairs
            const result: RawAutomatic1111ParametersJson = {
                "Positive prompt": positivePromptPart.trim(),
                "Negative prompt": negativePromptPart.trim(),
            };

            // Function to split key-value pairs while considering potential commas in values
            const keyValuePattern = /([a-zA-Z\s]+?):\s*(.+?)(?=, [a-zA-Z\s]+?:|$)/g;

            // Extract remaining key-value pairs from the details section
            details.forEach((detail) => {
                const trimmedDetail = detail.trim();
        
                let match;
                // Extract key-value pairs using regex
                while ((match = keyValuePattern.exec(trimmedDetail)) !== null) {
                    const key = match[1];
                    const value = match[2];
        
                    if (key && value !== undefined) {
                        // Try to parse the value as a number if it is numeric, otherwise keep it as a string
                        const numericValue = parseFloat(value);
                        (result as any)[key.trim() as keyof RawAutomatic1111ParametersJson] = isNaN(numericValue) ? value.trim() : numericValue;
                    }
                }
            });

            metadata.parameters = result;
        }
        
        return { success: true, metadata };
    } catch (error) {
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        // Handle unknown errors
        return { success: false, error: 'An unknown error occurred' };
    }
};

export const extractCkptNamesFromExifData = (jsonData: RawExifJson) => {
    const ckpts: { comfyUI: CheckpointLoaderSimpleInput[], auto1111: Auto1111CheckpointInput[] } = {
        comfyUI: [],
        auto1111: []
    };

    // COMFYUI
    // Ensure 'prompt' is an object, not a string
    if (typeof jsonData.prompt === 'object') {
        // Loop through each key in the 'prompt' object
        for (const key in jsonData.prompt) {
            if (jsonData.prompt.hasOwnProperty(key)) {
                const promptEntry = jsonData.prompt[key];
        
                // Check if class_type is 'CheckpointLoaderSimple'
                if (promptEntry.class_type === 'CheckpointLoaderSimple') {
                    promptEntry.inputs.key = key;
                    const cleanedName = promptEntry.inputs.ckpt_name.split('\\').pop();
                    if (cleanedName !== undefined) {
                        promptEntry.inputs.ckpt_name = cleanedName;
                    }
                    ckpts.comfyUI.push(promptEntry.inputs);
                }
            }
        }
    }

    // AUTOMATIC1111
    // Ensure 'parameters' is an object, not a string
    if (typeof jsonData.parameters === 'object') {
        // Loop through each key in the 'parameters' object
        for (const key in jsonData.parameters) {
            if (key === 'Model') {
                const chkpt = jsonData.parameters[key];
                const chkptObj: Auto1111CheckpointInput = { ckpt_name: chkpt! + '.safetensors', key };
                ckpts.auto1111.push(chkptObj);
            }
        }
    }

    return ckpts;
};

export const extractPromptsFromExifData = (jsonData: RawExifJson) => {
    const prompts: { comfyUI: CLIPTextEncodeInput[], auto1111: Auto1111PromptInput[] } = {
        comfyUI: [],
        auto1111: []
    };

    // COMFYUI
    // Ensure 'prompt' is an object, not a string
    if (typeof jsonData.prompt === 'object') {
        // Loop through each key in the 'prompt' object
        for (const key in jsonData.prompt) {
            if (jsonData.prompt.hasOwnProperty(key)) {
                const promptEntry = jsonData.prompt[key];
        
                // Check if class_type is 'CLIPTextEncode'
                if (promptEntry.class_type === 'CLIPTextEncode') {
                    promptEntry.inputs.key = key;
                    prompts.comfyUI.push(promptEntry.inputs);
                }
            }
        }
    }

    // AUTOMATIC1111
    // Ensure 'parameters' is an object, not a string
    if (typeof jsonData.parameters === 'object') {
        // Loop through each key in the 'parameters' object
        for (const key in jsonData.parameters) {
            if (key === 'Positive prompt') {
                const prompt = jsonData.parameters[key];
                const promptObj: Auto1111PromptInput = { text: prompt, key };
                prompts.auto1111.push(promptObj);
            }
            if (key === 'Hires prompt') {
                const prompt = jsonData.parameters[key]!;
                const promptObj: Auto1111PromptInput = { text: prompt, key };
                prompts.auto1111.push(promptObj);
            }
            if (key === 'Negative prompt') {
                const prompt = jsonData.parameters[key];
                const promptObj: Auto1111PromptInput = { text: prompt, key };
                prompts.auto1111.push(promptObj);
            }
        }
    }

    return prompts;
};

export const extractLoraNamesFromExifData = (jsonData: RawExifJson) => {
    const loras: { comfyUI: LoraBase[], auto1111: LoraBase[] } = {
        comfyUI: [],
        auto1111: []
    };

    // COMFYUI
    // Ensure 'prompt' is an object, not a string
    if (typeof jsonData.prompt === 'object') {
        // Loop through each key in the 'prompt' object
        for (const key in jsonData.prompt) {
            if (jsonData.prompt.hasOwnProperty(key)) {
                const promptEntry = jsonData.prompt[key];
        
                // Check if class_type is a LoRA type
                if (promptEntry.class_type === 'LoraLoader') {
                    const { lora_name, strength_model, strength_clip } = promptEntry.inputs;
                    const newLora = {
                        lora_name: lora_name.split('\\').pop()!,
                        strength_model,
                        strength_clip
                    };
                    
                    if (isLoraUnique(loras.comfyUI, newLora)) {
                        loras.comfyUI.push(newLora);
                    }
                } else if (promptEntry.class_type === 'CR LoRA Stack') {
                    const {
                        switch_1, switch_2, switch_3,
                        lora_name_1, lora_name_2, lora_name_3,
                        clip_weight_1, clip_weight_2, clip_weight_3,
                        model_weight_1, model_weight_2, model_weight_3
                    } = promptEntry.inputs;
                
                    // Push entries only if their corresponding switch is 'On'
                    if (switch_1 === 'On') {
                        const newLora = {
                            lora_name: lora_name_1.split('\\').pop()!,
                            strength_model: model_weight_1,
                            strength_clip: clip_weight_1
                        };
                        if (isLoraUnique(loras.comfyUI, newLora)) {
                            loras.comfyUI.push(newLora);
                        }
                    }
                    if (switch_2 === 'On') {
                        const newLora = {
                            lora_name: lora_name_2.split('\\').pop()!,
                            strength_model: model_weight_2,
                            strength_clip: clip_weight_2
                        };
                        if (isLoraUnique(loras.comfyUI, newLora)) {
                            loras.comfyUI.push(newLora);
                        }
                    }
                    if (switch_3 === 'On') {
                        const newLora = {
                            lora_name: lora_name_3.split('\\').pop()!,
                            strength_model: model_weight_3,
                            strength_clip: clip_weight_3
                        };
                        if (isLoraUnique(loras.comfyUI, newLora)) {
                            loras.comfyUI.push(newLora);
                        }
                    }
                }
            }
        }
    }

    // AUTOMATIC1111
    // Ensure 'parameters' is an object, not a string
    if (typeof jsonData.parameters === 'object') {
        // Loop through each key in the 'parameters' object
        for (const paramKey in jsonData.parameters) {
            if (paramKey === 'Lora hashes') {
                const loraHashesString = jsonData.parameters[paramKey];
                if (loraHashesString !== undefined) {
                    // Get prompt strings
                    const prompts = extractPromptsFromExifData(jsonData);

                    // Use a regular expression to match the keys (before the colon)
                    const loraStrings = loraHashesString.match(/(\w+):/g)?.map(key => key.replace(':', '.safetensors'));
                    loraStrings?.forEach((loraString) => {
                        const loraName = loraString.split('.')[0]; // Extract lora name by splitting at the dot

                        // Regex to find <lora:lora_name:strength> in the prompt
                        const regex = new RegExp(`<lora:${loraName}:(\\d+\\.?\\d*)>`);

                        // Loop through all the prompt strings in the prompts array
                        prompts.auto1111.forEach((prompt) => {
                            const match = prompt.text.match(regex);
                            if (match) {
                                const newLora: LoraBase = {
                                    lora_name: loraString, // Use loraString as we want the filename
                                    strength_model: parseFloat(match[1]),
                                    strength_clip: parseFloat(match[1]),
                                };
                                if (isLoraUnique(loras.auto1111, newLora)) {
                                    loras.auto1111.push(newLora);
                                }
                            }
                        });
                    });
                }
            }
        }
    }

    return loras;
};

export const extractKsamplersFromExifData = (jsonData: RawExifJson) => {
    const ckptNames = [];

    // Ensure 'prompt' is an object, not a string
    if (typeof jsonData.prompt === 'object') {
        // Loop through each key in the 'prompt' object
        for (const key in jsonData.prompt) {
            if (jsonData.prompt.hasOwnProperty(key)) {
                const promptEntry = jsonData.prompt[key];
        
                // Check if class_type is 'CheckpointLoaderSimple'
                if (promptEntry.class_type === 'KSampler') {
                ckptNames.push(promptEntry.inputs);
                }
            }
        }
    }

    return ckptNames;
};

export const getCheckpointIdsForKSamplers = (
    kSamplers: KsamplerInput[],
    ckptsWithIds: (CheckpointLoaderSimpleInput & { id: number })[],
    jsonData: RawExifJson
): number[] => {
    // Helper function to recursively find the checkpoint ID
    const findCheckpointId = (modelKey: string): number | null => {
        // Try to find a match in the ckptsWithIds array
        const foundObject = ckptsWithIds.find((obj) => obj.key === modelKey);

        if (foundObject) {
            return foundObject.id; // Return the found id
        } else if (typeof jsonData.prompt === 'object') {
            // If not found, iterate over the jsonData prompt entries
            for (const key in jsonData.prompt) {
                if (jsonData.prompt.hasOwnProperty(key)) {
                    const promptEntry = jsonData.prompt[key];
                    // Need to cast promptEntry.inputs to any since typescript is getting confused by my union types. Will still fall back if it doesn't exisat
                    if (key === modelKey && promptEntry.inputs && (promptEntry.inputs as any).model) {
                        const newModelKey = (promptEntry.inputs as any).model[0];
                        // Recursively call with the new model key
                        return findCheckpointId(newModelKey);
                    }
                }
            }
        }
        return null; // Return null if no match is found
    };

    // Map over each kSampler and get its corresponding checkpoint ID
    return kSamplers.map((kSampler) => {
        const modelKey = kSampler.model[0];
        const id = findCheckpointId(modelKey);
        return id !== null ? id : -1; // Use -1 if no id is found
    });
};

export const getPromptIdsForKSamplers = (
    kSamplers: KsamplerInput[],
    promptsWithIds: (CLIPTextEncodeInput & { id: number })[],
    jsonData: RawExifJson
): { positivePromptIds: number[][], negativePromptIds: number[][] } => {
    // Helper function to recursively find the prompt ID
    const findPromptIds = (promptKey: string, targetNode: string): number[] | null => {
        // Try to find a match in the promptsWithIds array
        const foundObject = promptsWithIds.find((obj) => obj.key === promptKey);
        const ids: number[] = []; // Due to combine conditioning we can have multiple

        if (foundObject) {
            return [foundObject.id]; // Return the found id
        } else if (typeof jsonData.prompt === 'object') {
            // If not found, iterate over the jsonData prompt entries
            for (const key in jsonData.prompt) {
                if (jsonData.prompt.hasOwnProperty(key)) {
                    const promptEntry = jsonData.prompt[key];
                    // Need to cast promptEntry.inputs to any since typescript is getting confused by my union types. Will still fall back if it doesn't exisat
                    if (key === promptKey && promptEntry.inputs && (promptEntry.inputs as any)[targetNode]) {
                        const newKey = (promptEntry.inputs as any)[targetNode][0];
                        // Recursively call with the new conditioning key
                        const foundIds = findPromptIds(newKey, targetNode);
                        if (foundIds !== null) {
                            ids.push(...foundIds);
                        }
                    }
                    // Could also be refered to as conditioning in some nodes
                    if (key === promptKey && promptEntry.inputs && (promptEntry.inputs as any).conditioning) {
                        const newKey = (promptEntry.inputs as any).conditioning[0];
                        // Recursively call with the new conditioning key
                        const foundIds = findPromptIds(newKey, targetNode);
                        if (foundIds !== null) {
                            ids.push(...foundIds);
                        }
                    }
                    if (key === promptKey && promptEntry.inputs && (promptEntry.inputs as any).conditioning_1) {
                        const newKey = (promptEntry.inputs as any).conditioning_1[0];
                        // Recursively call with the new conditioning_1 key
                        const foundIds = findPromptIds(newKey, targetNode);
                        if (foundIds !== null) {
                            ids.push(...foundIds);
                        }
                    }
                    if (key === promptKey && promptEntry.inputs && (promptEntry.inputs as any).conditioning_2) {
                        const newKey = (promptEntry.inputs as any).conditioning_2[0];
                        // Recursively call with the new conditioning_2 key
                        const foundIds = findPromptIds(newKey, targetNode);
                        if (foundIds !== null) {
                            ids.push(...foundIds);
                        }
                    }
                }
            }
        }

        return ids.length > 0 ? ids : null;
    };

    // Map over each kSampler and get its corresponding prompt ID
    const positivePromptIds = kSamplers.map((kSampler) => {
        const promptKey = kSampler.positive[0];
        const ids = findPromptIds(promptKey, 'positive');
        if (ids === null) {
            throw new Error('Unable to find positive prompt data');
        }
        return ids;
    });
    const negativePromptIds = kSamplers.map((kSampler) => {
        const promptKey = kSampler.negative[0];
        const ids = findPromptIds(promptKey, 'negative');
        if (ids === null) {
            console.warn('Unable to find negative prompt data');
        }
        return ids !== null ? ids : [];
    });
    return { positivePromptIds, negativePromptIds }
};

export const getSeedsForKSamplers = (
    kSamplers: KsamplerInput[],
    jsonData: RawExifJson
): number[] => {
    // Helper function to recursively find the seed
    const findSeed = (seedKey: string): number | null => {
        if (typeof jsonData.prompt === 'object') {
            for (const key in jsonData.prompt) {
                if (jsonData.prompt.hasOwnProperty(key)) {
                    const promptEntry = jsonData.prompt[key];
                    // Need to cast promptEntry.inputs to any since typescript is getting confused by my union types. Will still fall back if it doesn't exist
                    if (key === seedKey && promptEntry.inputs && (promptEntry.inputs as any).seed) {
                        const seed = (promptEntry.inputs as any).seed;
                        if (typeof seed === 'number') {
                            return seed;
                        }

                        const newSeedKey = seed[0];
                        // Recursively call with the new seed key
                        return findSeed(newSeedKey);
                    }
                }
            }
        }
        return null; // Return null if no match is found
    };

    // Map over each kSampler and get its corresponding seed
    return kSamplers.map((kSampler) => {
        if (typeof kSampler.seed === 'number') {
            return kSampler.seed;
        }

        const seedKey = kSampler.seed[0];
        const seed = findSeed(seedKey);
        return seed !== null ? seed : -1; // Use -1 if no seed is found
    });
};

function isLoraUnique(loras: LoraBase[], lora: LoraBase) {
    return !loras.some(
        (existingLora) =>
            existingLora.lora_name === lora.lora_name &&
            existingLora.strength_model === lora.strength_model &&
            existingLora.strength_clip === lora.strength_clip
    );
};
