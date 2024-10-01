import { Metadata } from 'next';
import Search from '@/app/ui/search';
import MultiSelect from '@/app/ui/multi-select';

export const metadata: Metadata = {
    title: 'Generated Media',
  };
  
export default async function Page() {
    return (
        <div className="w-full">
            <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
                <Search placeholder="Search exif data..." searchParam='exif' />
                <MultiSelect placeholder="Select Models..." options={[{"value": "1", "label": "model 1"},{"value": "2", "label": "model 2"}]} searchParam='models' />
                <MultiSelect placeholder="Select Loras..." options={[{"value": "1", "label": "lora 1"},{"value": "2", "label": "lora 2"}]} searchParam='loras' />
            </div>
        </div>
    );
}