import { useMemo } from 'react';

type TokenType = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punct';
interface Token {
  text: string;
  type: TokenType;
}

// Named groups so the same matched "..." text can be told apart as an object key (lookahead for a trailing ':') vs a plain string value — both alternatives match identical text otherwise.
const TOKEN_RE =
  /(?<key>"(?:\\.|[^"\\])*"(?=\s*:))|(?<str>"(?:\\.|[^"\\])*")|(?<num>-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(?<bool>true|false)|(?<nul>null)/g;

function tokenize(json: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  for (const m of json.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0;
    if (idx > lastIndex) {
      tokens.push({ text: json.slice(lastIndex, idx), type: 'punct' });
    }
    const g = m.groups!;
    const type: TokenType = g.key
      ? 'key'
      : g.str
        ? 'string'
        : g.num
          ? 'number'
          : g.bool
            ? 'boolean'
            : 'null';
    tokens.push({ text: m[0], type });
    lastIndex = idx + m[0].length;
  }
  if (lastIndex < json.length) {
    tokens.push({ text: json.slice(lastIndex), type: 'punct' });
  }
  return tokens;
}

const COLOR: Record<TokenType, string> = {
  key: 'text-neon-blue',
  string: 'text-neon',
  number: 'text-neon-violet',
  boolean: 'text-neon-pink',
  null: 'text-muted-foreground',
  punct: 'text-muted-foreground/80',
};

// Tokenizes already-valid JSON text into typed spans — no dangerouslySetInnerHTML, so there's nothing to escape/sanitize.
export default function JsonHighlight({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const tokens = useMemo(() => tokenize(code), [code]);
  return (
    // data-lenis-prevent stops the smooth-scroll provider eating the wheel, so height-capped callers scroll themselves.
    <pre data-lenis-prevent tabIndex={0} className={className}>
      {tokens.map((t, i) => (
        <span key={i} className={COLOR[t.type]}>
          {t.text}
        </span>
      ))}
    </pre>
  );
}
