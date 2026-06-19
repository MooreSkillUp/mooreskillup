"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, List, ListOrdered } from "lucide-react";

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  // Only push `value` into the DOM when it differs from what the editor already
  // shows. Writing innerHTML on every keystroke (the old bug) reset the caret to
  // the start, so each typed character landed in front of the last — text came
  // out reversed. Syncing only on external changes keeps the caret in place.
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.innerHTML !== value) {
      editor.innerHTML = value || "";
    }
  }, [value]);

  const runCommand = (command: "bold" | "italic" | "insertUnorderedList" | "insertOrderedList") => {
    editorRef.current?.focus();
    document.execCommand(command);
    onChange(editorRef.current?.innerHTML ?? "");
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="overflow-hidden rounded-2xl border border-input bg-background shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <button type="button" onClick={() => runCommand("bold")} className="rounded-lg p-2 hover:bg-muted" aria-label="Bold">
            <Bold className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => runCommand("italic")} className="rounded-lg p-2 hover:bg-muted" aria-label="Italic">
            <Italic className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => runCommand("insertUnorderedList")} className="rounded-lg p-2 hover:bg-muted" aria-label="Bullet list">
            <List className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => runCommand("insertOrderedList")} className="rounded-lg p-2 hover:bg-muted" aria-label="Numbered list">
            <ListOrdered className="h-4 w-4" />
          </button>
        </div>
        <div
          ref={editorRef}
          contentEditable
          dir="ltr"
          style={{ direction: "ltr", textAlign: "left", unicodeBidi: "plaintext" }}
          suppressContentEditableWarning
          onInput={(event) => onChange(event.currentTarget.innerHTML)}
          className="min-h-32 px-4 py-3 text-sm leading-7 outline-none [&:empty]:before:text-muted-foreground [&:empty]:before:content-[attr(data-placeholder)]"
          data-placeholder={placeholder}
        />
      </div>
    </div>
  );
}
