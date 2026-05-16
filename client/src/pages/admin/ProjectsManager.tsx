import ResourceManager, {
  type ResourceConfig,
} from '@/components/admin/ResourceManager';
import type { ProjectDoc } from '@/types';

const config: ResourceConfig<ProjectDoc> = {
  title: 'Projects',
  subtitle: 'Portfolio projects and case studies.',
  singular: 'project',
  base: 'projects',
  modalSize: 'lg',
  defaults: {
    title: '',
    tagline: '',
    summary: '',
    description: '',
    techStack: [],
    highlights: [],
    category: 'fullstack',
    coverImage: '',
    coverPublicId: '',
    sourceUrl: '',
    liveUrl: '',
    featured: false,
    status: 'completed',
    year: '',
    order: 0,
  },
  fields: [
    { name: 'title', label: 'Title', type: 'text' },
    { name: 'year', label: 'Year', type: 'text' },
    { name: 'tagline', label: 'Tagline', type: 'text', full: true },
    {
      name: 'summary',
      label: 'Card summary',
      type: 'textarea',
      full: true,
      rows: 2,
    },
    {
      name: 'description',
      label: 'Case study (Markdown)',
      type: 'textarea',
      full: true,
      rows: 8,
    },
    {
      name: 'techStack',
      label: 'Tech stack (comma separated)',
      type: 'tags',
      full: true,
    },
    {
      name: 'highlights',
      label: 'Highlights (one per line)',
      type: 'list',
      full: true,
      rows: 4,
    },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      options: ['fullstack', 'frontend', 'backend', 'mobile', 'other'].map(
        (v) => ({ value: v, label: v })
      ),
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: ['completed', 'in-progress', 'archived'].map((v) => ({
        value: v,
        label: v,
      })),
    },
    { name: 'sourceUrl', label: 'Source URL', type: 'url' },
    { name: 'liveUrl', label: 'Live URL', type: 'url' },
    { name: 'order', label: 'Order', type: 'number' },
    { name: 'featured', label: 'Featured', type: 'switch' },
    {
      name: 'coverImage',
      label: 'Cover image',
      type: 'image',
      publicIdKey: 'coverPublicId',
      folder: 'portfolio/projects',
      full: true,
    },
  ],
  labelOf: (i) => i.title,
  renderItem: (i) => (
    <div className="flex items-center gap-3">
      {i.coverImage && (
        <img
          src={i.coverImage}
          alt=""
          className="h-10 w-16 rounded-md border border-line object-cover"
        />
      )}
      <div>
        <p className="font-semibold text-ink">
          {i.title} {i.featured && <span className="text-xs text-neon">★</span>}
        </p>
        <p className="text-xs text-ink-dim">
          {i.category} · {i.views} views · /{i.slug}
        </p>
      </div>
    </div>
  ),
};

export default function ProjectsManager() {
  return <ResourceManager config={config} />;
}
