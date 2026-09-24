import apiClient from './client';
import type { Category, CreateCategoryDto, UpdateCategoryDto } from '../types';

export function normalizeCategory(c: any): Category {
  if (!c) return c;
  return {
    ...c,
    id: c.id || c.category_id,
    category_id: c.category_id || c.id,
    name: c.name || '',
    isActive: c.isActive !== undefined ? c.isActive : (c.active !== undefined ? c.active : true),
    active: c.active !== undefined ? c.active : (c.isActive !== undefined ? c.isActive : true),
    sortOrder: c.sortOrder !== undefined ? c.sortOrder : (c.display_order !== undefined ? c.display_order : 0),
    display_order: c.display_order !== undefined ? c.display_order : (c.sortOrder !== undefined ? c.sortOrder : 0),
    createdAt: c.createdAt || c.created_at || '',
    created_at: c.created_at || c.createdAt || '',
  };
}

/**
 * GET /inspection-categories?activeOnly=true|false
 */
export async function getCategories(activeOnly?: boolean): Promise<Category[]> {
  const { data } = await apiClient.get<any[]>('/inspection-categories', {
    params: activeOnly !== undefined ? { activeOnly } : undefined,
  });
  return Array.isArray(data) ? data.map(normalizeCategory) : [];
}

/**
 * POST /inspection-categories
 */
export async function createCategory(dto: CreateCategoryDto): Promise<Category> {
  const order = dto.sortOrder !== undefined ? dto.sortOrder : (dto.display_order ?? 0);
  const active = dto.isActive !== undefined ? dto.isActive : (dto.active ?? true);
  const payload = {
    name: dto.name.trim(),
    sortOrder: order,
    display_order: order,
    active,
    isActive: active,
  };
  const { data } = await apiClient.post<any>('/inspection-categories', payload);
  return normalizeCategory(data);
}

/**
 * PATCH /inspection-categories/:id
 */
export async function updateCategory(
  id: string,
  dto: UpdateCategoryDto,
): Promise<Category> {
  const payload: any = {};
  if (dto.name !== undefined) payload.name = dto.name.trim();

  if (dto.isActive !== undefined) {
    payload.active = dto.isActive;
    payload.isActive = dto.isActive;
  } else if (dto.active !== undefined) {
    payload.active = dto.active;
    payload.isActive = dto.active;
  }

  if (dto.sortOrder !== undefined) {
    payload.display_order = dto.sortOrder;
    payload.sortOrder = dto.sortOrder;
  } else if (dto.display_order !== undefined) {
    payload.display_order = dto.display_order;
    payload.sortOrder = dto.display_order;
  }

  const { data } = await apiClient.patch<any>(`/inspection-categories/${id}`, payload);
  return normalizeCategory(data);
}

/**
 * POST /inspection-categories/reorder
 */
export async function reorderCategories(ids: string[]): Promise<void> {
  await apiClient.post('/inspection-categories/reorder', { ids });
}
