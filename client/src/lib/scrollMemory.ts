// Per-pathname scroll memory for back/forward navigation, held in memory only so a hard reload resets it like a native browser would.
const positions = new Map<string, number>();

export function saveScroll(key: string, y: number): void {
  positions.set(key, y);
}

export function getScroll(key: string): number | undefined {
  return positions.get(key);
}
