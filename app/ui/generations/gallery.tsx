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
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
            {generations?.map((generation) => (
              <div
                key={generation.id}
                className="mb-2 w-full rounded-md bg-white p-4"
              >
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <div className="mb-2 flex items-center">
                      <Image
                        src={`/api/images/${encodeURIComponent(generation.file_location)}`}
                        className="mr-2 rounded-full"
                        width={generation.width}
                        height={generation.height}
                        alt={`${generation.name}'s profile picture`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
