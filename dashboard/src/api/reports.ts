import apiClient from './client';

/**
 * Triggers a browser download for the daily compliance report (XLSX).
 * Uses blob response type, creates an Object URL, clicks a hidden <a>.
 *
 * @param date - YYYY-MM-DD
 */
export async function downloadDailyReport(date: string): Promise<void> {
  const response = await apiClient.get('/reports/daily', {
    params: { date },
    responseType: 'blob',
  });

  const blob = new Blob([response.data as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mcrs-daily-${date}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a browser download for the monthly compliance report (XLSX).
 *
 * @param month - YYYY-MM
 */
export async function downloadMonthlyReport(month: string): Promise<void> {
  const response = await apiClient.get('/reports/monthly', {
    params: { month },
    responseType: 'blob',
  });

  const blob = new Blob([response.data as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mcrs-monthly-${month}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
