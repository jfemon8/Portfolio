import { htmlToText } from '../services/jobs/text.js';

const DEFAULT_WORD_LIMIT = 50;

/** Strips HTML and clips to a word count, appending an ellipsis only when it actually truncates. */
export const excerptFromHtml = (
  html: string,
  wordLimit = DEFAULT_WORD_LIMIT
): string => {
  const text = htmlToText(html).replace(/\s+/g, ' ').trim();
  if (!text) return '';

  const words = text.split(' ');
  if (words.length <= wordLimit) return text;

  return `${words.slice(0, wordLimit).join(' ')}…`;
};
