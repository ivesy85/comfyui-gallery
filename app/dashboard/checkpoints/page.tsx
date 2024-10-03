import { processAllGenerationLocations } from '@/app/lib/generations/data';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Checkpoints',
  };
  
export default async function Page() {
    processAllGenerationLocations()
        .then(() => console.log('All directories processed.'))
        .catch(err => console.error('Error processing directories:', err));

    return (
        <p>Checkpoints</p>
    );
}