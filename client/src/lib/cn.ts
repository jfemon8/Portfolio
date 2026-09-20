import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// The single class-composition helper, merging conditional class names and de-duping conflicting Tailwind utilities.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
