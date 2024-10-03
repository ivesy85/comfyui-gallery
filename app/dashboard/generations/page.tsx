import Search from '@/app/ui/search';
import MultiSelect from '@/app/ui/multi-select';
import Pagination from '@/app/ui/pagination';
import Gallery from '@/app/ui/generations/gallery';
import { GenerationsGallerySkeleton } from '@/app/ui/skeletons';
import { Suspense } from 'react';
import { fetchGenerationsPages } from '@/app/lib/generations/data';
import { getListOfCheckpoints } from '@/app/lib/checkpoints/data';
import { getListOfLoras } from '@/app/lib/loras/data';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Generated Media',
  };
  
export default async function Page({
    searchParams,
}: {
    searchParams?: {
        exif?: string;
        checkpoints?: string;
        loras?: string;
        page?: string;
    };
}) {
    const fuckYou = await searchParams;
    const exif = fuckYou?.exif || '';
    const checkpoints = fuckYou?.checkpoints || '';
    const loras = fuckYou?.loras || '';
    const currentPage = Number(fuckYou?.page) || 1;

    const totalPages = await fetchGenerationsPages(exif, checkpoints, loras);

    const loraOptions = await getListOfLoras();
    const checkpointOptions = await getListOfCheckpoints();

    return (
        <div className="w-full">
            <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
                <Search placeholder="Search exif data..." searchParam='exif' />
                <MultiSelect placeholder="Select Checkpoints..." options={checkpointOptions} searchParam='checkpoints' />
                <MultiSelect placeholder="Select Loras..." options={loraOptions} searchParam='loras' />
            </div>
            <Suspense key={exif + checkpoints + loras + currentPage} fallback={<GenerationsGallerySkeleton />}>
                <Gallery exif={exif} checkpoints={checkpoints} loras={loras} currentPage={currentPage} />
            </Suspense>
            <div className="mt-5 flex w-full justify-center">
                <Pagination totalPages={totalPages} />
            </div>
        </div>
    );
}