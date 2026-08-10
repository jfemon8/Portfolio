// Per-pathname scroll memory for back/forward navigation. In-memory only (not sessionStorage) — resets on hard reload, which matches native browser back/forward feel without stepping on the top-on-forward-nav behavior.
const positions = new Map<string, number>();

export function saveScroll(key: string, y: number): void {
  positions.set(key, y);
}

export function getScroll(key: string): number | undefined {
  return positions.get(key);
}
