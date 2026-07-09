"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

// Searchable project picker. `value`/`onChange` deal in project IDs — the
// backend (leads.service.ts) resolves leads by project id, not name — while
// the button label shows the matching project's display name.
export function ProjectDropdown({
  value,
  onChange,
  projects,
}: {
  value: string;
  onChange: (id: string) => void;
  projects: { id: string; projectName: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(""); }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedName = projects.find((p) => p.id === value)?.projectName ?? "";
  const filtered = projects.filter((p) => p.projectName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setSearch(""); }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-sm bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-input ${selectedName ? "text-foreground" : "text-muted-foreground"}`}
      >
        <span className="truncate">{selectedName || "Select a project…"}</span>
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="size-3.5 text-muted-foreground shrink-0" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search project…" className="w-full text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground" />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                {projects.length === 0 ? "No projects added yet" : "No match"}
              </li>
            ) : filtered.map((p) => (
              <li key={p.id}>
                <button type="button"
                  onClick={() => { onChange(p.id); setOpen(false); setSearch(""); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-accent ${value === p.id ? "bg-primary/10 text-primary font-medium" : "text-foreground"}`}>
                  {p.projectName}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
