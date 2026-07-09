"use client";

export interface StatusFilterOption {
  value: string;
  label: string;
  count?: number;
}

interface StatusFilterPillsProps {
  options: StatusFilterOption[];
  value: string;
  onChange: (value: string) => void;
}

export function StatusFilterPills({ options, value, onChange }: StatusFilterPillsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
            value === opt.value
              ? "bg-primary/10 border-primary/40 text-primary"
              : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          {opt.label}
          {typeof opt.count === "number" && (
            <span className="text-[10px] opacity-70 tabular-nums">{opt.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
