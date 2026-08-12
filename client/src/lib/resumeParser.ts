// Works only on text really present in the uploaded file — nothing here is inferred or model-generated.
import { pdfjsLib } from './pdfjsSetup';

export interface TextPosition {
  text: string;
  x: number;
  y: number;
  pageNumber: number;
}

export interface ParsedResume {
  fullText: string;
  pageCount: number;
  positions: TextPosition[];
}

async function extractPdf(arrayBuffer: ArrayBuffer): Promise<ParsedResume> {
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const positions: TextPosition[] = [];
  const pageTexts: string[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    let pageText = '';
    let prev: { endX: number; y: number; hasEOL: boolean } | null = null;
    for (const item of content.items) {
      if (!('str' in item) || !item.str) continue;
      const x = item.transform[4] as number;
      const y = item.transform[5] as number;
      const fontHeight =
        Math.abs(item.height) || Math.abs(item.transform[3] as number) || 10;
      positions.push({ text: item.str, x, y, pageNumber });

      // PDF streams hold no spaces or newlines; without rebuilding them from geometry, words fuse ("SKILLSLanguages").
      if (prev) {
        if (prev.hasEOL || Math.abs(y - prev.y) > fontHeight * 0.5) {
          if (!pageText.endsWith('\n')) pageText += '\n';
        } else if (
          x - prev.endX > fontHeight * 0.2 &&
          !pageText.endsWith(' ')
        ) {
          pageText += ' ';
        }
      }
      pageText += item.str;
      prev = { endX: x + (item.width || 0), y, hasEOL: item.hasEOL };
    }
    pageTexts.push(pageText);
  }
  return {
    fullText: pageTexts.join('\n\n'),
    pageCount: doc.numPages,
    positions,
  };
}

async function extractDocx(arrayBuffer: ArrayBuffer): Promise<ParsedResume> {
  const mammoth = (await import('mammoth')).default;
  const result = await mammoth.extractRawText({ arrayBuffer });
  // DOCX carries no glyph positions, so layout hazards simply don't apply to this format.
  return { fullText: result.value, pageCount: 1, positions: [] };
}

export async function parseResume(file: File): Promise<ParsedResume> {
  const buffer = await file.arrayBuffer();
  if (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  ) {
    return extractPdf(buffer);
  }
  return extractDocx(buffer);
}

const COLUMN_BINS = 40;

// True columns leave an empty channel with real text on BOTH sides; a bare gap test fired on centered names instead.
function pageHasMultiColumnLayout(positions: TextPosition[]): boolean {
  if (positions.length < 40) return false;
  const xs = positions.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const range = maxX - minX;
  if (range < 150) return false;

  const counts = new Array<number>(COLUMN_BINS).fill(0);
  for (const x of xs) {
    const bin = Math.min(
      COLUMN_BINS - 1,
      Math.floor(((x - minX) / range) * COLUMN_BINS)
    );
    counts[bin]!++;
  }

  for (let start = 0; start < COLUMN_BINS; start++) {
    if (counts[start] !== 0) continue;
    let end = start;
    while (end + 1 < COLUMN_BINS && counts[end + 1] === 0) end++;

    const centre = (start + end + 1) / 2 / COLUMN_BINS;
    const width = (end - start + 1) / COLUMN_BINS;
    if (width >= 0.08 && centre >= 0.3 && centre <= 0.7) {
      let left = 0;
      let right = 0;
      for (let b = 0; b < start; b++) left += counts[b]!;
      for (let b = end + 1; b < COLUMN_BINS; b++) right += counts[b]!;
      const total = left + right;
      // Both sides must carry real content, which is what separates a second column from a stray right-aligned date.
      if (total > 0 && left / total >= 0.2 && right / total >= 0.2) return true;
    }
    start = end;
  }
  return false;
}

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_PATTERN =
  /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/;
const URL_PATTERN =
  /(?:https?:\/\/\S+)|(?:\bwww\.\S+)|(?:\b[a-z0-9-]+\.(?:com|net|org|io|dev|co|me)\/\S+)/gi;
const SECTION_HEADING_PATTERN =
  /\b(objective|summary|experience|employment|work history|education|skills|projects|certifications|publications)\b/i;

export interface AtsHazard {
  severity: 'high' | 'medium';
  message: string;
}

