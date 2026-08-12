import { splitAddress, isStructurallyValid } from './extract';
import {
  classifyAddress,
  type EmailFlags,
  type EmailVerdict,
} from './classify';
import { lookupDomain, type DomainInfo } from './dns';

export interface VerifiedEmail {
  email: string;
  verdict: EmailVerdict;
  reason: string;
  domain: string;
  flags: EmailFlags;
  domainInfo: DomainInfo | null;
}

const SYNTAX_FAILURE: EmailFlags = {
  disposable: false,
  role: false,
  freeProvider: false,
  gibberish: false,
  suggestion: null,
};

// Ordered worst-first: the first match decides, so a disposable address never reads as just a role account.
function decide(
  flags: EmailFlags,
  info: DomainInfo
): {
  verdict: EmailVerdict;
  reason: string;
} {
  if (info.status === 'nxdomain') {
    return { verdict: 'invalid', reason: 'Domain does not exist' };
  }
  if (info.status === 'null-mx') {
    return {
      verdict: 'invalid',
      reason: 'Domain explicitly accepts no mail (null MX)',
    };
  }
  if (info.status === 'no-mx') {
    return { verdict: 'invalid', reason: 'Domain has no mail server' };
  }
  if (flags.disposable) {
    // Typo-squat domains are often on the disposable list too; the suggestion is the more actionable half.
    const hint = flags.suggestion ? ` — did you mean ${flags.suggestion}?` : '';
    return {
      verdict: 'risky',
      reason: `Disposable / temporary address${hint}`,
    };
  }
  if (flags.suggestion) {
    return {
      verdict: 'risky',
      reason: `Likely typo — did you mean ${flags.suggestion}?`,
    };
  }
  if (flags.role) {
    return { verdict: 'risky', reason: 'Role account, not a person' };
  }
  if (flags.gibberish) {
    return { verdict: 'risky', reason: 'Randomly generated-looking address' };
  }
  // After the address-level signals: a known disposable/typo domain is worth reporting even when DNS was inconclusive.
  if (info.status === 'lookup-failed') {
    return { verdict: 'unknown', reason: 'DNS lookup failed — try again' };
  }
  if (info.status === 'a-record-only') {
    return {
      verdict: 'risky',
      reason: 'No MX record; mail may fall back to the A record',
    };
  }
  return { verdict: 'valid', reason: 'Domain accepts mail' };
}

export function verifySyntaxOnly(email: string): VerifiedEmail | null {
  const parts = splitAddress(email);
  if (!parts || !isStructurallyValid(parts.local, parts.domain)) {
    return {
      email,
      verdict: 'invalid',
      reason: 'Malformed address',
      domain: parts?.domain ?? '',
      flags: SYNTAX_FAILURE,
      domainInfo: null,
    };
  }
  return null;
}

export interface VerifyProgress {
  done: number;
  total: number;
}

// Verification is per-domain, not per-address — deduplicating here removes ~98% of the network work on real lists.
export async function verifyEmails(
  emails: string[],
  options: {
    concurrency?: number;
    onProgress?: (progress: VerifyProgress) => void;
    shouldStop?: () => boolean;
  } = {}
): Promise<VerifiedEmail[]> {
  const { concurrency = 16, onProgress, shouldStop } = options;

  const parsed = emails.map((email) => {
    const syntaxFailure = verifySyntaxOnly(email);
    const parts = splitAddress(email);
    return { email, syntaxFailure, parts };
  });

  const domains = [
    ...new Set(
      parsed
        .filter((p) => !p.syntaxFailure && p.parts)
        .map((p) => p.parts!.domain.toLowerCase())
    ),
  ];

  const cache = new Map<string, DomainInfo>();
  let done = 0;
  let cursor = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, domains.length) },
    async () => {
      for (;;) {
        if (shouldStop?.()) return;
        const index = cursor++;
        if (index >= domains.length) return;
        const domain = domains[index]!;
        cache.set(domain, await lookupDomain(domain));
        done++;
        onProgress?.({ done, total: domains.length });
      }
    }
  );
  await Promise.all(workers);

  return parsed.map(({ email, syntaxFailure, parts }) => {
    if (syntaxFailure) return syntaxFailure;
    const { local, domain } = parts!;
    const lower = domain.toLowerCase();
    const flags = classifyAddress(local, lower);
    const info = cache.get(lower) ?? {
      status: 'lookup-failed' as const,
      mxHosts: [],
      provider: null,
    };
    const { verdict, reason } = decide(flags, info);
    return { email, verdict, reason, domain: lower, flags, domainInfo: info };
  });
}
