import { useState, type ReactNode } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useCrud } from '@/hooks/useCrud';
import { Spinner, ErrorState, EmptyState } from '@/components/ui/States';
import type { WithId } from '@/types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import Field, { type FieldSchema, type FormState } from './Field';

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

/** Schema-driven CRUD screen reused by every simple resource. */
export default function ResourceManager<T extends WithId>({
  config,
}: {
  config: ResourceConfig<T>;
}) {
  const { items, isLoading, isError, refetch, create, update, remove } =
    useCrud<T>(config.base, config.queryKey ?? config.base);
  const [editing, setEditing] = useState<T | Record<string, never> | null>(
    null
  );
  const [form, setForm] = useState<FormState>({});

  const openNew = (): void => {
    setForm({ ...(config.defaults as FormState) });
    setEditing({});
  };
  const openEdit = (item: T): void => {
    setForm({ ...(config.defaults as FormState), ...item });
    setEditing(item);
  };
  const close = (): void => setEditing(null);

  const onField = (name: string, value: unknown): void =>
    setForm((f) => ({ ...f, [name]: value }));

  const isEditing = (
    e: T | Record<string, never> | null
  ): e is T => !!e && '_id' in e;

  const save = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const payload: FormState = { ...form };
    delete payload._id;
    delete payload.__v;
    delete payload.createdAt;
    delete payload.updatedAt;
    if (isEditing(editing)) {
      await update.mutateAsync({
        id: editing._id,
        body: payload as Partial<T>,
      });
    } else {
      await create.mutateAsync(payload as Partial<T>);
    }
    close();
  };

  const del = async (item: T): Promise<void> => {
    if (window.confirm(`Delete "${config.labelOf?.(item) ?? 'this item'}"?`)) {
      await remove.mutateAsync(item._id);
    }
  };

  return (
    <div>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        action={
          <button onClick={openNew} className="btn-primary">
            <Plus className="h-4 w-4" /> Add new
          </button>
        }
      />

      {isLoading && <Spinner />}
      {isError && <ErrorState onRetry={() => void refetch()} />}
      {!isLoading && !isError && items.length === 0 && (
        <EmptyState message="Nothing here yet — add your first entry." />
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item._id}
            className="glass flex items-center justify-between gap-4 p-4"
          >
            <div className="min-w-0">{config.renderItem(item)}</div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => openEdit(item)}
                className="rounded-lg border border-line p-2 text-ink-soft hover:border-neon/40 hover:text-neon"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => void del(item)}
                className="rounded-lg border border-line p-2 text-ink-soft hover:border-neon-pink/40 hover:text-neon-pink"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
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
                  value={form[f.name]}
                  form={form}
                  onChange={onField}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button type="button" onClick={close} className="btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending || update.isPending}
              className="btn-primary"
            >
              {create.isPending || update.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
