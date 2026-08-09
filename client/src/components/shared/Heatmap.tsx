import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/date';

interface HeatmapProps {
  /** chronological day buckets */
  data: { date: string; count: number }[];
  weeks?: number;
  className?: string;
  ariaLabel?: string;
}

const LEVELS = [
  'bg-border/40',
  'bg-primary/25',
  'bg-primary/45',
  'bg-primary/65',
  'bg-primary/90',
];

const level = (c: number): number =>
  c <= 0 ? 0 : c < 3 ? 1 : c < 6 ? 2 : c < 10 ? 3 : 4;

export default function Heatmap({
  data,
  weeks = 26,
  className,
  ariaLabel,
}: HeatmapProps) {
  const counts = new Map(data.map((d) => [d.date, d.count]));
  const days = weeks * 7;
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));

  const cols: { key: string; lvl: number }[][] = [];
  for (let c = 0; c < weeks; c++) {
    const col: { key: string; lvl: number }[] = [];
    for (let r = 0; r < 7; r++) {
      const d = new Date(start);
      d.setDate(start.getDate() + c * 7 + r);
      const key = d.toISOString().slice(0, 10);
      col.push({ key, lvl: level(counts.get(key) ?? 0) });
    }
    cols.push(col);
  }

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div
      role="img"
      aria-label={
        ariaLabel ?? `${total} submissions in the last ${weeks} weeks`
      }
      className={cn('flex gap-1 overflow-x-auto', className)}
    >
      {cols.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-1">
          {col.map((cell) => (
            <span
              key={cell.key}
              title={formatDate(cell.key)}
              className={cn(
                'h-2.5 w-2.5 shrink-0 rounded-[0.125rem]',
                LEVELS[cell.lvl]
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
