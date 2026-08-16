import type { JobFeedConfig } from '../../config/env.js';
import type { FetchText, SourceJob } from './types.js';
import { MAX_ITEMS_PER_SOURCE } from './types.js';
import { getRobots, isAllowed } from './robots.js';
import {
  asDeadline,
  deadlineFromText,
  employmentTypeFrom,
  employerFromCircularTitle,
  extractAttachments,
  htmlToText,
  oneLine,
  parseLooseDate,
  sanePublishedAt,
} from './text.js';

/** Detail pages are fetched one at a time in small waves so no source is hammered. */
const DETAIL_CONCURRENCY = 4;
const DETAIL_PAUSE_MS = 350;
const MAX_DETAILS_PER_RUN = 60;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Strips scripts/styles then flattens to labelled lines, which is how these pages encode their fields. */
const pageLines = (html: string): string[] =>
  htmlToText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  )
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/** Reads a `Label: value` pair whether the value sits on the same line or the next. */
const labelled = (lines: string[], label: RegExp): string => {
  const index = lines.findIndex((line) => label.test(line));
  if (index === -1) return '';
  const inline = (lines[index] ?? '').replace(label, '').trim();
  return inline || (lines[index + 1] ?? '').trim();
};

const LABELS = {
  position: /^position\s*:?\s*/i,
  published: /^published\s+on\s*:?\s*/i,
  deadline: /^application\s+deadline\s*:?\s*/i,
  source: /^source\s*:?\s*/i,
  location: /^(?:job\s+)?location\s*:?\s*/i,
  salary: /^salary\s*:?\s*/i,
  company: /^company\s*:?\s*/i,
} as const;

const metaContent = (html: string, name: string): string => {
  const pattern = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`,
    'i'
  );
  const reversed = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`,
    'i'
  );
  return oneLine(pattern.exec(html)?.[1] ?? reversed.exec(html)?.[1] ?? '');
};

/** JSON-LD JobPosting is the ideal case — a standard schema rather than a guessed layout. */
const fromJsonLd = (html: string): Partial<SourceJob> | null => {
  const blocks =
    html.match(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ) ?? [];
  for (const block of blocks) {
    const raw = /<script[^>]*>([\s\S]*?)<\/script>/i.exec(block)?.[1] ?? '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const candidates = Array.isArray(parsed) ? parsed : [parsed];
    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'object') continue;
      const node = candidate as Record<string, unknown>;
      const graph = Array.isArray(node['@graph']) ? node['@graph'] : [node];
      for (const entry of graph) {
        if (!entry || typeof entry !== 'object') continue;
        const item = entry as Record<string, unknown>;
        if (String(item['@type'] ?? '') !== 'JobPosting') continue;
        const org =
          item.hiringOrganization && typeof item.hiringOrganization === 'object'
            ? (item.hiringOrganization as Record<string, unknown>)
            : {};
        return {
          title: oneLine(String(item.title ?? '')),
          description: htmlToText(String(item.description ?? '')),
          company: oneLine(String(org.name ?? '')),
          deadline: asDeadline(item.validThrough),
          publishedAt: sanePublishedAt(
            item.datePosted ? new Date(String(item.datePosted)) : undefined
          ),
          employmentType: oneLine(
            String(item.employmentType ?? '').replace(/_/g, '-')
          ),
        };
      }
    }
  }
  return null;
};

interface ListingPage {
  url: string;
  /** Extra classifier text every job found on this listing inherits. */
  hint?: string;
}

interface CrawlerDefinition {
  /** Listing pages to harvest job links from. */
  listUrls: (config: JobFeedConfig) => ListingPage[];
  /** Reads whole postings off the listing page, so no detail fetch is needed. */
  fromListing?: (
    html: string,
    url: string,
    config: JobFeedConfig
  ) => SourceJob[];
  /** Extracts absolute detail-page URLs from a listing page. */
  links?: (html: string, base: string) => string[];
  /** Turns one detail page into a posting. */
  detail?: (
    html: string,
    url: string,
    config: JobFeedConfig
  ) => SourceJob | null;
}

const cells = (row: string): string[] =>
  (row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) ?? []).map((cell) => oneLine(cell));

