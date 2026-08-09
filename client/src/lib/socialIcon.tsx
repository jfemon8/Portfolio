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

// Best-effort iconKey match from an arbitrary string; null when nothing matches.
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
  const Icon = iconMap[deriveIconKey(social)] ?? Code2;
  return <Icon className={className} />;
}
