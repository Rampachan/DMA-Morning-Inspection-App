import apiClient from './client';
import type { User, CreateUserDto, UpdateUserDto } from '../types';

export function normalizeUser(u: any): User {
  if (!u) return u;
  return {
    ...u,
    id: u.id || u.user_id,
    user_id: u.user_id || u.id,
    name: u.name || '',
    username: u.username || '',
    role: u.role || 'commissioner',
    mobile: u.mobile || '',
    isActive: u.isActive !== undefined ? u.isActive : (u.active !== undefined ? u.active : true),
    active: u.active !== undefined ? u.active : (u.isActive !== undefined ? u.isActive : true),
    ulbId: u.ulbId || u.ulb_id || (u.ulb ? (u.ulb.id || u.ulb.ulb_id) : null),
    ulb_id: u.ulb_id || u.ulbId || (u.ulb ? (u.ulb.ulb_id || u.ulb.id) : null),
    lastLoginAt: u.lastLoginAt || u.last_login_at || null,
    last_login_at: u.last_login_at || u.lastLoginAt || null,
    createdAt: u.createdAt || u.created_at || '',
    created_at: u.created_at || u.createdAt || '',
    ulb: u.ulb ? {
      ...u.ulb,
      id: u.ulb.id || u.ulb.ulb_id,
      ulb_id: u.ulb.ulb_id || u.ulb.id,
    } : null,
  };
}

/**
 * GET /users — Admin only
 */
export async function getUsers(): Promise<User[]> {
  const { data } = await apiClient.get<any[]>('/users');
  return Array.isArray(data) ? data.map(normalizeUser) : [];
}

/**
 * POST /users — Admin only
 */
export async function createUser(dto: CreateUserDto): Promise<User> {
  const payload = {
    name: dto.name.trim(),
    username: dto.username.trim(),
    password: dto.password,
    role: dto.role,
    mobile: dto.mobile ? dto.mobile.trim() : undefined,
    ulb_id: dto.ulb_id || dto.ulbId,
    ulbId: dto.ulbId || dto.ulb_id,
  };
  const { data } = await apiClient.post<any>('/users', payload);
  return normalizeUser(data);
}

/**
 * PATCH /users/:id — Admin only
 */
export async function updateUser(id: string, dto: UpdateUserDto): Promise<User> {
  const payload: any = {};
  if (dto.name !== undefined) payload.name = dto.name.trim();
  if (dto.username !== undefined) payload.username = dto.username.trim().toLowerCase();
  if (dto.mobile !== undefined) payload.mobile = dto.mobile.trim();
  if (dto.role !== undefined) payload.role = dto.role;

  if (dto.isActive !== undefined) {
    payload.active = dto.isActive;
    payload.isActive = dto.isActive;
  } else if (dto.active !== undefined) {
    payload.active = dto.active;
    payload.isActive = dto.active;
  }

  if (dto.ulbId !== undefined || dto.ulb_id !== undefined) {
    const uId = dto.ulb_id || dto.ulbId;
    payload.ulb_id = uId;
    payload.ulbId = uId;
  }

  if (dto.password !== undefined && dto.password.trim().length > 0) {
    payload.password = dto.password;
  }

  const { data } = await apiClient.patch<any>(`/users/${id}`, payload);
  return normalizeUser(data);
}
