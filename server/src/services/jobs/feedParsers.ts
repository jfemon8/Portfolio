import type { JobFeedConfig } from '../../config/env.js';
import type { SourceJob } from './types.js';
import { MAX_ITEMS_PER_SOURCE } from './types.js';
import {
  asDate,
  asDeadline,
  asTimestampDate,
  deadlineFromText,
  employerFromCircularTitle,
  extractAttachments,
  employmentTypeFrom,
  htmlToText,
  oneLine,
  sanePublishedAt,
} from './text.js';

/* ---------------------------------------------------------------- parsers */

const xmlRaw = (item: string, tag: string): string => {
  const match = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`,
    'i'
  ).exec(item);
  return match?.[1] ?? '';
};

const xmlValue = (item: string, tag: string): string =>
  oneLine(xmlRaw(item, tag));

const xmlText = (item: string, tag: string): string =>
  htmlToText(xmlRaw(item, tag));

const xmlAttribute = (item: string, tag: string, attribute: string): string => {
  const match = new RegExp(
    `<${tag}\\s[^>]*\\b${attribute}=["']([^"']+)["'][^>]*>`,
    'i'
  ).exec(item);
  return oneLine(match?.[1] ?? '');
};

const isHttps = (value: string): boolean => /^https:\/\//i.test(value);

export function parseRss(text: string, feed: JobFeedConfig): SourceJob[] {
  const entries = text.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? [];
  const rssJobs = entries
    .slice(0, MAX_ITEMS_PER_SOURCE)
    .flatMap((entry): SourceJob[] => {
      const title = xmlValue(entry, 'title');
      const sourceUrl = xmlValue(entry, 'link');
      if (!title || !isHttps(sourceUrl)) return [];
      const description =
        xmlText(entry, 'content:encoded') ||
        xmlText(entry, 'description') ||
        xmlText(entry, 'excerpt');
      // WordPress job plugins publish structured fields plain RSS tags don't carry.
      const sector = xmlValue(entry, 'sector');
      return [
        {
          title,
          externalId: xmlValue(entry, 'guid') || sourceUrl,
          sourceUrl,
          applyUrl: sourceUrl,
          description,
          publishedAt: sanePublishedAt(
            asDate(xmlValue(entry, 'pubDate')) ??
              asDate(xmlValue(entry, 'PostDate')) ??
              asDate(xmlValue(entry, 'date'))
          ),
          deadline:
            asDeadline(xmlValue(entry, 'applicationDeadline')) ??
            asDeadline(xmlValue(entry, 'deadline')) ??
            asDeadline(xmlValue(entry, 'expiryDate')) ??
            deadlineFromText(description),
          company:
            xmlValue(entry, 'employer') ||
            xmlValue(entry, 'company') ||
            // On circular blogs the employer only exists inside the headline.
            (feed.circularTitles ? employerFromCircularTitle(title) : '') ||
            feed.company ||
            feed.name,
          location: xmlValue(entry, 'location') || 'Bangladesh',
          employmentType:
            xmlValue(entry, 'type') ||
            xmlValue(entry, 'job_type') ||
            employmentTypeFrom(description),
          salary: xmlValue(entry, 'salary'),
          classifierHint: `${sector} ${feed.circularTitles ? 'government circular' : ''}`,
          // WordPress circular posts embed the scan inside content:encoded.
          attachments: extractAttachments(
            xmlRaw(entry, 'content:encoded') || xmlRaw(entry, 'description'),
            sourceUrl
          ),
        },
      ];
    });
  if (rssJobs.length) return rssJobs;

  // Jekyll/GitHub Pages and many company ATSes expose Atom rather than RSS.
  const atomEntries =
    text.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi) ?? [];
  return atomEntries
    .slice(0, MAX_ITEMS_PER_SOURCE)
    .flatMap((entry): SourceJob[] => {
      const title = xmlValue(entry, 'title');
      const sourceUrl = xmlAttribute(entry, 'link', 'href');
      if (!title || !isHttps(sourceUrl)) return [];
      const description =
        xmlText(entry, 'content') || xmlText(entry, 'summary');
      return [
        {
          title,
          externalId: xmlValue(entry, 'id') || sourceUrl,
          sourceUrl,
          applyUrl: sourceUrl,
          description,
          publishedAt: sanePublishedAt(
            asDate(xmlValue(entry, 'published')) ??
              asDate(xmlValue(entry, 'updated'))
          ),
          deadline: deadlineFromText(description),
          company: feed.company || feed.name,
          location: 'Bangladesh',
          employmentType: employmentTypeFrom(description),
          salary: '',
        },
      ];
    });
}

export function parseJson(text: string, feed: JobFeedConfig): SourceJob[] {
  const value: unknown = JSON.parse(text);
  const records =
    value &&
    typeof value === 'object' &&
    Array.isArray((value as { items?: unknown }).items)
      ? (value as { items: unknown[] }).items
      : Array.isArray(value)
        ? value
        : [];
  return records
    .slice(0, MAX_ITEMS_PER_SOURCE)
    .flatMap((entry): SourceJob[] => {
      if (!entry || typeof entry !== 'object') return [];
      const item = entry as Record<string, unknown>;
      const title = typeof item.title === 'string' ? oneLine(item.title) : '';
      const sourceUrl =
        typeof item.url === 'string'
          ? item.url
          : typeof item.applyUrl === 'string'
            ? item.applyUrl
            : '';
      if (!title || !isHttps(sourceUrl)) return [];
      const details =
        typeof item.description === 'string'
          ? item.description
          : typeof item.content_html === 'string'
            ? item.content_html
            : typeof item.content_text === 'string'
              ? item.content_text
              : '';
      const description = htmlToText(details);
      return [
        {
          title,
          externalId: String(item.id ?? item.guid ?? sourceUrl),
          sourceUrl,
          applyUrl:
            typeof item.applyUrl === 'string' ? item.applyUrl : sourceUrl,
          description,
          publishedAt: sanePublishedAt(
            asDate(item.publishedAt ?? item.date_published) ??
              asTimestampDate(item.publishedAt)
          ),
          deadline: asDeadline(item.deadline) ?? deadlineFromText(description),
          company:
            typeof item.company === 'string'
              ? oneLine(item.company)
              : (feed.company ?? feed.name),
          location:
            typeof item.location === 'string'
              ? oneLine(item.location)
              : 'Bangladesh',
          employmentType:
            typeof item.employmentType === 'string'
              ? oneLine(item.employmentType)
              : employmentTypeFrom(description),
          salary: typeof item.salary === 'string' ? oneLine(item.salary) : '',
        },
      ];
    });
}

/** Lever exposes pay as `{currency, min, max, interval}`; renders it as one readable line. */
const formatSalaryRange = (value: unknown): string => {
  if (!value || typeof value !== 'object') return '';
  const range = value as Record<string, unknown>;
  const min = typeof range.min === 'number' ? range.min : undefined;
  const max = typeof range.max === 'number' ? range.max : undefined;
  if (min === undefined && max === undefined) return '';
  const currency = typeof range.currency === 'string' ? range.currency : '';
  const interval =
    typeof range.interval === 'string'
      ? range.interval
          .replace(/-/g, ' ')
          .replace(/\bsalary\b/, '')
          .trim()
      : '';
  const amount =
    min !== undefined && max !== undefined && min !== max
      ? `${min.toLocaleString('en-US')}–${max.toLocaleString('en-US')}`
      : (max ?? min ?? 0).toLocaleString('en-US');
  return [currency, amount, interval].filter(Boolean).join(' ');
};

export function parseLever(text: string, feed: JobFeedConfig): SourceJob[] {
  const value: unknown = JSON.parse(text);
  if (!Array.isArray(value)) return [];

  return value.slice(0, MAX_ITEMS_PER_SOURCE).flatMap((entry): SourceJob[] => {
    if (!entry || typeof entry !== 'object') return [];
    const item = entry as Record<string, unknown>;
    const title = typeof item.text === 'string' ? oneLine(item.text) : '';
    const sourceUrl = typeof item.hostedUrl === 'string' ? item.hostedUrl : '';
    if (!title || !isHttps(sourceUrl)) return [];

    const categories =
      item.categories && typeof item.categories === 'object'
        ? (item.categories as Record<string, unknown>)
        : {};
    const allLocations = Array.isArray(categories.allLocations)
      ? categories.allLocations.filter(
          (location): location is string => typeof location === 'string'
        )
      : [];
    const location =
      typeof categories.location === 'string'
        ? oneLine(categories.location)
        : allLocations.join(', ') || 'Bangladesh';
    const description =
      typeof item.descriptionPlain === 'string'
        ? item.descriptionPlain
        : typeof item.description === 'string'
          ? item.description
          : '';
    // Lever splits the posting body into `lists`; without them requirements are lost.
    const lists = Array.isArray(item.lists)
      ? item.lists
          .map((block) => {
            if (!block || typeof block !== 'object') return '';
            const section = block as Record<string, unknown>;
            const heading =
              typeof section.text === 'string' ? oneLine(section.text) : '';
            const body =
              typeof section.content === 'string'
                ? htmlToText(section.content)
                : '';
            return heading ? `${heading}\n${body}` : body;
          })
          .filter(Boolean)
          .join('\n\n')
      : '';
    const closing =
      typeof item.additionalPlain === 'string'
        ? oneLine(item.additionalPlain)
        : '';

    return [
      {
        title,
        externalId: String(item.id ?? sourceUrl),
        sourceUrl,
        applyUrl: typeof item.applyUrl === 'string' ? item.applyUrl : sourceUrl,
        description: [htmlToText(description), lists, closing]
          .filter(Boolean)
          .join('\n\n'),
        publishedAt: sanePublishedAt(
          asTimestampDate(item.createdAt) ?? asTimestampDate(item.updatedAt)
        ),
        company: feed.company ?? feed.name,
        location,
        employmentType:
          typeof categories.commitment === 'string'
            ? oneLine(categories.commitment)
            : '',
        salary: formatSalaryRange(categories.salaryRange),
        classifierHint: [categories.team, categories.department]
          .filter((value): value is string => typeof value === 'string')
          .join(' '),
      },
    ];
  });
}

/** Greenhouse: one documented API unlocks hundreds of tech-company boards. */
export function parseGreenhouse(
  text: string,
  feed: JobFeedConfig
): SourceJob[] {
  const value: unknown = JSON.parse(text);
  const jobs =
    value &&
    typeof value === 'object' &&
    Array.isArray((value as { jobs?: unknown }).jobs)
      ? (value as { jobs: unknown[] }).jobs
      : [];

  // Newest first, then capped — these boards run to thousands of postings.
  const ordered = jobs
    .filter((entry): entry is Record<string, unknown> =>
      Boolean(entry && typeof entry === 'object')
    )
    .sort(
      (a, b) =>
        new Date(String(b.first_published ?? b.updated_at ?? 0)).getTime() -
        new Date(String(a.first_published ?? a.updated_at ?? 0)).getTime()
    )
    .slice(0, MAX_ITEMS_PER_SOURCE);

  return ordered.flatMap((item): SourceJob[] => {
    const title = oneLine(String(item.title ?? ''));
    const sourceUrl =
      typeof item.absolute_url === 'string' ? item.absolute_url : '';
    if (!title || !isHttps(sourceUrl)) return [];

    const location =
      item.location && typeof item.location === 'object'
        ? oneLine(String((item.location as Record<string, unknown>).name ?? ''))
        : '';
    const departments = Array.isArray(item.departments)
      ? item.departments
          .map((d) =>
            d && typeof d === 'object'
              ? String((d as Record<string, unknown>).name ?? '')
              : ''
          )
          .filter(Boolean)
          .join(' ')
      : '';
    const description = htmlToText(String(item.content ?? ''));

    return [
      {
        title,
        externalId: String(item.id ?? sourceUrl),
        sourceUrl,
        applyUrl: sourceUrl,
        description,
        publishedAt: sanePublishedAt(
          asDate(item.first_published) ?? asDate(item.updated_at)
        ),
        deadline:
          asDeadline(item.application_deadline) ??
          deadlineFromText(description),
        company:
          oneLine(String(item.company_name ?? '')) || feed.company || feed.name,
        location: location || 'Remote',
        employmentType: employmentTypeFrom(`${title} ${description}`),
        salary: '',
        classifierHint: departments,
      },
    ];
  });
}

/** SmartRecruiters public postings API: `{ content: [...] }`, one of the few ATS boards BD employers actually use. */
export function parseSmartRecruiters(
  text: string,
  feed: JobFeedConfig
): SourceJob[] {
  const value: unknown = JSON.parse(text);
  const content =
    value &&
    typeof value === 'object' &&
    Array.isArray((value as { content?: unknown }).content)
      ? (value as { content: unknown[] }).content
      : [];

  return content
    .filter((entry): entry is Record<string, unknown> =>
      Boolean(entry && typeof entry === 'object')
    )
    .slice(0, MAX_ITEMS_PER_SOURCE)
    .flatMap((item): SourceJob[] => {
      const title = oneLine(String(item.name ?? ''));
      const id = String(item.id ?? '');
      const company =
        item.company && typeof item.company === 'object'
          ? (item.company as Record<string, unknown>)
          : {};
      const identifier = String(company.identifier ?? '');
      if (!title || !id || !identifier) return [];

      const loc =
        item.location && typeof item.location === 'object'
          ? (item.location as Record<string, unknown>)
          : {};
      // The country arrives as the ISO code `bd`, which the Bangladesh-location test does not match; spelling it out keeps the region filter correct.
      const country = oneLine(String(loc.country ?? ''));
      const place = country.toLowerCase() === 'bd' ? 'Bangladesh' : country;
      const location =
        oneLine(String(loc.fullLocation ?? '')) ||
        [loc.city, place].filter(Boolean).join(', ') ||
        'Bangladesh';
      // The API ref is JSON; the human-facing posting lives on the public jobs host.
      const sourceUrl = `https://jobs.smartrecruiters.com/${identifier}/${id}`;

      return [
        {
          title,
          externalId: id,
          sourceUrl,
          applyUrl: sourceUrl,
          description: '',
          publishedAt: sanePublishedAt(asDate(item.releasedDate)),
          deadline: undefined,
          company:
            oneLine(String(company.name ?? '')) || feed.company || feed.name,
          location,
          employmentType: employmentTypeFrom(title),
          salary: '',
          classifierHint: String(
            (item.department as Record<string, unknown>)?.label ?? ''
          ),
        },
      ];
    });
}

