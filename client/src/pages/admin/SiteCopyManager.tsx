import { useEffect, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  LayoutList,
  Terminal,
  Sparkles,
  PanelBottom,
  Compass,
  Inbox,
  MessageSquare,
  KeyRound,
  Tags,
  Mail,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useSiteContent } from '@/hooks/usePortfolio';
import PageHeader from '@/components/admin/PageHeader';
import Field, {
  type FieldSchema,
  type FormState,
} from '@/components/admin/Field';
import { Button } from '@/components/ui/button';
import { getByPath, setByPath } from '@/lib/object';
import type { ApiError, ContentSection } from '@/types';

/** Collapsible glass section — native <details>, zero-dep & accessible. */
function Panel({
  icon: Icon,
  title,
  defaultOpen = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xl"
    >
      <summary className="flex cursor-pointer select-none list-none items-center gap-2 p-4 font-semibold text-neon transition-colors hover:text-neon/80 sm:p-6 [&::-webkit-details-marker]:hidden">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1">{title}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="border-t border-border/60 p-4 pt-5 sm:p-6">
        {children}
      </div>
    </details>
  );
}

/** Known section copy-keys (matches the P12.2 useSectionCopy call sites). */
const SECTION_KEYS: { key: string; label: string }[] = [
  { key: 'about', label: 'About' },
  { key: 'skills', label: 'Skills' },
  { key: 'featured', label: 'Featured projects (home)' },
  { key: 'experience', label: 'Experience' },
  { key: 'education', label: 'Education' },
  { key: 'credentials', label: 'Credentials' },
  { key: 'research', label: 'Research' },
  { key: 'cp', label: 'Competitive programming' },
  { key: 'contact', label: 'Contact' },
  { key: 'projects', label: 'Projects page' },
  { key: 'blog', label: 'Blog page' },
];

/** Known dock targets (matches FloatingDock ITEMS). */
const NAV_TARGETS: { key: string; label: string }[] = [
  { key: '#hero', label: 'Home' },
  { key: '#about', label: 'About' },
  { key: '#skills', label: 'Skills' },
  { key: '#experience', label: 'Work' },
  { key: '/projects', label: 'Projects' },
  { key: '/blog', label: 'Blog' },
  { key: '#contact', label: 'Contact' },
];

const HERO_FIELDS: FieldSchema[] = [
  { name: 'hero.availableBadge', label: '"Available" badge', type: 'text' },
  { name: 'hero.unavailableBadge', label: '"Building" badge', type: 'text' },
  { name: 'hero.greeting', label: 'Greeting (before name)', type: 'text' },
  { name: 'hero.ctaProjects', label: 'CTA — projects', type: 'text' },
  { name: 'hero.ctaResume', label: 'CTA — resume', type: 'text' },
  { name: 'hero.ctaContact', label: 'CTA — contact', type: 'text' },
  { name: 'hero.scrollLabel', label: 'Scroll-down aria-label', type: 'text' },
  { name: 'hero.terminalTitle', label: 'Terminal title bar', type: 'text' },
  { name: 'hero.whoamiCmd', label: 'Terminal — whoami command', type: 'text' },
  { name: 'hero.stackCmd', label: 'Terminal — stack command', type: 'text' },
  { name: 'hero.goalsCmd', label: 'Terminal — goals command', type: 'text' },
  { name: 'hero.goalsText', label: 'Terminal — goals text', type: 'text' },
  {
    name: 'hero.stack',
    label: 'Terminal stack.json (key → value)',
    type: 'pairs',
    full: true,
    itemLabels: ['Key', 'Value'],
  },
];

const ABOUT_FIELDS: FieldSchema[] = [
  {
    name: 'about.strengthsHeading',
    label: '"What I bring" heading',
    type: 'text',
    full: true,
  },
  {
    name: 'about.strengths',
    label: 'Strengths (one per line)',
    type: 'list',
    full: true,
    rows: 6,
  },
];

const FOOTER_FIELDS: FieldSchema[] = [
  { name: 'footer.wordmark', label: 'Wordmark', type: 'text' },
  { name: 'footer.linkProjects', label: 'Link — Projects', type: 'text' },
  { name: 'footer.linkBlog', label: 'Link — Blog', type: 'text' },
  { name: 'footer.linkAdmin', label: 'Link — Admin', type: 'text' },
];

