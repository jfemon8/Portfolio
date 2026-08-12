import { DISPOSABLE_DOMAINS } from './disposableDomains';

// RFC 2142 plus the shared-mailbox names that actually appear in scraped lists.
const ROLE_LOCALS = new Set([
  'abuse',
  'admin',
  'administrator',
  'billing',
  'careers',
  'compliance',
  'contact',
  'customerservice',
  'enquiries',
  'enquiry',
  'feedback',
  'finance',
  'ftp',
  'help',
  'helpdesk',
  'hostmaster',
  'hr',
  'info',
  'inquiries',
  'inquiry',
  'it',
  'jobs',
  'legal',
  'mail',
  'mailer-daemon',
  'marketing',
  'media',
  'newsletter',
  'noc',
  'no-reply',
  'noreply',
  'office',
  'orders',
  'postmaster',
  'press',
  'privacy',
  'recruitment',
  'root',
  'sales',
  'security',
  'service',
  'support',
  'sysadmin',
  'team',
  'usenet',
  'uucp',
  'webmaster',
  'welcome',
  'www',
]);

const FREE_PROVIDERS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.co.in',
  'ymail.com',
  'rocketmail.com',
  'hotmail.com',
  'hotmail.co.uk',
  'outlook.com',
  'live.com',
  'msn.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'pm.me',
  'zoho.com',
  'gmx.com',
  'gmx.net',
  'mail.com',
  'yandex.com',
  'yandex.ru',
  'tutanota.com',
  'fastmail.com',
  'hushmail.com',
  'inbox.com',
  'mail.ru',
  'qq.com',
  '163.com',
  '126.com',
  'rediffmail.com',
  'naver.com',
  'daum.net',
  'seznam.cz',
  'web.de',
  't-online.de',
]);

// Only the domains typo'd often enough to be worth a suggestion; a broad list produces confident nonsense.
const POPULAR_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'msn.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'gmx.com',
  'mail.com',
  'yandex.com',
  'fastmail.com',
  'comcast.net',
  'verizon.net',
  'att.net',
  'sbcglobal.net',
  'bellsouth.net',
  'cox.net',
  'charter.net',
  'earthlink.net',
  'optonline.net',
];

export type EmailVerdict = 'valid' | 'invalid' | 'risky' | 'unknown';

export interface EmailFlags {
  disposable: boolean;
  role: boolean;
  freeProvider: boolean;
  gibberish: boolean;
  suggestion: string | null;
}

function levenshtein(a: string, b: string, cutoff: number): number {
  if (Math.abs(a.length - b.length) > cutoff) return cutoff + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
      curr[j] = v;
      if (v < rowMin) rowMin = v;
    }
    // Whole row already past the cutoff, so the final distance can only be worse.
    if (rowMin > cutoff) return cutoff + 1;
    prev = curr;
  }
  return prev[b.length]!;
}

export function suggestDomain(domain: string): string | null {
  if (POPULAR_DOMAINS.includes(domain)) return null;
  let best: string | null = null;
  let bestDistance = 3;
  for (const candidate of POPULAR_DOMAINS) {
    const d = levenshtein(domain, candidate, 2);
    if (d < bestDistance) {
      bestDistance = d;
      best = candidate;
    }
  }
  return bestDistance <= 2 ? best : null;
}

// Random-looking local parts (few vowels, long consonant runs, high digit ratio) read as generated addresses.
export function looksGibberish(local: string): boolean {
  const cleaned = local.replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (cleaned.length < 10) return false;
  const letters = cleaned.replace(/[0-9]/g, '');
  if (letters.length < 6) return true;
  const vowelRatio = (letters.match(/[aeiou]/g) ?? []).length / letters.length;
  const longestConsonantRun = Math.max(
    0,
    ...(letters.match(/[^aeiou]+/g) ?? []).map((r) => r.length)
  );
  const digitRatio = (cleaned.match(/[0-9]/g) ?? []).length / cleaned.length;
  return vowelRatio < 0.22 || longestConsonantRun >= 6 || digitRatio > 0.6;
}

export function classifyAddress(local: string, domain: string): EmailFlags {
  return {
    disposable: DISPOSABLE_DOMAINS.has(domain),
    role: ROLE_LOCALS.has(local.toLowerCase().split('+')[0] ?? ''),
    freeProvider: FREE_PROVIDERS.has(domain),
    gibberish: looksGibberish(local),
    suggestion: suggestDomain(domain),
  };
}
