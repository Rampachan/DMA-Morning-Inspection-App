import { useState } from 'react';
import {
  Building2,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  X,
  Layers,
} from 'lucide-react';
import type { AnalyticsData } from '../types';

interface AnalyticsChartsProps {
  data: AnalyticsData;
  selectedRegion: string | null;
  onSelectRegion: (regionName: string | null) => void;
}

export default function AnalyticsCharts({
  data,
  selectedRegion,
  onSelectRegion,
}: AnalyticsChartsProps) {
  const { overall, corporations, regions } = data;
  const [muniFilter, setMuniFilter] = useState<'all' | 'uploaded' | 'not_uploaded'>('all');
  const [showCorpList, setShowCorpList] = useState(false);
  const [showAllRegionsDirectory, setShowAllRegionsDirectory] = useState(false);

  // Active selected region data (defaults to first region if none selected when exploring)
  const activeRegionData = regions.find((r) => r.name === selectedRegion);

  // Filtered municipalities for the active region
  const displayedMunicipalities = activeRegionData
    ? activeRegionData.municipalities.filter((m) => {
        if (muniFilter === 'uploaded') return m.has_uploaded;
        if (muniFilter === 'not_uploaded') return !m.has_uploaded;
        return true;
      })
    : [];

  return (
    <div className="space-y-6">
      {/* ─── Graphical Visualizations Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Overall Status Graphical Bar & Gauge */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Statewide Compliance Ratio
              </h3>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                {overall.compliance_pct}% Overall
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Visual proportion of 169 ULBs (24 Corps + 145 Regional Municipalities)
            </p>

            {/* Stacked Progress Bar */}
            <div className="space-y-2.5">
              <div className="h-5 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner p-0.5">
                <div
                  style={{
                    width: `${overall.total > 0 ? (overall.on_time / overall.total) * 100 : 0}%`,
                  }}
                  className="bg-emerald-500 h-full rounded-l-full transition-all duration-500"
                  title={`On-Time: ${overall.on_time}`}
                />
                <div
                  style={{
                    width: `${overall.total > 0 ? (overall.late / overall.total) * 100 : 0}%`,
                  }}
                  className="bg-amber-400 h-full transition-all duration-500"
                  title={`Late: ${overall.late}`}
                />
                <div
                  style={{
                    width: `${overall.total > 0 ? (overall.absent / overall.total) * 100 : 0}%`,
                  }}
                  className="bg-rose-500 h-full transition-all duration-500"
                  title={`Absent: ${overall.absent}`}
                />
                <div
                  style={{
                    width: `${overall.total > 0 ? (overall.pending / overall.total) * 100 : 0}%`,
                  }}
                  className="bg-gray-300 h-full rounded-r-full transition-all duration-500"
                  title={`Pending: ${overall.pending}`}
                />
              </div>

              {/* Graphical Legend */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium pt-1">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span>On-Time: <strong>{overall.on_time}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <span>Late: <strong>{overall.late}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0" />
                  <span>Absent: <strong>{overall.absent}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0" />
                  <span>Pending: <strong>{overall.pending}</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Uploaded: <strong className="text-emerald-700">{overall.submitted}</strong> / {overall.total}</span>
            <span>Pending Upload: <strong className="text-gray-700">{overall.pending}</strong></span>
          </div>
        </div>

        {/* 2. 24 Corporations Graphical Progress & Gauge */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                24 Corporations Status
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Direct State Corporations Monitoring
              </p>
            </div>
            <button
              onClick={() => setShowCorpList(!showCorpList)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors"
            >
              {showCorpList ? 'Hide List' : 'View 24 Corps'}
            </button>
          </div>

          <div className="flex items-center gap-4 my-2">
            {/* Circular Gauge */}
            <div className="relative flex-shrink-0 w-20 h-20 flex items-center justify-center">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-100"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-indigo-600 transition-all duration-700"
                  strokeDasharray={`${corporations.compliance_pct}, 100`}
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-base font-extrabold text-gray-900 leading-none block">
                  {corporations.compliance_pct}%
                </span>
                <span className="text-[9px] text-gray-400 font-semibold uppercase">Rate</span>
              </div>
            </div>

            <div className="flex-1 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Uploaded:</span>
                <span className="font-bold text-emerald-700">{corporations.submitted} / {corporations.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">On-Time Uploads:</span>
                <span className="font-semibold text-emerald-700">{corporations.on_time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Late Uploads:</span>
                <span className="font-semibold text-amber-600">{corporations.late}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pending / Absent:</span>
                <span className="font-semibold text-rose-600">{corporations.pending + corporations.absent}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100 text-center">
            <div className="bg-indigo-50/60 rounded-xl py-1.5 px-2">
              <span className="text-[10px] font-semibold text-indigo-700 uppercase">On-Time</span>
              <p className="text-base font-bold text-indigo-900">{corporations.on_time}</p>
            </div>
            <div className="bg-amber-50/60 rounded-xl py-1.5 px-2">
              <span className="text-[10px] font-semibold text-amber-700 uppercase">Late</span>
              <p className="text-base font-bold text-amber-900">{corporations.late}</p>
            </div>
          </div>
        </div>

        {/* 3. 7 Regions Comparative Horizontal Bars */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-sky-600" />
                7 Regions Compliance
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Comparative performance of all 7 regions
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
              145 Munis
            </span>
          </div>

          {/* Regional Comparative Mini-Bars */}
          <div className="space-y-1.5 my-1">
            {regions.map((reg) => (
              <div
                key={reg.name}
                onClick={() => onSelectRegion(selectedRegion === reg.name ? null : reg.name)}
                className={`cursor-pointer group flex items-center gap-2 px-2 py-1 rounded-lg transition-all ${
                  selectedRegion === reg.name
                    ? 'bg-sky-100 font-semibold'
                    : 'hover:bg-gray-50'
                }`}
                title={`Click to view ${reg.name} municipalities`}
              >
                <span className="text-xs text-gray-700 w-24 truncate">{reg.name}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${reg.compliance_pct}%` }}
                    className={`h-full transition-all duration-300 ${
                      reg.compliance_pct >= 80
                        ? 'bg-emerald-500'
                        : reg.compliance_pct >= 50
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                  />
                </div>
                <span className="text-[11px] font-bold text-gray-600 w-12 text-right">
                  {reg.submitted}/{reg.total}
                </span>
                <span className="text-[11px] font-semibold text-gray-500 w-8 text-right">
                  {reg.compliance_pct}%
                </span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-sky-700 font-medium text-center mt-2">
            Click any region to inspect its municipalities status
          </p>
        </div>
      </div>

      {/* ─── EXPANDED DRAWER: 24 Corporations Detailed List ─── */}
      {showCorpList && (
        <div className="bg-gradient-to-br from-indigo-50/50 to-white rounded-2xl p-6 border border-indigo-100 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-indigo-950 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                All 24 Corporations — Upload Status
              </h4>
              <p className="text-xs text-indigo-700">
                {corporations.submitted} Uploaded, {corporations.total - corporations.submitted} Not Uploaded
              </p>
            </div>
            <button
              onClick={() => setShowCorpList(false)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1">
            {corporations.items.map((c) => (
              <div
                key={c.ulb_id}
                className={`p-3 rounded-xl border transition-all ${
                  c.has_uploaded
                    ? c.on_time
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-amber-50/70 border-amber-200'
                    : 'bg-white border-gray-200 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-bold text-sm text-gray-900">{c.name}</span>
                  {c.has_uploaded ? (
                    c.on_time ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> On-Time
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        <Clock className="w-3 h-3" /> Late
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      Not Uploaded
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>Categories: {c.categories_done}/{c.total_categories}</span>
                  <span>{c.submitted_at ? new Date(c.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 7 Administrative Regions Interactive Cards ─── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand-600" />
              7 Administrative Regions — Municipality Compliance
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Click on any region below to inspect all its municipality names and their upload status
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowAllRegionsDirectory(!showAllRegionsDirectory)}
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-sky-300 text-sky-700 hover:bg-sky-50 transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              {showAllRegionsDirectory ? 'Hide Directory' : 'Browse All 7 Regions Directory'}
            </button>
            {selectedRegion && (
              <button
                onClick={() => onSelectRegion(null)}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear Region ({selectedRegion})
              </button>
            )}
          </div>
        </div>

        {/* 7 Regional Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-2 sm:gap-3">
          {regions.map((reg) => {
            const isSelected = selectedRegion === reg.name;
            const notUploadedCount = reg.total - reg.submitted;

            return (
              <div
                key={reg.name}
                onClick={() => onSelectRegion(isSelected ? null : reg.name)}
                role="button"
                tabIndex={0}
                className={`p-2.5 sm:p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between select-none ${
                  isSelected
                    ? 'bg-sky-50/90 border-sky-500 shadow-md ring-2 ring-sky-400'
                    : 'bg-gray-50/60 hover:bg-sky-50/40 border-gray-200 hover:border-sky-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-gray-900">
                      {reg.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        reg.compliance_pct >= 80
                          ? 'bg-emerald-100 text-emerald-800'
                          : reg.compliance_pct >= 50
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {reg.compliance_pct}%
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 block mb-3">
                    {reg.total} Municipalities
                  </span>
                </div>

                <div>
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div
                      style={{ width: `${reg.compliance_pct}%` }}
                      className={`h-full ${
                        reg.compliance_pct >= 80
                          ? 'bg-emerald-500'
                          : reg.compliance_pct >= 50
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                    />
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span className="text-emerald-700 font-semibold">
                      ✓ {reg.submitted} Up
                    </span>
                    <span className="text-rose-600 font-semibold">
                      ✗ {notUploadedCount} Pend
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── SECTION 3: Click-to-View Municipalities under Selected Region ─── */}
      {selectedRegion && activeRegionData && (
        <div className="bg-gradient-to-br from-sky-50/50 via-white to-blue-50/30 rounded-2xl p-6 border-2 border-sky-300 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-sky-100 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-sky-600 text-white font-bold text-xs">
                  Region Detail
                </span>
                <h4 className="text-xl font-extrabold text-gray-900">
                  {selectedRegion} Region
                </h4>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Showing all {activeRegionData.total} municipalities under {selectedRegion} with individual upload status
              </p>
            </div>

            {/* Filter buttons within region */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Filter:</span>
              <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 text-xs">
                <button
                  onClick={() => setMuniFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    muniFilter === 'all'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  All ({activeRegionData.total})
                </button>
                <button
                  onClick={() => setMuniFilter('uploaded')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    muniFilter === 'uploaded'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Uploaded ({activeRegionData.submitted})
                </button>
                <button
                  onClick={() => setMuniFilter('not_uploaded')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    muniFilter === 'not_uploaded'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Not Uploaded ({activeRegionData.total - activeRegionData.submitted})
                </button>
              </div>
            </div>
          </div>

          {/* Grid of Municipalities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {displayedMunicipalities.map((m) => {
              return (
                <div
                  key={m.ulb_id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    m.has_uploaded
                      ? m.on_time
                        ? 'bg-emerald-50/80 border-emerald-300'
                        : 'bg-amber-50/80 border-amber-300'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-sm text-gray-900">{m.name}</span>
                    {m.has_uploaded ? (
                      m.on_time ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex-shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> Uploaded (On-Time)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex-shrink-0">
                          <Clock className="w-3 h-3" /> Uploaded (Late)
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex-shrink-0">
                        <XCircle className="w-3 h-3 text-rose-500" /> Not Uploaded
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium text-gray-600">
                      Categories: {m.categories_done}/{m.total_categories}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {m.submitted_at
                        ? new Date(m.submitted_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'No submission'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {displayedMunicipalities.length === 0 && (
            <p className="text-center py-6 text-sm text-gray-500">
              No municipalities match the selected filter for {selectedRegion}.
            </p>
          )}
        </div>
      )}

      {/* ─── ALL 7 REGIONS DIRECTORY MODAL / EXPANDER ─── */}
      {showAllRegionsDirectory && (
        <div className="bg-white rounded-2xl p-6 border border-sky-200 shadow-lg space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-sky-600" />
                All 7 Administrative Regions & Municipality Directory (145 Municipalities)
              </h4>
              <p className="text-xs text-gray-500">
                Reference list of all municipalities grouped under their official regions
              </p>
            </div>
            <button
              onClick={() => setShowAllRegionsDirectory(false)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {regions.map((reg) => (
              <div
                key={reg.name}
                className="bg-gray-50/70 rounded-xl p-4 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-sky-600" />
                    <span className="font-bold text-gray-900">{reg.name} Region</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-white rounded-md border border-gray-200 text-gray-700">
                    {reg.municipalities.length} Munis ({reg.submitted} Uploaded)
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 text-xs">
                  {reg.municipalities.map((m) => (
                    <div
                      key={m.ulb_id}
                      className="flex items-center justify-between py-1 px-2 rounded-lg bg-white border border-gray-100"
                    >
                      <span className="font-medium text-gray-800">{m.name}</span>
                      {m.has_uploaded ? (
                        m.on_time ? (
                          <span className="text-[10px] font-bold text-emerald-700">✓ On-Time</span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700">✓ Late</span>
                        )
                      ) : (
                        <span className="text-[10px] font-semibold text-rose-600">Pending</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
