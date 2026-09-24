import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import StatusBoard from '../pages/StatusBoard';
import type { Submission, Category } from '../types';

// ─────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────

// Mock useAuth so the layout renders without localStorage
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Admin', role: 'admin', username: 'admin' },
    isAdmin: true,
    isDirector: false,
    logout: vi.fn(),
  }),
}));

// Mock getToken/getStoredUser so ProtectedRoute passes
vi.mock('../api/auth', () => ({
  getToken: () => 'fake-token',
  getStoredUser: () => ({ id: '1', name: 'Admin', role: 'admin' }),
  logout: vi.fn(),
}));

const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Sanitation', isActive: true, sortOrder: 1, createdAt: '' },
  { id: 'cat-2', name: 'Roads', isActive: true, sortOrder: 2, createdAt: '' },
];

const mockSubmissions: Submission[] = [
  {
    id: 'sub-1',
    ulb: { id: 'ulb-1', name: 'Chennai Corp', district: 'Chennai', type: 'corporation', latitude: null, longitude: null },
    category: mockCategories[0],
    submittedBy: { id: 'u1', name: 'Commissioner A', username: 'ca', role: 'commissioner', mobile: '', ulbId: 'ulb-1', ulb: null, isActive: true, lastLoginAt: null, createdAt: '' },
    status: 'on_time',
    submittedAt: new Date().toISOString(),
    deviceTimestamp: new Date().toISOString(),
    geoFlagged: false,
    photos: [],
  },
  {
    id: 'sub-2',
    ulb: { id: 'ulb-2', name: 'Coimbatore Corp', district: 'Coimbatore', type: 'corporation', latitude: null, longitude: null },
    category: mockCategories[0],
    submittedBy: { id: 'u2', name: 'Commissioner B', username: 'cb', role: 'commissioner', mobile: '', ulbId: 'ulb-2', ulb: null, isActive: true, lastLoginAt: null, createdAt: '' },
    status: 'late',
    submittedAt: new Date().toISOString(),
    deviceTimestamp: new Date().toISOString(),
    geoFlagged: false,
    photos: [],
  },
  {
    id: 'sub-3',
    ulb: { id: 'ulb-3', name: 'Madurai Municipality', district: 'Madurai', type: 'municipality', latitude: null, longitude: null },
    category: mockCategories[1],
    submittedBy: { id: 'u3', name: 'Commissioner C', username: 'cc', role: 'commissioner', mobile: '', ulbId: 'ulb-3', ulb: null, isActive: true, lastLoginAt: null, createdAt: '' },
    status: 'absent',
    submittedAt: new Date().toISOString(),
    deviceTimestamp: new Date().toISOString(),
    geoFlagged: false,
    photos: [],
  },
];

vi.mock('../api/submissions', () => ({
  getSubmissions: vi.fn().mockResolvedValue(mockSubmissions),
  getAnalytics: vi.fn().mockResolvedValue({
    date: '2026-09-09',
    overall: { total: 3, submitted: 2, on_time: 1, late: 1, absent: 1, pending: 0, compliance_pct: 67 },
    corporations: { total: 2, submitted: 2, on_time: 1, late: 1, absent: 0, pending: 0, compliance_pct: 100, items: [] },
    regions: [
      { name: 'Chengalpattu', total: 0, submitted: 0, on_time: 0, late: 0, absent: 0, pending: 0, compliance_pct: 0, municipalities: [] },
      { name: 'Vellore', total: 0, submitted: 0, on_time: 0, late: 0, absent: 0, pending: 0, compliance_pct: 0, municipalities: [] },
      { name: 'Salem', total: 0, submitted: 0, on_time: 0, late: 0, absent: 0, pending: 0, compliance_pct: 0, municipalities: [] },
      { name: 'Thanjavur', total: 0, submitted: 0, on_time: 0, late: 0, absent: 0, pending: 0, compliance_pct: 0, municipalities: [] },
      { name: 'Madurai', total: 1, submitted: 0, on_time: 0, late: 0, absent: 1, pending: 0, compliance_pct: 0, municipalities: [] },
      { name: 'Tiruppur', total: 0, submitted: 0, on_time: 0, late: 0, absent: 0, pending: 0, compliance_pct: 0, municipalities: [] },
      { name: 'Tirunelveli', total: 0, submitted: 0, on_time: 0, late: 0, absent: 0, pending: 0, compliance_pct: 0, municipalities: [] },
    ],
  }),
}));

