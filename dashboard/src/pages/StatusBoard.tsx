import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  RefreshCw,
  AlertTriangle,
  MapPin,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Layers,
  X,
  ExternalLink,
} from 'lucide-react';
import { useSubmissions } from '../hooks/useSubmissions';
import { useQuery } from '@tanstack/react-query';
import { getCategories } from '../api/categories';
import { getUlbs } from '../api/ulb';
import { getAnalytics } from '../api/submissions';
import FilterBar from '../components/FilterBar';
import StatusBadge from '../components/StatusBadge';
import AnalyticsCharts from '../components/AnalyticsCharts';
import Layout from '../components/Layout';
import SubmissionDetailModal from '../components/SubmissionDetailModal';
import type {
  FilterState,
  StatusBoardRow,
  SubmissionStatus,
  Category,
  Ulb,
  AnalyticsData,
  DetectedLocation,
} from '../types';

type StatusFilterType =
  | 'all'
  | 'uploaded'
  | 'pending'
  | 'on_time'
  | 'late'
  | 'absent';

const STATUS_LABELS: Record<StatusFilterType, string> = {
  all: 'All ULBs',
  uploaded: 'Uploaded / Submitted',
  pending: 'Pending (Not Uploaded)',
  on_time: 'Uploaded On-Time',
  late: 'Uploaded Late',
  absent: 'Marked Absent',
};