export function detectHazards(resume: ParsedResume): AtsHazard[] {
  const hazards: AtsHazard[] = [];
  const trimmed = resume.fullText.trim();

  const pagesWithMultiColumn = new Set(
    resume.positions
      .reduce<number[]>((pages, p) => {
        if (!pages.includes(p.pageNumber)) pages.push(p.pageNumber);
        return pages;
      }, [])
      .filter((pageNumber) =>
        pageHasMultiColumnLayout(
          resume.positions.filter((p) => p.pageNumber === pageNumber)
        )
      )
  );
  if (pagesWithMultiColumn.size > 0) {
    hazards.push({
      severity: 'high',
      message: `Multi-column layout detected on page${pagesWithMultiColumn.size > 1 ? 's' : ''} ${[...pagesWithMultiColumn].join(', ')} — many ATS parsers read straight across the page, silently interleaving your two columns into scrambled, nonsensical text.`,
    });
  }

  const charsPerPage = trimmed.length / Math.max(resume.pageCount, 1);
  if (charsPerPage < 200) {
    hazards.push({
      severity: 'high',
      message:
        'Very little text could be extracted for the document length — content may be trapped in images, text boxes, or graphics that a real ATS parser cannot read at all.',
    });
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    hazards.push({
      severity: 'high',
      message:
        "No email address was found in the extracted text — if it's in a header/footer or a text box, many ATS parsers will miss it entirely.",
    });
  }
  if (!PHONE_PATTERN.test(trimmed)) {
    hazards.push({
      severity: 'medium',
      message: 'No phone number was found in the extracted text.',
    });
  }
  if (!SECTION_HEADING_PATTERN.test(trimmed)) {
    hazards.push({
      severity: 'medium',
      message:
        'No standard section heading (Experience, Education, Skills, etc.) was found — if your headings are stylized as images or unusual fonts, an ATS may not recognize them as section breaks.',
    });
  }

  return hazards;
}

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'your',
  'you',
  'are',
  'will',
  'have',
  'has',
  'our',
  'their',
  'able',
  'must',
  'not',
  'all',
  'any',
  'can',
  'who',
  'what',
  'when',
  'where',
  'why',
  'how',
  'job',
  'role',
  'work',
  'team',
  'company',
  'about',
  'into',
  'other',
  'more',
  'such',
  'than',
  'per',
  // Minor/contact fields the comparison is meant to ignore.
  'name',
  'email',
  'phone',
  'website',
  'address',
  'contact',
  'linkedin',
  'github',
  'portfolio',
  'organization',
  'location',
  'city',
  'street',
  'road',
  'avenue',
  'tower',
  'floor',
  'level',
  'house',
  'block',
  // Section labels — the content under them is what matters, not the label itself.
  'objective',
  'summary',
  'profile',
  'requirements',
  'responsibilities',
  'qualifications',
  'designation',
  'salary',
  'compensation',
  'benefits',
  'context',
  'vacancy',
  'employment',
  'status',
  'educational',
  'additional',
  'preferred',
  'required',
  'responsibility',
  // Web-page chrome that comes along when a posting is copied from a site.
  'site',
  'logo',
  'icon',
  'home',
  'menu',
  'career',
  'careers',
  'gallery',
  'resources',
  'copy',
  'link',
  'share',
  'click',
  'privacy',
  'policy',
  'terms',
  'condition',
  'conditions',
  'return',
  'refund',
  'products',
  'services',
  'service',
  'products',
  'company',
  'about',
  'trade',
  'license',
  'bin',
  // Hiring-process and HR-benefit boilerplate.
  'apply',
  'applying',
  'application',
  'applications',
  'registration',
  'deadline',
  'submission',
  'submit',
  'submitted',
  'assigned',
  'instruction',
  'instructions',
  'complete',
  'completed',
  'completing',
  'cancelled',
  'considered',
  'according',
  'recruitment',
  'interview',
  'online',
  'onsite',
  'process',
  'step',
  'steps',
  'bonus',
  'bonuses',
  'festival',
  'casual',
  'medical',
  'recreational',
  'wedding',
  'paternity',
  'maternity',
  'weekend',
  'friday',
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'prayer',
  'health',
  'discount',
  'leave',
  'yearly',
  'monthly',
  'review',
  'facilities',
  'environment',
  'friendly',
  'exclusive',
  'dedicated',
  'programs',
  'time',
  'full',
  'part',
  'year',
  'years',
  'month',
  'months',
  // Generic verbs/adjectives that carry no matchable signal.
  'understand',
  'understanding',
  'deliver',
  'write',
  'follow',
  'join',
  'learn',
  'improve',
  'estimate',
  'maintain',
  'ensure',
  'ensured',
  'good',
  'strong',
  'new',
  'various',
  'different',
  'important',
  'well',
  'looking',
  'passionate',
  'motivated',
  'proactive',
  'willingness',
  'ability',
  'sense',
  'attitude',
  'opportunities',
  'opportunity',
  'selected',
  'candidates',
  'candidate',
  'related',
  'field',
  'degree',
  'bachelor',
  'master',
  'knowledge',
  'familiar',
  'familiarity',
  'experienced',
  'excellent',
  'including',
  'include',
  'across',
  'using',
  'used',
  'use',
  'need',
  'needs',
  'want',
  'also',
  'may',
  'both',
  'each',
  'every',
  'within',
  'through',
  'over',
  'under',
  'between',
  'while',
  'been',
  'being',
  'was',
  'were',
  'its',
  'his',
  'her',
  'they',
  'them',
  'open',
  'below',
  'above',
  'after',
  'before',
  'here',
  'there',
  'please',
]);