const STATES_FIELDS: FieldSchema[] = [
  { name: 'states.loading', label: 'Loading text', type: 'text' },
  { name: 'states.error', label: 'Error text', type: 'text' },
  { name: 'states.retry', label: 'Retry button', type: 'text' },
  { name: 'states.empty', label: 'Empty text', type: 'text' },
  { name: 'states.notFoundError', label: '404 — error line', type: 'text' },
  { name: 'states.notFoundHome', label: '404 — home button', type: 'text' },
  { name: 'states.homeLoading', label: 'Home — loading', type: 'text' },
  { name: 'states.homeError', label: 'Home — API error', type: 'text' },
  { name: 'states.projectsEmpty', label: 'Featured — empty', type: 'text' },
  {
    name: 'states.projectsFilterEmpty',
    label: 'Projects — filter empty',
    type: 'text',
  },
  { name: 'states.postsEmpty', label: 'Blog — empty', type: 'text' },
  {
    name: 'states.projectNotFound',
    label: 'Project — not found',
    type: 'text',
  },
  { name: 'states.postNotFound', label: 'Post — not found', type: 'text' },
];

const AUTH_FIELDS: FieldSchema[] = [
  { name: 'auth.panelTitle', label: 'Panel title', type: 'text' },
  { name: 'auth.panelSubtitle', label: 'Panel subtitle', type: 'text' },
  { name: 'auth.emailLabel', label: 'Email — label', type: 'text' },
  {
    name: 'auth.emailPlaceholder',
    label: 'Email — placeholder',
    type: 'text',
  },
  { name: 'auth.emailRequired', label: 'Email — required', type: 'text' },
  { name: 'auth.passwordLabel', label: 'Password — label', type: 'text' },
  {
    name: 'auth.passwordPlaceholder',
    label: 'Password — placeholder',
    type: 'text',
  },
  {
    name: 'auth.passwordRequired',
    label: 'Password — required',
    type: 'text',
  },
  { name: 'auth.signIn', label: 'Sign-in button', type: 'text' },
  { name: 'auth.signingIn', label: 'Sign-in button (busy)', type: 'text' },
  { name: 'auth.footer', label: 'Footer note', type: 'text' },
  { name: 'auth.welcomeToast', label: 'Toast — welcome', type: 'text' },
  { name: 'auth.failToast', label: 'Toast — failed', type: 'text' },
];

