import {
  Code2,
  Facebook,
  Github,
  Instagram,
  Linkedin,
  Mail,
  Twitter,
  Youtube,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Social } from '@/types';

const iconMap: Record<string, LucideIcon> = {
  github: Github,
  linkedin: Linkedin,
  mail: Mail,
  twitter: Twitter,
  youtube: Youtube,
  instagram: Instagram,
  facebook: Facebook,
  code: Code2,
};

/** Best-effort iconKey match from an arbitrary string (a url or a label).
 *  Returns null when nothing matches so callers can fall through. */
const matchIconKey = (s: string): string | null => {
  const l = s.toLowerCase();
  for (const key of Object.keys(iconMap)) {
    if (l.includes(key)) return key;
  }
  if (l.includes('mailto') || l.includes('email')) return 'mail';
  if (l.includes('x.com')) return 'twitter';
  if (
    l.includes('leetcode') ||
    l.includes('codeforces') ||
    l.includes('codechef') ||
    l.includes('hackerrank') ||
    l.includes('hackerearth')
  )
    return 'code';
  return null;
};

/** Derive a built-in iconKey for a social link. The `url` (the real
 *  destination) is checked FIRST so the icon always matches where the link
 *  actually goes — even if the label was mistyped or the label/url pair was
 *  entered swapped (which showed e.g. a GitHub icon opening LinkedIn). Falls
 *  back to the label, then a neutral `code` glyph. Internal to this file so
 *  the module stays component-only for react-refresh. */
const deriveIconKey = (social: Social): string =>
  matchIconKey(social.url ?? '') ?? matchIconKey(social.label ?? '') ?? 'code';

interface SocialIconProps {
  social: Social;
  className?: string;
}

/**
 * Renders a social-link icon with this priority chain:
 *   1. `social.iconImage`  — admin-uploaded Cloudinary URL (wins outright)
 *   2. auto-derive         — match on the `url` first, then the `label`
 *
 * The url is the destination, so matching it first keeps the icon truthful to
 * where the link goes. Legacy `social.icon` values are intentionally ignored
 * so old saved rows cannot drift out of sync with the current label/url pair.
 */
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
  const Icon = iconMap[deriveIconKey(social)] ?? Code2;
  return <Icon className={className} />;
}
