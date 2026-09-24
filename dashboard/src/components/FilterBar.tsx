import { useQuery } from '@tanstack/react-query';
import { Filter } from 'lucide-react';
import { getUlbs } from '../api/ulb';
import type { FilterState, UlbType } from '../types';

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const ULB_TYPES: { label: string; value: FilterState['type'] }[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Corporation (24)', value: 'corporation' },
  { label: 'Municipality (145)', value: 'municipality' },
];

const OFFICIAL_REGIONS = [
  'Chengalpattu',
  'Vellore',
  'Salem',
  'Thanjavur',
  'Madurai',
  'Tiruppur',
  'Tirunelveli',
];

/**
 * FilterBar for the StatusBoard.
 * Allows filtering by Region (7 regions), District, Type (Corporation/Municipality), and Date.
 */
export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const { data: ulbs = [] } = useQuery({
    queryKey: ['ulbs'],
    queryFn: () => getUlbs(),
    staleTime: 5 * 60_000,
  });

  const districts = Array.from(
    new Set(ulbs.map((u) => u.district).filter(Boolean)),
  ).sort();

  const activeFilterCount = [
    Boolean(filters.region),
    Boolean(filters.district),
    filters.type !== 'all',
  ].filter(Boolean).length;

  const set = (patch: Partial<FilterState>) =>
    onChange({ ...filters, ...patch });

  return (
    <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* 7 Regions Dropdown */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="region-select"
            className="text-xs font-bold text-gray-600 uppercase tracking-wider"
          >
            Region
          </label>
          <select
            id="region-select"
            value={filters.region ?? ''}
            onChange={(e) => set({ region: e.target.value || undefined })}
            className="w-full rounded-xl border border-gray-300 text-xs sm:text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
          >
            <option value="">All 7 Regions</option>
            {OFFICIAL_REGIONS.map((r) => (
              <option key={r} value={r}>
                {r} Region
              </option>
            ))}
          </select>
        </div>

        {/* District Dropdown */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="district-select"
            className="text-xs font-bold text-gray-600 uppercase tracking-wider"
          >
            District
          </label>
          <select
            id="district-select"
            value={filters.district}
            onChange={(e) => set({ district: e.target.value })}
            className="w-full rounded-xl border border-gray-300 text-xs sm:text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
          >
            <option value="">All Districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Type toggle */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            ULB Type
          </span>
          <div
            className="grid grid-cols-3 rounded-xl border border-gray-300 overflow-hidden text-xs shadow-sm bg-gray-50 p-0.5"
            role="group"
            aria-label="Filter by ULB type"
          >
            {ULB_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => set({ type: t.value as UlbType | 'all' })}
                className={`px-1.5 py-1.5 font-semibold text-center rounded-lg transition-colors truncate ${
                  filters.type === t.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title={t.label}
              >
                {t.value === 'all'
                  ? 'All'
                  : t.value === 'corporation'
                  ? 'Corps (24)'
                  : 'Munis (145)'}
              </button>
            ))}
          </div>
        </div>

        {/* Date picker */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="date-pick"
            className="text-xs font-bold text-gray-600 uppercase tracking-wider"
          >
            Inspection Date
          </label>
          <input
            id="date-pick"
            type="date"
            value={filters.date}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => set({ date: e.target.value })}
            className="w-full rounded-xl border border-gray-300 text-xs sm:text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Active filter badge & reset */}
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-full">
            <Filter size={12} />
            {activeFilterCount} active filters
          </span>
          <button
            onClick={() =>
              onChange({
                district: '',
                region: undefined,
                type: 'all',
                date: filters.date,
              })
            }
            className="text-xs text-blue-600 hover:text-blue-800 font-bold underline"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
