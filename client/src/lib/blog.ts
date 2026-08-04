export const BLOG_REACTIONS = [
  'like',
  'love',
  'clap',
  'insightful',
  'fire',
] as const;

export type BlogReactionType = (typeof BLOG_REACTIONS)[number];

export const BLOG_REACTION_META: Record<
  BlogReactionType,
  { label: string; emoji: string }
> = {
  like: { label: 'Like', emoji: '👍' },
  love: { label: 'Love', emoji: '❤️' },
  clap: { label: 'Clap', emoji: '👏' },
  insightful: { label: 'Insightful', emoji: '💡' },
  fire: { label: 'Fire', emoji: '🔥' },
};

export const getBlogVisitorKey = (slug: string): string => {
  const storageKey = `blog-visitor:${slug}`;
  const generated =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;
    localStorage.setItem(storageKey, generated);
    return generated;
  } catch {
    return generated;
  }
};
