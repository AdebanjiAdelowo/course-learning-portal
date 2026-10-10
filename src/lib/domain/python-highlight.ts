/**
 * A small tokenizer for colouring Python in the practice editor. It only classifies text: it
 * never evaluates anything, and it keeps every character, so joining the tokens always gives
 * back the input exactly. That property is what keeps the coloured layer aligned with the
 * text the student is typing.
 */

export type TokenKind = "plain" | "keyword" | "builtin" | "string" | "comment" | "number" | "title" | "decorator";

export interface Token {
  kind: TokenKind;
  text: string;
}

const KEYWORDS = new Set([
  "False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del",
  "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal",
  "not", "or", "pass", "raise", "return", "try", "while", "with", "yield", "match", "case",
]);

const BUILTINS = new Set([
  "abs", "all", "any", "bool", "dict", "divmod", "enumerate", "filter", "float", "frozenset", "int", "isinstance",
  "iter", "len", "list", "map", "max", "min", "next", "print", "range", "repr", "reversed", "round", "set",
  "sorted", "str", "sum", "tuple", "type", "zip",
]);

const isIdentifierStart = (ch: string) => /[A-Za-z_]/.test(ch);
const isIdentifierPart = (ch: string) => /[A-Za-z0-9_]/.test(ch);
const isDigit = (ch: string) => ch >= "0" && ch <= "9";

/** Length of a string literal starting at `start` (at its opening quote), including the quotes. */
function stringLength(code: string, start: number): number {
  const quote = code[start]!;
  const triple = code.startsWith(quote.repeat(3), start);
  const close = triple ? quote.repeat(3) : quote;
  let i = start + close.length;
  while (i < code.length) {
    if (code[i] === "\\") {
      i += 2;
      continue;
    }
    if (code.startsWith(close, i)) return i + close.length - start;
    // An unterminated single-line string ends at the line break.
    if (!triple && code[i] === "\n") return i - start;
    i += 1;
  }
  return code.length - start;
}

export function tokenizePython(code: string): Token[] {
  const tokens: Token[] = [];
  let plain = "";
  let expectName = false; // the identifier after `def` or `class`

  const flush = () => {
    if (plain) tokens.push({ kind: "plain", text: plain });
    plain = "";
  };
  const push = (kind: TokenKind, text: string) => {
    flush();
    tokens.push({ kind, text });
  };

  let i = 0;
  while (i < code.length) {
    const ch = code[i]!;

    if (ch === "#") {
      const end = code.indexOf("\n", i);
      const stop = end === -1 ? code.length : end;
      push("comment", code.slice(i, stop));
      i = stop;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const length = stringLength(code, i);
      push("string", code.slice(i, i + length));
      i += length;
      continue;
    }

    if (isIdentifierStart(ch)) {
      let end = i + 1;
      while (end < code.length && isIdentifierPart(code[end]!)) end += 1;
      const word = code.slice(i, end);
      const next = code[end];
      // String prefixes such as f"..." or rb'...'.
      if (/^[rbfuRBFU]{1,2}$/.test(word) && (next === '"' || next === "'")) {
        const length = stringLength(code, end);
        push("string", code.slice(i, end + length));
        i = end + length;
        continue;
      }
      if (expectName) {
        push("title", word);
        expectName = false;
      } else if (KEYWORDS.has(word)) {
        push("keyword", word);
        expectName = word === "def" || word === "class";
      } else if (BUILTINS.has(word) && code[i - 1] !== ".") {
        push("builtin", word);
      } else {
        plain += word;
      }
      i = end;
      continue;
    }

    if (isDigit(ch) || (ch === "." && isDigit(code[i + 1] ?? ""))) {
      const match = /^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(\d[\d_]*)?\.?\d[\d_]*([eE][+-]?\d+)?j?)/.exec(code.slice(i));
      const text = match?.[0] || ch;
      push("number", text);
      i += text.length;
      continue;
    }

    if (ch === "@" && /^\s*$/.test(code.slice(code.lastIndexOf("\n", i - 1) + 1, i))) {
      let end = i + 1;
      while (end < code.length && /[A-Za-z0-9_.]/.test(code[end]!)) end += 1;
      push("decorator", code.slice(i, end));
      i = end;
      continue;
    }

    if (ch !== " " && ch !== "\t") expectName = false;
    plain += ch;
    i += 1;
  }
  flush();
  return tokens;
}

/** CSS classes shared with the highlighted code blocks in lessons (see globals.css). */
export const tokenClass: Record<TokenKind, string | undefined> = {
  plain: undefined,
  keyword: "hljs-keyword",
  builtin: "hljs-built_in",
  string: "hljs-string",
  comment: "hljs-comment",
  number: "hljs-number",
  title: "hljs-title",
  decorator: "hljs-meta",
};
