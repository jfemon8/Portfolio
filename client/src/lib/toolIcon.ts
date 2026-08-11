import {
  KeyRound,
  Braces,
  Regex,
  GitCompare,
  TrendingUp,
  Wrench,
  Terminal,
  Sparkles,
  Gauge,
  Lock,
  FileSearch,
  FileStack,
  Mic2,
  type LucideIcon,
} from 'lucide-react';
import type { ToolIcon } from '@/types';

// Mirrors skillIcon.ts's string-key → component lookup, but the key set is a fixed enum (ToolIcon) rather than free text, so every value here is guaranteed to resolve.
export const TOOL_ICONS: Record<ToolIcon, LucideIcon> = {
  KeyRound,
  Braces,
  Regex,
  GitCompare,
  TrendingUp,
  Wrench,
  Terminal,
  Sparkles,
  Gauge,
  Lock,
  FileSearch,
  FileStack,
  Mic2,
};

export const TOOL_ICON_OPTIONS: { value: ToolIcon; label: string }[] =
  Object.keys(TOOL_ICONS).map((value) => ({
    value: value as ToolIcon,
    label: value,
  }));