// ── Skeleton row ──────────────────────────────────────────────
function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ── Clickable Summary Card Component ──────────────────────────
interface ClickableSummaryCardProps {
  label: string;
  value: number;
  subtext: string;
  isActive: boolean;
  colorClass: string;
  badgeBg: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function ClickableSummaryCard({
  label,
  value,
  subtext,
  isActive,
  colorClass,
  badgeBg,
  icon,
  onClick,
}: ClickableSummaryCardProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`rounded-2xl p-3 sm:p-4 md:p-5 border transition-all cursor-pointer select-none flex flex-col justify-between ${
        isActive
          ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500 transform -translate-y-0.5'
          : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-sm shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-1 gap-1">
        <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide truncate">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        {isActive ? (
          <span className="text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-sm flex-shrink-0">
            Active
          </span>
        ) : (
          <span
            className={`text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0 ${badgeBg}`}
          >
            View
          </span>
        )}
      </div>
      <p className={`text-2xl sm:text-3xl lg:text-4xl font-black my-0.5 sm:my-1 tracking-tight ${colorClass}`}>
        {value}
      </p>
      <p className="text-[10px] sm:text-[11px] font-medium text-gray-400 truncate">
        {isActive ? '✓ Showing below ↓' : subtext}
      </p>
    </div>
  );
}

const today = new Date().toISOString().split('T')[0];

export default function StatusBoard() {
  const [filters, setFilters] = useState<FilterState>({
    district: '',
    region: undefined,
    type: 'all',
    date: today,
  });

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    ulb: Ulb | null;
    submissions: any[];
    initialCategoryId?: string | null;
  }>({
    isOpen: false,
    ulb: null,
    submissions: [],
    initialCategoryId: null,
  });

  // Sync selectedRegion with filters.region
  const handleSelectRegion = (regionName: string | null) => {
    setSelectedRegion(regionName);
    setFilters((prev) => ({
      ...prev,
      region: regionName ?? undefined,
    }));
  };

  // Toggle status filter from clickable count cards
  const handleStatusFilterToggle = (targetStatus: StatusFilterType) => {
    setStatusFilter((prev) => (prev === targetStatus ? 'all' : targetStatus));
  };

  // ── Data fetching ─────────────────────────────────────────────
  const {
    data: submissions = [],
    isLoading: isSubmissionsLoading,
    isError,
    dataUpdatedAt,
    refetch: refetchSubmissions,
    isFetching,
  } = useSubmissions(filters.date);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories', true],
    queryFn: () => getCategories(true),
    staleTime: 5 * 60_000,
  });

  const { data: ulbs = [], isLoading: isUlbsLoading } = useQuery<Ulb[]>({
    queryKey: ['ulbs'],
    queryFn: () => getUlbs(),
    staleTime: 5 * 60_000,
  });

  const {
    data: analytics,
    refetch: refetchAnalytics,
  } = useQuery<AnalyticsData>({
    queryKey: ['analytics', filters.date],
    queryFn: () => getAnalytics(filters.date),
    refetchInterval: 30_000,
  });

  const handleRefresh = () => {
    void refetchSubmissions();
    void refetchAnalytics();
  };

  // ── Build status-board rows from ALL active ULBs ──────────────
  const allRows = useMemo<StatusBoardRow[]>(() => {
    const subMap = new Map<string, typeof submissions>();
    for (const sub of submissions) {
      const uId = sub?.ulb?.id || (sub?.ulb as any)?.ulb_id || (sub as any)?.ulb_id;
      if (!uId) continue;
      if (!subMap.has(uId)) subMap.set(uId, []);
      subMap.get(uId)!.push(sub);
    }

    return ulbs.map((ulb) => {
      const currentUlbId = ulb.id || (ulb as any).ulb_id;
      const ulbSubs = subMap.get(currentUlbId) || [];
      const categoryStatuses: Record<string, SubmissionStatus> = {};
      let latestSubmissionId: string | null = null;
      let latestSubmittedAt: string | null = null;
      let geoFlagged = false;

      for (const s of ulbSubs) {
        const catId =
          s?.category?.id ||
          (s?.category as any)?.category_id ||
          (s as any)?.category_id;
        if (catId) {
          categoryStatuses[catId] = s.status;
        }
        if (s.geoFlagged || (s as any).geo_flagged) geoFlagged = true;
        const subTime = s.submittedAt || (s as any).submitted_at;
        const subId = s.id || (s as any).submission_id;
        if (!latestSubmittedAt || (subTime && subTime > latestSubmittedAt)) {
          latestSubmittedAt = subTime;
          latestSubmissionId = subId;
        }
      }

      // Compute overall status
      const statuses = Object.values(categoryStatuses);
      let overallStatus: SubmissionStatus = 'pending';
      if (statuses.includes('absent')) {
        overallStatus = 'absent';
      } else if (statuses.includes('late')) {
        overallStatus = 'late';
      } else if (statuses.includes('on_time')) {
        overallStatus = 'on_time';
      }

      // Extract real detected GPS location from inspection photos
      let detectedLocation: DetectedLocation | null = null;
      let totalPhotosCount = 0;

      // Sort submissions chronologically descending to get the freshest inspection location
      const sortedSubs = [...ulbSubs].sort((a, b) => {
        const ta = new Date((a as any).submitted_at || a.submittedAt || 0).getTime();
        const tb = new Date((b as any).submitted_at || b.submittedAt || 0).getTime();
        return tb - ta;
      });

      for (const s of sortedSubs) {
        const photos = s.photos || (s as any).photos || [];
        totalPhotosCount += photos.length;
        if (!detectedLocation && photos.length > 0) {
          for (const p of photos) {
            const lat = Number(p.latitude);
            const lng = Number(p.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
              detectedLocation = {
                latitude: lat,
                longitude: lng,
                capturedAt: (p as any).captured_at || p.capturedAt || (s as any).submitted_at || s.submittedAt,
                geoFlagged: Boolean((p as any).geo_flagged || p.geoFlagged || (s as any).geo_flagged || s.geoFlagged),
                totalPhotos: 0,
              };
              break;
            }
          }
        }
      }
      if (detectedLocation) {
        detectedLocation.totalPhotos = totalPhotosCount;
      }

      return {
        ulb,
        categoryStatuses,
        latestSubmissionId,
        overallStatus,
        submittedAt: latestSubmittedAt,
        geoFlagged,
        submissions: ulbSubs,
        detectedLocation,
      };
    });
  }, [ulbs, submissions]);

  // ── Summary counts for clickable cards ─────────────────────────
  const summaryCounts = useMemo(() => {
    const scopedRows = allRows.filter((row) => {
      if (filters.region && row.ulb.region !== filters.region) return false;
      if (filters.district && row.ulb.district !== filters.district) return false;
      if (filters.type !== 'all' && row.ulb.type !== filters.type) return false;
      return true;
    });

    const total = scopedRows.length;
    const uploaded = scopedRows.filter((r) =>
      ['on_time', 'late'].includes(r.overallStatus),
    ).length;
    const on_time = scopedRows.filter((r) => r.overallStatus === 'on_time').length;
    const late = scopedRows.filter((r) => r.overallStatus === 'late').length;
    const absent = scopedRows.filter((r) => r.overallStatus === 'absent').length;
    const pending = scopedRows.filter((r) => r.overallStatus === 'pending').length;

    return { total, uploaded, on_time, late, absent, pending };
  }, [allRows, filters.region, filters.district, filters.type]);

  // ── Apply filters to rows for live table ───────────────────────
  const filteredRows = useMemo<StatusBoardRow[]>(() => {
    return allRows.filter((row) => {
      // Status filter from clicked card
      if (
        statusFilter === 'uploaded' &&
        !['on_time', 'late'].includes(row.overallStatus)
      ) {
        return false;
      }
      if (statusFilter === 'pending' && row.overallStatus !== 'pending') {
        return false;
      }
      if (statusFilter === 'on_time' && row.overallStatus !== 'on_time') {
        return false;
      }
      if (statusFilter === 'late' && row.overallStatus !== 'late') {
        return false;
      }
      if (statusFilter === 'absent' && row.overallStatus !== 'absent') {
        return false;
      }

      // Region filter
      if (filters.region && row.ulb.region !== filters.region) return false;

      // District filter
      if (filters.district && row.ulb.district !== filters.district) return false;

      // Type filter
      if (filters.type !== 'all' && row.ulb.type !== filters.type) return false;

      return true;
    });
  }, [allRows, statusFilter, filters]);

  // ── TanStack Table columns ────────────────────────────────────
  const columnHelper = createColumnHelper<StatusBoardRow>();

  const columns = useMemo(() => {
    const base = [
      columnHelper.accessor('ulb.name', {
        header: 'ULB Name',
        cell: (info) => (
          <div className="flex items-center gap-1.5 font-medium text-gray-900">
            {info.row.original.ulb.type === 'corporation' ? (
              <Building2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            ) : (
              <MapPin className="w-4 h-4 text-sky-500 flex-shrink-0" />
            )}
            <span>{info.getValue()}</span>
          </div>
        ),
      }),
      columnHelper.accessor('ulb.region', {
        header: 'Region / District',
        cell: (info) => {
          const reg = info.getValue();
          const dist = info.row.original.ulb.district;
          return reg ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
              {reg} Region
            </span>
          ) : (
            <span className="text-xs text-gray-500 font-medium">{dist}</span>
          );
        },
      }),
      columnHelper.accessor('ulb.type', {
        header: 'Type',
        cell: (info) => (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${
              info.getValue() === 'corporation'
                ? 'bg-indigo-50 text-indigo-700'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {info.getValue()}
          </span>
        ),
      }),
    ];

    const catCols = categories.map((cat) =>
      columnHelper.display({
        id: `cat-${cat.id}`,
        header: cat.name,
        cell: ({ row }) => {
          const status: SubmissionStatus =
            (row.original.categoryStatuses[cat.id] as SubmissionStatus) ??
            'pending';
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setModalState({
                  isOpen: true,
                  ulb: row.original.ulb,
                  submissions: row.original.submissions || [],
                  initialCategoryId: cat.id,
                });
              }}
              className="hover:scale-105 active:scale-95 transition-transform p-0.5 rounded focus:outline-none"
              title={`Click to view ${cat.name} inspection details for ${row.original.ulb.name}`}
            >
              <StatusBadge status={status} small />
            </button>
          );
        },
      }),
    );

    const tail = [
      columnHelper.accessor('overallStatus', {
        header: 'Overall Status',
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor('submittedAt', {
        header: 'Submitted At',
        cell: (info) => {
          const v = info.getValue();
          return v ? (
            <span className="text-gray-600 text-xs">
              {format(new Date(v), 'HH:mm:ss')}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">—</span>
          );
        },
      }),
      columnHelper.accessor('detectedLocation', {
        header: 'Detected Geo Location',
        cell: (info) => {
          const loc = info.getValue();
          const row = info.row.original;

          if (!loc) {
            return (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium">
                <MapPin size={12} className="text-gray-300" />
                <span>Pending GPS</span>
              </span>
            );
          }

          const lat = loc.latitude;
          const lng = loc.longitude;
          const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
          const lngStr = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
          const coordsText = `${latStr}, ${lngStr}`;
          const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

          return (
            <div
              className="flex items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setModalState({
                    isOpen: true,
                    ulb: row.ulb,
                    submissions: row.submissions || [],
                    initialCategoryId: null,
                  });
                }}
                className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all hover:scale-105 active:scale-95 shadow-sm whitespace-nowrap ${
                  loc.geoFlagged
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 ring-1 ring-rose-300'
                    : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200'
                }`}
                title={`Click to view inspection GPS map: ${coordsText}`}
              >
                <MapPin
                  size={13}
                  className={loc.geoFlagged ? 'text-rose-600 animate-pulse' : 'text-sky-600'}
                />
                <span>{coordsText}</span>
                {loc.geoFlagged && (
                  <span className="text-[10px] font-bold px-1 rounded bg-rose-200 text-rose-800 ml-0.5">
                    Flagged
                  </span>
                )}
              </button>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Open coordinates in Google Maps"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={13} />
              </a>
            </div>
          );
        },
      }),
    ];

    return [...base, ...catCols, ...tail];
  }, [categories, columnHelper]);

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const lastUpdated = dataUpdatedAt
    ? format(new Date(dataUpdatedAt), 'HH:mm:ss')
    : null;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              DMA Compliance Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Monitoring 24 Corporations & 7 Administrative Regions ({filters.date})
              {lastUpdated && (
                <span className="block sm:inline sm:ml-2 text-gray-400">· Live Updated {lastUpdated}</span>
              )}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs sm:text-sm font-bold px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              size={15}
              className={isFetching ? 'animate-spin text-blue-500' : 'text-gray-500'}
            />
            Refresh Data
          </button>
        </div>

        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          onChange={(newFilters) => {
            setFilters(newFilters);
            setSelectedRegion(newFilters.region ?? null);
          }}
        />

        {/* ─── 1. COUNTS OF STATUS AS BEFORE (INTERACTIVE & CLICKABLE) ─── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider">
              Status Overview · Click any count to view its total list below:
            </span>
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline flex items-center gap-1"
              >
                <X size={12} /> Clear status filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <ClickableSummaryCard
              label="Total ULBs"
              value={summaryCounts.total}
              subtext="Click to view all"
              isActive={statusFilter === 'all'}
              colorClass="text-gray-900"
              badgeBg="bg-gray-100 text-gray-700"
              icon={<Layers className="w-3.5 h-3.5 text-gray-600" />}
              onClick={() => handleStatusFilterToggle('all')}
            />
            <ClickableSummaryCard
              label="Submitted"
              value={summaryCounts.uploaded}
              subtext="Click for uploaded list"
              isActive={statusFilter === 'uploaded'}
              colorClass="text-emerald-600"
              badgeBg="bg-emerald-50 text-emerald-700"
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              onClick={() => handleStatusFilterToggle('uploaded')}
            />
            <ClickableSummaryCard
              label="Pending"
              value={summaryCounts.pending}
              subtext="Click for pending list"
              isActive={statusFilter === 'pending'}
              colorClass="text-rose-600"
              badgeBg="bg-rose-50 text-rose-700"
              icon={<AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
              onClick={() => handleStatusFilterToggle('pending')}
            />
            <ClickableSummaryCard
              label="On-Time"
              value={summaryCounts.on_time}
              subtext="05:00–07:30 AM"
              isActive={statusFilter === 'on_time'}
              colorClass="text-green-700"
              badgeBg="bg-green-50 text-green-700"
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-green-700" />}
              onClick={() => handleStatusFilterToggle('on_time')}
            />
            <ClickableSummaryCard
              label="Late"
              value={summaryCounts.late}
              subtext="After 07:30 AM"
              isActive={statusFilter === 'late'}
              colorClass="text-amber-600"
              badgeBg="bg-amber-50 text-amber-700"
              icon={<Clock className="w-3.5 h-3.5 text-amber-600" />}
              onClick={() => handleStatusFilterToggle('late')}
            />
            <ClickableSummaryCard
              label="Absent"
              value={summaryCounts.absent}
              subtext="Missed deadline"
              isActive={statusFilter === 'absent'}
              colorClass="text-red-600"
              badgeBg="bg-red-50 text-red-700"
              icon={<XCircle className="w-3.5 h-3.5 text-red-600" />}
              onClick={() => handleStatusFilterToggle('absent')}
            />
          </div>
        </div>

        {/* ─── 2. FOLLOWED BY GRAPHICAL REPRESENTATION OF THE STATUS ─── */}
        {analytics && (
          <AnalyticsCharts
            data={analytics}
            selectedRegion={selectedRegion}
            onSelectRegion={handleSelectRegion}
          />
        )}

        {/* Error state */}
        {isError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4">
            <AlertTriangle size={18} />
            <p className="text-sm">Failed to load live submissions. Please check connection.</p>
          </div>
        )}

        {/* ─── 3. TOTAL LIST / TABLE SECTION (SHOWS PENDING OR UPLOADED) ─── */}
        <div className="space-y-3 pt-2">
          {/* Active Status Filter Callout Banner */}
          {statusFilter !== 'all' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50 border-2 border-blue-300 rounded-xl px-4 py-3 text-blue-900 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping inline-block" />
                <span className="font-bold text-sm">
                  Showing Total List of {STATUS_LABELS[statusFilter]} ({filteredRows.length} ULBs)
                </span>
                {filters.region && (
                  <span className="text-xs bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-800">
                    in {filters.region} Region
                  </span>
                )}
              </div>
              <button
                onClick={() => setStatusFilter('all')}
                className="self-start sm:self-auto text-xs font-bold bg-white text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
              >
                ✕ Reset to Show All ULBs ({summaryCounts.total})
              </button>
            </div>
          )}

          {/* ─── DMA FRAMEWORK VIEW TABS ─── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, type: 'all', region: undefined }));
                  setSelectedRegion(null);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  filters.type === 'all' && !filters.region
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                <Layers size={15} />
                <span>All 169 ULBs</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    filters.type === 'all' && !filters.region
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  169
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, type: 'corporation', region: undefined }));
                  setSelectedRegion(null);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  filters.type === 'corporation'
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                <Building2 size={15} />
                <span>24 Corporations</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    filters.type === 'corporation'
                      ? 'bg-white/20 text-white'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  24
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, type: 'municipality' }));
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  filters.type === 'municipality'
                    ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-600/30'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                <MapPin size={15} />
                <span>7 DMA Regions</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    filters.type === 'municipality'
                      ? 'bg-white/20 text-white'
                      : 'bg-sky-100 text-sky-800'
                  }`}
                >
                  145
                </span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span>Click any category badge or row to view photos & GPS pin</span>
            </div>
          </div>

          {/* Regional Chips when in 7 Regions view */}
          {filters.type === 'municipality' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="font-bold text-gray-500 uppercase tracking-wide text-[11px] whitespace-nowrap mr-1">
                Select Region:
              </span>
              <button
                type="button"
                onClick={() => handleSelectRegion(null)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  !filters.region
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                All 7 Regions (145)
              </button>
              {[
                { name: 'Chengalpattu', count: 20 },
                { name: 'Vellore', count: 22 },
                { name: 'Salem', count: 17 },
                { name: 'Thanjavur', count: 21 },
                { name: 'Madurai', count: 19 },
                { name: 'Tiruppur', count: 24 },
                { name: 'Tirunelveli', count: 22 },
              ].map((r) => (
                <button
                  key={r.name}
                  type="button"
                  onClick={() => handleSelectRegion(r.name)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    filters.region === r.name
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {r.name} ({r.count})
                </button>
              ))}
            </div>
          )}

          {/* Detailed Table Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>
                {selectedRegion
                  ? `${selectedRegion} Region Municipalities`
                  : filters.type === 'corporation'
                  ? '24 Statewide Corporations'
                  : filters.type === 'municipality'
                  ? '145 Regional Municipalities'
                  : 'Live Compliance Status Table'}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                {filteredRows.length} ULBs
              </span>
            </h2>
            {selectedRegion && (
              <button
                onClick={() => handleSelectRegion(null)}
                className="text-xs text-sky-600 hover:text-sky-800 font-semibold underline"
              >
                Show all 169 ULBs
              </button>
            )}
          </div>

          {/* Mobile Swipe Hint */}
          <div className="flex md:hidden items-center justify-between text-[11px] text-gray-500 px-1">
            <span className="font-semibold text-blue-700 flex items-center gap-1">
              👈 Swipe horizontally to view categories & GPS location 👉
            </span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto overscroll-x-contain">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="bg-gray-50/90">
                    {hg.headers.map((header, idx) => (
                      <th
                        key={header.id}
                        className={`px-3 sm:px-4 py-3 sm:py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap ${
                          idx === 0
                            ? 'sticky left-0 bg-gray-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]'
                            : ''
                        }`}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isSubmissionsLoading || isUlbsLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <SkeletonRow key={i} cols={columns.length} />
                    ))
                  : table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => {
                          setModalState({
                            isOpen: true,
                            ulb: row.original.ulb,
                            submissions: row.original.submissions || [],
                            initialCategoryId: null,
                          });
                        }}
                        className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${
                          row.original.geoFlagged
                            ? 'border-l-4 border-l-red-400'
                            : ''
                        }`}
                      >
                        {row.getVisibleCells().map((cell, idx) => (
                          <td
                            key={cell.id}
                            className={`px-3 sm:px-4 py-3 sm:py-3.5 whitespace-nowrap ${
                              idx === 0
                                ? 'sticky left-0 bg-white z-10 font-bold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]'
                                : ''
                            }`}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}

                {/* Empty state */}
                {!isSubmissionsLoading &&
                  !isUlbsLoading &&
                  filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="text-center py-12 text-gray-400"
                      >
                        No ULBs found for the selected status/filters.
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Polling indicator */}
        <p className="text-xs text-gray-400 text-right">
          Auto-refreshes every 30 seconds · Data reflects official Tamil Nadu ULB master list
        </p>

        {/* Submission Detail Modal */}
        <SubmissionDetailModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
          ulb={modalState.ulb}
          submissions={modalState.submissions}
          allCategories={categories}
          initialCategoryId={modalState.initialCategoryId}
        />
      </div>
    </Layout>
  );
}
