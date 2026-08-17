import PrefetchLink from '@/components/shared/PrefetchLink';
import type { ToolDoc } from '@/types';

/** Internal links between sibling tools, so each page is a route onward rather than a dead end for crawlers. */
export default function RelatedTools({ tools }: { tools: ToolDoc[] }) {
  if (!tools.length) return null;

  return (
    <section aria-labelledby="tool-related" className="mt-4">
      <h2
        id="tool-related"
        className="text-xl font-bold tracking-tight text-foreground"
      >
        Related free tools
      </h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {tools.map((tool) => (
          <PrefetchLink
            key={tool._id}
            to={`/tools/${tool.slug}`}
            className="glass-thin rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-neon"
          >
            {tool.name}
          </PrefetchLink>
        ))}
      </div>
    </section>
  );
}
