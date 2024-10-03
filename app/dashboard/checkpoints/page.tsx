import { saveGenerationEntry } from '@/app/lib/generations/data';
import { Metadata } from 'next';
import path from 'path';

export const metadata: Metadata = {
    title: 'Checkpoints',
  };
  
export default async function Page() {
    const imagePath = path.resolve(process.cwd(), 'comfy_outputs/ComfyUI_02195_.png');
    const result = await saveGenerationEntry(imagePath);
    if (result.success) {
        console.log(`Generation entry saved with ID: ${result.generationId}`);
    } else {
        console.error(`Failed to save generation entry: ${result.error}`);
    }

    return (
        <p>Checkpoints</p>
    );
}