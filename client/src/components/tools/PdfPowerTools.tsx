import { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import { cn } from '@/lib/cn';
import MergeTab from './pdf-power-tools/MergeTab';
import SplitTab from './pdf-power-tools/SplitTab';
import CompressTab from './pdf-power-tools/CompressTab';
import SignTab from './pdf-power-tools/SignTab';

const TABS = [
  { key: 'merge', label: 'Merge' },
  { key: 'split', label: 'Split' },
  { key: 'compress', label: 'Compress' },
  { key: 'sign', label: 'Sign' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function PdfPowerTools() {
  const [tab, setTab] = useState<TabKey>('merge');

  return (
    <GlassCard className="p-6">
      <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-bg-elevated/40 p-3.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 translate-y-0.5 text-neon" />
        <p>
          Every PDF you drop here is never uploaded anywhere. Merging,
          splitting, compressing, and signing all happen securely.
        </p>
      </div>

      <div role="tablist" className="mt-4 flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={cn(
                'relative rounded-full px-4 py-1.5 text-sm transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {active && (
                <motion.span
                  layoutId="pdf-power-tools-tab"
                  className="absolute inset-0 rounded-full border border-primary/40 bg-primary/10"
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                />
              )}
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mt-6"
      >
        {tab === 'merge' && <MergeTab />}
        {tab === 'split' && <SplitTab />}
        {tab === 'compress' && <CompressTab />}
        {tab === 'sign' && <SignTab />}
      </motion.div>
    </GlassCard>
  );
}
