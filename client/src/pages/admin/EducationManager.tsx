import ResourceManager, {
  type ResourceConfig,
} from '@/components/admin/ResourceManager';
import type { EducationDoc } from '@/types';

const config: ResourceConfig<EducationDoc> = {
  title: 'Education',
  subtitle:
    'Schools, degrees & grades shown in the Education section on your homepage.',
  singular: 'education',
  base: 'education',
  defaults: {
    institution: '',
    degree: '',
    field: '',
    location: '',
    startYear: '',
    endYear: '',
    grade: '',
    description: '',
    order: 0,
  },
  fields: [
    { name: 'institution', label: 'Institution', type: 'text', full: true },
    { name: 'degree', label: 'Degree', type: 'text' },
    { name: 'field', label: 'Field of study', type: 'text' },
    { name: 'location', label: 'Location', type: 'text', full: true },
    { name: 'startYear', label: 'Start year', type: 'text' },
    { name: 'endYear', label: 'End year', type: 'text' },
    { name: 'grade', label: 'Grade (e.g. CGPA: 3.38)', type: 'text' },
    { name: 'order', label: 'Order', type: 'number' },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      editor: 'richtext',
      full: true,
      rows: 3,
    },
  ],
  labelOf: (i) => i.institution,
  renderItem: (i) => (
    <>
      <p className="font-semibold text-foreground">{i.institution}</p>
      <p className="text-xs text-muted-foreground">
        {i.degree} {i.field && `— ${i.field}`} · {i.startYear}–{i.endYear} ·{' '}
        {i.grade}
      </p>
    </>
  ),
};

export default function EducationManager() {
  return <ResourceManager config={config} />;
}
