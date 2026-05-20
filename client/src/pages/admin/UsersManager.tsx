import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, ShieldCheck, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import PageHeader from '@/components/admin/PageHeader';
import Modal from '@/components/admin/Modal';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Spinner, ErrorState, EmptyState } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import type { ApiError, ListResponse, UserDoc } from '@/types';

type AssignableRole = 'admin' | 'visitor';
interface FormState {
  _id?: string;
  name: string;
  email: string;
  password: string;
  role: AssignableRole;
  status: 'active' | 'disabled';
}
const empty: FormState = {
  name: '',
  email: '',
  password: '',
  role: 'admin',
  status: 'active',
};

export default function UsersManager() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [form, setForm] = useState<FormState | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<ListResponse<UserDoc>>('/users')).data,
  });
  const users = data?.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });
  const onErr = (e: unknown) =>
    toast.error((e as ApiError).message || 'Action failed');

  const create = useMutation({
    mutationFn: async (b: FormState) => (await api.post('/users', b)).data,
    onSuccess: () => {
      invalidate();
      toast.success('User created');
      setForm(null);
    },
    onError: onErr,
  });
  const update = useMutation({
    mutationFn: async (b: FormState) =>
      (
        await api.patch(`/users/${b._id}`, {
          name: b.name,
          role: b.role,
          status: b.status,
        })
      ).data,
    onSuccess: () => {
      invalidate();
      toast.success('User updated');
      setForm(null);
    },
    onError: onErr,
  });
  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => {
      invalidate();
      toast.success('User deleted');
    },
    onError: onErr,
  });

  const editing = !!form?._id;
  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!form) return;
    (editing ? update : create).mutate(form);
  };

  const badge = (tone: 'neon' | 'muted' | 'warn') =>
    cn(
      'rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize',
      tone === 'neon' && 'border border-primary/40 bg-primary/10 text-primary',
      tone === 'muted' && 'border border-border/70 text-muted-foreground',
      tone === 'warn' &&
        'border border-destructive/40 bg-destructive/10 text-destructive'
    );

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        subtitle="Super-admin only · manage admin and visitor accounts."
        action={
          <Button onClick={() => setForm({ ...empty })}>
            <Plus className="h-4 w-4" /> Add user
          </Button>
        }
      />

      {isLoading && <Spinner />}
      {isError && <ErrorState onRetry={() => void refetch()} />}
      {!isLoading && users.length === 0 && (
        <EmptyState message="No users yet." />
      )}

      <div className="space-y-3">
        {users.map((u) => {
          const locked = u.isImmutableSuperAdmin;
          const isSelf = me?.id === u._id;
          return (
            <GlassCard
              key={u._id}
              className="flex flex-wrap items-center justify-between gap-4 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-neon">
                  {u.name?.[0]?.toUpperCase() || '?'}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-foreground">
                    {u.name}
                    {locked && (
                      <Lock
                        className="h-3.5 w-3.5 text-muted-foreground/60"
                        aria-label="Protected super admin"
                      />
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground/70">
                    {u.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={badge(u.role === 'visitor' ? 'muted' : 'neon')}
                >
                  {u.role === 'superAdmin' && (
                    <ShieldCheck className="mr-1 inline h-3 w-3" />
                  )}
                  {u.role}
                </span>
                <span
                  className={badge(u.status === 'active' ? 'muted' : 'warn')}
                >
                  {u.status}
                </span>
                <button
                  disabled={locked}
                  onClick={() =>
                    setForm({
                      _id: u._id,
                      name: u.name,
                      email: u.email,
                      password: '',
                      role: u.role === 'visitor' ? 'visitor' : 'admin',
                      status: u.status,
                    })
                  }
                  title={locked ? 'Protected account' : 'Edit'}
                  className="rounded-lg border border-border/70 p-2.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-neon disabled:opacity-40 disabled:hover:border-border/70 disabled:hover:text-muted-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  disabled={locked || isSelf}
                  onClick={() =>
                    window.confirm(`Delete ${u.email}?`) && del.mutate(u._id)
                  }
                  title={
                    locked
                      ? 'Protected account'
                      : isSelf
                        ? 'You cannot delete yourself'
                        : 'Delete'
                  }
                  className="rounded-lg border border-border/70 p-2.5 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-40 disabled:hover:border-border/70 disabled:hover:text-muted-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <Modal
        open={!!form}
        title={editing ? 'Edit user' : 'New user'}
        onClose={() => setForm(null)}
      >
        {form && (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className={cn('input', editing && 'opacity-60')}
                value={form.email}
                disabled={editing}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            {!editing && (
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  minLength={8}
                  required
                />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Role</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      role: e.target.value as AssignableRole,
                    })
                  }
                >
                  <option value="admin">admin</option>
                  <option value="visitor">visitor</option>
                </select>
              </div>
              {editing && (
                <div>
                  <label className="label">Status</label>
                  <select
                    className="input"
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as FormState['status'],
                      })
                    }
                  >
                    <option value="active">active</option>
                    <option value="disabled">disabled</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setForm(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={create.isPending || update.isPending}
              >
                {create.isPending || update.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
