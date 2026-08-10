import { cn } from '@/lib/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  id?: string;
}

// Shared on/off switch (shadcn-style); border-2 trick keeps the thumb visually inside the track at both ends.
export default function Toggle({ checked, onChange, label, id }: ToggleProps) {
  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-[inset_0_0.0625rem_0.125rem_rgba(0,0,0,0.15)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        // bg-input (not bg-muted) so the off state stays visibly grey — bg-muted was too close to bg-background.
        checked ? 'bg-primary' : 'bg-input'
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-[0_0.0625rem_0.1875rem_rgba(0,0,0,0.3),inset_0_0.0625rem_0_rgba(255,255,255,0.8)] ring-0 transition-transform',
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
