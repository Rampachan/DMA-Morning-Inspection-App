// ─── Domain types ────────────────────────────────────────────────────────────

/** An inspection category returned from the backend. */
export interface Category {
  category_id: string;
  name: string;
  display_order: number;
}

/** Geo-tag metadata for a single captured photo. */
export interface PhotoMeta {
  latitude: number;
  longitude: number;
  captured_at: string; // ISO 8601 UTC
}

/**
 * In-memory representation of a photo ready to be attached to a submission.
 * Keeps both the file URI and the geo-tag captured at the moment of capture.
 */
export interface PhotoItem {
  uri: string;
  type: string;
  fileName: string;
  latitude: number;
  longitude: number;
  /** ISO 8601 UTC – captured at the exact moment the photo was taken/selected. */
  capturedAt: string;
  source: 'camera' | 'gallery';
}

/** Authenticated user stored in secure keychain. */
export interface User {
  user_id: string;
  name: string;
  role: string;
  ulb_id: string;
  ulb_name?: string;
}

/** Payload for a single submission as sent to the API. */
export interface SubmissionPayload {
  category_id: string;
  device_timestamp: string; // ISO 8601
  photos_meta: PhotoMeta[];
}

/** A submission record returned by GET /submissions/my. */
export interface Submission {
  submission_id: string;
  category_id: string;
  category_name?: string;
  device_timestamp: string;
  server_timestamp: string;
  status: 'on_time' | 'late';
  photos: Array<{ photo_url: string } & PhotoMeta>;
}

// ─── Offline queue ────────────────────────────────────────────────────────────

export interface QueuedSubmission {
  id: number;
  payload: string; // JSON-encoded QueuedSubmissionPayload
  created_at: string;
  retry_count: number;
}

export interface QueuedSubmissionPayload {
  categoryId: string;
  /** Original device_timestamp – must NOT change on retry. */
  deviceTimestamp: string;
  photos: PhotoItem[];
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  Inspection: undefined;
  History: undefined;
};
