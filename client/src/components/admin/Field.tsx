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
  const { name, label, type = 'text', options, placeholder, help, rows } =
    field;

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

      {(type === 'text' || type === 'url' || type === 'email') && (
        <input
          type={type === 'text' ? 'text' : type}
          className="input"
          placeholder={placeholder}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => set(e.target.value)}
        />
      )}

      {help && <p className="mt-1 text-[11px] text-ink-dim">{help}</p>}
    </div>
  );
}
