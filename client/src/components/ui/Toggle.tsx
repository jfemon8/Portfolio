interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  id?: string;
}

/**
 * Shared on/off switch. Single source of truth for the toggle used across the
 * admin forms (Field, ProfileManager, BlogEditor) — project rule #3.
 */
export default function Toggle({ checked, onChange, label, id }: ToggleProps) {
  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-neon' : 'bg-bg-elevated'
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-bg transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  if (!label) return button;

  return (
    <label className="flex items-center gap-3 text-sm text-ink-soft">
      {button}
      {label}
    </label>
  );
}
