import api from './api';
import { PhotoItem, Submission, SubmissionPayload } from '../types';

export interface SubmitOptions {
  categoryId: string;
  /** ISO 8601 – preserved from the moment "Submit" was pressed; never regenerated on retry. */
  deviceTimestamp: string;
  photos: PhotoItem[];
}

/**
 * Upload a single inspection submission as multipart/form-data.
 *
 * Field layout (matching backend contract):
 *   - 'data'   : JSON string { category_id, device_timestamp, photos_meta }
 *   - 'photos' : up to 10 image files
 */
export async function submit(options: SubmitOptions): Promise<void> {
  const { categoryId, deviceTimestamp, photos } = options;

  const payload: SubmissionPayload = {
    category_id: categoryId,
    device_timestamp: deviceTimestamp,
    photos_meta: photos.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      captured_at: p.capturedAt,
    })),
  };

  const form = new FormData();
  form.append('data', JSON.stringify(payload));

  photos.forEach((photo, index) => {
    form.append('photos', {
      uri: photo.uri,
      type: photo.type || 'image/jpeg',
      name: photo.fileName || `photo_${index}.jpg`,
    } as unknown as Blob);
  });

  // Do NOT pass manual 'Content-Type': 'multipart/form-data' — React Native and Axios
  // automatically construct the header with the correct multipart boundary.
  await api.post('/submissions', form);
}

/**
 * Retrieve the authenticated user's submissions.
 * @param date Optional YYYY-MM-DD string. Defaults to today on the server.
 */
export async function getMySubmissions(date?: string): Promise<Submission[]> {
  const params: Record<string, string> = {};
  if (date) {
    params.date = date;
  }
  const response = await api.get<Submission[]>('/submissions/my', { params });
  return response.data;
}
