/**
 * Text edits for the practice editor: indentation that follows Python's conventions. Pure
 * functions over a string and a selection, so the behaviour can be tested without a browser.
 */

export const INDENT = "    ";

/** Replace `value.slice(from, to)` with `text`, then select [selectionStart, selectionEnd). */
export interface Edit {
  from: number;
  to: number;
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

const lineStart = (value: string, position: number) => value.lastIndexOf("\n", position - 1) + 1;

function lineEnd(value: string, position: number): number {
  const end = value.indexOf("\n", position);
  return end === -1 ? value.length : end;
}

/** Enter: keep the current line's indentation, and add one level after a line ending in a colon. */
export function newlineEdit(value: string, start: number, end: number): Edit {
  const before = value.slice(lineStart(value, start), start);
  const indentation = /^[ \t]*/.exec(before)![0];
  const opensBlock = /:\s*(#.*)?$/.test(before);
  const text = `\n${indentation}${opensBlock ? INDENT : ""}`;
  const caret = start + text.length;
  return { from: start, to: end, text, selectionStart: caret, selectionEnd: caret };
}

/**
 * Tab and Shift+Tab. With no selection, Tab inserts spaces up to the next multiple of four.
 * With a selection, or with Shift, every line the selection touches is indented or dedented.
 */
export function indentEdit(value: string, start: number, end: number, outdent: boolean): Edit {
  if (start === end && !outdent) {
    const column = start - lineStart(value, start);
    const spaces = " ".repeat(INDENT.length - (column % INDENT.length));
    const caret = start + spaces.length;
    return { from: start, to: end, text: spaces, selectionStart: caret, selectionEnd: caret };
  }

  const from = lineStart(value, start);
  // A selection that ends at the very start of a line does not include that line.
  const lastTouched = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const to = lineEnd(value, lastTouched);
  const lines = value.slice(from, to).split("\n");

  let firstDelta = 0;
  let totalDelta = 0;
  const changed = lines.map((line, index) => {
    let next: string;
    if (outdent) {
      const removable = /^( {1,4}|\t)/.exec(line)?.[0].length ?? 0;
      next = line.slice(removable);
    } else {
      next = line === "" ? line : INDENT + line;
    }
    const delta = next.length - line.length;
    if (index === 0) firstDelta = delta;
    totalDelta += delta;
    return next;
  });

  return {
    from,
    to,
    text: changed.join("\n"),
    selectionStart: Math.max(from, start + firstDelta),
    selectionEnd: Math.max(from, end + totalDelta),
  };
}

/**
 * Backspace inside leading indentation removes back to the previous multiple of four.
 * Returns null when an ordinary single-character delete should happen instead.
 */
export function backspaceEdit(value: string, start: number, end: number): Edit | null {
  if (start !== end) return null;
  const from = lineStart(value, start);
  const before = value.slice(from, start);
  if (before === "" || !/^ +$/.test(before)) return null;
  const remove = before.length % INDENT.length || INDENT.length;
  if (remove < 2) return null;
  const caret = start - remove;
  return { from: caret, to: start, text: "", selectionStart: caret, selectionEnd: caret };
}

export function applyEdit(value: string, edit: Edit): string {
  return value.slice(0, edit.from) + edit.text + value.slice(edit.to);
}

/** 1-based line and column of a position, for the editor's status line. */
export function lineAndColumn(value: string, position: number): { line: number; column: number } {
  const before = value.slice(0, position);
  const line = before.split("\n").length;
  return { line, column: position - lineStart(value, position) + 1 };
}
