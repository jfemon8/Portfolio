import type { FetchText } from './types.js';

/** Enforces robots.txt at fetch time, so politeness is verifiable rather than assumed. */
interface RobotsRules {
  allow: string[];
  disallow: string[];
  crawlDelayMs: number;
}

const EMPTY: RobotsRules = { allow: [], disallow: [], crawlDelayMs: 0 };
/** A source that cannot serve robots.txt is treated as fully allowed, per the standard. */
const OPEN: RobotsRules = EMPTY;

const cache = new Map<string, Promise<RobotsRules>>();

/** Takes the union of the `*` group and any group naming this bot — the stricter reading. */
export function parseRobots(text: string, agent: string): RobotsRules {
  const rules: RobotsRules = { allow: [], disallow: [], crawlDelayMs: 0 };
  const wanted = new Set(['*', agent.toLowerCase()]);
  let active = false;
  let sawAgentLine = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const [rawField, ...rest] = line.split(':');
    const field = (rawField ?? '').trim().toLowerCase();
    const value = rest.join(':').trim();

    if (field === 'user-agent') {
      // A new block of agent lines starts a fresh group.
      if (!sawAgentLine) active = false;
      sawAgentLine = true;
      if (wanted.has(value.toLowerCase())) active = true;
      continue;
    }
    sawAgentLine = false;
    if (!active) continue;

    if (field === 'disallow' && value) rules.disallow.push(value);
    else if (field === 'allow' && value) rules.allow.push(value);
    else if (field === 'crawl-delay') {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds > 0)
        rules.crawlDelayMs = Math.min(seconds * 1000, 30_000);
    }
  }
  return rules;
}

/** Matches robots.txt path patterns, including `*` wildcards and a trailing `$`. */
const matches = (path: string, pattern: string): boolean => {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source = body
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${source}${anchored ? '$' : ''}`).test(path);
};

/** Longest matching rule wins, and an equal-length Allow beats a Disallow. */
export function isAllowed(rules: RobotsRules, url: string): boolean {
  let path: string;
  try {
    const parsed = new URL(url);
    path = `${parsed.pathname}${parsed.search}`;
  } catch {
    return false;
  }

  const longest = (patterns: string[]): number =>
    patterns.reduce(
      (best, pattern) =>
        matches(path, pattern) ? Math.max(best, pattern.length) : best,
      -1
    );

  const deny = longest(rules.disallow);
  if (deny < 0) return true;
  return longest(rules.allow) >= deny;
}

/** Fetches and caches robots.txt for the origin of `url`, once per process. */
export async function getRobots(
  url: string,
  fetchText: FetchText,
  agent: string
): Promise<RobotsRules> {
  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    return OPEN;
  }

  const existing = cache.get(origin);
  if (existing) return existing;

  const pending = (async (): Promise<RobotsRules> => {
    try {
      return parseRobots(
        await fetchText(`${origin}/robots.txt`, 'text/plain'),
        agent
      );
    } catch {
      // 404 or unreachable robots.txt means no restrictions were published.
      return OPEN;
    }
  })();

  cache.set(origin, pending);
  return pending;
}
