import type { SourceJob } from './types.js';

/** Words that differ between boards for the same vacancy and must not split a group. */
const NOISE_WORDS = new Set([
  'job',
  'jobs',
  'vacancy',
  'vacancies',
  'circular',
  'recruitment',
  'hiring',
  'urgent',
  'new',
  'post',
  'position',
  'career',
  'opportunity',
  'apply',
  'online',
  'bd',
  'bangladesh',
  'ltd',
  'limited',
  'company',
  'group',
  'the',
  'of',
  'and',
  'for',
  'at',
  'in',
  'a',
  'an',
]);

/** Roman numerals and grade markers that genuinely distinguish two postings are kept. */
const normalise = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/[^a-z0-9ঀ-৿]+/g, ' ')
    .split(' ')
    .map((word) => word.trim())
    .filter((word) => word.length > 1 && !NOISE_WORDS.has(word));

/** Fingerprints on the significant words of title and employer, which survive rewording better than any id. */
export const dedupeKeyOf = (job: {
  title: string;
  company: string;
}): string => {
  const title = normalise(job.title).sort().join('-');
  const company = normalise(job.company).sort().join('-');
  // Falling back to the raw text keeps pathological titles from colliding into one key.
  return `${company || 'unknown'}::${title || job.title.toLowerCase().trim()}`;
};

/** How complete a posting is — decides which source wins a merge. */
export const qualityOf = (job: SourceJob): number => {
  let score = 0;
  if (job.description)
    score += Math.min(40, Math.floor(job.description.length / 100));
  if (job.deadline) score += 25;
  if (job.publishedAt) score += 10;
  if (job.salary) score += 8;
  if (job.employmentType) score += 5;
  if (job.attachments?.length) score += 12;
  if (job.location && job.location !== 'Bangladesh') score += 5;
  if (job.applyUrl && job.applyUrl !== job.sourceUrl) score += 3;
  if (job.company && !/^unknown$/i.test(job.company)) score += 2;
  return score;
};

export interface MergedJob extends SourceJob {
  dedupeKey: string;
  quality: number;
  sources: Array<{ key: string; name: string; url: string }>;
}

const noiseCount = (value: string): number =>
  value
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => NOISE_WORDS.has(word)).length;

/** "Senior Software Engineer" beats "Urgent Hiring: Senior Software Engineer Job". */
const cleanestTitle = (group: SourceJob[]): string => {
  const titles = group.map((job) => job.title).filter(Boolean);
  if (!titles.length) return group[0]?.title ?? '';
  return titles.sort(
    (a, b) => noiseCount(a) - noiseCount(b) || a.length - b.length
  )[0] as string;
};

const isShouted = (value: string): boolean =>
  value.length > 3 && value === value.toUpperCase();

/** The fullest legal name wins, but a properly-cased one beats a SHOUTED one. */
const fullestCompany = (group: SourceJob[]): string =>
  group
    .map((job) => job.company)
    .filter(Boolean)
    .sort(
      (a, b) =>
        Number(isShouted(a)) - Number(isShouted(b)) || b.length - a.length
    )[0] ?? '';

/** Collapses one vacancy seen on several boards: the fullest version wins, the rest only fill gaps. */
export function mergeDuplicates(jobs: SourceJob[]): MergedJob[] {
  const groups = new Map<string, SourceJob[]>();
  for (const job of jobs) {
    const key = dedupeKeyOf(job);
    const group = groups.get(key);
    if (group) group.push(job);
    else groups.set(key, [job]);
  }

  return [...groups.entries()].map(([dedupeKey, group]) => {
    const ranked = [...group].sort((a, b) => qualityOf(b) - qualityOf(a));
    const best = ranked[0] as SourceJob;
    const merged: MergedJob = {
      ...best,
      title: cleanestTitle(group),
      company: fullestCompany(group) || best.company,
      dedupeKey,
      quality: qualityOf(best),
      sources: [],
    };

    for (const candidate of ranked) {
      // Gap-filling only — never let a weaker source overwrite the winner's field.
      if (!merged.deadline && candidate.deadline)
        merged.deadline = candidate.deadline;
      if (!merged.salary && candidate.salary) merged.salary = candidate.salary;
      if (!merged.employmentType && candidate.employmentType)
        merged.employmentType = candidate.employmentType;
      if (!merged.publishedAt && candidate.publishedAt)
        merged.publishedAt = candidate.publishedAt;
      if (
        (!merged.location || merged.location === 'Bangladesh') &&
        candidate.location &&
        candidate.location !== 'Bangladesh'
      )
        merged.location = candidate.location;
      if (candidate.description.length > merged.description.length)
        merged.description = candidate.description;
      // A circular scan found on any one source belongs on the merged record.
      if (!merged.attachments?.length && candidate.attachments?.length)
        merged.attachments = candidate.attachments;

      if (candidate.sourceKey && candidate.sourceName) {
        merged.sources.push({
          key: candidate.sourceKey,
          name: candidate.sourceName,
          url: candidate.sourceUrl,
        });
      }
    }

    // The earliest publish date across sources is the truest posting date.
    const dates = group
      .map((item) => item.publishedAt)
      .filter((value): value is Date => value instanceof Date);
    if (dates.length)
      merged.publishedAt = new Date(Math.min(...dates.map((d) => d.getTime())));

    merged.quality = qualityOf(merged);
    return merged;
  });
}
