import Image from 'next/image';
import Link from 'next/link';
import { fetchFilteredGenerations } from '@/app/lib/generations/data';

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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-4 rounded-lg p-2 md:pt-0">
                    {generations?.map((generation) => (
                        <div 
                            key={generation.id}
                            className="relative w-full h-0 pb-[100%] rounded-md overflow-hidden"
                        >
                            <Link
                                key={generation.name}
                                href={'/dashboard/generations/' + generation.id + '/view'}
                            >
                                <Image
                                    src={`/api/images/${encodeURIComponent(generation.file_location)}`}
                                    alt={generation.name}
                                    priority
                                    fill
                                    style={{objectFit:"cover"}}
                                    sizes="20vw"
                                />
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
