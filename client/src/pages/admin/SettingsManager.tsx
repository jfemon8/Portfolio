import { useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { KeyRound, User, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import PageHeader from '@/components/admin/PageHeader';
import type { ApiError, MeResponse } from '@/types';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirm: string;
}

export default function SettingsManager() {
  const { user, setUser } = useAuth();
  const [savingName, setSavingName] = useState(false);
  const [name, setName] = useState(user?.name || '');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>();

  const changePassword = async (v: PasswordForm): Promise<void> => {
    if (v.newPassword !== v.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      await api.patch('/auth/password', {
        currentPassword: v.currentPassword,
        newPassword: v.newPassword,
      });
      toast.success('Password updated');
      reset();
    } catch (err) {
      toast.error((err as ApiError).message || 'Failed to update password');
    }
  };

  const saveName = async (): Promise<void> => {
    setSavingName(true);
    try {
      const { data } = await api.patch<MeResponse>('/auth/profile', { name });
      setUser(data.user);
      toast.success('Account updated');
    } catch (err) {
      toast.error((err as ApiError).message || 'Failed');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your admin account." />

      <div className="grid max-w-3xl gap-6">
        <div className="glass p-6">
          <h3 className="mb-5 flex items-center gap-2 font-semibold text-neon">
            <User className="h-4 w-4" /> Account
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Display name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input opacity-60"
                value={user?.email || ''}
                disabled
              />
            </div>
          </div>
          <button
            onClick={saveName}
            disabled={savingName}
            className="btn-primary mt-4"
          >
            {savingName && <Loader2 className="h-4 w-4 animate-spin" />}
            Save account
          </button>
        </div>

        <form onSubmit={handleSubmit(changePassword)} className="glass p-6">
          <h3 className="mb-5 flex items-center gap-2 font-semibold text-neon">
            <KeyRound className="h-4 w-4" /> Change password
          </h3>
          <div className="grid gap-4">
            <div>
              <label className="label">Current password</label>
              <input
                type="password"
                className="input"
                {...register('currentPassword', { required: 'Required' })}
              />
              {errors.currentPassword && (
                <p className="mt-1 text-xs text-neon-pink">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">New password</label>
                <input
                  type="password"
                  className="input"
                  {...register('newPassword', {
                    required: 'Required',
                    minLength: { value: 8, message: 'Min 8 characters' },
                  })}
                />
                {errors.newPassword && (
                  <p className="mt-1 text-xs text-neon-pink">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>
              <div>
                <label className="label">Confirm new password</label>
                <input
                  type="password"
                  className="input"
                  {...register('confirm', { required: 'Required' })}
                />
                {errors.confirm && (
                  <p className="mt-1 text-xs text-neon-pink">
                    {errors.confirm.message}
                  </p>
                )}
              </div>
            </div>
          </div>
          <button
            disabled={isSubmitting}
            className="btn-primary mt-5"
            type="submit"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
