import { describe, expect, it } from "vitest";

import { applyEdit, backspaceEdit, indentEdit, lineAndColumn, newlineEdit } from "@/lib/domain/editor";
import { tokenizePython, type TokenKind } from "@/lib/domain/python-highlight";

/** Applies an edit and returns the text with | marking the caret (or [ ] a selection). */
function after(value: string, edit: ReturnType<typeof newlineEdit>): string {
  const text = applyEdit(value, edit);
  return edit.selectionStart === edit.selectionEnd
    ? `${text.slice(0, edit.selectionStart)}|${text.slice(edit.selectionStart)}`
    : `${text.slice(0, edit.selectionStart)}[${text.slice(edit.selectionStart, edit.selectionEnd)}]${text.slice(edit.selectionEnd)}`;
}

/** Splits "ab|cd" into the text and caret position. */
function caret(marked: string): [string, number] {
  const position = marked.indexOf("|");
  return [marked.replace("|", ""), position];
}

describe("newlineEdit", () => {
  it("keeps the indentation of the current line", () => {
    const [text, at] = caret("    x = 1|");
    expect(after(text, newlineEdit(text, at, at))).toBe("    x = 1\n    |");
  });

  it("adds one level after a line that opens a block", () => {
    const [text, at] = caret("def f(x):|");
    expect(after(text, newlineEdit(text, at, at))).toBe("def f(x):\n    |");
    const [nested, position] = caret("    while lo < hi:  # shrink|");
    expect(after(nested, newlineEdit(nested, position, position))).toBe("    while lo < hi:  # shrink\n        |");
  });

  it("does not indent after a colon that is not at the end of the line", () => {
    const [text, at] = caret("d = {1: 2}|");
    expect(after(text, newlineEdit(text, at, at))).toBe("d = {1: 2}\n|");
  });

  it("uses only the text before the caret when splitting a line", () => {
    const [text, at] = caret("    if x:| return 1");
    expect(after(text, newlineEdit(text, at, at))).toBe("    if x:\n        | return 1");
  });

  it("replaces a selection", () => {
    expect(after("abcdef", newlineEdit("abcdef", 2, 4))).toBe("ab\n|ef");
  });
});

describe("indentEdit", () => {
  it("inserts spaces up to the next multiple of four", () => {
    expect(after("", indentEdit("", 0, 0, false))).toBe("    |");
    expect(after("ab", indentEdit("ab", 2, 2, false))).toBe("ab  |");
    expect(after("abcd", indentEdit("abcd", 4, 4, false))).toBe("abcd    |");
  });

  it("measures the column from the start of the current line", () => {
    const [text, at] = caret("first line\nx|");
    expect(after(text, indentEdit(text, at, at, false))).toBe("first line\nx   |");
  });

  it("indents every line a selection touches, leaving empty lines empty", () => {
    const text = "a\n\nb\nc";
    expect(applyEdit(text, indentEdit(text, 0, 4, false))).toBe("    a\n\n    b\nc");
  });

  it("does not indent the line after a selection that ends at a line start", () => {
    const text = "a\nb\nc";
    expect(applyEdit(text, indentEdit(text, 0, 2, false))).toBe("    a\nb\nc");
  });

  it("outdents by up to four spaces, or one tab, per line", () => {
    const text = "        a\n  b\n\tc\nd";
    expect(applyEdit(text, indentEdit(text, 0, text.length, true))).toBe("    a\nb\nc\nd");
  });

  it("outdents the current line when there is no selection, keeping the caret on it", () => {
    const [text, at] = caret("    retu|rn 1");
    expect(after(text, indentEdit(text, at, at, true))).toBe("retu|rn 1");
    const [start, position] = caret("  |  x");
    const edit = indentEdit(start, position, position, true);
    expect(applyEdit(start, edit)).toBe("x");
    expect(edit.selectionStart).toBe(0);
  });

  it("indenting then outdenting a block restores it exactly", () => {
    const text = "def f():\n    return 1\n\nprint(f())";
    const indented = applyEdit(text, indentEdit(text, 0, text.length, false));
    expect(applyEdit(indented, indentEdit(indented, 0, indented.length, true))).toBe(text);
  });
});

