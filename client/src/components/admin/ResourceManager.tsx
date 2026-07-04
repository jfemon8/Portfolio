import { useState, type ReactNode } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCrud } from '@/hooks/useCrud';
import { Spinner, ErrorState, EmptyState } from '@/components/ui/States';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import type { WithId } from '@/types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import Field, { type FieldSchema, type FormState } from './Field';
import { useConfirm } from './ConfirmModal';
import { getByPath, setByPath } from '@/lib/object';

export interface ResourceConfig<T extends WithId> {
  title: string;
  subtitle?: string;
  singular: string;
  base: string;
  queryKey?: string;
  modalSize?: 'sm' | 'md' | 'lg';
  defaults: Partial<T>;
  fields: FieldSchema[];
  labelOf?: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}

/** Schema-driven CRUD screen reused by every simple resource (rule #3/#8). */
export default function ResourceManager<T extends WithId>({
  config,
}: {
  config: ResourceConfig<T>;
}) {
  const { items, isLoading, isError, refetch, create, update, remove } =
    useCrud<T>(config.base, config.queryKey ?? config.base);
  const confirm = useConfirm();
  const [editing, setEditing] = useState<T | Record<string, never> | null>(
    null
  );
  const [form, setForm] = useState<FormState>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fieldLabelByName = (name: string): string =>
    config.fields.find((field) => field.name === name)?.label ?? name;

  const formatValidationMessage = (name: string, message: string): string => {
    const label = fieldLabelByName(name);

    if (/required/i.test(message)) {
      return `${label} is required.`;
    }

    if (/enum/i.test(message)) {
      return `${label} must be one of the available options.`;
    }

    if (/shorter than the minimum/i.test(message)) {
      return `${label} is too short.`;
    }

    if (/longer than the maximum/i.test(message)) {
      return `${label} is too long.`;
    }

    return message;
  };

  const extractFieldErrors = (
    details: unknown
  ): Record<string, string> | null => {
    if (!Array.isArray(details) || details.length === 0) return null;

    const next: Record<string, string> = {};

    for (const item of details) {
      if (!item) continue;

      if (
        typeof item === 'object' &&
        'field' in item &&
        typeof (item as { field?: unknown }).field === 'string' &&
        'message' in item &&
        typeof (item as { message?: unknown }).message === 'string'
      ) {
        const { field, message } = item as { field: string; message: string };
        next[field] = formatValidationMessage(field, message);
        continue;
      }

      if (typeof item === 'string') {
        const match = item.match(/Path `([^`]+)` is required\.?/i);
        if (match?.[1]) {
          next[match[1]] = `${fieldLabelByName(match[1])} is required.`;
        }
      }
    }

    return Object.keys(next).length ? next : null;
  };

  const openNew = (): void => {
    setForm({ ...(config.defaults as FormState) });
    setEditing({});
    setFieldErrors({});
  };
  const openEdit = (item: T): void => {
    setForm({ ...(config.defaults as FormState), ...item });
    setEditing(item);
    setFieldErrors({});
  };
  const close = (): void => {
    setEditing(null);
    setFieldErrors({});
  };

  const onField = (name: string, value: unknown): void => {
    setForm((f) => setByPath(f, name, value));
    clearFieldError(name);
  };

  const clearFieldError = (name: string): void => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const isEditing = (e: T | Record<string, never> | null): e is T =>
    !!e && '_id' in e;

  const save = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setFieldErrors({});
    let payload: FormState = { ...form };
    for (const field of config.fields) {
      if (field.type !== 'list' && field.type !== 'tags') continue;
      const current = getByPath(payload, field.name);
      if (!Array.isArray(current)) continue;
      // setByPath is immutable — assign its return value or the cleanup is a no-op.
      payload = setByPath(
        payload,
        field.name,
        current
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
      );
    }
    delete payload._id;
    delete payload.__v;
    delete payload.createdAt;
    delete payload.updatedAt;
    if (isEditing(editing)) {
      try {
        await update.mutateAsync({
          id: editing._id,
          body: payload as Partial<T>,
        });
      } catch (err) {
        const next = extractFieldErrors((err as { details?: unknown }).details);
        if (next) {
          setFieldErrors(next);
          toast.error('Please fix the highlighted fields and try again.');
        }
        return;
      }
    } else {
      try {
        await create.mutateAsync(payload as Partial<T>);
      } catch (err) {
        const next = extractFieldErrors((err as { details?: unknown }).details);
        if (next) {
          setFieldErrors(next);
          toast.error('Please fix the highlighted fields and try again.');
        }
        return;
      }
    }
    close();
  };

  const del = async (item: T): Promise<void> => {
    const label = config.labelOf?.(item) ?? 'this item';
    const ok = await confirm({
      title: `Delete ${config.singular}?`,
      message: `"${label}" will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (ok) await remove.mutateAsync(item._id);
  };

  return (
    <div>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Add new
          </Button>
        }
      />

      {isLoading && <Spinner />}
      {isError && <ErrorState onRetry={() => void refetch()} />}
      {!isLoading && !isError && items.length === 0 && (
        <EmptyState message="Nothing here yet — add your first entry." />
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <GlassCard
            key={item._id}
            interactive
            className="flex items-center justify-between gap-4 p-4"
          >
            <div className="min-w-0">{config.renderItem(item)}</div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => openEdit(item)}
                aria-label="Edit"
                className="rounded-lg border border-border/70 p-2.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-neon"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => void del(item)}
                aria-label="Delete"
                className="rounded-lg border border-border/70 p-2.5 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </GlassCard>
        ))}
      </div>

      <Modal
        open={!!editing}
        size={config.modalSize ?? 'md'}
        title={
          isEditing(editing)
            ? `Edit ${config.singular}`
            : `New ${config.singular}`
        }
        onClose={close}
      >
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {config.fields.map((f) => (
              <div key={f.name} className={f.full ? 'sm:col-span-2' : ''}>
                <Field
                  field={f}
                  value={getByPath(form, f.name)}
                  form={form}
                  onChange={onField}
                />
                {fieldErrors[f.name] && (
                  <p className="mt-1 text-xs text-destructive">
                    {fieldErrors[f.name]}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
            <Button type="button" variant="ghost" onClick={close}>
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
      </Modal>
    </div>
  );
}
