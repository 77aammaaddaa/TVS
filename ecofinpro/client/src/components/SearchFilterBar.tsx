import { Search, Filter } from 'lucide-react';

export interface FilterOption {
    label: string;
    value: string;
}

export default function SearchFilterBar({
    search,
    onSearchChange,
    searchPlaceholder = 'بحث...',
    filterLabel,
    filterValue,
    filterOptions,
    onFilterChange,
}: {
    search: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    filterLabel?: string;
    filterValue?: string;
    filterOptions?: FilterOption[];
    onFilterChange?: (value: string) => void;
}) {
    return (
        <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[220px]">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full border rounded-md p-2 pr-9 text-sm"
                    dir="rtl"
                />
            </div>

            {filterOptions && onFilterChange && (
                <div className="relative">
                    <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select
                        value={filterValue}
                        onChange={(e) => onFilterChange(e.target.value)}
                        className="border rounded-md p-2 pr-8 text-sm bg-white appearance-none min-w-[140px]"
                    >
                        {filterLabel && <option value="all">{filterLabel}</option>}
                        {filterOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}
