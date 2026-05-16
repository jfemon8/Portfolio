import ResourceManager, {
  type ResourceConfig,
} from '@/components/admin/ResourceManager';
import type { SkillDoc } from '@/types';

const config: ResourceConfig<SkillDoc> = {
  title: 'Skills',
  subtitle: 'Technologies grouped by category with proficiency bars.',
  singular: 'skill',
  base: 'skills',
  defaults: {
    name: '',
    category: 'language',
    level: 75,
    order: 0,
    featured: false,
  },
  fields: [
    { name: 'name', label: 'Name', type: 'text' },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      options: [
        'language',
        'framework',
        'database',
        'tool',
        'cloud',
        'concept',
        'other',
      ].map((v) => ({ value: v, label: v })),
    },
    { name: 'level', label: 'Proficiency %', type: 'number' },
    { name: 'order', label: 'Order', type: 'number' },
    { name: 'featured', label: 'Featured', type: 'switch' },
  ],
  labelOf: (i) => i.name,
  renderItem: (i) => (
    <>
      <p className="font-semibold text-ink">
        {i.name} <span className="chip ml-1 capitalize">{i.category}</span>
      </p>
      <div className="mt-1.5 h-1.5 w-40 overflow-hidden rounded-full bg-bg-elevated">
        <div
          className="h-full bg-neon-gradient"
          style={{ width: `${i.level}%` }}
        />
      </div>
    </>
  ),
};

export default function SkillsManager() {
  return <ResourceManager config={config} />;
}
