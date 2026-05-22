export function capitalizeFirst(text: string): string {
  const value = text.trim();
  if (!value) return value;
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
