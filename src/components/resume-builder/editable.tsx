"use client";

import { useRef } from "react";

/**
 * Inline text editing primitive for the resume canvas.
 *
 * Uncontrolled contentEditable that commits on blur — the caret is never
 * disturbed while typing. `key`ing on the value means external changes
 * (AI enhance, undo) remount with fresh content, while our own blur-commit
 * round-trips to an identical value and the remount is a no-op.
 */
export function Editable({
  value,
  onCommit,
  placeholder,
  multiline = false,
  editable,
  className,
  style,
  as: Tag = "span",
}: {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
  editable: boolean;
  className?: string;
  style?: React.CSSProperties;
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3" | "li";
}) {
  const ref = useRef<HTMLElement | null>(null);

  if (!editable) {
    if (!value) return null;
    return (
      <Tag className={className} style={{ whiteSpace: "pre-wrap", ...style }}>
        {value}
      </Tag>
    );
  }

  return (
    <Tag
      key={value}
      ref={(el: HTMLElement | null) => {
        ref.current = el;
      }}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-ph={placeholder ?? "Type here"}
      className={`rz-editable ${className ?? ""}`}
      style={{ whiteSpace: "pre-wrap", outline: "none", ...style }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
        if (e.key === "Escape") (e.target as HTMLElement).blur();
      }}
      onBlur={() => {
        const next = (ref.current?.innerText ?? "").replace(/ /g, " ").trimEnd();
        if (next !== value) onCommit(next);
      }}
    >
      {value}
    </Tag>
  );
}
