// zxcvbn-ts is a sizeable dictionary-backed library (dozens of KB gzipped) — dynamically imported here rather than at the top level, so its cost is only ever paid by a visitor who actually opens the password tool, not bundled into every page.
import type { ZxcvbnFactory as ZxcvbnFactoryType } from '@zxcvbn-ts/core';

export interface PasswordAnalysis {
  score: 0 | 1 | 2 | 3 | 4;
  guesses: number;
  warning: string;
  suggestions: string[];
  // zxcvbn's own standard reference scenarios — well-established rate assumptions, not something this tool invented.
  crackTimes: {
    onlineThrottled: string;
    onlineUnthrottled: string;
    offlineSlowHash: string;
    offlineFastHash: string;
  };
}

let factoryPromise: Promise<ZxcvbnFactoryType> | null = null;

async function getFactory(): Promise<ZxcvbnFactoryType> {
  factoryPromise ??= (async () => {
    const [{ ZxcvbnFactory }, common, en] = await Promise.all([
      import('@zxcvbn-ts/core'),
      import('@zxcvbn-ts/language-common'),
      import('@zxcvbn-ts/language-en'),
    ]);
    return new ZxcvbnFactory({
      translations: en.translations,
      graphs: common.adjacencyGraphs,
      dictionary: {
        ...common.dictionary,
        ...en.dictionary,
      },
    });
  })();
  return factoryPromise;
}

export async function analyzePassword(
  password: string
): Promise<PasswordAnalysis> {
  const factory = await getFactory();
  const result = await factory.checkAsync(password);
  return {
    score: result.score,
    guesses: result.guesses,
    warning: result.feedback.warning ?? '',
    suggestions: result.feedback.suggestions,
    crackTimes: {
      onlineThrottled: result.crackTimes.onlineThrottlingXPerHour.display,
      onlineUnthrottled: result.crackTimes.onlineNoThrottlingXPerSecond.display,
      offlineSlowHash: result.crackTimes.offlineSlowHashingXPerSecond.display,
      offlineFastHash: result.crackTimes.offlineFastHashingXPerSecond.display,
    },
  };
}

// zxcvbn's own duration formatter isn't exported, so this is a small, self-contained equivalent for the live-measured scenario, which is computed outside the library (guesses / this device's actually-benchmarked rate).
export function formatCrackTime(seconds: number): string {
  if (seconds < 1) return 'less than a second';
  const MINUTE = 60;
  const HOUR = MINUTE * 60;
  const DAY = HOUR * 24;
  const MONTH = DAY * 31;
  const YEAR = MONTH * 12;
  const CENTURY = YEAR * 100;
  const pluralize = (value: number, unit: string): string =>
    `${value} ${unit}${value === 1 ? '' : 's'}`;
  if (seconds >= CENTURY) return 'centuries';
  if (seconds >= YEAR) return pluralize(Math.round(seconds / YEAR), 'year');
  if (seconds >= MONTH) return pluralize(Math.round(seconds / MONTH), 'month');
  if (seconds >= DAY) return pluralize(Math.round(seconds / DAY), 'day');
  if (seconds >= HOUR) return pluralize(Math.round(seconds / HOUR), 'hour');
  if (seconds >= MINUTE)
    return pluralize(Math.round(seconds / MINUTE), 'minute');
  return pluralize(Math.round(seconds), 'second');
}

export function crackTimeAtRate(
  guesses: number,
  hashesPerSecond: number
): number {
  return guesses / Math.max(hashesPerSecond, 1e-9);
}
