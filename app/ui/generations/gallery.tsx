import Image from 'next/image';
import { fetchFilteredGenerations } from '@/app/lib/data';

export default async function GenerationsGallery({
    exif,
    checkpoints,
    loras,
    currentPage,
}: {
    exif: string;
    checkpoints: string;
    loras: string;
    currentPage: number;
}) {
  const generations = await fetchFilteredGenerations(exif, checkpoints, loras, currentPage);

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
                                priority
                                fill
                                style={{objectFit:"cover"}}
                                sizes="20vw"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
