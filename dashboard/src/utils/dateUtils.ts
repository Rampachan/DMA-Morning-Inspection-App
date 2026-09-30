import { format, parseISO } from 'date-fns';

/**
 * Formats a Date object or ISO string into DD-MM-YYYY format (e.g. 30-08-2026).
 */
export function formatDateDDMMYYYY(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  try {
    if (typeof dateInput === 'string') {
      if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = dateInput.split('-');
        return `${d}-${m}-${y}`;
      }
      const parsed = parseISO(dateInput);
      if (!isNaN(parsed.getTime())) {
        return format(parsed, 'dd-MM-yyyy');
      }
      const dObj = new Date(dateInput);
      if (!isNaN(dObj.getTime())) {
        return format(dObj, 'dd-MM-yyyy');
      }
      return dateInput;
    }
    return format(dateInput, 'dd-MM-yyyy');
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats a Date object or ISO string into DD-MM-YYYY, hh:mm a format (e.g. 30-08-2026, 07:30 AM).
 */
export function formatDateTimeDDMMYYYY(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    if (isNaN(d.getTime())) {
      const dObj = new Date(dateInput);
      return isNaN(dObj.getTime()) ? String(dateInput) : format(dObj, 'dd-MM-yyyy, hh:mm a');
    }
    return format(d, 'dd-MM-yyyy, hh:mm a');
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats a Date object or ISO string into DD-MM-YYYY HH:mm:ss format (e.g. 30-08-2026 07:30:00).
 */
export function formatDateTimeFull(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    if (isNaN(d.getTime())) {
      const dObj = new Date(dateInput);
      return isNaN(dObj.getTime()) ? String(dateInput) : format(dObj, 'dd-MM-yyyy HH:mm:ss');
    }
    return format(d, 'dd-MM-yyyy HH:mm:ss');
  } catch {
    return String(dateInput);
  }
}