vi.mock('../api/categories', () => ({
  getCategories: vi.fn().mockResolvedValue(mockCategories),
}));

vi.mock('../api/ulb', () => ({
  getUlbs: vi.fn().mockResolvedValue([
    { id: 'ulb-1', name: 'Chennai Corp', district: 'Chennai', type: 'corporation' },
    { id: 'ulb-2', name: 'Coimbatore Corp', district: 'Coimbatore', type: 'corporation' },
    { id: 'ulb-3', name: 'Madurai Municipality', district: 'Madurai', type: 'municipality' },
  ]),
}));

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function renderStatusBoard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <StatusBoard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────
describe('StatusBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all rows when no filter is applied', async () => {
    renderStatusBoard();
    await waitFor(() => {
      expect(screen.getByText('Chennai Corp')).toBeInTheDocument();
      expect(screen.getByText('Coimbatore Corp')).toBeInTheDocument();
      expect(screen.getByText('Madurai Municipality')).toBeInTheDocument();
    });
  });

  it('filters rows by district', async () => {
    renderStatusBoard();

    // Wait for rows to appear
    await waitFor(() =>
      expect(screen.getByText('Chennai Corp')).toBeInTheDocument(),
    );

    // Change district filter to "Chennai"
    const districtSelect = screen.getByLabelText(/district/i);
    await userEvent.selectOptions(districtSelect, 'Chennai');

    await waitFor(() => {
      expect(screen.getByText('Chennai Corp')).toBeInTheDocument();
      expect(screen.queryByText('Coimbatore Corp')).not.toBeInTheDocument();
      expect(screen.queryByText('Madurai Municipality')).not.toBeInTheDocument();
    });
  });

  it('filters to show only corporations', async () => {
    renderStatusBoard();

    await waitFor(() =>
      expect(screen.getByText('Madurai Municipality')).toBeInTheDocument(),
    );

    // Click "Corporation" type button
    const corpButton = screen.getByRole('button', { name: /corporation/i });
    await userEvent.click(corpButton);

    await waitFor(() => {
      expect(screen.getByText('Chennai Corp')).toBeInTheDocument();
      expect(screen.getByText('Coimbatore Corp')).toBeInTheDocument();
      expect(screen.queryByText('Madurai Municipality')).not.toBeInTheDocument();
    });
  });

  it('renders correct status badges for on_time, late, absent', async () => {
    renderStatusBoard();

    await waitFor(() => {
      // on_time → "On Time"
      expect(screen.getAllByText('On Time').length).toBeGreaterThan(0);
      // late → "Late"
      expect(screen.getAllByText('Late').length).toBeGreaterThan(0);
      // absent → "Absent"
      expect(screen.getAllByText('Absent').length).toBeGreaterThan(0);
    });
  });

  it('filters total list when a status count card is clicked', async () => {
    renderStatusBoard();

    await waitFor(() =>
      expect(screen.getByText('Chennai Corp')).toBeInTheDocument(),
    );

    // Click on "Absent" summary card
    const absentCard = screen.getByText(/^absent$/i);
    await userEvent.click(absentCard);

    await waitFor(() => {
      // Madurai Municipality was mockSubmissions status 'absent'
      expect(screen.getByText('Madurai Municipality')).toBeInTheDocument();
      // Chennai Corp was on_time and Coimbatore was late, so should be filtered out
      expect(screen.queryByText('Chennai Corp')).not.toBeInTheDocument();
      expect(screen.queryByText('Coimbatore Corp')).not.toBeInTheDocument();
    });
  });
});

