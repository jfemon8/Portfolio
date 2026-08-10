import { useState } from 'react';
import { Trophy, Swords } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/States';
import { api } from '@/lib/api';

interface CpEntry {
  handle: string;
  rating: number | null;
  maxRating: number | null;
  rank: string;
  maxRank: string;
  contests: number;
  error?: string;
}

interface CompareResponse {
  success: boolean;
  data: { a: CpEntry; b: CpEntry };
}

function StatCard({ entry, winner }: { entry: CpEntry; winner: boolean }) {
  if (entry.error) {
    return (
      <GlassCard className="p-5 text-center">
        <p className="font-mono text-sm font-semibold text-foreground">
          {entry.handle}
        </p>
        <p className="mt-2 text-sm text-neon-pink">{entry.error}</p>
      </GlassCard>
    );
  }
  return (
    <GlassCard
      className={`p-5 text-center ${winner ? 'ring-1 ring-neon/60' : ''}`}
    >
      {winner && (
        <Trophy className="mx-auto mb-1 h-5 w-5 text-neon" strokeWidth={2.25} />
      )}
      <p className="font-mono text-sm font-semibold text-foreground">
        {entry.handle}
      </p>
      <p className="mt-1 text-3xl font-extrabold text-neon">
        {entry.rating ?? '—'}
      </p>
      <p className="text-xs capitalize text-muted-foreground">
        {entry.rank || 'unrated'}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <div>
          <p className="font-semibold text-foreground">
            {entry.maxRating ?? '—'}
          </p>
          <p>Max rating</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">{entry.contests}</p>
          <p>Contests</p>
        </div>
      </div>
    </GlassCard>
  );
}

export default function CpProfileComparer() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [result, setResult] = useState<CompareResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onCompare = async (): Promise<void> => {
    if (!a.trim() || !b.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.get<CompareResponse>('/cp/compare', {
        params: { a: a.trim(), b: b.trim() },
      });
      setResult(res.data.data);
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Could not compare these handles right now.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const winnerSide =
    result && !result.a.error && !result.b.error
      ? (result.a.rating ?? -Infinity) >= (result.b.rating ?? -Infinity)
        ? 'a'
        : 'b'
      : null;

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <input
          className="input font-mono text-sm"
          placeholder="Codeforces handle A"
          value={a}
          onChange={(e) => setA(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void onCompare()}
        />
        <Swords className="h-5 w-5 shrink-0 text-muted-foreground" />
        <input
          className="input font-mono text-sm"
          placeholder="Codeforces handle B"
          value={b}
          onChange={(e) => setB(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void onCompare()}
        />
        <Button
          onClick={() => void onCompare()}
          disabled={loading || !a.trim() || !b.trim()}
          className="w-full shrink-0 sm:w-auto"
        >
          Compare
        </Button>
      </div>

      {loading && (
        <div className="mt-6">
          <Spinner />
        </div>
      )}
      {error && <p className="mt-4 text-sm text-neon-pink">{error}</p>}

      {result && !loading && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <StatCard entry={result.a} winner={winnerSide === 'a'} />
          <StatCard entry={result.b} winner={winnerSide === 'b'} />
        </div>
      )}
    </GlassCard>
  );
}