const LABELS_FIELDS: FieldSchema[] = [
  {
    name: 'labels.researchStages',
    label: 'Research pipeline stages (one per line)',
    type: 'list',
    full: true,
    rows: 4,
  },
  { name: 'labels.caseProblem', label: 'Case · Problem', type: 'text' },
  { name: 'labels.caseProcess', label: 'Case · UI/UX process', type: 'text' },
  {
    name: 'labels.caseArchitecture',
    label: 'Case · Architecture',
    type: 'text',
  },
  { name: 'labels.caseDatabase', label: 'Case · Database', type: 'text' },
  { name: 'labels.caseApi', label: 'Case · API', type: 'text' },
  { name: 'labels.caseChallenges', label: 'Case · Challenges', type: 'text' },
  { name: 'labels.caseSolutions', label: 'Case · Solutions', type: 'text' },
  {
    name: 'labels.caseOptimization',
    label: 'Case · Optimization',
    type: 'text',
  },
  { name: 'labels.caseLearnings', label: 'Case · Learnings', type: 'text' },
  { name: 'labels.filterAll', label: 'Filter · All', type: 'text' },
  {
    name: 'labels.filterFullstack',
    label: 'Filter · Full-Stack',
    type: 'text',
  },
  { name: 'labels.filterFrontend', label: 'Filter · Front-End', type: 'text' },
  { name: 'labels.filterBackend', label: 'Filter · Back-End', type: 'text' },
  { name: 'labels.catLanguage', label: 'Skill Cat · Languages', type: 'text' },
  {
    name: 'labels.catFramework',
    label: 'Skill Cat · Frameworks',
    type: 'text',
  },
  { name: 'labels.catDatabase', label: 'Skill Cat · Databases', type: 'text' },
  { name: 'labels.catTool', label: 'Skill Cat · Tools', type: 'text' },
  { name: 'labels.catCloud', label: 'Skill Cat · Cloud', type: 'text' },
  { name: 'labels.catConcept', label: 'Skill Cat · Concepts', type: 'text' },
  {
    name: 'labels.cpCurrentRating',
    label: 'CP · Current Rating',
    type: 'text',
  },
  { name: 'labels.cpMaxRating', label: 'CP · Max Rating', type: 'text' },
  { name: 'labels.cpContests', label: 'CP · Contests', type: 'text' },
  { name: 'labels.cpUnrated', label: 'CP · Unrated', type: 'text' },
  { name: 'labels.cpCfProfile', label: 'CP · Codeforces Link', type: 'text' },
  {
    name: 'labels.cpRatingHistory',
    label: 'CP · Rating History',
    type: 'text',
  },
  { name: 'labels.cpLeetcode', label: 'CP · LeetCode Heading', type: 'text' },
  { name: 'labels.cpLcProfile', label: 'CP · LeetCode Link', type: 'text' },
  { name: 'labels.cpSolved', label: 'CP · Solved', type: 'text' },
  { name: 'labels.cpEasy', label: 'CP · Easy', type: 'text' },
  { name: 'labels.cpMedium', label: 'CP · Medium', type: 'text' },
  { name: 'labels.cpHard', label: 'CP · Hard', type: 'text' },
  {
    name: 'labels.cpSubmissionActivity',
    label: 'CP · Submission Activity',
    type: 'text',
  },
  { name: 'labels.cpCodechef', label: 'CP · CodeChef Heading', type: 'text' },
  { name: 'labels.cpHighest', label: 'CP · Highest', type: 'text' },
  { name: 'labels.cpCcProfile', label: 'CP · CodeChef Link', type: 'text' },
  { name: 'labels.btnBack', label: 'Button · Back', type: 'text' },
  {
    name: 'labels.backToProjects',
    label: 'Button · Back To Projects',
    type: 'text',
  },
  { name: 'labels.backToBlog', label: 'Button · Back To Blog', type: 'text' },
  { name: 'labels.btnSourceCode', label: 'Button · Source Code', type: 'text' },
  { name: 'labels.btnLiveDemo', label: 'Button · Live Demo', type: 'text' },
  { name: 'labels.btnCaseStudy', label: 'Button · Case Study', type: 'text' },
  { name: 'labels.badgeFeatured', label: 'Badge · Featured', type: 'text' },
  { name: 'labels.badgeVideo', label: 'Badge · Video', type: 'text' },
  { name: 'labels.btnShare', label: 'Button · Share', type: 'text' },
  { name: 'labels.unitViews', label: 'Unit · Views', type: 'text' },
  {
    name: 'labels.headingHighlights',
    label: 'Heading · Key highlights',
    type: 'text',
  },
  {
    name: 'labels.headingRelated',
    label: 'Heading · Related posts',
    type: 'text',
  },
  {
    name: 'labels.toastLinkCopied',
    label: 'Toast · Link copied',
    type: 'text',
  },
  {
    name: 'labels.toastCopyFailed',
    label: 'Toast · Copy failed',
    type: 'text',
  },
  {
    name: 'labels.searchPlaceholder',
    label: 'Blog · Search placeholder',
    type: 'text',
  },
  {
    name: 'labels.searchAria',
    label: 'Blog · Search aria-label',
    type: 'text',
  },
];

const EMAIL_FIELDS: FieldSchema[] = [
  {
    name: 'email.ownerSubjectPrefix',
    label: 'Owner · subject prefix',
    type: 'text',
  },
  { name: 'email.ownerHeading', label: 'Owner · heading', type: 'text' },
  { name: 'email.ackFromName', label: 'Reply · from name', type: 'text' },
  { name: 'email.ackSubject', label: 'Reply · subject', type: 'text' },
  { name: 'email.ackHeading', label: 'Reply · heading', type: 'text' },
  {
    name: 'email.ackGreeting',
    label: 'Reply · greeting (supports {{name}})',
    type: 'text',
  },
  {
    name: 'email.ackBody',
    label: 'Reply · body (supports {{name}} {{email}} {{subject}} {{message}})',
    type: 'textarea',
    editor: 'richtext',
    full: true,
    rows: 3,
  },
  { name: 'email.ackSignoff', label: 'Reply · sign-off', type: 'text' },
];