/** Collects every `href` in a chunk of markup, resolved against `base`. */
const hrefsIn = (html: string, base: string, pattern: RegExp): string[] =>
  [...html.matchAll(/href=["']([^"']+)["']/gi)]
    .map((match) => match[1] ?? '')
    .filter((href) => pattern.test(href))
    .flatMap((href) => {
      const url = absolute(href, base);
      return url ? [url] : [];
    });

const absolute = (href: string, base: string): string | null => {
  try {
    const url = new URL(href, base);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

/** bdjobstoday.com — server-rendered, robots-permitted, and the main public source of BD government vacancies. */
const bdjobstoday: CrawlerDefinition = {
  listUrls: (config) => [
    { url: config.url },
    // Anything harvested here is a government circular by definition of the page.
    {
      url: `${new URL(config.url).origin}/govtjobs.php`,
      hint: 'government govt circular',
    },
  ],
  links: (html, base) => {
    const hrefs =
      html.match(/href="([^"]*hotjobs_details\.php\?id=\d+)"/gi) ?? [];
    return hrefs.flatMap((raw) => {
      const href = /href="([^"]+)"/i.exec(raw)?.[1] ?? '';
      const url = absolute(href, base);
      return url ? [url] : [];
    });
  },
  detail: (html, url, config) => {
    const lines = pageLines(html);
    const structured = fromJsonLd(html);

    const title =
      structured?.title ||
      labelled(lines, LABELS.position) ||
      // og:title carries "Role Job, Employer | site" — only the role is wanted.
      oneLine(
        (metaContent(html, 'og:title').split('|')[0] ?? '')
          .split(/\s+Job,\s+/i)[0]
          ?.replace(/\s+jobs?$/i, '') ?? ''
      );
    if (!title) return null;

    // The org name is repeated under "Organization Information" in title case.
    const orgIndex = lines.findIndex((line) =>
      /^organization information$/i.test(line)
    );
    const company =
      structured?.company ||
      (orgIndex >= 0 ? (lines[orgIndex + 1] ?? '') : '') ||
      labelled(lines, LABELS.company) ||
      config.company ||
      config.name;

    const deadline =
      structured?.deadline ??
      asDeadline(labelled(lines, LABELS.deadline)) ??
      deadlineFromText(metaContent(html, 'description')) ??
      deadlineFromText(lines.join('\n'));

    // Parsed through the shared loose-date reader so `12 Jul, 2026` is understood.
    const publishedDay = parseLooseDate(labelled(lines, LABELS.published));
    const published =
      structured?.publishedAt ??
      sanePublishedAt(
        publishedDay ? new Date(`${publishedDay}T00:00:00+06:00`) : undefined
      );

    const description =
      structured?.description ||
      metaContent(html, 'description') ||
      `${title} at ${company}.`;

    return {
      title,
      externalId: url,
      sourceUrl: url,
      applyUrl: url,
      description,
      publishedAt: published,
      deadline,
      company: company || config.name,
      location: labelled(lines, LABELS.location) || 'Bangladesh',
      employmentType:
        structured?.employmentType || employmentTypeFrom(description),
      salary: labelled(lines, LABELS.salary),
      classifierHint: company,
      // Government circulars are published as a scanned page or a PDF notice.
      attachments: extractAttachments(html, url),
    };
  },
};

/** Generic adapter for any server-rendered board that publishes JSON-LD JobPosting. */
const jsonLdBoard: CrawlerDefinition = {
  listUrls: (config) => [{ url: config.url }],
  links: (html, base) => {
    const hrefs =
      html.match(/href="([^"]*\/(?:job|career|vacancy)[^"]*)"/gi) ?? [];
    return hrefs.flatMap((raw) => {
      const href = /href="([^"]+)"/i.exec(raw)?.[1] ?? '';
      const url = absolute(href, base);
      return url ? [url] : [];
    });
  },
  detail: (html, url, config) => {
    const structured = fromJsonLd(html);
    if (!structured?.title) return null;
    return {
      title: structured.title,
      externalId: url,
      sourceUrl: url,
      applyUrl: url,
      description: structured.description ?? '',
      publishedAt: structured.publishedAt,
      deadline: structured.deadline,
      company: structured.company || config.company || config.name,
      location: 'Bangladesh',
      employmentType: structured.employmentType ?? '',
      salary: '',
      attachments: extractAttachments(html, url),
    };
  },
};

