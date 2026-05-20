import { cn } from '@/lib/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  id?: string;
}

/**
 * Shared on/off switch (shadcn-style). Theme-aware: track is `bg-primary`
 * (brand teal) when checked, `bg-muted` when not. Thumb is `bg-background`
 * so it shows white-on-teal in light mode and dark-on-teal in dark mode.
 * Border-2 trick keeps the thumb visually inside the track at both ends.
 */
export default function Toggle({ checked, onChange, label, id }: ToggleProps) {
  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        // Off track uses `bg-input` so the unchecked state is visibly grey
        // (not page-bg) in light mode — `bg-muted` was too close to
        // `bg-background` and the thumb disappeared on white-ish surfaces.
        checked ? 'bg-primary' : 'bg-input'
      )}
    >
      <span
        className={cn(
          // Always-white thumb with a shadow — pops on both the teal `on`
          // track and the grey `off` track in light + dark themes.
          'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );

  if (!label) return button;

  return (
    <label className="flex items-center gap-3 text-sm text-muted-foreground">
      {button}
      {label}
    </label>
  );
}
