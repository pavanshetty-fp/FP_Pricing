import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/*
  V1 · V2 · V3 — versions built side by side to choose from (Pavan,
  2026-11-03). The 3PL version switch's own control, with a label saying
  what it switches. Remembered per browser; removed once a version is
  chosen.
*/

export function useVersion(key: string): [string, (v: string) => void] {
  const [v, setV] = React.useState(() => {
    try {
      return localStorage.getItem(key) ?? "1";
    } catch {
      return "1";
    }
  });
  const set = (next: string) => {
    setV(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      /* storage blocked — the choice lasts for this visit */
    }
  };
  return [v, set];
}

export function VersionSwitch({
  label,
  value,
  onChange,
  versions = ["1", "2", "3"],
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  versions?: string[];
}) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={value}
        onValueChange={(v) => v && onChange(v)}
        aria-label={`${label} version`}
      >
        {versions.map((v) => (
          <ToggleGroupItem
            key={v}
            value={v}
            aria-label={`${label} version ${v}`}
            className="h-5 min-w-0 px-1.5 text-[11px] font-normal text-muted-foreground"
          >
            V{v}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </span>
  );
}
