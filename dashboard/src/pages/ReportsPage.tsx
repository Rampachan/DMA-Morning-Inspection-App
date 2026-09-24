import { useState } from 'react';
import { format } from 'date-fns';
import {
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Building2,
  MapPin,
} from 'lucide-react';
import { downloadDailyReport, downloadMonthlyReport } from '../api/reports';
import Layout from '../components/Layout';

type ToastState = { type: 'success' | 'error'; message: string } | null;

const today = new Date().toISOString().split('T')[0];
const thisMonth = format(new Date(), 'yyyy-MM');

export default function ReportsPage() {
  // ── Daily state ───────────────────────────────────────────────
  const [dailyDate, setDailyDate] = useState(today);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyToast, setDailyToast] = useState<ToastState>(null);

  // ── Monthly state ─────────────────────────────────────────────
  const [monthlyMonth, setMonthlyMonth] = useState(thisMonth);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyToast, setMonthlyToast] = useState<ToastState>(null);

  const showToast = (
    setFn: React.Dispatch<React.SetStateAction<ToastState>>,
    toast: ToastState,
  ) => {
    setFn(toast);
    setTimeout(() => setFn(null), 5000);
  };

  const handleDailyDownload = async () => {
    setDailyLoading(true);
    setDailyToast(null);
    try {
      await downloadDailyReport(dailyDate);
      showToast(setDailyToast, {
        type: 'success',
        message: `Daily report for ${dailyDate} downloaded successfully.`,
      });
    } catch {
      showToast(setDailyToast, {
        type: 'error',
        message: 'Failed to download daily report. Please try again.',
      });
    } finally {
      setDailyLoading(false);
    }
  };

  const handleMonthlyDownload = async () => {
    setMonthlyLoading(true);
    setMonthlyToast(null);
    try {
      await downloadMonthlyReport(monthlyMonth);
      showToast(setMonthlyToast, {
        type: 'success',
        message: `Monthly report for ${monthlyMonth} downloaded successfully.`,
      });
    } catch {
      showToast(setMonthlyToast, {
        type: 'error',
        message: 'Failed to download monthly report. Please try again.',
      });
    } finally {
      setMonthlyLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Compliance Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate and download multi-sheet Excel (.xlsx) reports covering 24 Corporations and 7 Regions with municipality upload statuses.
          </p>
        </div>

        {/* Report Structure Info Card */}
        <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl p-5 border border-blue-100 shadow-sm">
          <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-700" />
            Hierarchical Multi-Sheet Excel Structure
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-blue-800">
            <div className="bg-white/80 rounded-xl p-3 border border-blue-100/60">
              <div className="flex items-center gap-1.5 font-bold text-blue-950 mb-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Sheet 1: Executive Summary
              </div>
              <p className="text-[11px] text-gray-600">
                Statewide KPI totals + 24 Corporations summary + 7 Regions comparative breakdown table.
              </p>
            </div>
            <div className="bg-white/80 rounded-xl p-3 border border-blue-100/60">
              <div className="flex items-center gap-1.5 font-bold text-indigo-950 mb-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                Sheet 2: 24 Corporations
              </div>
              <p className="text-[11px] text-gray-600">
                All 24 Corporations with category status, submission timestamps, and compliance rates.
              </p>
            </div>
            <div className="bg-white/80 rounded-xl p-3 border border-blue-100/60">
              <div className="flex items-center gap-1.5 font-bold text-sky-950 mb-1">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                Sheet 3: Regional Munis
              </div>
              <p className="text-[11px] text-gray-600">
                Municipalities listed under each of the 7 regions with explicit &quot;Uploaded&quot; vs &quot;Not Uploaded&quot; status.
              </p>
            </div>
          </div>
        </div>

        {/* Daily Report */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Daily Compliance Report</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Exports complete multi-sheet workbook for a specific calendar date.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="daily-date"
                className="text-xs font-semibold text-gray-700 uppercase tracking-wide"
              >
                Select Inspection Date
              </label>
              <input
                id="daily-date"
                type="date"
                value={dailyDate}
                max={today}
                onChange={(e) => setDailyDate(e.target.value)}
                className="rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <button
              onClick={() => void handleDailyDownload()}
              disabled={dailyLoading || !dailyDate}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              {dailyLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {dailyLoading ? 'Generating XLSX…' : 'Download Daily XLSX'}
            </button>
          </div>
          {dailyToast && <Toast toast={dailyToast} />}
        </div>

        {/* Monthly Report */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Monthly Compliance Report</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Aggregated monthly compliance statistics and trends across 24 Corporations and 7 Regions.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="monthly-month"
                className="text-xs font-semibold text-gray-700 uppercase tracking-wide"
              >
                Select Month
              </label>
              <input
                id="monthly-month"
                type="month"
                value={monthlyMonth}
                max={thisMonth}
                onChange={(e) => setMonthlyMonth(e.target.value)}
                className="rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <button
              onClick={() => void handleMonthlyDownload()}
              disabled={monthlyLoading || !monthlyMonth}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              {monthlyLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {monthlyLoading ? 'Generating XLSX…' : 'Download Monthly XLSX'}
            </button>
          </div>
          {monthlyToast && <Toast toast={monthlyToast} />}
        </div>
      </div>
    </Layout>
  );
}

// ── Inline Toast ──────────────────────────────────────────────
function Toast({ toast }: { toast: NonNullable<ToastState> }) {
  return (
    <div
      role="status"
      className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium ${
        toast.type === 'success'
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          : 'bg-rose-50 text-rose-800 border border-rose-200'
      }`}
    >
      {toast.type === 'success' ? (
        <CheckCircle size={16} className="flex-shrink-0 text-emerald-600" />
      ) : (
        <AlertCircle size={16} className="flex-shrink-0 text-rose-600" />
      )}
      {toast.message}
    </div>
  );
}