describe("backspaceEdit", () => {
  it("removes a whole indentation level inside leading spaces", () => {
    const [text, at] = caret("        |x");
    expect(after(text, backspaceEdit(text, at, at)!)).toBe("    |x");
  });

  it("removes back to the previous multiple of four", () => {
    const [text, at] = caret("      |x");
    expect(after(text, backspaceEdit(text, at, at)!)).toBe("    |x");
  });

  it("leaves ordinary deletes to the browser", () => {
    expect(backspaceEdit("abc", 3, 3)).toBeNull(); // after text
    expect(backspaceEdit("abc", 0, 0)).toBeNull(); // start of the document
    expect(backspaceEdit("x = 1    ", 9, 9)).toBeNull(); // trailing spaces, not indentation
    expect(backspaceEdit("    x", 1, 3)).toBeNull(); // a selection
    expect(backspaceEdit("\tx", 1, 1)).toBeNull(); // a tab character
    expect(backspaceEdit("     x", 5, 5)).toBeNull(); // one space past a level: delete just that space
  });
});

describe("lineAndColumn", () => {
  it("is 1-based and counts columns from the line start", () => {
    const text = "ab\ncde\n";
    expect(lineAndColumn(text, 0)).toEqual({ line: 1, column: 1 });
    expect(lineAndColumn(text, 2)).toEqual({ line: 1, column: 3 });
    expect(lineAndColumn(text, 3)).toEqual({ line: 2, column: 1 });
    expect(lineAndColumn(text, 7)).toEqual({ line: 3, column: 1 });
  });
});

describe("tokenizePython", () => {
  const kinds = (code: string) => tokenizePython(code).filter((t) => t.kind !== "plain").map((t) => [t.kind, t.text] as [TokenKind, string]);

  it("loses no characters: joining the tokens gives back the input", () => {
    const samples = [
      "",
      "def lower_bound(items: list[int], target: int) -> int:\n    lo, hi = 0, len(items)\n    return lo\n",
      'x = "unterminated\ny = 1',
      "s = '''triple\nquoted''' + f\"{a}\" # done",
      "@decorator\nclass A:\n\tpass",
      "weird: \u00e9\u4e2d \\ $ ` ~ 0x1F 1_000 3.14e-2 .5 1.",
      '"""never closed',
      "a = b'\\'' + r\"\\d\"",
    ];
    for (const code of samples) {
      expect(tokenizePython(code).map((t) => t.text).join("")).toBe(code);
    }
  });

  it("classifies keywords, the defined name, builtins and numbers", () => {
    expect(kinds("def count(items):\n    return len(items) + 10")).toEqual([
      ["keyword", "def"],
      ["title", "count"],
      ["keyword", "return"],
      ["builtin", "len"],
      ["number", "10"],
    ]);
  });

  it("treats a comment as running to the end of its line only", () => {
    expect(kinds("x = 1  # return here\ny = 2")).toEqual([
      ["number", "1"],
      ["comment", "# return here"],
      ["number", "2"],
    ]);
  });

  it("does not colour keywords or comment markers inside strings", () => {
    expect(kinds('s = "if # not a comment"')).toEqual([["string", '"if # not a comment"']]);
    expect(kinds("s = 'it\\'s' + \"a\"")).toEqual([
      ["string", "'it\\'s'"],
      ["string", '"a"'],
    ]);
  });

  it("handles triple-quoted strings across lines and string prefixes", () => {
    expect(kinds('"""doc\nstring""" + f"{x}"')).toEqual([
      ["string", '"""doc\nstring"""'],
      ["string", 'f"{x}"'],
    ]);
  });

  it("ends an unterminated single-line string at the line break", () => {
    expect(kinds('a = "open\nreturn 1')).toEqual([
      ["string", '"open'],
      ["keyword", "return"],
      ["number", "1"],
    ]);
  });

  it("does not treat a method named like a builtin, or an identifier containing a keyword, as special", () => {
    expect(kinds("items.sorted_ = notes.len")).toEqual([]);
    expect(kinds("format = information")).toEqual([]);
  });
});
