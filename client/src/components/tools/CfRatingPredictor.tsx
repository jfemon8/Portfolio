import { useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import Counter from '@/components/shared/Counter';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/States';
import { api } from '@/lib/api';
import type { ApiError } from '@/types';

interface PredictResponse {
  success: boolean;
  data: {
    handle: string;
    rank: number;
    currentRating: number;
    predictedDelta: number;
    predictedNewRating: number;
    contestantsConsidered: number;
  };
}

function StatSkeleton() {
  return (
    <GlassCard className="p-5 text-center">
      <Skeleton className="mx-auto h-3 w-16" />
      <Skeleton className="mx-auto mt-2 h-7 w-14" />
    </GlassCard>
  );
}

export default function CfRatingPredictor() {
  const [contestId, setContestId] = useState('');
  const [handle, setHandle] = useState('');
  const [result, setResult] = useState<PredictResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onPredict = async (): Promise<void> => {
    if (!contestId.trim() || !handle.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.get<PredictResponse>('/cp/predict', {
        params: { contestId: contestId.trim(), handle: handle.trim() },
      });
      setResult(res.data.data);
    } catch (e) {
      // api.ts's response interceptor already normalizes every rejection to ApiError ({status, message, details}) — not a raw AxiosError, so the message is read directly, not via .response.data.message.
      setError(
        (e as ApiError)?.message ??
          'Could not predict a delta for this contest/handle.'
      );
    } finally {
      setLoading(false);
    }
  };

  const DeltaIcon =
    result && result.predictedDelta > 0
      ? TrendingUp
      : result && result.predictedDelta < 0
        ? TrendingDown
        : Minus;
  const deltaColor =
    result && result.predictedDelta > 0
      ? 'text-neon'
      : result && result.predictedDelta < 0
        ? 'text-neon-pink'
        : 'text-muted-foreground';

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <input
          className="input font-mono text-sm sm:w-40"
          placeholder="Contest ID"
          inputMode="numeric"
          value={contestId}
          onChange={(e) => setContestId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void onPredict()}
        />
        <input
          className="input font-mono text-sm"
          placeholder="Your Codeforces handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void onPredict()}
        />
        <Button
          onClick={() => void onPredict()}
          disabled={loading || !contestId.trim() || !handle.trim()}
          className="w-full shrink-0 sm:w-auto"
        >
          Predict
        </Button>
      </div>
      <p className="mt-2 text-2xs text-muted-foreground/70">
        Works right after a contest finishes, before Codeforces runs its own
        official recalculation. This is an unofficial estimate
        (community-standard approximation), not a guaranteed match to the real
        delta. Contest ID is the number in a contest's URL, e.g.{' '}
        <code>codeforces.com/contest/1234</code> → 1234.
      </p>

      {loading && (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
      )}
      {error && <p className="mt-4 text-sm text-neon-pink">{error}</p>}

      {result && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 grid gap-4 sm:grid-cols-3"
        >
          <GlassCard className="p-4 text-center">
            <p className="text-2xs uppercase tracking-wide text-muted-foreground">
              Rank
            </p>
            <p className="mt-1 text-2xl font-extrabold text-foreground">
              #<Counter value={String(result.rank)} />
            </p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <p className="text-2xs uppercase tracking-wide text-muted-foreground">
              Predicted delta
            </p>
            <p
              className={`mt-1 flex items-center justify-center gap-1 text-2xl font-extrabold ${deltaColor}`}
            >
              <DeltaIcon className="h-5 w-5" />
              {result.predictedDelta > 0
                ? '+'
                : result.predictedDelta < 0
                  ? '-'
                  : ''}
              <Counter value={String(Math.abs(result.predictedDelta))} />
            </p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <p className="text-2xs uppercase tracking-wide text-muted-foreground">
              {result.currentRating} → New rating
            </p>
            <p className="mt-1 text-2xl font-extrabold text-neon">
              <Counter value={String(result.predictedNewRating)} />
            </p>
          </GlassCard>
        </motion.div>
      )}
    </GlassCard>
  );
}
