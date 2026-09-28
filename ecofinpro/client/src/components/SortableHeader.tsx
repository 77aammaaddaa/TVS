import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export default function SortableHeader({
    label,
    active,
    direction,
    onClick,
}: {
    label: string;
    active: boolean;
    direction?: 'asc' | 'desc';
    onClick: () => void;
}) {
    return (
        <th
            className="p-3 cursor-pointer select-none hover:bg-gray-100 transition-colors"
            onClick={onClick}
        >
            <div className="flex items-center gap-1 justify-end">
                <span>{label}</span>
                {active ? (
                    direction === 'asc' ? (
                        <ChevronUp size={14} className="text-blue-600" />
                    ) : (
                        <ChevronDown size={14} className="text-blue-600" />
                    )
                ) : (
                    <ChevronsUpDown size={14} className="text-gray-300" />
                )}
            </div>
        </th>
    );
}
