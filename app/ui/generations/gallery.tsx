import Image from 'next/image';
import { fetchFilteredGenerations } from '@/app/lib/data';

export default async function GenerationsGallery({
    exif,
    models,
    loras,
    currentPage,
}: {
    exif: string;
    models: string;
    loras: string;
    currentPage: number;
}) {
  const generations = await fetchFilteredGenerations(exif, models, loras, currentPage);

    return (
        <div className="mt-6 flow-root">
            <div className="inline-block min-w-full align-middle">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 rounded-lg p-2 md:pt-0">
                    {generations?.map((generation) => (
                        <div 
                            key={generation.id}
                            className="relative w-full h-0 pb-[100%] rounded-md overflow-hidden"
                        >
                            <Image
                                src={`/api/images/${encodeURIComponent(generation.file_location)}`}
                                alt={generation.name}
                                fill
                                objectFit="cover"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
