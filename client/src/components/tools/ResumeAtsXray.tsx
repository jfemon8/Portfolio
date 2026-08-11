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
          Your resume is parsed entirely in your browser and never uploaded
          anywhere. This shows exactly what a real ATS text-extraction step
          would see — not an invented percentage.
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
          {fileName || 'Drop your resume here, or click to choose a file'}
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
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-bg-elevated/50 p-3 font-mono text-xs text-muted-foreground">
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
              className="input mt-1.5 min-h-24 text-xs"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job posting text here…"
            />
          </div>

          {keywordOverlap && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-neon">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Found in your resume ({keywordOverlap.matched.length})
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {keywordOverlap.matched.map((w) => (
                    <span
                      key={w}
                      className="rounded-full bg-neon/10 px-2 py-0.5 text-2xs text-neon"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <XCircle className="h-3.5 w-3.5" />
                  Missing from your resume ({keywordOverlap.missing.length})
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {keywordOverlap.missing.map((w) => (
                    <span
                      key={w}
                      className="rounded-full bg-amber-400/10 px-2 py-0.5 text-2xs text-amber-400"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            </div>
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
