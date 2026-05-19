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
    gallery: [],
    sourceUrl: '',
    liveUrl: '',
    videoUrl: '',
    metrics: [],
    featured: false,
    status: 'completed',
    year: '',
    order: 0,
    caseStudy: {
      problem: '',
      process: '',
      architecture: '',
      database: '',
      api: '',
      challenges: '',
      solutions: '',
      optimization: '',
      learnings: '',
    },
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
      label: 'Overview / fallback (Markdown) — shown if no case study below',
      type: 'textarea',
      full: true,
      rows: 6,
    },
    {
      name: 'caseStudy.problem',
      label: 'Case study · Problem statement (Markdown)',
      type: 'textarea',
      full: true,
      rows: 4,
    },
    {
      name: 'caseStudy.process',
      label: 'Case study · UI/UX process (Markdown)',
      type: 'textarea',
      full: true,
      rows: 4,
    },
    {
      name: 'caseStudy.architecture',
      label: 'Case study · Technical architecture (Markdown)',
      type: 'textarea',
      full: true,
      rows: 4,
    },
    {
      name: 'caseStudy.database',
      label: 'Case study · Database design (Markdown)',
      type: 'textarea',
      full: true,
      rows: 4,
    },
    {
      name: 'caseStudy.api',
      label: 'Case study · API architecture (Markdown)',
      type: 'textarea',
      full: true,
      rows: 4,
    },
    {
      name: 'caseStudy.challenges',
      label: 'Case study · Challenges faced (Markdown)',
      type: 'textarea',
      full: true,
      rows: 4,
    },
    {
      name: 'caseStudy.solutions',
      label: 'Case study · Solutions implemented (Markdown)',
      type: 'textarea',
      full: true,
      rows: 4,
    },
    {
      name: 'caseStudy.optimization',
      label: 'Case study · Optimization strategy (Markdown)',
      type: 'textarea',
      full: true,
      rows: 4,
    },
    {
      name: 'caseStudy.learnings',
      label: 'Case study · Learnings (Markdown)',
      type: 'textarea',
      full: true,
      rows: 4,
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
    {
      name: 'videoUrl',
      label: 'Video preview URL (mp4 / Cloudinary)',
      type: 'url',
      full: true,
    },
    {
      name: 'metrics',
      label: 'Performance metrics',
      type: 'pairs',
      full: true,
      itemLabels: ['Metric', 'Value'],
    },
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
    {
      name: 'gallery',
      label: 'Gallery images (with captions)',
      type: 'gallery',
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
