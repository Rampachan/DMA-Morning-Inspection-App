import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ReportsPage from '../pages/ReportsPage';

// ─────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Admin', role: 'admin', username: 'admin' },
    isAdmin: true,
    isDirector: false,
    logout: vi.fn(),
  }),
}));

vi.mock('../api/auth', () => ({
  getToken: () => 'fake-token',
  getStoredUser: () => ({ id: '1', name: 'Admin', role: 'admin' }),
  logout: vi.fn(),
}));

const mockDownloadDaily = vi.fn().mockResolvedValue(undefined);
const mockDownloadMonthly = vi.fn().mockResolvedValue(undefined);

vi.mock('../api/reports', () => ({
  downloadDailyReport: (...args: unknown[]) => mockDownloadDaily(...args),
  downloadMonthlyReport: (...args: unknown[]) => mockDownloadMonthly(...args),
}));

// ─────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────
function renderReportsPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────
describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls downloadDailyReport with the selected date', async () => {
    renderReportsPage();

    // Set the daily date
    const dateInput = screen.getByLabelText(/select date/i);
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, '2024-06-01');

    // Click Download in the Daily section
    const downloadButtons = screen.getAllByRole('button', { name: /download/i });
    // First button = daily
    await userEvent.click(downloadButtons[0]);

    await waitFor(() => {
      expect(mockDownloadDaily).toHaveBeenCalledTimes(1);
      expect(mockDownloadDaily).toHaveBeenCalledWith('2024-06-01');
    });
  });

  it('calls downloadMonthlyReport with the selected month', async () => {
    renderReportsPage();

    // Set the monthly month
    const monthInput = screen.getByLabelText(/select month/i);
    await userEvent.clear(monthInput);
    await userEvent.type(monthInput, '2024-06');

    // Click Download in the Monthly section
    const downloadButtons = screen.getAllByRole('button', { name: /download/i });
    // Second button = monthly
    await userEvent.click(downloadButtons[1]);

    await waitFor(() => {
      expect(mockDownloadMonthly).toHaveBeenCalledTimes(1);
      expect(mockDownloadMonthly).toHaveBeenCalledWith('2024-06');
    });
  });

  it('shows success toast after daily download', async () => {
    renderReportsPage();

    const downloadButtons = screen.getAllByRole('button', { name: /download/i });
    await userEvent.click(downloadButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/downloaded successfully/i)).toBeInTheDocument();
    });
  });

  it('shows error toast when daily download fails', async () => {
    mockDownloadDaily.mockRejectedValueOnce(new Error('Network Error'));
    renderReportsPage();

    const downloadButtons = screen.getAllByRole('button', { name: /download/i });
    await userEvent.click(downloadButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/failed to download daily report/i)).toBeInTheDocument();
    });
  });
});
