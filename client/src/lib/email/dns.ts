export type DomainStatus =
  | 'has-mx'
  | 'a-record-only'
  | 'null-mx'
  | 'no-mx'
  | 'nxdomain'
  | 'lookup-failed';

export interface DomainInfo {
  status: DomainStatus;
  mxHosts: string[];
  provider: string | null;
}

interface DohAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DohResponse {
  Status: number;
  Answer?: DohAnswer[];
}

const CLOUDFLARE = 'https://cloudflare-dns.com/dns-query';
const GOOGLE = 'https://dns.google/resolve';
const LOOKUP_TIMEOUT_MS = 8000;

// Identified from MX hostnames so the result explains who actually runs the mailbox.
const PROVIDER_PATTERNS: [RegExp, string][] = [
  [/aspmx.*\.google(mail)?\.com|google\.com$/i, 'Google Workspace'],
  [/\.outlook\.com$|protection\.outlook\.com$/i, 'Microsoft 365'],
  [/\.zoho\.(com|eu)$/i, 'Zoho'],
  [/\.yandex\.net$/i, 'Yandex'],
  [/\.mimecast\.com$/i, 'Mimecast'],
  [/\.pphosted\.com$|\.ppe-hosted\.com$/i, 'Proofpoint'],
  [/\.messagelabs\.com$/i, 'Symantec MessageLabs'],
  [/\.iphmx\.com$/i, 'Cisco'],
  [/\.barracudanetworks\.com$/i, 'Barracuda'],
  [/\.yahoodns\.net$/i, 'Yahoo'],
  [/\.icloud\.com$|\.apple\.com$/i, 'Apple iCloud'],
  [/\.protonmail\.ch$|\.proton\.me$/i, 'Proton'],
  [/\.improvmx\.com$/i, 'ImprovMX'],
  [/\.forwardemail\.net$/i, 'Forward Email'],
  [/\.mail\.ru$/i, 'Mail.ru'],
  [/\.qq\.com$/i, 'Tencent QQ'],
  [/\.secureserver\.net$/i, 'GoDaddy'],
  [/\.hostinger\.|\.hostingermail\./i, 'Hostinger'],
  [/\.namecheap\.com$|privateemail\.com$/i, 'Namecheap'],
];

function identifyProvider(hosts: string[]): string | null {
  for (const host of hosts) {
    for (const [pattern, name] of PROVIDER_PATTERNS) {
      if (pattern.test(host)) return name;
    }
  }
  return null;
}

async function queryDoh(
  domain: string,
  type: 'MX' | 'A',
  useGoogle: boolean
): Promise<DohResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const url = useGoogle
      ? `${GOOGLE}?name=${encodeURIComponent(domain)}&type=${type}`
      : `${CLOUDFLARE}?name=${encodeURIComponent(domain)}&type=${type}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/dns-json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as DohResponse;
  } finally {
    clearTimeout(timer);
  }
}

// Cloudflare first, Google on SERVFAIL too — one resolver failing where the other answers is common.
async function resolve(domain: string, type: 'MX' | 'A'): Promise<DohResponse> {
  try {
    const first = await queryDoh(domain, type, false);
    if (first.Status === 0 || first.Status === 3) return first;
  } catch {
    // Fall through to the second resolver.
  }
  return queryDoh(domain, type, true);
}

export async function lookupDomain(domain: string): Promise<DomainInfo> {
  try {
    const mx = await resolve(domain, 'MX');
    if (mx.Status === 3) {
      return { status: 'nxdomain', mxHosts: [], provider: null };
    }
    // SERVFAIL/REFUSED means the lookup failed, which is not evidence the domain lacks mail — never call it invalid.
    if (mx.Status !== 0) {
      return { status: 'lookup-failed', mxHosts: [], provider: null };
    }
    const records = (mx.Answer ?? []).filter((a) => a.type === 15);

    // RFC 7505: a single "0 ." record is the domain declaring it accepts no mail at all.
    if (records.length === 1 && /^0\s+\.?$/.test(records[0]!.data.trim())) {
      return { status: 'null-mx', mxHosts: [], provider: null };
    }

    const hosts = records
      .map((r) => r.data.split(/\s+/)[1] ?? '')
      .map((h) => h.replace(/\.$/, ''))
      .filter(Boolean);

    if (hosts.length > 0) {
      return {
        status: 'has-mx',
        mxHosts: hosts,
        provider: identifyProvider(hosts),
      };
    }

    // RFC 5321 §5.1: with no MX, an A record still accepts mail on the domain itself.
    const a = await resolve(domain, 'A');
    if (a.Status === 3)
      return { status: 'nxdomain', mxHosts: [], provider: null };
    if (a.Status !== 0) {
      return { status: 'lookup-failed', mxHosts: [], provider: null };
    }
    if ((a.Answer ?? []).some((r) => r.type === 1)) {
      return { status: 'a-record-only', mxHosts: [], provider: null };
    }
    return { status: 'no-mx', mxHosts: [], provider: null };
  } catch {
    return { status: 'lookup-failed', mxHosts: [], provider: null };
  }
}
