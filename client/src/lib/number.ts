// Compact counter (Twitter/Instagram style): under 1000 shows as-is; above that, one decimal, dropped when whole (1000 -> "1k", 1250 -> "1.3k", 1000000 -> "1M").
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs < 1000) return String(value);
  const units: [number, string][] = [
    [1_000_000_000, 'B'],
    [1_000_000, 'M'],
    [1_000, 'k'],
  ];
  for (const [threshold, suffix] of units) {
    if (abs >= threshold) {
      const scaled = value / threshold;
      const rounded = Math.round(scaled * 10) / 10;
      return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}${suffix}`;
    }
  }
  return String(value);
}
