'use client';

import { useDebouncedCallback } from 'use-debounce';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import Select, { components, MultiValue } from 'react-select';
import { useState } from 'react';

type Option = {
    value: string;
    label: string;
};

export default function MultiSelect({
    placeholder,
    options,
    searchParam,
}: {
    placeholder: string;
    options: Option[];
    searchParam: string;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // To store selected options
  const [selectedOptions, setSelectedOptions] = useState<Option[]>(
        searchParams.get(searchParam)
            ? searchParams.get(searchParam)!.split(',').map((value) => options.find((opt) => opt.value === value)!)
            : []
  );


  const handleSelection = useDebouncedCallback((selected: Option[]) => {
        console.log('Selected options:', selected);

        const params = new URLSearchParams(searchParams);
        params.set('page', '1');
        if (selected.length > 0) {
            params.set(
                searchParam,
                selected.map((opt) => opt.value).join(',') // Join selected values by comma
            );
        } else {
            params.delete(searchParam);
        }
        replace(`${pathname}?${params.toString()}`);
  }, 300);

  const handleChange = (newValue: MultiValue<Option>) => {
        const selectedValues = newValue as Option[];
        setSelectedOptions(selectedValues);
        handleSelection(selectedValues);
  };

  return (
    <div className="relative flex flex-1 flex-shrink-0">
        <Select
            instanceId={searchParam}
            isMulti
            options={options}
            value={selectedOptions}
            onChange={handleChange}
            placeholder={placeholder}
            className="w-full"
            classNames={{
                control: (state) => {
                    const baseClasses = '!rounded-md !bg-customGray !py-[1px] !text-sm !shadow-none';
                    const focusClasses = state.isFocused
                      ? '!border-pink-300 !outline-none'
                      : '!border-white/10 !outline-2';
                      
                    return `${baseClasses} ${focusClasses}`;
                },
                multiValueLabel: () =>
                    '!rounded-l-[2px] !rounded-r-none !bg-pink-300 !text-pink-800',
                multiValueRemove: () =>
                    '!rounded-r-[2px] !rounded-l-none !bg-pink-300 !text-pink-800',
                menu: () =>
                    '!bg-customGray',
                option: (state) =>
                    state.isFocused ? '!bg-pink-300 !text-pink-800' : '',
            }}
            styles={{
                placeholder: (base) => ({
                    ...base,
                    color: 'rgb(107 114 128 / 1)', // Tailwind's 'text-gray-500' equivalent
                }),
                dropdownIndicator: (base) => ({
                    ...base,
                    color: 'rgb(107 114 128 / 1)',
                }),
                indicatorSeparator: (base) => ({
                    ...base,
                    backgroundColor: 'rgb(107 114 128 / 1)',
                }),
              }}
            components={{
                Input: (props) => (
                    <components.Input {...props} aria-activedescendant={undefined} />
                ),
            }}
      />
    </div>
  );
}
