import { useRef, useState } from 'react';
import {
  Award,
  Trophy,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  type LucideIcon,
} from 'lucide-react';
import { Section, SectionHeading } from '@/components/shared/Section';
import { useSectionCopy } from '@/hooks/useSectionCopy';
import Reveal from '@/components/motion/Reveal';
import GlassCard from '@/components/shared/GlassCard';
import Lightbox from '@/components/shared/Lightbox';
import PdfPreviewModal, {
  type PdfPreviewTarget,
} from '@/components/shared/PdfPreviewModal';
import Async from '@/components/ui/Async';
import { CredentialsColumnSkeleton } from '@/components/ui/Skeletons';
import { useCertifications } from '@/hooks/usePortfolio';
import { isPdfUrl } from '@/lib/media';
import { formatDate } from '@/lib/date';

interface ColumnItem {
  id: string;
  title: string;
  meta?: string;
  desc?: string;
  url?: string;
  mediaUrl?: string;
}

function Column({
  icon: Icon,
  title,
  items,
  delay,
  mediaLabel,
  onOpenMedia,
}: {
  icon: LucideIcon;
  title: string;
  items: ColumnItem[];
  delay: number;
  /** Noun used in the "View … for X" aria-label (e.g. "certificate"). */
  mediaLabel: string;
  onOpenMedia: (item: ColumnItem, trigger: HTMLElement) => void;
}) {
  return (
    <Reveal delay={delay}>
      <GlassCard interactive className="h-full w-0 min-w-full p-4">
        <h3 className="mb-4 flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-wider text-neon">
          <Icon className="h-4 w-4" /> {title}
        </h3>
        <ul className="space-y-4">
          {items.map((it) => {
            // Title priority: media opens the viewer, credential URL opens in a new tab, otherwise plain text.
            const titleClass =
              'group/title inline-flex items-center gap-1 text-left text-sm font-medium text-foreground transition-colors hover:text-neon';
            const iconClass =
              'mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60 transition-opacity group-hover/title:opacity-100';
            return (
              <li key={it.id} className="border-l-2 border-border/70 pl-2">
                {it.mediaUrl ? (
                  <button
                    type="button"
                    onClick={(e) => onOpenMedia(it, e.currentTarget)}
                    aria-label={`View ${mediaLabel} for ${it.title}`}
                    className={titleClass}
                  >
                    <span className="underline-offset-2 group-hover/title:underline">
                      {it.title}
                    </span>
                    {isPdfUrl(it.mediaUrl) ? (
                      <FileText className={iconClass} />
                    ) : (
                      <ImageIcon className={iconClass} />
                    )}
                  </button>
                ) : it.url ? (
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open verification link for ${it.title}`}
                    className={titleClass}
                  >
                    <span className="underline-offset-2 group-hover/title:underline">
                      {it.title}
                    </span>
                    <ExternalLink className={iconClass} />
                  </a>
                ) : (
                  <p className="text-sm font-medium text-foreground">
                    {it.title}
                  </p>
                )}
                {it.meta && (
                  <p className="text-xs text-muted-foreground/70">{it.meta}</p>
                )}
                {it.desc && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground/70 line-clamp-2">
                    {it.desc}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </GlassCard>
    </Reveal>
  );
}

export default function Credentials() {
  const certificationsQuery = useCertifications();
  const all = certificationsQuery.data?.data ?? [];

  const [lightbox, setLightbox] = useState<{
    url: string;
    caption?: string;
  } | null>(null);
  const [pdfTarget, setPdfTarget] = useState<PdfPreviewTarget | null>(null);
  // Credential URL of the open item, surfaced as a "Verify" action in the modal.
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  // Element that opened the viewer — focus returns here on close (WCAG 2.4.3).
  const triggerRef = useRef<HTMLElement | null>(null);

  const openMedia = (item: ColumnItem, trigger: HTMLElement): void => {
    if (!item.mediaUrl) return;
    triggerRef.current = trigger;
    setVerifyUrl(item.url ?? null);
    if (isPdfUrl(item.mediaUrl)) {
      setPdfTarget({ fileUrl: item.mediaUrl, title: item.title });
    } else {
      setLightbox({ url: item.mediaUrl, caption: item.title });
    }
  };

  const verifyAction = verifyUrl
    ? { href: verifyUrl, label: 'Verify' }
    : undefined;

  const restoreFocus = (): void => {
    triggerRef.current?.focus();
    triggerRef.current = null;
  };

  const toItem = (c: (typeof all)[number]): ColumnItem => ({
    id: c._id,
    title: c.title,
    meta: [c.issuer, formatDate(c.issueDate)].filter(Boolean).join(' · '),
    desc: c.description,
    url: c.credentialUrl || undefined,
    mediaUrl: c.mediaUrl || undefined,
  });

  const certs = all.filter((c) => c.category === 'certification').map(toItem);
  const achievements = all
    .filter((c) => c.category === 'achievement')
    .map(toItem);
  const copy = useSectionCopy('credentials', {
    index: '06.',
    title: 'Credentials',
    subtitle: 'Certifications & achievements.',
  });

  return (
    <Section id="credentials">
      <SectionHeading
        index={copy.index}
        title={copy.title}
        subtitle={copy.subtitle}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Async
          query={certificationsQuery}
          select={(r) => r.data}
          skeleton={<CredentialsColumnSkeleton count={2} />}
          stateClass="col-span-full"
        >
          {() => (
            <>
              <Column
                icon={Award}
                title="Certifications"
                items={certs}
                delay={0}
                mediaLabel="certificate"
                onOpenMedia={openMedia}
              />
              <Column
                icon={Trophy}
                title="Achievements"
                items={achievements}
                delay={0.08}
                mediaLabel="attachment"
                onOpenMedia={openMedia}
              />
            </>
          )}
        </Async>
      </div>

      <Lightbox
        images={lightbox ? [lightbox] : []}
        open={!!lightbox}
        action={verifyAction}
        onClose={() => {
          setLightbox(null);
          restoreFocus();
        }}
      />
      <PdfPreviewModal
        target={pdfTarget}
        action={verifyAction}
        onClose={() => {
          setPdfTarget(null);
          restoreFocus();
        }}
      />
    </Section>
  );
}
