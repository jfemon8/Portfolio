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

/** Auto-derive a built-in iconKey from a social's label (case-insensitive).
 *  Used as the fallback when neither `iconImage` nor a legacy `icon` string
 *  has been set in the admin form. Internal to this file so the module
 *  stays component-only for react-refresh. */
const deriveIconKey = (label: string): string => {
  const l = label.toLowerCase();
  for (const key of Object.keys(iconMap)) {
    if (l.includes(key)) return key;
  }
  if (l.includes('email')) return 'mail';
  if (l === 'x' || l.includes('x.com')) return 'twitter';
  if (
    l.includes('leetcode') ||
    l.includes('codeforces') ||
    l.includes('codechef') ||
    l.includes('hackerrank') ||
    l.includes('hackerearth')
  )
    return 'code';
  return 'code';
};

interface SocialIconProps {
  social: Social;
  className?: string;
}

/**
 * Renders a social-link icon with this priority chain:
 *   1. `social.iconImage`  — admin-uploaded Cloudinary URL (wins outright)
 *   2. legacy `social.icon` — string that maps to a built-in lucide icon
 *   3. auto-derive          — best-effort match on `social.label`
 *
 * The fallback ensures a usable icon even when the admin form leaves the
 * icon fields empty.
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
  const key = (social.icon || deriveIconKey(social.label)).toLowerCase();
  const Icon = iconMap[key] ?? Code2;
  return <Icon className={className} />;
}