// The major facts. Unlisted terms are demoted, never dropped, since no list is exhaustive.
const SKILL_TERMS = new Set([
  'c',
  'c++',
  'c#',
  'java',
  'javascript',
  'typescript',
  'python',
  'php',
  'ruby',
  'go',
  'golang',
  'rust',
  'kotlin',
  'swift',
  'scala',
  'perl',
  'dart',
  'r',
  'html',
  'css',
  'sass',
  'scss',
  'less',
  'tailwind',
  'bootstrap',
  'daisyui',
  'material',
  'jquery',
  'react',
  'reactjs',
  'angular',
  'vue',
  'svelte',
  'next.js',
  'nextjs',
  'nuxt',
  'redux',
  'zustand',
  'mobx',
  'rxjs',
  'jsx',
  'node',
  'node.js',
  'nodejs',
  'express',
  'nestjs',
  'deno',
  'bun',
  'django',
  'flask',
  'fastapi',
  'laravel',
  'symfony',
  'rails',
  'spring',
  'hibernate',
  'asp.net',
  'dotnet',
  '.net',
  'mvc',
  'razor',
  'blazor',
  'signalr',
  'linq',
  'entity',
  'framework',
  'orm',
  'ef',
  'efcore',
  'sequelize',
  'prisma',
  'mongoose',
  'sql',
  'mysql',
  'postgresql',
  'postgres',
  'sqlite',
  'mssql',
  'mongodb',
  'redis',
  'cassandra',
  'dynamodb',
  'firestore',
  'firebase',
  'supabase',
  'elasticsearch',
  'neo4j',
  'oracle',
  'database',
  'databases',
  'rest',
  'restful',
  'api',
  'apis',
  'graphql',
  'grpc',
  'soap',
  'websocket',
  'websockets',
  'microservices',
  'gateway',
  'gateways',
  'authentication',
  'authorization',
  'oauth',
  'jwt',
  'saml',
  'ldap',
  'caching',
  'cache',
  'messaging',
  'rabbitmq',
  'kafka',
  'celery',
  'queue',
  'docker',
  'kubernetes',
  'k8s',
  'containerized',
  'container',
  'containers',
  'jenkins',
  'terraform',
  'ansible',
  'aws',
  'azure',
  'gcp',
  'cloud',
  'serverless',
  'lambda',
  'vercel',
  'netlify',
  'heroku',
  'nginx',
  'apache',
  'linux',
  'unix',
  'bash',
  'shell',
  'git',
  'github',
  'gitlab',
  'bitbucket',
  'svn',
  'ci',
  'cd',
  'cicd',
  'devops',
  'agile',
  'scrum',
  'kanban',
  'jira',
  'confluence',
  'testing',
  'test',
  'tests',
  'unit',
  'integration',
  'xunit',
  'nunit',
  'jest',
  'vitest',
  'mocha',
  'chai',
  'cypress',
  'playwright',
  'selenium',
  'pytest',
  'junit',
  'moq',
  'nsubstitute',
  'mocking',
  'mock',
  'tdd',
  'bdd',
  'debugging',
  'debug',
  'performance',
  'optimization',
  'scalable',
  'scalability',
  'security',
  'saas',
  'oop',
  'algorithms',
  'algorithm',
  'structures',
  'design',
  'patterns',
  'architecture',
  'responsive',
  'accessibility',
  'seo',
  'ux',
  'ui',
  'figma',
  'sketch',
  'photoshop',
  'shopify',
  'wordpress',
  'cms',
  'webpack',
  'vite',
  'babel',
  'eslint',
  'prettier',
  'npm',
  'yarn',
  'pnpm',
  'postman',
  'swagger',
  'openapi',
  'json',
  'xml',
  'yaml',
  'websphere',
  'pandas',
  'numpy',
  'tensorflow',
  'pytorch',
  'sklearn',
  'ml',
  'ai',
  'nlp',
  'analytics',
  'etl',
  'spark',
  'hadoop',
  'tableau',
  'powerbi',
  'excel',
  'cloudinary',
  'stripe',
  'twilio',
  'sendgrid',
  'websocket',
  'pwa',
  'ssr',
  'ssg',
  'spa',
  'crud',
  'mvvm',
  'solid',
]);

