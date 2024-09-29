import { Metadata } from 'next';
import exifr from 'exifr';
import fs from 'fs';
import path from 'path';

export const metadata: Metadata = {
    title: 'Generated Media',
  };
  
export default async function Page() {
    const imagePath = path.resolve(process.cwd(), 'comfy_outputs/ComfyUI_02194_.png');
    const outputJsonPath = path.resolve(process.cwd(), 'comfy_outputs/ComfyUI_02194_.json');

    try {
        // Read the image file as a buffer
        const imageBuffer = fs.readFileSync(imagePath);
    
        // Extract metadata from the image buffer
        const metadata = await exifr.parse(imageBuffer);

        const cleanUpPrompt = (data) => {
            if (data.prompt && typeof data.prompt === 'string') {
              try {
                // Unescape and parse the prompt string as JSON
                const unescapedPrompt = JSON.parse(data.prompt);
                // Replace the original prompt string with the parsed object
                data.prompt = unescapedPrompt;
              } catch (error) {
                console.error('Failed to parse the prompt field:', error);
              }
            }
            return data;
          };

          // Clean up the prompt field in the metadata
        const cleanedMetadata = cleanUpPrompt(metadata);

        // Save the metadata to a JSON file
        fs.writeFileSync(outputJsonPath, JSON.stringify(cleanedMetadata, null, 2));
        
        console.log({ success: true, metadata });
      } catch (error) {
        console.log({ success: false, error: error.message });
      }

    return (
        <p>Generated Media</p>
    );
}