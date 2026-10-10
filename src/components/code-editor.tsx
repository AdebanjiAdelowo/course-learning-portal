"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type UIEvent } from "react";

import { cn } from "@/lib/cn";
import { applyEdit, backspaceEdit, indentEdit, lineAndColumn, newlineEdit, type Edit } from "@/lib/domain/editor";
import { tokenClass, tokenizePython } from "@/lib/domain/python-highlight";

const metrics = "p-4 font-mono text-[0.86rem] leading-6 [tab-size:4]";

/**
 * A Python editor made of a real <textarea> with a coloured copy of the same text drawn
 * underneath it. The textarea keeps everything a browser already does well: the caret,
 * selection, copy and paste, undo, the on-screen keyboard and screen-reader support.
 *
 * Nothing typed here is ever executed. The text is only stored when the form is saved.
 */
export function CodeEditor({
  id,
  name,
  value,
  onChange,
  label,
  maxLength,
  invalid = false,
  describedBy,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  maxLength: number;
  invalid?: boolean;
  describedBy?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const layerRef = useRef<HTMLPreElement>(null);
  // After Escape, the next Tab moves focus instead of indenting, so the editor is not a keyboard trap.
  const [tabLeaves, setTabLeaves] = useState(false);
  const [caret, setCaret] = useState({ line: 1, column: 1 });

  const tokens = useMemo(() => tokenizePython(value), [value]);
  const lineCount = useMemo(() => value.split("\n").length, [value]);

  function syncScroll(event: UIEvent<HTMLTextAreaElement>) {
    const layer = layerRef.current;
    if (!layer) return;
    layer.scrollTop = event.currentTarget.scrollTop;
    layer.scrollLeft = event.currentTarget.scrollLeft;
  }

  function updateCaret() {
    const textarea = textareaRef.current;
    if (textarea) setCaret(lineAndColumn(textarea.value, textarea.selectionStart));
  }

  function apply(edit: Edit) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.setSelectionRange(edit.from, edit.to);
    // insertText keeps the browser's undo history intact. Where it is unavailable, fall back
    // to replacing the text directly.
    const inserted = typeof document.execCommand === "function" && document.execCommand(edit.text === "" ? "delete" : "insertText", false, edit.text);
    if (!inserted) {
      const next = applyEdit(textarea.value, edit);
      textarea.value = next;
      onChange(next);
    }
    textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    updateCaret();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing || event.altKey || event.metaKey || event.ctrlKey) return;
    const { value: text, selectionStart: start, selectionEnd: end } = event.currentTarget;

    if (event.key === "Escape") {
      setTabLeaves(true);
      return;
    }
    if (event.key === "Tab") {
      if (tabLeaves) {
        setTabLeaves(false);
        return; // let the browser move focus
      }
      event.preventDefault();
      apply(indentEdit(text, start, end, event.shiftKey));
      return;
    }
    if (tabLeaves) setTabLeaves(false);

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      apply(newlineEdit(text, start, end));
      return;
    }
    if (event.key === "Backspace") {
      const edit = backspaceEdit(text, start, end);
      if (edit) {
        event.preventDefault();
        apply(edit);
      }
    }
  }

  return (
    <div>
      <div
        className={cn(
          "relative h-[26rem] overflow-hidden rounded-lg border bg-sunken focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--focus)",
          invalid ? "border-danger" : "border-line-strong",
        )}
      >
        <pre
          ref={layerRef}
          aria-hidden="true"
          className={cn(metrics, "pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre text-ink [&_span]:font-normal [&_span]:not-italic")}
        >
          {tokens.map((token, index) => (
            <span key={index} className={tokenClass[token.kind]}>
              {token.text}
            </span>
          ))}
          {/* A trailing line break needs a character after it to be given height. */}
          {"\n"}
        </pre>
        <textarea
          ref={textareaRef}
          id={id}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onKeyUp={updateCaret}
          onClick={updateCaret}
          onSelect={updateCaret}
          onScroll={syncScroll}
          aria-label={label}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          maxLength={maxLength}
          wrap="off"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          className={cn(
            metrics,
            "absolute inset-0 size-full resize-none overflow-auto whitespace-pre border-0 bg-transparent text-transparent caret-(--ink) outline-none selection:bg-accent/25",
          )}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-ink-faint">
        <p>
          Python · Ln {caret.line}, Col {caret.column} · {lineCount} {lineCount === 1 ? "line" : "lines"}
        </p>
        <p aria-live="polite">
          {tabLeaves ? "Tab now moves to the next control." : "Tab indents. Press Esc, then Tab, to leave the editor."}
        </p>
      </div>
    </div>
  );
}