const EMAIL_PATTERN_G = new RegExp(EMAIL_PATTERN.source, 'gi');
const PHONE_PATTERN_G = new RegExp(PHONE_PATTERN.source, 'gi');

// Drops emails/phones/URLs, whose fragments would otherwise surface as unmatchable keywords.
function stripContactInfo(text: string): string {
  return text
    .replace(EMAIL_PATTERN_G, ' ')
    .replace(PHONE_PATTERN_G, ' ')
    .replace(URL_PATTERN, ' ');
}

// Skips the opening name/contact block by starting at the first real section heading.
function stripResumeHeader(text: string): string {
  const match = SECTION_HEADING_PATTERN.exec(text);
  return match ? text.slice(match.index) : text;
}

function extractKeywords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    // Inner dots stay so "node.js" survives; trailing ones must not split "skills." from "skills".
    .map((w) => w.replace(/^\.+|\.+$/g, ''))
    .filter(
      (w) =>
        w.length >= 2 &&
        // Letterless tokens are dates, salaries, or licence numbers — never matchable keywords.
        /[a-z]/.test(w) &&
        !STOPWORDS.has(w)
    );
  return new Set(words);
}

export interface KeywordHit {
  term: string;
  isSkill: boolean;
}

export interface KeywordOverlap {
  matched: KeywordHit[];
  missing: KeywordHit[];
  /** Share of the posting's skill terms present in the resume; null when it names none to score against. */
  skillMatchPercent: number | null;
  matchedSkillCount: number;
  totalSkillCount: number;
}

// Skills sort first so the terms that actually decide a match are read before the filler.
function toRankedHits(terms: string[]): KeywordHit[] {
  return terms
    .map((term) => ({ term, isSkill: SKILL_TERMS.has(term) }))
    .sort((a, b) =>
      a.isSkill === b.isSkill
        ? a.term.localeCompare(b.term)
        : Number(b.isSkill) - Number(a.isSkill)
    );
}

// Compares substantive content only — contact fields, PII fragments, and page boilerplate are stripped first.
export function compareKeywords(
  resumeText: string,
  jobDescription: string
): KeywordOverlap {
  const resumeMajorText = stripContactInfo(stripResumeHeader(resumeText));
  const jdMajorText = stripContactInfo(jobDescription);
  const resumeWords = extractKeywords(resumeMajorText);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const word of extractKeywords(jdMajorText)) {
    (resumeWords.has(word) ? matched : missing).push(word);
  }

  // Scored on skill terms alone — counting boilerplate words would inflate the number without meaning anything.
  const matchedSkillCount = matched.filter((t) => SKILL_TERMS.has(t)).length;
  const totalSkillCount =
    matchedSkillCount + missing.filter((t) => SKILL_TERMS.has(t)).length;

  return {
    matched: toRankedHits(matched),
    missing: toRankedHits(missing),
    skillMatchPercent:
      totalSkillCount === 0
        ? null
        : Math.round((matchedSkillCount / totalSkillCount) * 100),
    matchedSkillCount,
    totalSkillCount,
  };
}
