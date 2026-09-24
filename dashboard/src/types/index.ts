// ────────────────────────────────────────────────────────────
// MCRS — Shared TypeScript interfaces
// ────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'director' | 'commissioner';

export type UlbType = 'corporation' | 'municipality';

export type SubmissionStatus = 'on_time' | 'late' | 'absent' | 'pending';

// ── Auth ──────────────────────────────────────────────────────
export interface User {
  id: string;
  user_id?: string;
  name: string;
  username: string;
  role: UserRole;
  mobile: string | null;
  ulbId: string | null;
  ulb_id?: string | null;
  ulb: Ulb | null;
  isActive: boolean;
  active?: boolean;
  lastLoginAt: string | null;
  last_login_at?: string | null;
  createdAt: string;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// ── ULB ──────────────────────────────────────────────────────
export interface Ulb {
  id: string;
  ulb_id?: string;
  name: string;
  district: string;
  region: string | null;
  type: UlbType;
  latitude: number | null;
  longitude: number | null;
}

// ── Category ─────────────────────────────────────────────────
export interface Category {
  id: string;
  category_id?: string;
  name: string;
  isActive: boolean;
  active?: boolean;
  sortOrder: number;
  display_order?: number;
  createdAt?: string;
  created_at?: string;
}

// ── Photo ────────────────────────────────────────────────────
export interface Photo {
  id: string;
  signedUrl: string;
  latitude: number | null;
  longitude: number | null;
  capturedAt: string;
  geoFlagged: boolean;
}

// ── Submission ───────────────────────────────────────────────
export interface Submission {
  id: string;
  ulb: Ulb;
  category: Category;
  submittedBy: User;
  status: SubmissionStatus;
  submittedAt: string;
  deviceTimestamp: string;
  geoFlagged: boolean;
  photos: Photo[];
}

export interface DetectedLocation {
  latitude: number;
  longitude: number;
  capturedAt?: string | null;
  geoFlagged: boolean;
  totalPhotos: number;
}

/** Flat row used in StatusBoard — one row per ULB */
export interface StatusBoardRow {
  ulb: Ulb;
  /** keyed by category.id → status for that category */
  categoryStatuses: Record<string, SubmissionStatus>;
  /** id of the latest submission for linking to detail */
  latestSubmissionId: string | null;
  overallStatus: SubmissionStatus;
  submittedAt: string | null;
  geoFlagged: boolean;
  submissions?: any[];
  detectedLocation?: DetectedLocation | null;
}

// ── Analytics & Visualizations ──────────────────────────────
export interface StatusCounts {
  total: number;
  submitted: number;
  on_time: number;
  late: number;
  absent: number;
  pending: number;
  compliance_pct: number;
}

export interface MunicipalityStatus {
  ulb_id: string;
  name: string;
  district: string;
  region: string;
  status: SubmissionStatus;
  has_uploaded: boolean;
  on_time: boolean;
  late: boolean;
  submitted_at: string | null;
  categories_done: number;
  total_categories: number;
}

export interface RegionAnalytics {
  name: string;
  total: number;
  submitted: number;
  on_time: number;
  late: number;
  absent: number;
  pending: number;
  compliance_pct: number;
  municipalities: MunicipalityStatus[];
}

export interface CorporationItem {
  ulb_id: string;
  name: string;
  district: string;
  status: SubmissionStatus;
  has_uploaded: boolean;
  on_time: boolean;
  late: boolean;
  submitted_at: string | null;
  categories_done: number;
  total_categories: number;
}

export interface CorporationAnalytics {
  total: number;
  submitted: number;
  on_time: number;
  late: number;
  absent: number;
  pending: number;
  compliance_pct: number;
  items: CorporationItem[];
}

export interface AnalyticsData {
  date: string;
  overall: StatusCounts;
  corporations: CorporationAnalytics;
  regions: RegionAnalytics[];
}

// ── Report rows ──────────────────────────────────────────────
export interface DailyReportRow {
  ulbName: string;
  district: string;
  type: UlbType;
  categoryName: string;
  status: SubmissionStatus;
  submittedAt: string | null;
  geoFlagged: boolean;
}

export interface MonthlyReportRow {
  ulbName: string;
  district: string;
  type: UlbType;
  totalSubmissions: number;
  onTime: number;
  late: number;
  absent: number;
  complianceRate: number;
}

// ── Filter state ──────────────────────────────────────────────
export interface FilterState {
  district: string;
  region?: string;
  type: UlbType | 'all';
  date: string; // YYYY-MM-DD
}

// ── DTOs ─────────────────────────────────────────────────────
export interface CreateUserDto {
  name: string;
  username: string;
  password: string;
  role: UserRole;
  mobile?: string;
  ulbId?: string;
  ulb_id?: string;
}

export interface UpdateUserDto {
  name?: string;
  mobile?: string;
  isActive?: boolean;
  active?: boolean;
  password?: string;
  ulbId?: string | null;
  ulb_id?: string | null;
  role?: UserRole;
}

export interface CreateCategoryDto {
  name: string;
  sortOrder?: number;
  display_order?: number;
  isActive?: boolean;
  active?: boolean;
}

export interface UpdateCategoryDto {
  name?: string;
  isActive?: boolean;
  active?: boolean;
  sortOrder?: number;
  display_order?: number;
}
