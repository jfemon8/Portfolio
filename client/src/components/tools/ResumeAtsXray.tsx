import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import AutoTextarea from '@/components/shared/AutoTextarea';
import { cn } from '@/lib/cn';
import {
  parseResume,
  detectHazards,
  compareKeywords,
  type ParsedResume,
  type AtsHazard,
  type KeywordOverlap,
  type KeywordHit,
} from '@/lib/resumeParser';

type Status = 'idle' | 'parsing' | 'done' | 'error';

export default function ResumeAtsXray() {
  const [status, setStatus] = useState<Status>('idle');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [hazards, setHazards] = useState<AtsHazard[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const keywordOverlap: KeywordOverlap | null =
    resume && jobDescription.trim()
      ? compareKeywords(resume.fullText, jobDescription)
      : null;

  const handleFile = async (file: File): Promise<void> => {
    const isSupported =
      file.type === 'application/pdf' ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      /\.(pdf|docx)$/i.test(file.name);
    if (!isSupported) {
      setError('Please upload a .pdf or .docx file.');
      setStatus('error');
      return;
    }
    setFileName(file.name);
    setStatus('parsing');
    setError(null);
    try {
      const parsed = await parseResume(file);
      setResume(parsed);
      setHazards(detectHazards(parsed));
      setStatus('done');
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not read this file: ${err.message}`
          : 'Could not read this file.'
      );
      setStatus('error');
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-bg-elevated/40 p-3.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 translate-y-0.5 text-neon" />
        <p>
          Your resume is never uploaded anywhere. Everything below, including
          the match score is counted from your own text.
        </p>
      </div>

      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/70 p-8 text-center transition-colors hover:border-primary/40',
          status === 'parsing' && 'pointer-events-none opacity-60'
        )}
      >
        <Upload className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-foreground">
          {fileName || 'Drop your Resume/CV here, or click to choose a file'}
        </p>
        <p className="text-2xs text-muted-foreground/70">PDF or DOCX</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>

      {status === 'parsing' && (
        <p className="mt-3 text-sm text-muted-foreground">Reading file…</p>
      )}

      {error && (
        <div className="mt-4 flex gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5">
          <AlertTriangle className="h-4 w-4 shrink-0 translate-y-0.5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {status === 'done' && resume && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-6 space-y-5"
        >
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              What an ATS would actually extract
            </h3>
            <p className="mt-1 text-2xs text-muted-foreground/70">
              {resume.fullText.trim().length.toLocaleString()} characters across{' '}
              {resume.pageCount} page
              {resume.pageCount === 1 ? '' : 's'} — in the same order a real
              parser would read them.
            </p>
            <pre
              // Without this the smooth-scroll provider eats the wheel and the page moves instead of this box.
              data-lenis-prevent
              tabIndex={0}
              className="mt-2 max-h-64 overflow-auto overscroll-contain whitespace-pre-wrap rounded-lg border border-border/60 bg-bg-elevated/50 p-3 font-mono text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
            >
              {resume.fullText.trim() || '(no text could be extracted)'}
            </pre>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Parsing hazards
            </h3>
            {hazards.length === 0 ? (
              <div className="mt-2 flex items-center gap-2 text-sm text-neon">
                <CheckCircle2 className="h-4 w-4" />
                No common ATS parsing hazards detected.
              </div>
            ) : (
              <ul className="mt-2 space-y-2">
                {hazards.map((h) => (
                  <li
                    key={h.message}
                    className={cn(
                      'flex gap-2 rounded-lg border p-2.5 text-xs',
                      h.severity === 'high'
                        ? 'border-destructive/40 bg-destructive/10 text-destructive'
                        : 'border-amber-400/40 bg-amber-400/10 text-amber-400'
                    )}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 translate-y-0.5" />
                    <span>{h.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="label" htmlFor="ats-jd">
              Paste a job description{' '}
              <span className="normal-case text-muted-foreground/60">
                (optional — checks which keywords your resume actually contains)
              </span>
            </label>
            <AutoTextarea
              id="ats-jd"
              // Caps the auto-grow; overflow-auto beats AutoTextarea's overflow-hidden via tailwind-merge.
              data-lenis-prevent
              className="input mt-1.5 max-h-64 min-h-24 overflow-auto overscroll-contain text-xs"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job posting text here…"
            />
          </div>

          {keywordOverlap && (
            <>
              <MatchScore overlap={keywordOverlap} />
              <div className="grid gap-4 sm:grid-cols-2">
                <KeywordColumn
                  tone="matched"
                  title="Found in your resume"
                  hits={keywordOverlap.matched}
                />
                <KeywordColumn
                  tone="missing"
                  title="Missing from your resume"
                  hits={keywordOverlap.missing}
                />
              </div>
            </>
          )}

          <p className="flex items-start gap-1.5 text-2xs text-muted-foreground/70">
            <FileText className="h-3 w-3 shrink-0 translate-y-0.5" />
            This is a simple keyword/layout check, not a real ATS — different
            systems parse differently, and this can't tell you how a human
            recruiter will react. Treat it as a sanity check, not a verdict.
          </p>
        </motion.div>
      )}
    </GlassCard>
  );
}

function MatchScore({ overlap }: { overlap: KeywordOverlap }) {
  const { skillMatchPercent, matchedSkillCount, totalSkillCount } = overlap;

  if (skillMatchPercent === null) {
    return (
      <div className="rounded-xl border border-border/60 bg-bg-elevated/40 p-3.5 text-xs text-muted-foreground">
        No recognisable skills or technologies were found in this job
        description, so there's nothing concrete to score against yet.
      </div>
    );
  }

  const band =
    skillMatchPercent >= 70
      ? { label: 'Strong match', text: 'text-neon', bar: 'bg-neon' }
      : skillMatchPercent >= 40
        ? {
            label: 'Partial match',
            text: 'text-amber-400',
            bar: 'bg-amber-400',
          }
        : {
            label: 'Weak match',
            text: 'text-destructive',
            bar: 'bg-destructive',
          };

  return (
    <div className="rounded-xl border border-border/60 bg-bg-elevated/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-semibold text-foreground">
          Skill match
          <span className={cn('ml-2 text-xs font-semibold', band.text)}>
            {band.label}
          </span>
        </p>
        <p className={cn('text-2xl font-bold tabular-nums', band.text)}>
          {skillMatchPercent}%
        </p>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${skillMatchPercent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn('h-full rounded-full', band.bar)}
        />
      </div>

      <p className="mt-2 text-2xs text-muted-foreground/70">
        Your resume contains {matchedSkillCount} of the {totalSkillCount} skills
        and technologies this posting names.
      </p>
    </div>
  );
}

function KeywordColumn({
  tone,
  title,
  hits,
}: {
  tone: 'matched' | 'missing';
  title: string;
  hits: KeywordHit[];
}) {
  const [showOthers, setShowOthers] = useState(false);
  const skills = hits.filter((h) => h.isSkill);
  const others = hits.filter((h) => !h.isSkill);
  const isMatched = tone === 'matched';

  return (
    <div>
      <p
        className={cn(
          'flex items-center gap-1.5 text-xs font-semibold',
          isMatched ? 'text-neon' : 'text-amber-400'
        )}
      >
        {isMatched ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <XCircle className="h-3.5 w-3.5" />
        )}
        {title} ({skills.length})
      </p>

      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {skills.length === 0 && (
          <span className="text-2xs text-muted-foreground/60">
            No skills or technologies {isMatched ? 'matched' : 'missing'}.
          </span>
        )}
        {skills.map((h) => (
          <span
            key={h.term}
            className={cn(
              'rounded-full px-2 py-0.5 text-2xs',
              isMatched
                ? 'bg-neon/10 text-neon'
                : 'bg-amber-400/10 text-amber-400'
            )}
          >
            {h.term}
          </span>
        ))}
      </div>

      {others.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowOthers((v) => !v)}
            className="text-2xs text-muted-foreground/70 underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            {showOthers ? 'Hide' : 'Show'} {others.length} other word
            {others.length === 1 ? '' : 's'}
          </button>
          {showOthers && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {others.map((h) => (
                <span
                  key={h.term}
                  className="rounded-full bg-bg-elevated/70 px-2 py-0.5 text-2xs text-muted-foreground/70"
                >
                  {h.term}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
