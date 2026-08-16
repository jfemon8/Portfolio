import ResourceManager, {
  type ResourceConfig,
} from '@/components/admin/ResourceManager';
import JobAgentPanel from '@/components/admin/JobAgentPanel';
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
  subtitle:
    'Automated listings are updated by the scheduled feed sync (latest 200 shown). You can also add, correct or remove any listing manually.',
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

export default function JobsManager() {
  return (
    <div>
      <JobAgentPanel />
      <ResourceManager<JobDoc> config={config} />
    </div>
  );
}
