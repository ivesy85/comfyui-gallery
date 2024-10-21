import Search from '@/app/ui/search';
import MultiSelect from '@/app/ui/multi-select';
import Pagination from '@/app/ui/pagination';
import Gallery from '@/app/ui/generations/gallery';
import { GenerationsGallerySkeleton } from '@/app/ui/skeletons';
import { Suspense } from 'react';
import { fetchGenerationsPages } from '@/app/lib/generations/data';
import { getListOfCheckpoints } from '@/app/lib/checkpoints/data';
import { getListOfLoras } from '@/app/lib/loras/data';
import { getListOfNodes } from '@/app/lib/nodes/data';
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
        nodes?: string;
        page?: string;
    };
}) {
    const fuckYou = await searchParams;
    const exif = fuckYou?.exif || '';
    const checkpoints = fuckYou?.checkpoints || '';
    const loras = fuckYou?.loras || '';
    const nodes = fuckYou?.nodes || '';
    const currentPage = Number(fuckYou?.page) || 1;

    const totalPages = await fetchGenerationsPages(exif, checkpoints, loras, nodes);

    const nodeOptions = await getListOfNodes(exif, checkpoints, loras, nodes);
    const loraOptions = await getListOfLoras(exif, checkpoints, loras, nodes);
    const checkpointOptions = await getListOfCheckpoints(exif, checkpoints, loras, nodes);

    return (
        <div className="w-full">
            <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
                <Search placeholder="Search exif data..." searchParam='exif' />
                <MultiSelect placeholder="Select Checkpoints..." options={checkpointOptions} searchParam='checkpoints' />
                <MultiSelect placeholder="Select Loras..." options={loraOptions} searchParam='loras' />
                <MultiSelect placeholder="Select Nodes..." options={nodeOptions} searchParam='nodes' />
            </div>
            <Suspense key={exif + checkpoints + loras + nodes + currentPage} fallback={<GenerationsGallerySkeleton />}>
                <Gallery exif={exif} checkpoints={checkpoints} loras={loras} nodes={nodes} currentPage={currentPage} />
            </Suspense>
            <div className="mt-5 flex w-full justify-center">
                <Pagination totalPages={totalPages} />
            </div>
        </div>
    );
}