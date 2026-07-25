"use client";

import { useState } from "react";
import Link from "next/link";
import { Play } from "@/app/components/icons";
import { SESSION_SIZES } from "@/lib/session";

export type StudyOption = {
  /** Vocab direction, when the deck is studied both ways. */
  dir?: "ru" | "en";
  label: string;
  due: number;
};

/**
 * Start a study session: pick how long it should be, then which direction
 * (or just Study, for a deck with a single direction). Sizes larger than
 * what's actually due are hidden — offering "30" for 4 due cards is noise.
 */
export function StudyStarter({
  deckId,
  options,
  size = "md",
}: {
  deckId: string;
  options: StudyOption[];
  size?: "md" | "lg";
}) {
  const [limit, setLimit] = useState<number | null>(null); // null = everything due
  const maxDue = Math.max(0, ...options.map((o) => o.due));
  const sizes = SESSION_SIZES.filter((n) => n < maxDue);

  const href = (o: StudyOption) => {
    const p = new URLSearchParams({ deck: deckId });
    if (o.dir) p.set("dir", o.dir);
    if (limit) p.set("n", String(limit));
    return `/review?${p}`;
  };
  const count = (o: StudyOption) => (limit ? Math.min(limit, o.due) : o.due);

  return (
    <div className="flex flex-col gap-2.5">
      {sizes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            Session:
          </span>
          {[...sizes, null].map((n) => (
            <button
              key={n ?? "all"}
              onClick={() => setLimit(n)}
              className="chip"
              style={
                limit === n
                  ? {
                      background: "var(--brand-tint)",
                      borderColor: "var(--brand-line)",
                      color: "var(--brand)",
                    }
                  : undefined
              }
            >
              {n ?? `All · ${maxDue}`}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Link
            key={o.dir ?? "all"}
            href={href(o)}
            aria-disabled={o.due === 0}
            className={`btn-brand flex items-center gap-2 text-[14px] ${
              size === "lg" ? "px-5 py-3" : "px-5 py-2.5"
            }`}
            style={o.due === 0 ? { opacity: 0.5, pointerEvents: "none" } : undefined}
          >
            <Play size={15} /> {o.label}
            {o.due > 0 ? ` · ${count(o)}` : ""}
          </Link>
        ))}
      </div>
    </div>
  );
}
