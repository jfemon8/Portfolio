import ResourceManager, {
  type ResourceConfig,
} from '@/components/admin/ResourceManager';
import type { ExperienceDoc } from '@/types';

const config: ResourceConfig<ExperienceDoc> = {
  title: 'Experience',
  singular: 'experience',
  base: 'experience',
  modalSize: 'lg',
  defaults: {
    role: '',
    company: '',
    location: '',
    startDate: '',
    endDate: 'Present',
    current: false,
    type: 'full-time',
    highlights: [],
    tech: [],
    order: 0,
  },
  fields: [
    { name: 'role', label: 'Role', type: 'text' },
    { name: 'company', label: 'Company', type: 'text' },
    { name: 'location', label: 'Location', type: 'text', full: true },
    { name: 'startDate', label: 'Start (e.g. June 2025)', type: 'text' },
    { name: 'endDate', label: 'End (or Present)', type: 'text' },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      options: [
        'full-time',
        'part-time',
        'internship',
        'contract',
        'freelance',
      ].map((v) => ({ value: v, label: v })),
    },
    { name: 'order', label: 'Order', type: 'number' },
    { name: 'current', label: 'Current job', type: 'switch' },
    {
      name: 'highlights',
      label: 'Highlights (one per line)',
      type: 'list',
      full: true,
      rows: 5,
    },
    { name: 'tech', label: 'Tech (comma separated)', type: 'tags', full: true },
  ],
  labelOf: (i) => i.role,
  renderItem: (i) => (
    <>
      <p className="font-semibold text-foreground">
        {i.role} <span className="text-neon">@ {i.company}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {i.startDate} — {i.endDate} · {i.location}
      </p>
    </>
  ),
};

export default function ExperienceManager() {
  return <ResourceManager config={config} />;
}
