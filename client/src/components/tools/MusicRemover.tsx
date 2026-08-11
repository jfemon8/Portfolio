import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { ShieldCheck, Upload, Loader2, Download, Mic2 } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { encodeWav } from '@/lib/audio/wavEncoder';
import { phaseCancelInstrumental } from '@/lib/audio/phaseCancel';
import type { WorkerMessage } from '@/workers/vocalRemover.types';

const TARGET_SAMPLE_RATE = 44100;
const MAX_DURATION_SECONDS = 10 * 60;

type Stage =
  | 'idle'
  | 'decoding'
  | 'ready'
  | 'loading-model'
  | 'processing'
  | 'done'
  | 'error';

interface DecodedAudio {
  channelData: Float32Array[];
  sampleRate: number;
  fileName: string;
}

interface ResultAudio {
  vocalsUrl: string;
  instrumentalUrl: string;
}

function formatBytes(n: number): string {
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MusicRemover() {
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<DecodedAudio | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [quickPreviewUrl, setQuickPreviewUrl] = useState<string | null>(null);
  const [modelProgress, setModelProgress] = useState<{
    loaded: number;
    total: number;
  } | null>(null);
  const [chunkProgress, setChunkProgress] = useState<{
    chunk: number;
    total: number;
  } | null>(null);
  const [result, setResult] = useState<ResultAudio | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: revoke every URL accumulated by unmount, not a stale snapshot from mount.
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const trackUrl = (url: string): string => {
    objectUrlsRef.current.push(url);
    return url;
  };

  const handleFile = async (file: File): Promise<void> => {
    setStage('decoding');
    setError(null);
    setResult(null);
    setQuickPreviewUrl(null);
    setOriginalUrl(trackUrl(URL.createObjectURL(file)));
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      if (audioBuffer.duration > MAX_DURATION_SECONDS) {
        await audioCtx.close();
        throw new Error(
          `This track is ${Math.round(audioBuffer.duration / 60)} minutes long — please use one under ${MAX_DURATION_SECONDS / 60} minutes so processing stays reasonable.`
        );
      }

      let finalBuffer = audioBuffer;
      if (audioBuffer.sampleRate !== TARGET_SAMPLE_RATE) {
        const offlineCtx = new OfflineAudioContext(
          audioBuffer.numberOfChannels,
          Math.ceil(audioBuffer.duration * TARGET_SAMPLE_RATE),
          TARGET_SAMPLE_RATE
        );
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start();
        finalBuffer = await offlineCtx.startRendering();
      }
      await audioCtx.close();

      const channelData: Float32Array[] = [];
      for (let i = 0; i < finalBuffer.numberOfChannels; i++) {
        channelData.push(finalBuffer.getChannelData(i).slice());
      }

      setDecoded({
        channelData,
        sampleRate: finalBuffer.sampleRate,
        fileName: file.name,
      });

      const quick = phaseCancelInstrumental(channelData);
      if (quick) {
        setQuickPreviewUrl(
          trackUrl(
            URL.createObjectURL(encodeWav([quick], finalBuffer.sampleRate))
          )
        );
      }

      setStage('ready');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not read this audio file.'
      );
      setStage('error');
    }
  };

  const handleSeparate = (): void => {
    if (!decoded) return;
    setStage('loading-model');
    setError(null);
    setModelProgress(null);
    setChunkProgress(null);

    const worker = new Worker(
      new URL('../../workers/vocalRemover.worker.ts', import.meta.url),
      {
        type: 'module',
      }
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data;
      if (msg.type === 'model-progress') {
        setModelProgress({ loaded: msg.loaded, total: msg.total });
      } else if (msg.type === 'processing-progress') {
        setStage('processing');
        setChunkProgress({ chunk: msg.chunk, total: msg.totalChunks });
      } else if (msg.type === 'result') {
        setResult({
          vocalsUrl: trackUrl(
            URL.createObjectURL(encodeWav(msg.vocals, msg.sampleRate))
          ),
          instrumentalUrl: trackUrl(
            URL.createObjectURL(encodeWav(msg.instrumental, msg.sampleRate))
          ),
        });
        setStage('done');
        toast.success('Separation complete');
        worker.terminate();
        workerRef.current = null;
      } else if (msg.type === 'error') {
        setError(msg.message);
        setStage('error');
        worker.terminate();
        workerRef.current = null;
      }
    };

    worker.onerror = () => {
      setError('The separation worker crashed unexpectedly. Please try again.');
      setStage('error');
      workerRef.current = null;
    };

    worker.postMessage({
      type: 'separate',
      channelData: decoded.channelData,
      sampleRate: decoded.sampleRate,
    });
  };

  const busy =
    stage === 'decoding' || stage === 'loading-model' || stage === 'processing';

  return (
    <GlassCard className="p-6">
      <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-bg-elevated/40 p-3.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 translate-y-0.5 text-neon" />
        <p>
          Your song is processed entirely in your browser and never uploaded
          anywhere. The first run downloads a ~67MB separation model (cached
          after that), so it takes a minute or two — genuinely running the
          model, not a canned demo.
        </p>
      </div>

      <div
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !busy && fileInputRef.current?.click()}
        className={cn(
          'mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/70 p-8 text-center transition-colors hover:border-primary/40',
          busy && 'pointer-events-none opacity-60'
        )}
      >
        <Upload className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-foreground">
          {decoded?.fileName || 'Drop a song here, or click to choose a file'}
        </p>
        <p className="text-2xs text-muted-foreground/70">MP3, WAV, M4A, OGG</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>

      {stage === 'decoding' && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Reading audio…
        </p>
      )}

      {error && (
        <div className="mt-4 flex gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {originalUrl && stage !== 'decoding' && (
        <div className="mt-5">
          <p className="label">Original</p>
          <audio controls src={originalUrl} className="mt-1.5 w-full" />
        </div>
      )}

      {quickPreviewUrl && (stage === 'ready' || busy) && (
        <div className="mt-4">
          <p className="label">
            Instant preview (rough — not real vocal isolation)
          </p>
          <audio controls src={quickPreviewUrl} className="mt-1.5 w-full" />
          <p className="mt-1 text-2xs text-muted-foreground/70">
            Cancels whatever's identical in both channels — usually most of the
            vocal, but also centered bass/drums. Free and instant while the real
            model works below.
          </p>
        </div>
      )}

      {stage === 'ready' && (
        <Button onClick={handleSeparate} className="mt-5 w-full sm:w-auto">
          <Mic2 className="h-4 w-4" />
          Separate Vocals
        </Button>
      )}

      {stage === 'loading-model' && (
        <div className="mt-5">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {modelProgress
              ? `Downloading separation model — ${formatBytes(modelProgress.loaded)} / ${formatBytes(modelProgress.total)}`
              : 'Starting up the separation model…'}
          </p>
          {modelProgress && modelProgress.total > 0 && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
              <div
                className="h-full bg-neon transition-all"
                style={{
                  width: `${(modelProgress.loaded / modelProgress.total) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {stage === 'processing' && (
        <div className="mt-5">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {chunkProgress
              ? `Separating — segment ${chunkProgress.chunk} of ${chunkProgress.total}`
              : 'Separating…'}
          </p>
          {chunkProgress && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
              <div
                className="h-full bg-neon transition-all"
                style={{
                  width: `${(chunkProgress.chunk / chunkProgress.total) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {stage === 'done' && result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-6 space-y-5"
        >
          <div>
            <p className="label">Vocals</p>
            <audio controls src={result.vocalsUrl} className="mt-1.5 w-full" />
            <a
              href={result.vocalsUrl}
              download="vocals.wav"
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-neon hover:underline"
            >
              <Download className="h-3.5 w-3.5" /> Download vocals.wav
            </a>
          </div>
          <div>
            <p className="label">Instrumental</p>
            <audio
              controls
              src={result.instrumentalUrl}
              className="mt-1.5 w-full"
            />
            <a
              href={result.instrumentalUrl}
              download="instrumental.wav"
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-neon hover:underline"
            >
              <Download className="h-3.5 w-3.5" /> Download instrumental.wav
            </a>
          </div>
          <p className="text-2xs text-muted-foreground/70">
            Real machine-learning separation (UVR-MDX-NET), not a filter — but a
            browser running one CPU core will never match a paid, GPU-backed
            service. Expect good results on typical pop/rock mixes and more
            bleed on dense or mono ones.
          </p>
        </motion.div>
      )}

      <p className="mt-6 text-2xs text-muted-foreground/60">
        Vocal separation model: UVR-MDX-NET by Anjok07 &amp; aufr33 (MIT
        license).
      </p>
    </GlassCard>
  );
}
