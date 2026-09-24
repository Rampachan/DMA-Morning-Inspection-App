import type { SubmissionStatus } from '../types';

const statusConfig: Record<
  SubmissionStatus,
  { label: string; className: string }
> = {
  on_time: {
    label: 'On Time',
    className: 'bg-green-100 text-green-800 ring-1 ring-green-300',
  },
  late: {
    label: 'Late',
    className: 'bg-amber-100 text-amber-800 ring-1 ring-amber-300',
  },
  absent: {
    label: 'Absent',
    className: 'bg-red-100 text-red-800 ring-1 ring-red-300',
  },
  pending: {
    label: 'Pending',
    className: 'bg-gray-100 text-gray-600 ring-1 ring-gray-300',
  },
};

interface StatusBadgeProps {
  status: SubmissionStatus;
  /** Optional smaller size variant */
  small?: boolean;
}

export default function StatusBadge({ status, small = false }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pending;
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        small ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs'
      } ${config.className}`}
    >
      {config.label}
    </span>
  );
}
