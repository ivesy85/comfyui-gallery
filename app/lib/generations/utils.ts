import exifr from 'exifr';
import fs from 'fs';
import path from 'path';
import { RawComfyUIJson } from '@/app/lib/generations/definitions';

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
    const loraNames = [];
  
    // Ensure 'prompt' is an object, not a string
    if (typeof jsonData.prompt === 'object') {
        // Loop through each key in the 'prompt' object
        for (const key in jsonData.prompt) {
            if (jsonData.prompt.hasOwnProperty(key)) {
                const promptEntry = jsonData.prompt[key];
          
                // Check if class_type is 'LoraLoader'
                if (promptEntry.class_type === 'LoraLoader') {
                    loraNames.push(promptEntry.inputs);
                }
              }
        }
    }
  
    return loraNames;
  };
