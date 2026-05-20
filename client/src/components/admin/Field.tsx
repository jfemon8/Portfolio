import { Plus, Trash2 } from 'lucide-react';
import ImageUpload from './ImageUpload';
import Toggle from '@/components/ui/Toggle';

export type FieldType =
  | 'text'
  | 'url'
  | 'email'
  | 'number'
  | 'textarea'
  | 'select'
  | 'switch'
  | 'list'
  | 'tags'
  | 'pairs'
  | 'gallery'
  | 'image';

export interface FieldSchema {
  name: string;
  label: string;
  type?: FieldType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
  rows?: number;
  full?: boolean;
  publicIdKey?: string;
  folder?: string;
  /** column placeholders for the `pairs` (label/value list) type */
  itemLabels?: [string, string];
}

export type FormState = Record<string, unknown>;

interface FieldProps {
  field: FieldSchema;
  value: unknown;
  form: FormState;
  onChange: (name: string, value: unknown) => void;
}

/** Renders a single form control based on a field schema. */
export default function Field({ field, value, form, onChange }: FieldProps) {
  const {
    name,
    label,
    type = 'text',
    options,
    placeholder,
    help,
    rows,
  } = field;

  const set = (v: unknown) => onChange(name, v);

  if (type === 'image') {
    return (
      <ImageUpload
        label={label}
        value={typeof value === 'string' ? value : ''}
        publicId={
          field.publicIdKey
            ? (form[field.publicIdKey] as string | undefined)
            : undefined
        }
        folder={field.folder}
        onChange={({ url, publicId }) => {
          set(url);
          if (field.publicIdKey) onChange(field.publicIdKey, publicId);
        }}
      />
    );
  }

  if (type === 'switch') {
    return (
      <div>
        <label className="label">{label}</label>
        <Toggle checked={Boolean(value)} onChange={set} />
      </div>
    );
  }

  const asArray = Array.isArray(value) ? (value as string[]) : [];
  const pairList = Array.isArray(value)
    ? (value as { label: string; value: string }[])
    : [];
  const galleryList = Array.isArray(value)
    ? (value as { url: string; publicId: string; caption: string }[])
    : [];

  return (
    <div>
      <label className="label">{label}</label>

      {type === 'textarea' && (
        <textarea
          rows={rows || 4}
          className="input resize-y"
          placeholder={placeholder}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => set(e.target.value)}
        />
      )}

      {type === 'select' && (
        <select
          className="input"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => set(e.target.value)}
        >
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {type === 'number' && (
        <input
          type="number"
          className="input"
          placeholder={placeholder}
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => set(Number(e.target.value))}
        />
      )}

      {type === 'list' && (
        <textarea
          rows={rows || 3}
          className="input resize-y font-mono text-xs"
          placeholder={placeholder || 'One item per line'}
          value={asArray.join('\n')}
          onChange={(e) =>
            set(
              e.target.value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
        />
      )}

      {type === 'tags' && (
        <input
          className="input"
          placeholder={placeholder || 'comma, separated, values'}
          value={asArray.join(', ')}
          onChange={(e) =>
            set(
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
        />
      )}

      {type === 'pairs' && (
        <div className="space-y-2">
          {pairList.map((p, i) => (
            <div key={i} className="flex flex-col gap-2 sm:flex-row">
              <input
                className="input"
                placeholder={field.itemLabels?.[0] ?? 'Label'}
                value={p.label}
                onChange={(e) =>
                  set(
                    pairList.map((x, j) =>
                      j === i ? { ...x, label: e.target.value } : x
                    )
                  )
                }
              />
              <input
                className="input"
                placeholder={field.itemLabels?.[1] ?? 'Value'}
                value={p.value}
                onChange={(e) =>
                  set(
                    pairList.map((x, j) =>
                      j === i ? { ...x, value: e.target.value } : x
                    )
                  )
                }
              />
              <button
                type="button"
                onClick={() => set(pairList.filter((_, j) => j !== i))}
                aria-label="Remove"
                className="shrink-0 rounded-lg border border-border/70 p-2.5 text-muted-foreground/70 transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set([...pairList, { label: '', value: '' }])}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-neon"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      )}

      {type === 'gallery' && (
        <div className="space-y-3">
          {galleryList.map((g, i) => (
            <div key={i} className="rounded-xl border border-border/70 p-3">
              <ImageUpload
                label={`Image ${i + 1}`}
                value={g.url}
                publicId={g.publicId}
                folder={field.folder}
                onChange={({ url, publicId }) =>
                  set(
                    galleryList.map((x, j) =>
                      j === i ? { ...x, url, publicId } : x
                    )
                  )
                }
              />
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  className="input"
                  placeholder="Caption (optional)"
                  value={g.caption}
                  onChange={(e) =>
                    set(
                      galleryList.map((x, j) =>
                        j === i ? { ...x, caption: e.target.value } : x
                      )
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() => set(galleryList.filter((_, j) => j !== i))}
                  aria-label="Remove image"
                  className="shrink-0 rounded-lg border border-border/70 p-2.5 text-muted-foreground/70 transition-colors hover:border-destructive/40 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              set([...galleryList, { url: '', publicId: '', caption: '' }])
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-neon"
          >
            <Plus className="h-3.5 w-3.5" /> Add image
          </button>
        </div>
      )}

      {(type === 'text' || type === 'url' || type === 'email') && (
        <input
          type={type === 'text' ? 'text' : type}
          className="input"
          placeholder={placeholder}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => set(e.target.value)}
        />
      )}

      {help && (
        <p className="mt-1 text-[11px] text-muted-foreground/70">{help}</p>
      )}
    </div>
  );
}
