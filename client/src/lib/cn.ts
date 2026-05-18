import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge conditional class names and de-duplicate conflicting Tailwind
 * utilities. The single class-composition helper used everywhere
 * (ShadCN primitives + our components) — project rule #3/#8.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
