/**
 * Codeforces integration. Uses two PUBLIC, unauthenticated endpoints
 * (no secrets, project rule #9): user.info (rating/rank) + user.rating
 * (contest count). Normalised into the shape the cache model stores.
 */
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

export interface CpSnapshot {
  handle: string;
  rating: number | null;
  maxRating: number | null;
  rank: string;
  maxRank: string;
  contests: number;
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
    j<unknown[]>(`${CF_API}/user.rating?handle=${h}`).catch(() => null),
  ]);

  if (info.status !== 'OK' || !info.result?.length) {
    throw new Error(info.comment || 'Codeforces user not found');
  }

  const u = info.result[0]!;
  const contests =
    rating && rating.status === 'OK' && Array.isArray(rating.result)
      ? rating.result.length
      : 0;

  return {
    handle: u.handle,
    rating: typeof u.rating === 'number' ? u.rating : null,
    maxRating: typeof u.maxRating === 'number' ? u.maxRating : null,
    rank: u.rank ?? '',
    maxRank: u.maxRank ?? '',
    contests,
  };
}
