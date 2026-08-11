import { cn } from '@/lib/cn';

interface PageThumbGridProps {
  thumbnails: string[];
  isSelected: (index: number) => boolean;
  onClick: (index: number) => void;
}

export default function PageThumbGrid({
  thumbnails,
  isSelected,
  onClick,
}: PageThumbGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
      {thumbnails.map((src, i) => {
        const active = isSelected(i);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onClick(i)}
            className={cn(
              'group relative overflow-hidden rounded-lg border-2 bg-bg-elevated/50 transition-colors',
              active
                ? 'border-neon'
                : 'border-border/60 hover:border-primary/40'
            )}
          >
            <img src={src} alt={`Page ${i + 1}`} className="w-full" />
            {active && <span className="absolute inset-0 bg-neon/10" />}
            <span
              className={cn(
                'absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-2xs font-semibold',
                active ? 'bg-neon text-bg' : 'bg-black/60 text-white'
              )}
            >
              {i + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}
