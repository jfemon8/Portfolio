// Immutable nested get/set by dot-path — lets schema-driven admin fields target nested models (e.g. `caseStudy.problem`) while staying compatible with flat names.
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
