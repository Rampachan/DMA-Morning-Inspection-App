import apiClient from './client';
import type { Submission, AnalyticsData } from '../types';

/**
 * GET /submissions?date=YYYY-MM-DD
 * Returns all submissions for the given date.
 */
export async function getSubmissions(date: string): Promise<Submission[]> {
  const { data } = await apiClient.get<Submission[]>('/submissions', {
    params: { date },
  });
  return data;
}

/**
 * GET /submissions/analytics?date=YYYY-MM-DD
 * Returns structured analytics for overall, 24 corporations, and 7 regions.
 */
export async function getAnalytics(date: string): Promise<AnalyticsData> {
  const { data } = await apiClient.get<AnalyticsData>('/submissions/analytics', {
    params: { date },
  });
  return data;
}

/**
 * GET /submissions/:id
 * Returns a single submission with full detail + signed photo URLs.
 */
export async function getSubmission(id: string): Promise<Submission> {
  const { data } = await apiClient.get<Submission>(`/submissions/${id}`);
  return data;
}