/** Maps Remotive, Jobicy, Arbeitnow and RemoteOK, whose shapes differ only by key name. */
export function parseRemoteBoard(
  text: string,
  feed: JobFeedConfig
): SourceJob[] {
  const value: unknown = JSON.parse(text);
  const records = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? ((value as Record<string, unknown>).jobs ??
        (value as Record<string, unknown>).data ??
        [])
      : [];
  if (!Array.isArray(records)) return [];

  const pick = (item: Record<string, unknown>, keys: string[]): string => {
    for (const key of keys) {
      const candidate = item[key];
      if (typeof candidate === 'string' && candidate.trim()) return candidate;
    }
    return '';
  };

  return records
    .slice(0, MAX_ITEMS_PER_SOURCE)
    .flatMap((entry): SourceJob[] => {
      if (!entry || typeof entry !== 'object') return [];
      const item = entry as Record<string, unknown>;
      const title = oneLine(pick(item, ['title', 'jobTitle', 'position']));
      const sourceUrl = pick(item, ['url', 'jobLink', 'apply_url', 'link']);
      if (!title || !isHttps(sourceUrl)) return [];

      const description = htmlToText(
        pick(item, ['description', 'jobDescription', 'jobExcerpt'])
      );
      const location =
        oneLine(
          pick(item, [
            'candidate_required_location',
            'jobGeo',
            'location',
            'jobLocation',
          ])
        ) || 'Remote';

      return [
        {
          title,
          externalId: String(item.id ?? item.slug ?? sourceUrl),
          sourceUrl,
          applyUrl: sourceUrl,
          description,
          publishedAt: sanePublishedAt(
            asDate(pick(item, ['publication_date', 'pubDate', 'created_at'])) ??
              asTimestampDate(item.created_at)
          ),
          deadline: deadlineFromText(description),
          company:
            oneLine(pick(item, ['company_name', 'companyName', 'company'])) ||
            feed.company ||
            feed.name,
          location,
          employmentType: oneLine(pick(item, ['job_type', 'jobType'])),
          salary: oneLine(pick(item, ['salary', 'annualSalaryMin'])),
          classifierHint: oneLine(
            pick(item, ['category', 'jobIndustry', 'jobLevel'])
          ),
        },
      ];
    });
}
