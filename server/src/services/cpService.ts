// Codeforces integration — uses two public, unauthenticated endpoints (user.info for rating/rank, user.rating for contest count), normalised into the cache model's shape.
const CF_API = 'https://codeforces.com/api';

interface CfUserInfo {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
}

interface CfResponse<T> {
  status: 'OK' | 'FAILED';
  comment?: string;
  result?: T;
}

interface CfRatingChange {
  contestName: string;
  newRating: number;
  ratingUpdateTimeSeconds: number;
}

export interface RatingPoint {
  contest: string;
  rating: number;
  date: string;
}

export interface CpSnapshot {
  handle: string;
  rating: number | null;
  maxRating: number | null;
  rank: string;
  maxRank: string;
  contests: number;
  ratingHistory: RatingPoint[];
}

const j = async <T>(url: string): Promise<CfResponse<T>> => {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  return (await res.json()) as CfResponse<T>;
};

export async function fetchCodeforces(handle: string): Promise<CpSnapshot> {
  const h = encodeURIComponent(handle);
  const [info, rating] = await Promise.all([
    j<CfUserInfo[]>(`${CF_API}/user.info?handles=${h}`),
    j<CfRatingChange[]>(`${CF_API}/user.rating?handle=${h}`).catch(() => null),
  ]);

  if (info.status !== 'OK' || !info.result?.length) {
    throw new Error(info.comment || 'Codeforces user not found');
  }

  const u = info.result[0]!;
  const changes =
    rating && rating.status === 'OK' && Array.isArray(rating.result)
      ? rating.result
      : [];
  const ratingHistory: RatingPoint[] = changes.slice(-60).map((c) => ({
    contest: c.contestName,
    rating: c.newRating,
    date: new Date(c.ratingUpdateTimeSeconds * 1000).toISOString(),
  }));

  return {
    handle: u.handle,
    rating: typeof u.rating === 'number' ? u.rating : null,
    maxRating: typeof u.maxRating === 'number' ? u.maxRating : null,
    rank: u.rank ?? '',
    maxRank: u.maxRank ?? '',
    contests: changes.length,
    ratingHistory,
  };
}

interface CfParty {
  members: { handle: string }[];
  participantType:
    | 'CONTESTANT'
    | 'PRACTICE'
    | 'VIRTUAL'
    | 'MANAGER'
    | 'OUT_OF_COMPETITION';
}

interface CfStandingsRow {
  party: CfParty;
  rank: number;
}

interface CfStandings {
  rows: CfStandingsRow[];
}

export interface StandingsEntry {
  handle: string;
  rank: number;
}

// Codeforces rejects any extra query param (count/from/showUnofficial) on this endpoint for anonymous callers — confirmed live: it 400s with "available only via anonymous GET requests with no extra parameters" the moment one is added. So the full field always comes back in one response (a large round can be 10k+ rows); callers that need to bound it (see ratingPredictor.ts's sampleStandings) do so themselves, since naively truncating here would silently bias every caller.
/** Rated contestants (excludes practice/virtual/out-of-competition rows) for a contest, ranked, full field. */
export async function fetchContestStandings(
  contestId: number
): Promise<StandingsEntry[]> {
  const res = await j<CfStandings>(
    `${CF_API}/contest.standings?contestId=${contestId}`
  );
  if (res.status !== 'OK' || !res.result) {
    throw new Error(res.comment || 'Could not load contest standings');
  }
  return res.result.rows
    .filter((r) => r.party.participantType === 'CONTESTANT')
    .map((r) => ({ handle: r.party.members[0]?.handle ?? '', rank: r.rank }))
    .filter((r) => r.handle);
}

// Confirmed live: Codeforces 400s a `;`-joined handles param past ~5-10k URL chars (a ~1000-handle request fails, 500 succeeds) — chunked well under that so a large contest's full field doesn't break the request.
const RATING_BATCH_SIZE = 400;

const chunk = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size)
  );

async function fetchUserInfoBatch(handles: string[]): Promise<CfUserInfo[]> {
  if (handles.length === 0) return [];
  const res = await j<CfUserInfo[]>(
    `${CF_API}/user.info?handles=${handles.map(encodeURIComponent).join(';')}`
  ).catch(() => null);
  if (res && res.status === 'OK' && res.result) return res.result;

  // Codeforces fails the WHOLE batch if even one handle is invalid (renamed/deleted account) — confirmed live: "handles: User with handle X not found" with no partial results. Bisect to isolate and drop just the bad handle(s) instead of losing the entire batch's ratings.
  if (handles.length === 1) return [];
  const mid = Math.ceil(handles.length / 2);
  const [left, right] = await Promise.all([
    fetchUserInfoBatch(handles.slice(0, mid)),
    fetchUserInfoBatch(handles.slice(mid)),
  ]);
  return [...left, ...right];
}

