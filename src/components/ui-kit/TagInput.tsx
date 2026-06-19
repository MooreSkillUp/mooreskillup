"use client";

import { X } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";

function normalizeTag(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function parseTags(values: string[]) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => value.split(","))
        .map(normalizeTag)
        .filter(Boolean)
        .map(toTitleCase),
    ),
  );
}

export function TagInput({
  label,
  hint,
  placeholder = "Type a tag and press comma or Enter",
  value,
  onChange,
}: {
  label?: string;
  hint?: string;
  placeholder?: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const tags = useMemo(() => parseTags(value), [value]);

  const commitTags = (raw: string) => {
    const next = parseTags([...tags, raw]);
    if (next.length !== tags.length) {
      onChange(next);
    }
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "," || event.key === "Enter") {
      event.preventDefault();
      if (draft.trim()) commitTags(draft);
      return;
    }

    if (event.key === "Backspace" && !draft && tags.length) {
      event.preventDefault();
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="space-y-1.5">
      {label ? <label className="text-sm font-medium text-foreground">{label}</label> : null}
      <div className="rounded-2xl border border-input bg-card p-3 shadow-sm transition focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter((item) => item !== tag))}
                className="rounded-full text-primary/70 transition hover:text-primary"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
              if (draft.trim()) commitTags(draft);
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="min-w-[12rem] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
