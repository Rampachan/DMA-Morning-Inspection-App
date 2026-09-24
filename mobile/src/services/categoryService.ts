import api from './api';
import { Category } from '../types';

/**
 * Fetch all active inspection categories, sorted by display_order.
 */
export async function getCategories(): Promise<Category[]> {
  const response = await api.get<Category[]>('/inspection-categories', {
    params: { activeOnly: true },
  });
  return response.data.sort((a, b) => a.display_order - b.display_order);
}