/** Bulk current ratings for a set of handles via Codeforces' `;`-separated handles param, batched to stay under its URL-length limit. Unrated (or unresolvable) handles are simply absent from the result. */
export async function fetchRatingsBulk(
  handles: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (handles.length === 0) return map;

  const batches = await Promise.all(
    chunk(handles, RATING_BATCH_SIZE).map(fetchUserInfoBatch)
  );
  for (const users of batches) {
    for (const u of users) {
      if (typeof u.rating === 'number') map.set(u.handle, u.rating);
    }
  }
  return map;
}

// LeetCode integration via the public GraphQL endpoint (no auth); best-effort — failures return null so it never breaks the Codeforces section it's nested under.
export interface LeetCodeSnapshot {
  handle: string;
  totalSolved: number;
  easy: number;
  medium: number;
  hard: number;
  ranking: number | null;
  calendar: { date: string; count: number }[];
}

const LC_API = 'https://leetcode.com/graphql';
const LC_QUERY =
  'query($u:String!){ matchedUser(username:$u){ profile{ ranking } ' +
  'submitStatsGlobal{ acSubmissionNum{ difficulty count } } ' +
  'submissionCalendar } }';

export async function fetchLeetCode(
  handle: string
): Promise<LeetCodeSnapshot | null> {
  try {
    const res = await fetch(LC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: 'https://leetcode.com',
      },
      body: JSON.stringify({ query: LC_QUERY, variables: { u: handle } }),
    });
    const json = (await res.json()) as {
      data?: {
        matchedUser?: {
          profile?: { ranking?: number };
          submitStatsGlobal?: {
            acSubmissionNum?: { difficulty: string; count: number }[];
          };
          submissionCalendar?: string;
        } | null;
      };
    };
    const u = json.data?.matchedUser;
    if (!u) return null;
    const ac = u.submitStatsGlobal?.acSubmissionNum ?? [];
    const by = (d: string): number =>
      ac.find((x) => x.difficulty === d)?.count ?? 0;
    let calendar: { date: string; count: number }[] = [];
    try {
      const raw = JSON.parse(u.submissionCalendar ?? '{}') as Record<
        string,
        number
      >;
      const cutoff = Date.now() - 200 * 86400 * 1000;
      calendar = Object.entries(raw)
        .map(([sec, count]) => ({
          ts: Number(sec) * 1000,
          count: Number(count),
        }))
        .filter((e) => e.ts >= cutoff)
        .sort((a, b) => a.ts - b.ts)
        .map((e) => ({
          date: new Date(e.ts).toISOString().slice(0, 10),
          count: e.count,
        }));
    } catch {
      calendar = [];
    }

    return {
      handle,
      totalSolved: by('All'),
      easy: by('Easy'),
      medium: by('Medium'),
      hard: by('Hard'),
      ranking:
        typeof u.profile?.ranking === 'number' ? u.profile.ranking : null,
      calendar,
    };
  } catch {
    return null;
  }
}

// CodeChef has no official API — scrapes the public profile page and regex-extracts the rating (stars derived from it); best-effort, failures return null.
export interface CodeChefSnapshot {
  handle: string;
  rating: number | null;
  highestRating: number | null;
  stars: number;
}

const ccStars = (r: number): number =>
  r >= 2500
    ? 7
    : r >= 2200
      ? 6
      : r >= 2000
        ? 5
        : r >= 1800
          ? 4
          : r >= 1600
            ? 3
            : r >= 1400
              ? 2
              : 1;

export async function fetchCodeChef(
  handle: string
): Promise<CodeChefSnapshot | null> {
  try {
    const res = await fetch(
      `https://www.codechef.com/users/${encodeURIComponent(handle)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          Accept: 'text/html',
        },
      }
    );
    if (!res.ok) return null;
    const html = await res.text();
    const ratingMatch = html.match(/class="rating-number"[^>]*>\s*(\d{3,4})/);
    if (!ratingMatch?.[1]) return null;
    const rating = Number(ratingMatch[1]);
    const hi = html.match(/Highest Rating\D*?(\d{3,4})/);
    return {
      handle,
      rating,
      highestRating: hi?.[1] ? Number(hi[1]) : rating,
      stars: ccStars(rating),
    };
  } catch {
    return null;
  }
}
