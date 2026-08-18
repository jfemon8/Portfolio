// Title/description copy for the fixed public routes, in one place so the pages and the build-time prerender emit identical meta.
export interface PageSeo {
  title: string;
  description: string;
  /** Uses the title verbatim, for a title already written at result-snippet length. */
  exactTitle?: boolean;
}

export const PAGE_SEO = {
  projects: {
    title: 'Projects',
    description:
      'Full-Stack Platforms, Front-Ends And Experiments — From MERN Products To .NET E-Commerce.',
  },
  blog: {
    title: 'Blog',
    description: 'Articles, notes and writeups.',
  },
  tools: {
    // The hub competes for the generic "free online tools" searches; the detail pages take the specific ones.
    title: 'Free Online Tools — No Sign-Up, Nothing Uploaded',
    description:
      'A set of free browser tools: PDF editing, OCR for English and Bangla, JSON and JWT utilities, regex testing, vocal removal and more. No account, no upload.',
    exactTitle: true,
  },
  jobs: {
    title: 'Job Circular Finder',
    description:
      'Open jobs in Bangladesh plus remote and international roles — government circulars, company career pages and worldwide job APIs, collected nightly.',
  },
} satisfies Record<string, PageSeo>;

export type PageSeoKey = keyof typeof PAGE_SEO;
