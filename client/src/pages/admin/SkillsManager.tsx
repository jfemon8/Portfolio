import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import ResourceManager, {
  type ResourceConfig,
} from '@/components/admin/ResourceManager';
import { useCategories } from '@/hooks/usePortfolio';
import { getSkillIcon, FallbackSkillIcon } from '@/lib/skillIcon';
import { cn } from '@/lib/cn';
import type { CategoryDoc, SkillDoc } from '@/types';

/** Two-panel admin view for /admin/skills: the Skills CRUD (with image-
 *  upload icon + dynamic category dropdown) and a separate Categories CRUD,
 *  switchable via the tab strip up top. Both panels reuse `ResourceManager`
 *  so list rendering, modal form, validation, and confirm-delete come for
 *  free — the page just composes them. */
export default function SkillsManager() {
  const [tab, setTab] = useState<'skills' | 'categories'>('skills');
  const { data: categoriesData } = useCategories();
  const categories = useMemo(
    () => categoriesData?.data ?? [],
    [categoriesData]
  );

  // Re-derive the Skill config whenever the categories list changes so the
  // dropdown options stay in sync with the Categories tab. `useMemo` keeps
  // the object stable across renders that don't actually need a refresh.
  const skillConfig: ResourceConfig<SkillDoc> = useMemo(
    () => ({
      title: 'Skills',
      subtitle:
        'Technologies displayed in the Skills & tech section on your homepage. Each skill becomes a card with a name, percentage bar, and an icon — upload an image or leave it blank to let the public renderer auto-match a brand logo from the skill name.',
      singular: 'skill',
      base: 'skills',
      defaults: {
        name: '',
        category: categories[0]?.slug ?? 'other',
        level: 75,
        icon: '',
        iconImage: '',
        iconImagePublicId: '',
        order: 0,
      },
      // Field order is intentional: name/category share row 1, level/order
      // share row 2 (both half-width, no full-spanning field between them),
      // then iconImage spans row 3 full-width. `featured` is no longer
      // surfaced — every skill renders on the public grid regardless, so
      // the toggle was a no-op on the UI.
      fields: [
        { name: 'name', label: 'Name', type: 'text' },
        {
          name: 'category',
          label: 'Category',
          type: 'select',
          options: categories.length
            ? categories.map((c) => ({ value: c.slug, label: c.name }))
            : [{ value: 'other', label: 'Other' }],
          help: categories.length
            ? undefined
            : 'No categories yet — add one from the Categories tab.',
        },
        { name: 'level', label: 'Proficiency %', type: 'number' },
        { name: 'order', label: 'Order', type: 'number' },
        {
          name: 'iconImage',
          label: 'Icon image (optional)',
          type: 'image',
          publicIdKey: 'iconImagePublicId',
          folder: 'portfolio/skills',
          full: true,
          help: 'Leave blank to auto-render a brand logo matched by skill name. Upload a square PNG/SVG (transparent background recommended) to override.',
        },
      ],
      labelOf: (i) => i.name,
      renderItem: (i) => <SkillRow item={i} categories={categories} />,
    }),
    [categories]
  );

  const categoryConfig: ResourceConfig<CategoryDoc> = useMemo(
    () => ({
      title: 'Categories',
      subtitle:
        'Manage the category tabs shown above the skill grid on your homepage. The slug is the stable id referenced by each skill — change it carefully (existing skills referencing the old slug will be orphaned until reassigned).',
      singular: 'category',
      base: 'categories',
      defaults: { name: '', slug: '', order: 0 },
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
      {/* Tab strip — animated active indicator borrowed from the public
          Skills section so the admin chrome stays visually consistent with
          the surface it controls. */}
      <div role="tablist" className="mb-6 flex gap-2">
        {(['skills', 'categories'] as const).map((key) => {
          const on = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={on}
              onClick={() => setTab(key)}
              className={cn(
                'relative rounded-full px-4 py-1.5 text-sm transition-colors',
                on
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {on && (
                <motion.span
                  layoutId="skills-admin-tab"
                  className="absolute inset-0 rounded-full border border-primary/40 bg-primary/10"
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                />
              )}
              <span className="relative capitalize">{key}</span>
            </button>
          );
        })}
      </div>

      {tab === 'skills' ? (
        <ResourceManager<SkillDoc> config={skillConfig} />
      ) : (
        <ResourceManager<CategoryDoc> config={categoryConfig} />
      )}
    </div>
  );
}

/** A single skill's list row. Shows the uploaded icon if any, otherwise a
 *  brand logo matched from the skill name, and falls back to a neutral
 *  glyph when nothing matches — same precedence the public renderer uses,
 *  so the admin preview faithfully mirrors what visitors will see. */
function SkillRow({
  item,
  categories,
}: {
  item: SkillDoc;
  categories: CategoryDoc[];
}) {
  const Icon = item.iconImage
    ? null
    : (getSkillIcon(item.name) ?? FallbackSkillIcon);
  const categoryLabel =
    categories.find((c) => c.slug === item.category)?.name ?? item.category;

  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border/70 bg-card/60">
        {item.iconImage ? (
          <img src={item.iconImage} alt="" className="h-7 w-7 object-contain" />
        ) : Icon ? (
          <Icon className="h-5 w-5 text-muted-foreground" />
        ) : null}
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">
          {item.name}{' '}
          <span className="chip ml-1 normal-case">{categoryLabel}</span>
        </p>
        <div className="mt-1.5 h-1.5 w-40 overflow-hidden rounded-full bg-bg-elevated">
          <div
            className="h-full bg-neon-gradient"
            style={{ width: `${item.level}%` }}
          />
        </div>
      </div>
    </div>
  );
}
