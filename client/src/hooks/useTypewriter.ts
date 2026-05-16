import { useEffect, useState } from 'react';

interface TypewriterOptions {
  type?: number;
  del?: number;
  hold?: number;
}

/** Cycles through an array of strings with a typing / deleting effect. */
export function useTypewriter(
  words: string[] = [],
  { type = 90, del = 45, hold = 1600 }: TypewriterOptions = {}
): string {
  const [text, setText] = useState('');
  const [i, setI] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!words.length) return;
    const word = words[i % words.length] ?? '';
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && text === word) {
      timeout = setTimeout(() => setDeleting(true), hold);
    } else if (deleting && text === '') {
      setDeleting(false);
      setI((v) => (v + 1) % words.length);
    } else {
      timeout = setTimeout(
        () =>
          setText((prev) =>
            deleting
              ? word.slice(0, prev.length - 1)
              : word.slice(0, prev.length + 1)
          ),
        deleting ? del : type
      );
    }
    return () => clearTimeout(timeout);
  }, [text, deleting, i, words, type, del, hold]);

  return text;
}
