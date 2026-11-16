import * as React from "react";
import { OverflowChip } from "../BreakdownCard";
import { changeParts, type ChangeRecord, type EntityMap } from "./changeLog";

/**
 * A CHANGE, READ IN A CELL (Yash, 2026-11-16): its names, and past two of
 * them the first name with a "+N" pill that lists every one on hover —
 * the overflow chip Service Work's order rows use.
 */
export function ChangeText({ c, ents, className }: { c: ChangeRecord; ents: EntityMap; className?: string }) {
  return (
    <span className={className ?? "inline-flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5"}>
      {changeParts(c, ents).map((p, i) =>
        typeof p === "string" ? (
          /* The row's gap spaces the parts; the text's own spaces would double it. */
          p.trim() && <span key={i}>{p.trim()}</span>
        ) : p.names.length <= 2 ? (
          <span key={i}>{p.names.join(", ")}</span>
        ) : (
          <React.Fragment key={i}>
            <span>{p.names[0]}</span>
            <span onClick={(e) => e.stopPropagation()}>
              <OverflowChip
                count={p.names.length - 1}
                label={`Show all ${p.names.length} ${p.label}`}
                card={{ title: `${p.names.length} ${p.label}`, rows: p.names.map((n) => ({ label: n })) }}
              />
            </span>
          </React.Fragment>
        )
      )}
    </span>
  );
}
