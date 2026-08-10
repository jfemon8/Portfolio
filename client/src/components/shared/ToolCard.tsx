import { ArrowUpRight } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import PrefetchLink from '@/components/shared/PrefetchLink';
import { TOOL_ICONS } from '@/lib/toolIcon';
import type { ToolDoc } from '@/types';

export default function ToolCard({
  tool,
  categoryLabel,
}: {
  tool: ToolDoc;
  categoryLabel?: string;
}) {
  const href = `/tools/${tool.slug}`;
  const Icon = TOOL_ICONS[tool.icon];

  return (
    <PrefetchLink to={href} className="group block h-full">
      <GlassCard interactive className="flex h-full flex-col p-5">
        <div className="flex items-center justify-between">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-border/60 bg-background/40 text-neon">
            {Icon && <Icon className="h-5 w-5" />}
          </span>
          <span className="rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-2xs text-muted-foreground backdrop-blur-md">
            {categoryLabel ?? tool.category}
          </span>
        </div>

        <h3 className="mt-4 text-lg font-bold text-foreground transition-colors group-hover:text-neon">
          {tool.name}
        </h3>
        <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
          {tool.description}
        </p>

        <span className="mt-4 flex items-center gap-1 text-sm font-medium text-neon">
          Open <ArrowUpRight className="h-4 w-4" />
        </span>
      </GlassCard>
    </PrefetchLink>
  );
}
