// Reimplements the widely-documented community rating-delta approximation, not a byte-exact replica since Codeforces' own inflation constants aren't public.

export interface Contestant {
  handle: string;
  rating: number;
  rank: number;
}

// Kept modest: the O(n^2) pass below (~60 * n^2 Math.pow calls, dominated by needRatingFor's binary search) needs to comfortably clear a serverless function's timeout even on a cold start; 900 keeps a large round's compute in the low seconds.
const SAMPLE_CAP = 900;

// Samples evenly across the whole field rather than truncating to the top-N by rank, whose performance-selected subset blows up the zero-sum correction.
export function sampleStandings<T extends { handle: string; rank: number }>(
  standings: T[],
  mustInclude: string,
  cap = SAMPLE_CAP
): { handle: string; rank: number }[] {
  if (standings.length <= cap) return standings;

  const targetIndex = standings.findIndex((s) => s.handle === mustInclude);
  const rest = standings.filter((_, i) => i !== targetIndex);
  const slots = targetIndex >= 0 ? cap - 1 : cap;
  const step = rest.length / slots;

  const sampled: T[] = [];
  for (let i = 0; i < slots; i++) {
    sampled.push(rest[Math.floor(i * step)]!);
  }
  if (targetIndex >= 0) sampled.push(standings[targetIndex]!);

  return sampled
    .sort((a, b) => a.rank - b.rank)
    .map((s, i) => ({ handle: s.handle, rank: i + 1 }));
}

const winProbability = (ra: number, rb: number): number =>
  1 / (1 + Math.pow(10, (rb - ra) / 400));

// Seed is expected RANK, so it sums each opponent's chance of beating *me*, not the reverse, which would invert the whole scale.
const seedAt = (rating: number, othersRatings: number[]): number =>
  othersRatings.reduce((seed, r) => seed + winProbability(r, rating), 1);

/** Binary-searches the rating producing `targetSeed`, which converges in 25 iterations because seedAt() is monotonically decreasing in `rating`. */
function needRatingFor(targetSeed: number, othersRatings: number[]): number {
  let lo = -500;
  let hi = 8000;
  for (let i = 0; i < 25; i++) {
    const mid = (lo + hi) / 2;
    if (seedAt(mid, othersRatings) < targetSeed) hi = mid;
    else lo = mid;
  }
  return Math.round((lo + hi) / 2);
}

export function predictDeltas(contestants: Contestant[]): Map<string, number> {
  const n = contestants.length;
  const ratings = contestants.map((c) => c.rating);

  const rawDeltas = contestants.map((c, i) => {
    const others = ratings.filter((_, j) => j !== i);
    const seed = seedAt(c.rating, others);
    const midRank = Math.sqrt(seed * c.rank);
    const needRating = needRatingFor(midRank, others);
    return (needRating - c.rating) / 2;
  });

  // Pass 1: small across-the-board correction (capped) so the pool doesn't drift from rounding/edge effects.
  const sum1 = rawDeltas.reduce((s, d) => s + d, 0);
  const inc1 = Math.min(0, Math.max(-10, -sum1 / n - 1));
  const afterPass1 = rawDeltas.map((d) => d + inc1);

  // Pass 2: the remaining imbalance is absorbed by the top-rated min(n, 4*round(sqrt(n))) participants, mirroring Codeforces' documented behavior.
  const topCount = Math.min(n, 4 * Math.round(Math.sqrt(n)));
  const orderByRatingDesc = contestants
    .map((c, i) => i)
    .sort((a, b) => ratings[b]! - ratings[a]!)
    .slice(0, topCount);

  const sum2 = afterPass1.reduce((s, d) => s + d, 0);
  // Defensive floor beyond what a real correction should ever need: real CF deltas rarely exceed a few hundred points even for extreme outliers, so this only ever guards against a skewed/unrepresentative sample producing a runaway correction, never fires on a healthy field.
  const inc2 = Math.max(-500, Math.min(0, -sum2 / topCount));
  const finalDeltas = [...afterPass1];
  for (const idx of orderByRatingDesc) {
    finalDeltas[idx] = finalDeltas[idx]! + inc2;
  }

  const result = new Map<string, number>();
  contestants.forEach((c, i) =>
    result.set(c.handle, Math.round(finalDeltas[i]!))
  );
  return result;
}
