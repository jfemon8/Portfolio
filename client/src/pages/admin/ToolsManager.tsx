import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import ResourceManager, {
  type ResourceConfig,
} from '@/components/admin/ResourceManager';
import { useCategories } from '@/hooks/usePortfolio';
import { TOOL_ICON_OPTIONS } from '@/lib/toolIcon';
import { cn } from '@/lib/cn';
import type { CategoryDoc, ToolDoc } from '@/types';

const KEY_OPTIONS = [
  { value: 'jwt-decoder', label: 'JWT Decoder' },
  { value: 'json-formatter', label: 'JSON Formatter' },
  { value: 'regex-tester', label: 'Regex Tester' },
  { value: 'cp-profile-comparer', label: 'CP Profile Comparer' },
  { value: 'cf-rating-predictor', label: 'Codeforces Rating Predictor' },
  { value: 'bigo-benchmark', label: 'Big-O Benchmark' },
  { value: 'password-crack-time', label: 'Password Crack-Time Benchmark' },
  { value: 'resume-ats-xray', label: 'Resume ATS X-Ray' },
  { value: 'pdf-power-tools', label: 'PDF Power-Tools' },
  { value: 'music-remover', label: 'Music Remover' },
  { value: 'email-verifier', label: 'Email Extractor & Verifier' },
  { value: 'image-to-text', label: 'Image-to-Text (OCR)' },
];

// Two-panel /admin/tools view (Tools + Categories tabs), mirroring SkillsManager's Skills/Categories split.
export default function ToolsManager() {
  const [tab, setTab] = useState<'tools' | 'categories'>('tools');
  const { data: categoriesData } = useCategories('tool');
  const categories = useMemo(
    () => categoriesData?.data ?? [],
    [categoriesData]
  );

  const toolConfig: ResourceConfig<ToolDoc> = useMemo(
    () => ({
      title: 'Tools',
      singular: 'tool',
      base: 'tools',
      defaults: {
        name: '',
        description: '',
        category: categories[0]?.slug ?? 'developer-utilities',
        icon: 'Wrench',
        key: 'jwt-decoder',
        order: 0,
      },
      fields: [
        { name: 'name', label: 'Name', type: 'text', full: true },
        {
          name: 'key',
          label: 'Implementation',
          type: 'select',
          options: KEY_OPTIONS,
          help: 'Which built-in tool this entry renders — the actual logic lives in code.',
        },
        {
          name: 'category',
          label: 'Category',
          type: 'select',
          options: categories.length
            ? categories.map((c) => ({ value: c.slug, label: c.name }))
            : [{ value: 'developer-utilities', label: 'Developer Utilities' }],
          help: categories.length
            ? undefined
            : 'No categories yet — add one from the Categories tab.',
        },
        {
          name: 'icon',
          label: 'Icon',
          type: 'select',
          options: TOOL_ICON_OPTIONS,
        },
        { name: 'order', label: 'Order', type: 'number' },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          full: true,
          rows: 3,
        },
      ],
      labelOf: (i) => i.name,
      renderItem: (i) => <ToolRow item={i} categories={categories} />,
    }),
    [categories]
  );

  const categoryConfig: ResourceConfig<CategoryDoc> = useMemo(
    () => ({
      title: 'Categories',
      singular: 'category',
      base: 'categories',
      defaults: { name: '', slug: '', order: 0, scope: 'tool' },
      fields: [
        { name: 'name', label: 'Display name', type: 'text' },
        {
          name: 'slug',
          label: 'Slug',
          type: 'text',
          placeholder: 'auto from name',
          help: 'Lowercase, hyphen-separated. Leave blank to derive from the display name.',
        },
        { name: 'order', label: 'Order', type: 'number' },
      ],
      labelOf: (i) => i.name,
      renderItem: (i) => (
        <div>
          <p className="font-semibold text-foreground">{i.name}</p>
          <p className="font-mono text-xs text-muted-foreground/70">{i.slug}</p>
        </div>
      ),
    }),
    []
  );

  return (
    <div>
      <div role="tablist" className="mb-6 flex gap-2">
        {(['tools', 'categories'] as const).map((key) => {
          const on = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={on}
              onClick={() => setTab(key)}
              className={cn(
                'relative rounded-full px-4 py-1 text-sm transition-colors',
                on
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {on && (
                <motion.span
                  layoutId="tools-admin-tab"
                  className="absolute inset-0 rounded-full border border-primary/40 bg-primary/10"
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                />
              )}
              <span className="relative capitalize">{key}</span>
            </button>
          );
        })}
      </div>

      {tab === 'tools' ? (
        <ResourceManager<ToolDoc> config={toolConfig} />
      ) : (
        <ResourceManager<CategoryDoc> config={categoryConfig} />
      )}
    </div>
  );
}

function ToolRow({
  item,
  categories,
}: {
  item: ToolDoc;
  categories: CategoryDoc[];
}) {
  const categoryLabel =
    categories.find((c) => c.slug === item.category)?.name ?? item.category;
  return (
    <>
      <p className="font-semibold text-foreground">{item.name}</p>
      <p className="text-xs text-muted-foreground">
        {categoryLabel} · {item.key} · /tools/{item.slug}
      </p>
    </>
  );
}