const FORMS_FIELDS: FieldSchema[] = [
  { name: 'forms.nameLabel', label: 'Name — label', type: 'text' },
  { name: 'forms.namePlaceholder', label: 'Name — placeholder', type: 'text' },
  { name: 'forms.nameRequired', label: 'Name — required error', type: 'text' },
  { name: 'forms.emailLabel', label: 'Email — label', type: 'text' },
  {
    name: 'forms.emailPlaceholder',
    label: 'Email — placeholder',
    type: 'text',
  },
  {
    name: 'forms.emailRequired',
    label: 'Email — required error',
    type: 'text',
  },
  { name: 'forms.emailInvalid', label: 'Email — invalid error', type: 'text' },
  { name: 'forms.subjectLabel', label: 'Subject — label', type: 'text' },
  {
    name: 'forms.subjectPlaceholder',
    label: 'Subject — placeholder',
    type: 'text',
  },
  { name: 'forms.messageLabel', label: 'Message — label', type: 'text' },
  {
    name: 'forms.messagePlaceholder',
    label: 'Message — placeholder',
    type: 'text',
  },
  {
    name: 'forms.messageRequired',
    label: 'Message — required error',
    type: 'text',
  },
  {
    name: 'forms.messageMin',
    label: 'Message — min-length error',
    type: 'text',
  },
  { name: 'forms.send', label: 'Submit button', type: 'text' },
  { name: 'forms.sending', label: 'Submit button (sending)', type: 'text' },
  { name: 'forms.sentTitle', label: 'Success — title', type: 'text' },
  {
    name: 'forms.sentBody',
    label: 'Success — body',
    type: 'textarea',
    editor: 'richtext',
    full: true,
    rows: 2,
  },
  { name: 'forms.sendAnother', label: 'Success — reset button', type: 'text' },
  { name: 'forms.sentToast', label: 'Toast — sent', type: 'text' },
  { name: 'forms.failToast', label: 'Toast — failed', type: 'text' },
  { name: 'forms.infoEmail', label: 'Info — Email label', type: 'text' },
  { name: 'forms.infoPhone', label: 'Info — Phone label', type: 'text' },
  { name: 'forms.infoLocation', label: 'Info — Location label', type: 'text' },
];

