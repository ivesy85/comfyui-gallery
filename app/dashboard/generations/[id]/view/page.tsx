import { fetchGenerationData } from '@/app/lib/generations/data';
import { Generation } from '@/app/lib/generations/definitions';
import Image from 'next/image';

export default async function Page({
    params
}: {
    params: { id: string }
}) {
    const awaitedParaams = await params;
    const generationId = awaitedParaams.id;

    const generation: Generation = await fetchGenerationData(generationId);

    if (!generation) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-gray-500">No generation found for ID: {generationId}</p>
            </div>
        );
    }

    return (
        <div className="w-full h-[calc(100vh-6rem)] flex"> {/* Adjust for parent padding */}
            {/* Left Panel */}
            <div className="w-1/2 p-4 h-full flex-col items-center justify-center">
                {/* Add your text or content here */}
                <div className="text-center">
                    <h1 className="text-lg font-bold">{generation.name}</h1>
                    <div className="border-b my-2 w-full"></div>
                    <p>{generation.file_location}</p>

                    <div className="mt-8">
                    <div className="flex justify-between">
                        <span className="font-bold">Source:</span>
                        <span>{generation.source}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-bold">Height:</span>
                        <span>{generation.height}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-bold">Width:</span>
                        <span>{generation.width}</span>
                    </div>
                </div>
                </div>
            </div>
            
            {/* Right Panel with Image */}
            <div className="relative w-1/2 h-full overflow-hidden">
                <Image
                    src={`/api/images/${encodeURIComponent(generation.file_location)}`}
                    alt={generation.name}
                    priority
                    fill
                    style={{ objectFit: "contain" }}
                    sizes="(max-width: 768px) 90vw, 50vw"
                    className="w-full h-full"
                />
            </div>
        </div>
    );
}