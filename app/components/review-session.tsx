"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { X, Check } from "@/app/components/icons";
import type { QueueCard } from "@/lib/queries";
import { CardFace } from "@/app/components/card-face";
import { previewIntervals, intervalLabel, Rating } from "@/lib/fsrs";
import { submitReviewAction } from "@/app/actions";

const RATINGS = [
  { grade: Rating.Again, label: "Again", fg: "var(--danger)", bg: "var(--danger-bg)" },
  { grade: Rating.Hard, label: "Hard", fg: "var(--warning)", bg: "var(--warning-bg)" },
  { grade: Rating.Good, label: "Good", fg: "var(--success)", bg: "var(--success-bg)" },
  { grade: Rating.Easy, label: "Easy", fg: "var(--accent)", bg: "var(--accent-bg)" },
] as const;

export function ReviewSession({ queue }: { queue: QueueCard[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const current = queue[index];
  const previews = useMemo(
    () => (current ? previewIntervals(current.sched, Date.now()) : null),
    [current],
  );

  const rate = useCallback(
    (grade: number) => {
      if (!current || isPending) return;
      const isLast = index + 1 >= queue.length;
      startTransition(async () => {
        await submitReviewAction(current.cardId, grade);
        if (isLast) {
          setDone(true);
        } else {
          setIndex((i) => i + 1);
          setRevealed(false);
        }
      });
    },
    [current, index, queue.length, isPending],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return;
      if (!revealed && (e.code === "Space" || e.code === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && e.key >= "1" && e.key <= "4") {
        e.preventDefault();
        rate(Number(e.key));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, done, rate]);

  if (done || !current) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 text-center">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "var(--success-bg)", color: "var(--success)" }}
        >
          <Check size={30} />
        </span>
        <h1 className="text-xl font-medium">Session complete</h1>
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          You reviewed {queue.length} card{queue.length === 1 ? "" : "s"}. Nice work.
        </p>
        <Link href="/" className="btn-brand mt-2 px-6 py-2.5 text-[15px]">
          Back to today
        </Link>
      </div>
    );
  }

  const progress = ((index + (revealed ? 0.5 : 0)) / queue.length) * 100;

  return (
    <div className="review-surface -mx-5 -mt-6 -mb-28 flex min-h-[calc(100dvh-3.75rem)] flex-col px-6 pb-28 pt-7">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/" aria-label="End session">
          <X size={20} style={{ color: "var(--text-muted)" }} />
        </Link>
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full"
          style={{ background: "color-mix(in srgb, var(--text-primary) 12%, transparent)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: "var(--brand)" }}
          />
        </div>
        <span
          className="text-[12px] tabular-nums"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-sp-mono), monospace" }}
        >
          {index + 1}/{queue.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="eyebrow2 mb-6">{current.deckTitle}</div>
        <CardFace
          noteType={current.noteType}
          fields={current.fields}
          kind={current.kind}
          showBack={revealed}
        />
      </div>

      <div className="mt-8">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="btn-brand w-full py-4 text-[15px]"
          >
            Show answer
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <button
                key={r.grade}
                onClick={() => rate(r.grade)}
                disabled={isPending}
                className="flex flex-col items-center gap-1 rounded-xl border py-3 disabled:opacity-60"
                style={{
                  background: r.bg,
                  color: r.fg,
                  borderColor: `color-mix(in srgb, ${r.fg} 32%, transparent)`,
                }}
              >
                <span
                  className="text-[13px]"
                  style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 600 }}
                >
                  {r.label}
                </span>
                <span
                  className="text-[11px]"
                  style={{ fontFamily: "var(--font-sp-mono), monospace" }}
                >
                  {previews ? intervalLabel(previews[r.grade], Date.now()) : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
