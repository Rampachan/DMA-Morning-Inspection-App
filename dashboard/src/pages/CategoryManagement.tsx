import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, ChevronUp, ChevronDown, Check, X, Pencil, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  getCategories,
  createCategory,
  updateCategory,
  reorderCategories,
} from '../api/categories';
import Layout from '../components/Layout';
import type { Category, CreateCategoryDto, UpdateCategoryDto } from '../types';

export default function CategoryManagement() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['categories-admin'],
    queryFn: () => getCategories(),
  });

  const sorted = [...categories].sort((a, b) => {
    const oa = a.sortOrder !== undefined ? a.sortOrder : (a.display_order ?? 0);
    const ob = b.sortOrder !== undefined ? b.sortOrder : (b.display_order ?? 0);
    return oa - ob;
  });

  // ── Mutations ─────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (dto: CreateCategoryDto) => createCategory(dto),
    onSuccess: (newCat) => {
      void qc.invalidateQueries({ queryKey: ['categories-admin'] });
      void qc.invalidateQueries({ queryKey: ['categories', true] });
      setNewName('');
      setAddError(null);
      setNotification({
        type: 'success',
        message: `Category "${newCat.name}" added successfully!`,
      });
      setTimeout(() => setNotification(null), 4000);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to create category.';
      setAddError(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCategoryDto }) =>
      updateCategory(id, dto),
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: ['categories-admin'] });
      void qc.invalidateQueries({ queryKey: ['categories', true] });
      setEditId(null);
      setNotification({
        type: 'success',
        message: `Category "${updated.name}" updated successfully.`,
      });
      setTimeout(() => setNotification(null), 4000);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update category.';
      setNotification({ type: 'error', message: Array.isArray(msg) ? msg.join(', ') : msg });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => reorderCategories(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories-admin'] });
      void qc.invalidateQueries({ queryKey: ['categories', true] });
      setNotification({
        type: 'success',
        message: 'Categories order updated.',
      });
      setTimeout(() => setNotification(null), 3000);
    },
  });

  // ── Reorder via up/down buttons ───────────────────────────────
  const moveCategory = (cat: Category, direction: 'up' | 'down') => {
    const catId = cat.id || cat.category_id!;
    const idx = sorted.findIndex((c) => (c.id || c.category_id) === catId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const newOrder = [...sorted];
    const [removed] = newOrder.splice(idx, 1);
    newOrder.splice(swapIdx, 0, removed);

    const ids = newOrder.map((c) => (c.id || c.category_id)!);
    reorderMutation.mutate(ids);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!newName.trim()) {
      setAddError('Category name cannot be empty.');
      return;
    }
    const maxOrder = sorted.length > 0
      ? Math.max(...sorted.map(s => s.sortOrder ?? s.display_order ?? 0)) + 1
      : 1;
    createMutation.mutate({ name: newName.trim(), sortOrder: maxOrder, display_order: maxOrder });
  };

  const startEdit = (cat: Category) => {
    setEditId(cat.id || cat.category_id!);
    setEditName(cat.name);
  };

  const saveEdit = (cat: Category) => {
    if (!editName.trim()) return;
    const catId = cat.id || cat.category_id!;
    updateMutation.mutate({ id: catId, dto: { name: editName.trim() } });
  };

  return (
    <Layout>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Inspection Categories
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage compliance inspection categories, their visibility, and priority order.
          </p>
        </div>

        {/* Global Toast */}
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
              <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
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

        {/* Categories list */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded flex-1" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <p className="text-center py-10 text-gray-400 text-sm">
              No inspection categories defined yet. Add one below.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sorted.map((cat, idx) => {
                const catId = cat.id || cat.category_id!;
                const isActive = cat.isActive !== undefined ? cat.isActive : (cat.active ?? true);
                return (
                  <li
                    key={catId}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveCategory(cat, 'up')}
                        disabled={idx === 0 || reorderMutation.isPending}
                        className="text-gray-400 hover:text-blue-700 disabled:opacity-20 p-0.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                        title="Move up"
                      >
                        <ChevronUp size={15} />
                      </button>
                      <button
                        onClick={() => moveCategory(cat, 'down')}
                        disabled={idx === sorted.length - 1 || reorderMutation.isPending}
                        className="text-gray-400 hover:text-blue-700 disabled:opacity-20 p-0.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                        title="Move down"
                      >
                        <ChevronDown size={15} />
                      </button>
                    </div>

                    {/* Order index badge */}
                    <span className="text-xs font-mono font-medium text-gray-400 w-5 text-center">
                      {idx + 1}
                    </span>

                    {/* Name — inline edit */}
                    <div className="flex-1 min-w-0">
                      {editId === catId ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(cat);
                            if (e.key === 'Escape') setEditId(null);
                          }}
                          autoFocus
                          className="w-full rounded-xl border border-blue-500 px-2.5 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <span
                          className={`text-sm font-medium ${
                            isActive ? 'text-gray-900' : 'text-gray-400 line-through'
                          }`}
                        >
                          {cat.name}
                        </span>
                      )}
                    </div>

                    {/* Edit controls */}
                    {editId === catId ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => saveEdit(cat)}
                          className="text-emerald-600 hover:text-emerald-800 p-1 rounded-md hover:bg-emerald-50 cursor-pointer"
                          title="Save"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 cursor-pointer"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(cat)}
                        className="text-gray-400 hover:text-blue-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        title={`Edit ${cat.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                    )}

                    {/* Active toggle */}
                    <div className="flex items-center gap-2 pl-2">
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            id: catId,
                            dto: { isActive: !isActive, active: !isActive },
                          })
                        }
                        disabled={updateMutation.isPending}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 cursor-pointer ${
                          isActive ? 'bg-emerald-600' : 'bg-gray-300'
                        }`}
                        role="switch"
                        aria-checked={isActive}
                        title={isActive ? 'Deactivate category' : 'Activate category'}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform ${
                            isActive ? 'translate-x-4.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                      <span className={`text-xs font-medium w-14 ${isActive ? 'text-emerald-700' : 'text-gray-400'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Add category form */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-2.5">
            Add New Category
          </h2>
          <form onSubmit={handleAdd} className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Public Park Cleanliness"
              className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-sm font-semibold rounded-xl shadow-xs disabled:opacity-60 transition-colors cursor-pointer"
            >
              {createMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={15} />
              )}
              Add Category
            </button>
          </form>
          {addError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 mt-3">
              {addError}
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}
