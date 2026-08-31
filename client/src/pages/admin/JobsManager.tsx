import ResourceManager, {
  type ResourceConfig,
} from '@/components/admin/ResourceManager';
import JobAgentPanel from '@/components/admin/JobAgentPanel';
import { useState } from 'react';
import { Bot, Briefcase } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/date';
import type { JobDoc } from '@/types';

const CATEGORIES = [
  { value: 'government', label: 'Govt.' },
  { value: 'private', label: 'Non-govt.' },
  { value: 'it', label: 'IT' },
  { value: 'bank', label: 'Bank' },
  { value: 'ngo', label: 'NGO' },
  { value: 'other', label: 'Other' },
];

const config: ResourceConfig<JobDoc> = {
  title: 'Jobs',
  singular: 'job',
  base: 'jobs/admin',
  modalSize: 'lg',
  searchOf: (job) =>
    `${job.title} ${job.company} ${job.location} ${job.category} ${job.sourceName}`,
  searchPlaceholder: 'Filter by title, company, location or source…',
  defaults: {
    title: '',
    company: '',
    location: 'Bangladesh',
    category: 'private',
    description: '',
    applyUrl: '',
    sourceUrl: '',
    sourceName: 'Manual',
    sourceKey: 'manual',
    source: 'manual',
    employmentType: '',
    salary: '',
    deadline: '',
  },
  fields: [
    { name: 'title', label: 'Job title', type: 'text' },
    { name: 'company', label: 'Company / organization', type: 'text' },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      options: CATEGORIES,
    },
    { name: 'location', label: 'Location', type: 'text' },
    {
      name: 'deadline',
      label: 'Deadline (Bangladesh)',
      type: 'date',
      help: 'After this local date, public descriptions are automatically hidden.',
    },
    {
      name: 'employmentType',
      label: 'Employment type',
      type: 'text',
      placeholder: 'Full-time, internship…',
    },
    {
      name: 'salary',
      label: 'Salary',
      type: 'text',
      placeholder: '40,000–65,000 Tk / month',
    },
    { name: 'applyUrl', label: 'Application URL', type: 'url', full: true },
    {
      name: 'sourceUrl',
      label: 'Original source URL',
      type: 'url',
      full: true,
    },
    { name: 'sourceName', label: 'Source name', type: 'text' },
    {
      name: 'source',
      label: 'Entry source',
      type: 'select',
      options: [
        { value: 'manual', label: 'Manual' },
        { value: 'automated', label: 'Automated' },
      ],
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      full: true,
      rows: 8,
    },
  ],
  labelOf: (job) => job.title,
  renderItem: (job) => (
    <div>
      <p className="font-semibold text-foreground">{job.title}</p>
      <p className="text-xs text-muted-foreground">
        {job.company} · {job.category} ·{' '}
        {job.deadline ? formatDate(job.deadline) : 'No deadline'} · {job.source}
      </p>
    </div>
  ),
};

const TABS = [
  { k: 'jobs' as const, l: 'Jobs', icon: Briefcase },
  { k: 'agent' as const, l: 'Agent', icon: Bot },
];

export default function JobsManager() {
  const [tab, setTab] = useState<'jobs' | 'agent'>('jobs');

  return (
    <div>
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(({ k, l, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-full border px-4 py-2 text-sm backdrop-blur-md backdrop-saturate-150 backdrop-brightness-105 transition-all',
              tab === k
                ? 'border-primary/50 bg-primary/10 text-primary shadow-glow'
                : 'border-border/70 text-muted-foreground hover:border-primary/30 hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {l}
          </button>
        ))}
      </div>

      {/* Both stay mounted: unmounting the agent tab would drop an in-flight sync and its result. */}
      <div className={cn(tab !== 'agent' && 'hidden')}>
        <JobAgentPanel />
      </div>
      <div className={cn(tab !== 'jobs' && 'hidden')}>
        <ResourceManager<JobDoc> config={config} />
      </div>
    </div>
  );
}
