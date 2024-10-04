import exifr from 'exifr';
import fs from 'fs';
import path from 'path';
import {
    RawComfyUIJson,
    LoraBase,
} from '@/app/lib/generations/definitions';

export const getExifDataFromImage = async (imagePath: string) => {
    const resolvedImagePath = path.resolve(process.cwd(), imagePath);

    try {
        // Read the image file as a buffer
        const imageBuffer = fs.readFileSync(resolvedImagePath);
    
        // Extract metadata from the image buffer
        const metadata: RawComfyUIJson = await exifr.parse(imageBuffer);

        if (metadata.prompt && typeof metadata.prompt === 'string') {
            try {
                // Unescape and parse the prompt string as JSON
                const unescapedPrompt = JSON.parse(metadata.prompt);
                // Replace the original prompt string with the parsed object
                metadata.prompt = unescapedPrompt;
            } catch (error) {
                console.error('Failed to parse the prompt field:', error);
            }
        }
        if (metadata.workflow && typeof metadata.workflow === 'string') {
            try {
                // Unescape and parse the workflow string as JSON
                const unescapedPrompt = JSON.parse(metadata.workflow);
                // Replace the original workflow string with the parsed object
                metadata.workflow = unescapedPrompt;
            } catch (error) {
                console.error('Failed to parse the workflow field:', error);
            }
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

export const extractCkptNamesFromExifData = (jsonData: RawComfyUIJson) => {
    const ckptNames = [];
  
    // Ensure 'prompt' is an object, not a string
    if (typeof jsonData.prompt === 'object') {
        // Loop through each key in the 'prompt' object
        for (const key in jsonData.prompt) {
            if (jsonData.prompt.hasOwnProperty(key)) {
                const promptEntry = jsonData.prompt[key];
          
                // Check if class_type is 'CheckpointLoaderSimple'
                if (promptEntry.class_type === 'CheckpointLoaderSimple') {
                  ckptNames.push(promptEntry.inputs);
                }
              }
        }
    }
  
    return ckptNames;
  };

  export const extractLoraNamesFromExifData = (jsonData: RawComfyUIJson) => {
    const loras: LoraBase[] = [];
  
    // Ensure 'prompt' is an object, not a string
    if (typeof jsonData.prompt === 'object') {
        // Loop through each key in the 'prompt' object
        for (const key in jsonData.prompt) {
            if (jsonData.prompt.hasOwnProperty(key)) {
                const promptEntry = jsonData.prompt[key];
          
                // Check if class_type is a LoRA type
                if (promptEntry.class_type === 'LoraLoader') {
                    const { lora_name, strength_model, strength_clip } = promptEntry.inputs;
                    const newLora = { lora_name, strength_model, strength_clip };
                    
                    if (isLoraUnique(loras, newLora)) {
                        loras.push(newLora);
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
                            lora_name: lora_name_1,
                            strength_model: model_weight_1,
                            strength_clip: clip_weight_1
                        };
                        if (isLoraUnique(loras, newLora)) {
                            loras.push(newLora);
                        }
                    }
                    if (switch_2 === 'On') {
                        const newLora = {
                            lora_name: lora_name_2,
                            strength_model: model_weight_2,
                            strength_clip: clip_weight_2
                        };
                        if (isLoraUnique(loras, newLora)) {
                            loras.push(newLora);
                        }
                    }
                    if (switch_3 === 'On') {
                        const newLora = {
                            lora_name: lora_name_3,
                            strength_model: model_weight_3,
                            strength_clip: clip_weight_3
                        };
                        if (isLoraUnique(loras, newLora)) {
                            loras.push(newLora);
                        }
                    }
                }
            }
        }
    }
  
    return loras;
  };

  function isLoraUnique(loras: LoraBase[], lora: LoraBase) {
    return !loras.some(
        (existingLora) =>
            existingLora.lora_name === lora.lora_name &&
            existingLora.strength_model === lora.strength_model &&
            existingLora.strength_clip === lora.strength_clip
    );
}
