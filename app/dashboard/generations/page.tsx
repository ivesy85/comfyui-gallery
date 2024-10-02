import Search from '@/app/ui/search';
import MultiSelect from '@/app/ui/multi-select';
import Pagination from '@/app/ui/pagination';
import Gallery from '@/app/ui/generations/gallery';
import { GenerationsGallerySkeleton } from '@/app/ui/skeletons';
import { Suspense } from 'react';
import { fetchGenerationsPages } from '@/app/lib/data';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Generated Media',
  };
  
export default async function Page({
    searchParams,
}: {
    searchParams?: {
        exif?: string;
        models?: string;
        loras?: string;
        page?: string;
    };
}) {
    const exif = searchParams?.exif || '';
    const models = searchParams?.models || '';
    const loras = searchParams?.loras || '';
    const currentPage = Number(searchParams?.page) || 1;

    const totalPages = await fetchGenerationsPages(exif, models, loras);

    return (
        <div className="w-full">
            <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
                <Search placeholder="Search exif data..." searchParam='exif' />
                <MultiSelect placeholder="Select Models..." options={[{"value": "1", "label": "model 1"},{"value": "2", "label": "model 2"}]} searchParam='models' />
                <MultiSelect placeholder="Select Loras..." options={[{"value": "1", "label": "lora 1"},{"value": "2", "label": "lora 2"}]} searchParam='loras' />
            </div>
            <Suspense key={exif + models + loras + currentPage} fallback={<GenerationsGallerySkeleton />}>
                <Gallery exif={exif} models={models} loras={loras} currentPage={currentPage} />
            </Suspense>
            <div className="mt-5 flex w-full justify-center">
                <Pagination totalPages={totalPages} />
            </div>
        </div>
    );
}