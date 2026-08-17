import toast from 'react-hot-toast';
import {
  Check,
  CircleDashed,
  Bookmark,
  EyeOff,
  StickyNote,
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import { useConfirm } from '@/components/admin/ConfirmModal';
import { useJobTracker, trackerStats } from '@/stores/jobTracker';
import { cn } from '@/lib/cn';

/** Stops a control's click from bubbling to a card that navigates on click. */
const swallow = (event: React.MouseEvent): void => event.stopPropagation();

/** The applied badge: info "Mark as Applied" → click → complete "Applied" → click → confirm-revoke → info. */
export function AppliedBadge({ jobId }: { jobId: string }) {
  const confirm = useConfirm();
  const applied = useJobTracker((s) => s.isApplied(jobId));
  const toggle = useJobTracker((s) => s.toggleApplied);

  const onClick = async (event: React.MouseEvent): Promise<void> => {
    event.stopPropagation();
    if (!applied) {
      toggle(jobId);
      return;
    }
    const ok = await confirm({
      title: 'Revoke application?',
      message: 'Are you sure to revoke the application?',
      confirmLabel: 'Revoke',
      variant: 'danger',
    });
    if (ok) toggle(jobId);
  };

  return (
    <button
      type="button"
      onClick={(e) => void onClick(e)}
      aria-pressed={applied}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-semibold transition-colors',
        applied
          ? 'border-neon/50 bg-neon/10 text-neon'
          : 'border-border/70 text-muted-foreground hover:border-primary/40 hover:text-primary'
      )}
    >
      {applied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <CircleDashed className="h-3.5 w-3.5" />
      )}
      {applied ? 'Applied' : 'Mark as Applied'}
    </button>
  );
}

/** Save / bookmark toggle, distinct from applied. */
export function SaveButton({ jobId }: { jobId: string }) {
  const saved = useJobTracker((s) => s.isSaved(jobId));
  const toggle = useJobTracker((s) => s.toggleSaved);
  return (
    <button
      type="button"
      onClick={(e) => {
        swallow(e);
        toggle(jobId);
      }}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved' : 'Save for later'}
      title={saved ? 'Saved' : 'Save for later'}
      className={cn(
        'grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors',
        saved
          ? 'border-neon/50 bg-neon/10 text-neon'
          : 'border-border/70 text-muted-foreground hover:border-primary/40 hover:text-primary'
      )}
    >
      <Bookmark className={cn('h-4 w-4', saved && 'fill-current')} />
    </button>
  );
}

/** Hides a job from the board, with an undo toast so a mis-tap is one click to reverse. */
export function HideButton({ jobId }: { jobId: string }) {
  const setHidden = useJobTracker((s) => s.setHidden);
  const onHide = (event: React.MouseEvent): void => {
    event.stopPropagation();
    setHidden(jobId, true);
    toast(
      (t) => (
        <span className="flex items-center gap-3 text-sm">
          Hidden
          <button
            type="button"
            onClick={() => {
              setHidden(jobId, false);
              toast.dismiss(t.id);
            }}
            className="font-semibold text-neon underline-offset-2 hover:underline"
          >
            Undo
          </button>
        </span>
      ),
      { duration: 5000 }
    );
  };
  return (
    <button
      type="button"
      onClick={onHide}
      aria-label="Hide this job"
      title="Not interested"
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
    >
      <EyeOff className="h-4 w-4" />
    </button>
  );
}

/** Detail-page only: a private per-job note plus a small tally of how many jobs are tracked on this device. */
export function JobTrackerNote({ jobId }: { jobId: string }) {
  const setNote = useJobTracker((s) => s.setNote);
  // Select the stable entries reference and derive here, so the selector never returns a fresh object.
  const entries = useJobTracker((s) => s.entries);
  const note = entries[jobId]?.note ?? '';
  const stats = trackerStats(entries);

  return (
    <GlassCard className="mt-6 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <StickyNote className="h-4 w-4 text-neon" /> Your private note
        </h2>
        <span className="text-2xs text-muted-foreground/70">
          {stats.applied} Applied · {stats.saved} Saved
        </span>
      </div>
      {/* Kept only on this device (and synced to its own code) — never shown to anyone else. */}
      <textarea
        value={note}
        onChange={(e) => setNote(jobId, e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Referral contact, portal login, follow-up date…"
        className="input mt-3 resize-y text-sm"
      />
    </GlassCard>
  );
}
