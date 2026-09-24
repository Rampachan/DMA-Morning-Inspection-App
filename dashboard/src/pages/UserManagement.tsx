import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  UserPlus,
  Search,
  Loader2,
  ChevronDown,
  X,
  Key,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { getUsers, createUser, updateUser } from '../api/users';
import { getUlbs } from '../api/ulb';
import Layout from '../components/Layout';
import type { User, CreateUserDto, UpdateUserDto, UserRole, Ulb } from '../types';

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}
function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-base">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Role badge ────────────────────────────────────────────────
const roleBadge: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  director: 'bg-blue-100 text-blue-700 border-blue-200',
  commissioner: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
export default function UserManagement() {
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── Queries ───────────────────────────────────────────────────
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const { data: rawUlbs = [] } = useQuery({
    queryKey: ['ulbs'],
    queryFn: () => getUlbs(),
    staleTime: 5 * 60_000,
  });

  // Normalize ulbs so that each has id, name, district, type
  const ulbs = useMemo<Ulb[]>(() => {
    return (rawUlbs as any[]).map((u) => ({
      ...u,
      id: u.id || u.ulb_id,
      name: u.name,
      district: u.district,
      region: u.region ?? null,
      type: u.type,
      latitude: u.latitude ?? null,
      longitude: u.longitude ?? null,
    }));
  }, [rawUlbs]);

  // ── Mutations ─────────────────────────────────────────────────
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateUser(id, { isActive, active: isActive }),
    onSuccess: (updatedUser) => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      setNotification({
        type: 'success',
        message: `User "${updatedUser.name}" has been ${updatedUser.isActive ? 'activated' : 'deactivated'}.`,
      });
      setTimeout(() => setNotification(null), 4000);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update user status.';
      setNotification({ type: 'error', message: Array.isArray(msg) ? msg.join(', ') : msg });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  // ── Filtered list ─────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        (u.ulb?.name && u.ulb.name.toLowerCase().includes(search.toLowerCase()));
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage accounts, roles, ULB assignments, and credentials.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus size={16} />
            Create User
          </button>
        </div>

        {/* Global Toast Notification */}
        {notification && (
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            ) : (
              <ShieldAlert size={16} className="text-red-600 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-auto text-gray-400 hover:text-gray-700"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="search"
              placeholder="Search by name, username, or ULB…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-medium text-gray-700"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="director">Director</option>
              <option value="commissioner">Commissioner</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/80">
                  {[
                    'Name',
                    'Username',
                    'Role',
                    'ULB / Corporation',
                    'Mobile',
                    'Last Login',
                    'Status',
                    'Actions',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 bg-gray-200 rounded w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const userId = user.id || user.user_id;
                    const isActive = user.isActive !== undefined ? user.isActive : (user.active ?? true);
                    return (
                      <tr key={userId} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                          {user.name}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 font-mono text-xs whitespace-nowrap">
                          {user.username}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize border ${
                              roleBadge[user.role] || 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">
                          {user.ulb?.name ? (
                            <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                              {user.ulb.name}
                              <span className="text-[11px] text-gray-400 capitalize">
                                ({user.ulb.type || 'ULB'})
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 text-xs whitespace-nowrap">
                          {user.mobile || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                          {user.lastLoginAt || user.last_login_at
                            ? format(new Date(user.lastLoginAt || user.last_login_at!), 'dd MMM yyyy HH:mm')
                            : <span className="text-gray-400 italic">Never</span>}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {/* Toggle active switch */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                toggleActiveMutation.mutate({
                                  id: userId!,
                                  isActive: !isActive,
                                })
                              }
                              disabled={toggleActiveMutation.isPending}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                                isActive ? 'bg-emerald-600' : 'bg-gray-300'
                              }`}
                              role="switch"
                              aria-checked={isActive}
                              title={isActive ? 'Click to deactivate' : 'Click to activate'}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform ${
                                  isActive ? 'translate-x-4.5' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                            <span className={`text-xs font-medium ${isActive ? 'text-emerald-700' : 'text-gray-400'}`}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <button
                            onClick={() => setResetPasswordUser(user)}
                            className="inline-flex items-center gap-1.5 text-xs text-gray-700 hover:text-blue-700 bg-white hover:bg-blue-50/50 border border-gray-200 hover:border-blue-300 rounded-lg px-2.5 py-1.5 font-medium transition-colors cursor-pointer"
                          >
                            <Key size={13} className="text-blue-600" />
                            Reset Password
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                      No users found matching current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          ulbs={ulbs}
          onClose={() => setShowCreateModal(false)}
          onCreated={(newUser) => {
            void qc.invalidateQueries({ queryKey: ['users'] });
            setShowCreateModal(false);
            setNotification({
              type: 'success',
              message: `User "${newUser.name}" (@${newUser.username}) created successfully!`,
            });
            setTimeout(() => setNotification(null), 5000);
          }}
        />
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onReset={(updatedUser) => {
            void qc.invalidateQueries({ queryKey: ['users'] });
            setResetPasswordUser(null);
            setNotification({
              type: 'success',
              message: `Password for "${updatedUser.name}" was reset successfully!`,
            });
            setTimeout(() => setNotification(null), 5000);
          }}
        />
      )}
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────
// CreateUserModal
// ─────────────────────────────────────────────────────────────
interface CreateUserModalProps {
  ulbs: Ulb[];
  onClose: () => void;
  onCreated: (user: User) => void;
}

function CreateUserModal({ ulbs, onClose, onCreated }: CreateUserModalProps) {
  const [form, setForm] = useState<CreateUserDto>({
    name: '',
    username: '',
    password: '',
    role: 'commissioner',
    mobile: '',
    ulbId: '',
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (dto: CreateUserDto) => createUser(dto),
    onSuccess: onCreated,
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to create user. Please verify the form and try again.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const set = (patch: Partial<CreateUserDto>) =>
    setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.username.trim() || !form.password) {
      setError('Name, username, and password are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.role === 'commissioner' && (!form.ulbId || form.ulbId.trim() === '')) {
      setError('Please select an Urban Local Body (ULB) for the Commissioner.');
      return;
    }

    const dto: CreateUserDto = {
      name: form.name.trim(),
      username: form.username.trim().toLowerCase(),
      password: form.password,
      role: form.role,
      mobile: form.mobile ? form.mobile.trim() : undefined,
      ulbId: form.role === 'commissioner' ? form.ulbId : undefined,
      ulb_id: form.role === 'commissioner' ? form.ulbId : undefined,
    };
    mutation.mutate(dto);
  };

  return (
    <Modal title="Create New User" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full Name *">
          <input
            type="text"
            required
            placeholder="e.g. S. Ramesh"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Username *">
          <input
            type="text"
            required
            placeholder="e.g. comm_tambaram"
            value={form.username}
            onChange={(e) => set({ username: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Password * (min 6 characters)">
          <input
            type="password"
            required
            minLength={6}
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => set({ password: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Role *">
          <select
            value={form.role}
            onChange={(e) => set({ role: e.target.value as UserRole })}
            className={inputCls}
          >
            <option value="commissioner">Commissioner (ULB In-charge)</option>
            <option value="director">Director (State Monitor)</option>
            <option value="admin">System Administrator</option>
          </select>
        </Field>
        <Field label="Mobile Number">
          <input
            type="tel"
            placeholder="10-digit mobile number"
            value={form.mobile || ''}
            onChange={(e) => set({ mobile: e.target.value })}
            className={inputCls}
          />
        </Field>
        {form.role === 'commissioner' && (
          <Field label="Assigned ULB / Corporation *">
            <select
              value={form.ulbId || ''}
              onChange={(e) => set({ ulbId: e.target.value })}
              required
              className={inputCls}
            >
              <option value="">Select Municipality or Corporation…</option>
              {ulbs.map((u) => {
                const uId = u.id || (u as any).ulb_id;
                return (
                  <option key={uId} value={uId}>
                    {u.name} ({u.type === 'corporation' ? 'Corp' : 'Muni'} - {u.district})
                  </option>
                );
              })}
            </select>
          </Field>
        )}

        {error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
          <button type="button" onClick={onClose} className={cancelBtnCls}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className={submitBtnCls}
          >
            {mutation.isPending && (
              <Loader2 size={14} className="animate-spin mr-1.5" />
            )}
            Create User
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// ResetPasswordModal
// ─────────────────────────────────────────────────────────────
interface ResetPasswordModalProps {
  user: User;
  onClose: () => void;
  onReset: (user: User) => void;
}

function ResetPasswordModal({ user, onClose, onReset }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const userId = user.id || user.user_id;

  const mutation = useMutation({
    mutationFn: (dto: UpdateUserDto) => updateUser(userId!, dto),
    onSuccess: onReset,
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to reset password.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    mutation.mutate({ password: newPassword });
  };

  return (
    <Modal title={`Reset Password — ${user.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
          Updating password for account <span className="font-semibold text-gray-800">@{user.username}</span>.
        </div>
        <Field label="New Password *">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            required
            autoFocus
            placeholder="Minimum 6 characters"
            className={inputCls}
          />
        </Field>
        {error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
          <button type="button" onClick={onClose} className={cancelBtnCls}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className={submitBtnCls}
          >
            {mutation.isPending && (
              <Loader2 size={14} className="animate-spin mr-1.5" />
            )}
            Save New Password
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Shared form helpers ───────────────────────────────────────
const inputCls =
  'w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs';
const cancelBtnCls =
  'px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer';
const submitBtnCls =
  'inline-flex items-center justify-center px-4 py-2 text-sm text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 rounded-xl font-semibold shadow-xs disabled:opacity-60 transition-colors cursor-pointer';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-700">{label}</label>
      {children}
    </div>
  );
}