export default function SiteCopyManager() {
  const qc = useQueryClient();
  const { data } = useSiteContent();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const d = data?.data;
    if (!d) return;
    setForm({
      sections: d.sections ?? [],
      hero: d.hero ?? {},
      about: d.about ?? {},
      footer: d.footer ?? {},
      nav: d.nav ?? { items: [] },
      states: d.states ?? {},
      forms: d.forms ?? {},
      auth: d.auth ?? {},
      labels: d.labels ?? {},
      email: d.email ?? {},
    });
  }, [data]);

  const onField = (name: string, value: unknown): void =>
    setForm((f) => (f ? setByPath(f, name, value) : f));

  const sec = (key: string): ContentSection =>
    ((form?.sections as ContentSection[] | undefined) ?? []).find(
      (s) => s.key === key
    ) ?? { key, index: '', title: '', subtitle: '' };

  const setSec = (
    key: string,
    field: 'index' | 'title' | 'subtitle',
    value: string
  ): void =>
    setForm((f) => {
      if (!f) return f;
      const arr = [...((f.sections as ContentSection[] | undefined) ?? [])];
      const i = arr.findIndex((s) => s.key === key);
      const cur: ContentSection =
        i >= 0
          ? (arr[i] as ContentSection)
          : { key, index: '', title: '', subtitle: '' };
      const next = { ...cur, [field]: value };
      if (i >= 0) arr[i] = next;
      else arr.push(next);
      return { ...f, sections: arr };
    });

  const navLabel = (key: string): string =>
    (
      (form?.nav as { items?: { key: string; label: string }[] } | undefined)
        ?.items ?? []
    ).find((n) => n.key === key)?.label ?? '';

  const setNav = (key: string, label: string): void =>
    setForm((f) => {
      if (!f) return f;
      const items = [
        ...((f.nav as { items?: { key: string; label: string }[] } | undefined)
          ?.items ?? []),
      ];
      const i = items.findIndex((n) => n.key === key);
      if (i >= 0) items[i] = { key, label };
      else items.push({ key, label });
      return { ...f, nav: { items } };
    });

  const save = async (): Promise<void> => {
    if (!form) return;
    setSaving(true);
    try {
      await api.put('/site-content', form);
      qc.invalidateQueries({ queryKey: ['siteContent'] });
      toast.success('Site copy saved');
    } catch (err) {
      toast.error((err as ApiError).message || 'Failed to save site copy');
    } finally {
      setSaving(false);
    }
  };

  const fieldGrid = (fields: FieldSchema[]) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.name} className={f.full ? 'sm:col-span-2' : ''}>
          <Field
            field={f}
            value={getByPath(form, f.name)}
            form={form ?? {}}
            onChange={onField}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Site copy"
        subtitle="Every piece of text on the public site — section headings, button labels, status messages, toasts, contact-form errors and the auto-reply email template. Leave any field blank to use the built-in English default."
        action={
          <Button onClick={save} disabled={!form || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save site copy
          </Button>
        }
      />

      {form && (
        <div className="grid max-w-4xl gap-3">
          <Panel
            icon={LayoutList}
            title='Section headings — the title, sub-title and tiny "index" tag above each public section'
            defaultOpen
          >
            <div className="space-y-3 sm:space-y-5">
              {SECTION_KEYS.map(({ key, label }) => {
                const s = sec(key);
                return (
                  <div
                    key={key}
                    className="rounded-xl border border-border/70 p-4"
                  >
                    <p className="mb-3 text-sm font-semibold text-foreground">
                      {label}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="label">Index</label>
                        <input
                          className="input"
                          value={s.index}
                          placeholder="e.g. 01. or ~/about"
                          onChange={(e) => setSec(key, 'index', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label">Title</label>
                        <input
                          className="input"
                          value={s.title}
                          onChange={(e) => setSec(key, 'title', e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label">Subtitle</label>
                        <input
                          className="input"
                          value={s.subtitle}
                          onChange={(e) =>
                            setSec(key, 'subtitle', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel
            icon={Terminal}
            title="Hero — top of homepage (badges, greeting, CTA buttons, scroll label, terminal card)"
          >
            {fieldGrid(HERO_FIELDS)}
          </Panel>

          <Panel
            icon={Sparkles}
            title='About — the "What I bring" heading + bullet list under the About section'
          >
            {fieldGrid(ABOUT_FIELDS)}
          </Panel>

          <Panel
            icon={PanelBottom}
            title="Footer — wordmark and links shown at the bottom of every public page"
          >
            {fieldGrid(FOOTER_FIELDS)}
          </Panel>

          <Panel
            icon={Compass}
            title="Navigation — labels shown on the floating dock at the bottom of every public page"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {NAV_TARGETS.map(({ key, label }) => (
                <div key={key}>
                  <label className="label">
                    {label}{' '}
                    <span className="text-muted-foreground/60">({key})</span>
                  </label>
                  <input
                    className="input"
                    value={navLabel(key)}
                    placeholder={label}
                    onChange={(e) => setNav(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            icon={Inbox}
            title="States & 404 — loading / empty / error messages and the Not-Found page"
          >
            {fieldGrid(STATES_FIELDS)}
          </Panel>

          <Panel
            icon={MessageSquare}
            title="Contact form — input labels, placeholders, validation errors and submit-button text"
          >
            {fieldGrid(FORMS_FIELDS)}
          </Panel>

          <Panel
            icon={KeyRound}
            title="Admin login page — the /admin/login screen labels, errors and toast messages"
          >
            {fieldGrid(AUTH_FIELDS)}
          </Panel>

          <Panel
            icon={Tags}
            title="Labels & chrome — small UI text across the site (buttons, badges, filters, units, headings)"
          >
            {fieldGrid(LABELS_FIELDS)}
          </Panel>

          <Panel
            icon={Mail}
            title="Contact emails — subject + body of mail sent when a visitor submits the contact form (yours + the auto-reply)"
          >
            {fieldGrid(EMAIL_FIELDS)}
          </Panel>

          <div className="sticky bottom-4 z-10 flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save site copy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