/** duranta.app puts employer, posts, dates, PDF and apply link in one table row. */
const duranta: CrawlerDefinition = {
  listUrls: (config) => [{ url: config.url, hint: 'government circular' }],
  fromListing: (html, url, config) => {
    const rows = html.match(/<tr>[\s\S]*?<\/tr>/gi) ?? [];
    return rows.flatMap((row): SourceJob[] => {
      const [, company, designation, , endDate] = cells(row);
      if (!company || !designation) return [];

      const pdf = hrefsIn(row, url, /\.pdf(?:$|[?#])/i)[0] ?? '';
      const apply = hrefsIn(row, url, /^(?!.*\.pdf)/i).find(
        (href) => !/\.pdf(?:$|[?#])/i.test(href)
      );
      const deadline = asDeadline(endDate ?? '');

      return [
        {
          title: designation.slice(0, 200),
          externalId:
            pdf || `${config.key}:${company}:${designation}`.slice(0, 300),
          sourceUrl: apply || pdf || config.url,
          applyUrl: apply || pdf || config.url,
          description: `${company} — ${designation}`,
          deadline,
          company,
          location: 'Bangladesh',
          employmentType: '',
          salary: '',
          classifierHint: `government ${company}`,
          attachments: pdf
            ? [{ url: pdf, type: 'pdf', label: 'Circular (PDF)' }]
            : [],
        },
      ];
    });
  },
};

/** Bangladeshi circular blogs: a listing of posts, each holding a scan or PDF. */
const circularBlog = (
  linkPattern: RegExp,
  hint: string
): CrawlerDefinition => ({
  listUrls: (config) => [{ url: config.url, hint }],
  links: (html, base) => hrefsIn(html, base, linkPattern),
  detail: (html, url, config) => {
    const structured = fromJsonLd(html);
    // og:title carries the headline; <title> is often just the site name.
    const heading = oneLine(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? '');
    const title =
      structured?.title ||
      metaContent(html, 'og:title') ||
      heading ||
      oneLine(
        (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').split(
          '|'
        )[0] ?? ''
      );
    if (!title) return null;

    const lines = pageLines(html);
    const description =
      structured?.description || metaContent(html, 'description') || title;
    // The employer is inside the headline on these blogs, never in a field.
    const employer = employerFromCircularTitle(title);

    return {
      title: title.slice(0, 200),
      externalId: url,
      sourceUrl: url,
      applyUrl: url,
      description,
      publishedAt: structured?.publishedAt,
      deadline:
        structured?.deadline ??
        asDeadline(labelled(lines, LABELS.deadline)) ??
        deadlineFromText(description) ??
        deadlineFromText(lines.join('\n')),
      company:
        structured?.company ||
        (employer.length > 2 ? employer : '') ||
        config.company ||
        config.name,
      location: 'Bangladesh',
      employmentType: '',
      salary: '',
      classifierHint: `${hint} ${employer}`,
      attachments: extractAttachments(html, url),
    };
  },
});

/** Google's board is server-rendered: link and title both live in the anchor. */
const googleCareers: CrawlerDefinition = {
  listUrls: (config) => [{ url: config.url }],
  fromListing: (html, url, config) => {
    const anchors =
      html.match(
        /<a[^>]+href=["'][^"']*jobs\/results\/[^"']+["'][^>]*aria-label=["'][^"']*["'][^>]*>/gi
      ) ?? [];
    return anchors.flatMap((anchor): SourceJob[] => {
      const href = /href=["']([^"']+)["']/i.exec(anchor)?.[1] ?? '';
      const label = oneLine(
        /aria-label=["']([^"']+)["']/i.exec(anchor)?.[1] ?? ''
      );
      const title = label.replace(/^learn more about\s*/i, '').trim();
      const jobUrl = absolute(href, url);
      if (!title || !jobUrl) return [];
      return [
        {
          title: title.slice(0, 200),
          externalId: jobUrl,
          sourceUrl: jobUrl,
          applyUrl: jobUrl,
          description: `${title} at ${config.company ?? 'Google'}.`,
          company: config.company ?? 'Google',
          location: 'Worldwide',
          employmentType: '',
          salary: '',
          classifierHint: 'technology software engineering',
        },
      ];
    });
  },
};

const CRAWLERS: Record<string, CrawlerDefinition> = {
  bdjobstoday,
  duranta,
  'google-careers': googleCareers,
  biddabari: circularBlog(/\/job-circular-details\//i, 'government circular'),
  livemcq: circularBlog(/\/blog\/[a-z0-9-]*circular/i, 'government circular'),
  optimalit: circularBlog(
    /\/circulars\/circular_details\//i,
    'government circular'
  ),
  'json-ld': jsonLdBoard,
};

export const crawlerNames = Object.keys(CRAWLERS);

/** Runs a crawler: harvest links from listing pages, then read detail pages in polite waves. */
export async function crawlSource(
  config: JobFeedConfig,
  fetchText: FetchText,
  agent = 'PortfolioJobBot'
): Promise<SourceJob[]> {
  const definition = CRAWLERS[config.crawler ?? ''] ?? jsonLdBoard;

  // robots.txt is read and applied before anything else is fetched.
  const rules = await getRobots(config.url, fetchText, agent);
  const pause = Math.max(DETAIL_PAUSE_MS, rules.crawlDelayMs);
  let blocked = 0;

  // Hints ride along from the listing page, so a vacancy under "Govt. jobs" is government whatever its title says.
  const discovered = new Map<string, string>();
  const direct: SourceJob[] = [];

  for (const page of definition.listUrls(config)) {
    if (!isAllowed(rules, page.url)) {
      blocked += 1;
      continue;
    }
    try {
      const html = await fetchText(page.url, 'text/html');
      if (definition.fromListing) {
        direct.push(
          ...definition.fromListing(html, page.url, config).map((job) =>
            page.hint
              ? {
                  ...job,
                  classifierHint: `${page.hint} ${job.classifierHint ?? ''}`,
                }
              : job
          )
        );
        continue;
      }
      for (const link of definition.links?.(html, page.url) ?? []) {
        if (discovered.size >= MAX_ITEMS_PER_SOURCE) break;
        if (!isAllowed(rules, link)) {
          blocked += 1;
          continue;
        }
        const existing = discovered.get(link) ?? '';
        discovered.set(link, `${existing} ${page.hint ?? ''}`.trim());
      }
    } catch {
      // A dead listing page must not sink the whole crawl.
      continue;
    }
  }
  // A listing-only crawler is finished here; nothing further is fetched.
  if (definition.fromListing) {
    if (!direct.length)
      throw new Error(
        blocked > 0
          ? `Listing blocked — ${blocked} path(s) disallowed by robots.txt`
          : 'No rows parsed from the listing page'
      );
    return direct.map((job) => ({
      ...job,
      attachments: (job.attachments ?? []).filter((item) =>
        isAllowed(rules, item.url)
      ),
    }));
  }

  if (!discovered.size) {
    throw new Error(
      blocked > 0
        ? `No crawlable job links — ${blocked} path(s) disallowed by robots.txt`
        : 'No job links found on listing pages'
    );
  }

  const targets = [...discovered.entries()].slice(0, MAX_DETAILS_PER_RUN);
  const jobs: SourceJob[] = [];
  for (let index = 0; index < targets.length; index += DETAIL_CONCURRENCY) {
    const wave = targets.slice(index, index + DETAIL_CONCURRENCY);
    const results = await Promise.allSettled(
      wave.map(async ([url, hint]) => {
        const html = await fetchText(url, 'text/html');
        const job = definition.detail?.(html, url, config) ?? null;
        if (!job) return null;
        return {
          ...job,
          // A circular under a disallowed path is not ours to republish.
          attachments: (job.attachments ?? []).filter((item) =>
            isAllowed(rules, item.url)
          ),
          ...(hint
            ? { classifierHint: `${hint} ${job.classifierHint ?? ''}` }
            : {}),
        };
      })
    );
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value)
        jobs.push(result.value);
    }
    // Honours the site's own Crawl-delay when it publishes one.
    if (index + DETAIL_CONCURRENCY < targets.length) await sleep(pause);
  }

  // Zero parsed pages from a live listing means the layout changed — surface it as a failure.
  if (!jobs.length)
    throw new Error(`Parsed 0 of ${targets.length} detail pages`);
  return jobs;
}
