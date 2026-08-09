import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merges conditional class names and de-dupes conflicting Tailwind utilities — the single class-composition helper used everywhere.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
