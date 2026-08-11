import {
  Code2,
  Facebook,
  Github,
  Instagram,
  Linkedin,
  Mail,
  Twitter,
  Youtube,
} from 'lucide-react';
import {
  SiCodechef,
  SiCodeforces,
  SiLeetcode,
  SiDiscord,
  SiTelegram,
  SiWhatsapp,
  SiThreads,
  SiTiktok,
  SiReddit,
  SiPinterest,
  SiSnapchat,
  SiMastodon,
  SiBluesky,
  SiTwitch,
  SiMedium,
  SiDevdotto,
  SiBehance,
  SiDribbble,
  SiStackoverflow,
  SiProducthunt,
  SiPatreon,
  SiKofi,
  SiBuymeacoffee,
  SiX,
} from 'react-icons/si';
import { cn } from '@/lib/cn';
import type { ComponentType } from 'react';
import type { Social } from '@/types';

type IconComponent = ComponentType<{ className?: string }>;

// Order matters: matchIconKey does substring checks, so more specific keys
// (e.g. "leetcode") must precede substrings they contain (e.g. "code").
const iconMap: Record<string, IconComponent> = {
  github: Github,
  linkedin: Linkedin,
  mail: Mail,
  twitter: Twitter,
  youtube: Youtube,
  instagram: Instagram,
  facebook: Facebook,
  leetcode: SiLeetcode,
  codeforces: SiCodeforces,
  codechef: SiCodechef,
  discord: SiDiscord,
  telegram: SiTelegram,
  whatsapp: SiWhatsapp,
  threads: SiThreads,
  tiktok: SiTiktok,
  reddit: SiReddit,
  pinterest: SiPinterest,
  snapchat: SiSnapchat,
  mastodon: SiMastodon,
  bluesky: SiBluesky,
  twitch: SiTwitch,
  medium: SiMedium,
  devto: SiDevdotto,
  behance: SiBehance,
  dribbble: SiDribbble,
  stackoverflow: SiStackoverflow,
  producthunt: SiProducthunt,
  patreon: SiPatreon,
  kofi: SiKofi,
  buymeacoffee: SiBuymeacoffee,
  code: Code2,
};

// "x" is deliberately excluded from `iconMap` — as a bare one-letter key it would false-positive as a substring of almost any URL/label. It's only reachable through the explicit x.com check below.
const UNSCANNED_ICONS: Record<string, IconComponent> = { x: SiX };
const ALL_ICONS: Record<string, IconComponent> = {
  ...iconMap,
  ...UNSCANNED_ICONS,
};

// Best-effort iconKey match from an arbitrary string; null when nothing matches.
const matchIconKey = (s: string): string | null => {
  const l = s.toLowerCase();
  if (l.includes('x.com')) return 'x';
  for (const key of Object.keys(iconMap)) {
    if (l.includes(key)) return key;
  }
  if (l.includes('mailto') || l.includes('email')) return 'mail';
  if (l.includes('dev.to')) return 'devto';
  if (l.includes('ko-fi')) return 'kofi';
  if (l.includes('hackerrank') || l.includes('hackerearth')) return 'code';
  return null;
};

// Checks url before label so a mistyped/swapped label can't show the wrong icon.
const deriveIconKey = (social: Social): string =>
  matchIconKey(social.url ?? '') ?? matchIconKey(social.label ?? '') ?? 'code';

interface SocialIconProps {
  social: Social;
  className?: string;
}

// social.iconImage wins if set, else auto-derive; legacy social.icon is intentionally ignored.
export function SocialIcon({ social, className = 'h-5 w-5' }: SocialIconProps) {
  if (social.iconImage) {
    return (
      <img
        src={social.iconImage}
        alt=""
        loading="lazy"
        className={cn(className, 'object-contain')}
      />
    );
  }
  const Icon = ALL_ICONS[deriveIconKey(social)] ?? Code2;
  return <Icon className={className} />;
}
