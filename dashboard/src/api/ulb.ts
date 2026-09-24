import apiClient from './client';
import type { Ulb, UlbType } from '../types';

export interface UlbFilters {
  district?: string;
  region?: string;
  type?: UlbType;
}

/**
 * GET /ulb?district=&type=
 * Returns the list of ULBs, optionally filtered.
 */
export async function getUlbs(filters?: UlbFilters): Promise<Ulb[]> {
  const { data } = await apiClient.get<Ulb[]>('/ulb', {
    params: filters,
  });
  return data;
}
