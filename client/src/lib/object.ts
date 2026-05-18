/**
 * Tiny immutable nested get/set by dot-path. Enables schema-driven admin
 * fields to target nested models (e.g. `caseStudy.problem`) while staying
 * fully backward-compatible with flat names (single-segment path).
 * Project rule #3/#8 — one shared helper, no lodash.
 */
type Obj = Record<string, unknown>;

export function getByPath(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) => (acc != null ? (acc as Obj)[key] : undefined),
      obj
    );
}

export function setByPath<T extends Obj>(
  obj: T,
  path: string,
  value: unknown
): T {
  const keys = path.split('.');
  const root: Obj = { ...obj };
  let cur: Obj = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i] as string;
    cur[k] = { ...((cur[k] as Obj | undefined) ?? {}) };
    cur = cur[k] as Obj;
  }
  cur[keys[keys.length - 1] as string] = value;
  return root as T;
}
