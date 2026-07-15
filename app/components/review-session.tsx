"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { X, Check } from "@/app/components/icons";
import type { QueueCard } from "@/lib/queries";
import { CardFace } from "@/app/components/card-face";
import { previewIntervals, intervalLabel, Rating } from "@/lib/fsrs";
import {
  submitReviewAction,
  updateStudyCardAction,
  deleteCardAction,
} from "@/app/actions";

const RATINGS = [
  { grade: Rating.Again, label: "Again", fg: "var(--danger)", bg: "var(--danger-bg)" },
  { grade: Rating.Hard, label: "Hard", fg: "var(--warning)", bg: "var(--warning-bg)" },
  { grade: Rating.Good, label: "Good", fg: "var(--success)", bg: "var(--success-bg)" },
  { grade: Rating.Easy, label: "Easy", fg: "var(--accent)", bg: "var(--accent-bg)" },
] as const;

export function ReviewSession({ queue }: { queue: QueueCard[] }) {
  const [cards, setCards] = useState(queue);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Card actions
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [editErr, setEditErr] = useState<string | null>(null);

  const current = cards[index];
  const previews = useMemo(
    () => (current ? previewIntervals(current.sched, Date.now()) : null),
    [current],
  );

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setConfirmRemove(false);
  }, []);

  const rate = useCallback(
    (grade: number) => {
      if (!current || isPending || editing) return;
      const isLast = index + 1 >= cards.length;
      startTransition(async () => {
        await submitReviewAction(current.cardId, grade);
        setReviewed((n) => n + 1);
        if (isLast) {
          setDone(true);
        } else {
          setIndex((i) => i + 1);
          setRevealed(false);
        }
      });
    },
    [current, index, cards.length, isPending, editing],
  );

  function openEdit() {
    if (!current) return;
    setEditText(current.markdown);
    setEditErr(null);
    setEditing(true);
    closeMenu();
  }

  function saveEdit() {
    if (!current) return;
    setEditErr(null);
    startTransition(async () => {
      const r = await updateStudyCardAction(current.noteId, current.kind, editText);
      if (!r.ok) {
        setEditErr(r.error);
        return;
      }
      const card = r.card;
      setCards((prev) => prev.map((c, i) => (i === index ? card : c)));
      setEditing(false);
    });
  }

  function removeCard() {
    if (!current) return;
    const noteId = current.noteId;
    startTransition(async () => {
      const r = await deleteCardAction(noteId);
      if (!r.ok) return;
      const next = cards.filter((c) => c.noteId !== noteId);
      closeMenu();
      setRevealed(false);
      setCards(next);
      if (next.length === 0 || index >= next.length) setDone(true);
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done || editing || menuOpen) return;
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
  }, [revealed, done, editing, menuOpen, rate]);

  if (done || !current) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 text-center">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "var(--success-bg)", color: "var(--success)" }}
        >
          <Check size={30} />
        </span>
        <h1 className="text-xl font-medium">
          {reviewed === 0 ? "All done" : "Session complete"}
        </h1>
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          {reviewed === 0
            ? "No cards left to review."
            : `You reviewed ${reviewed} card${reviewed === 1 ? "" : "s"}. Nice work.`}
        </p>
        <Link href="/" className="btn-brand mt-2 px-6 py-2.5 text-[15px]">
          Back to today
        </Link>
      </div>
    );
  }

  const progress = ((index + (revealed ? 0.5 : 0)) / cards.length) * 100;

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
          {index + 1}/{cards.length}
        </span>
        <div className="relative">
          <button
            onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
            disabled={editing}
            aria-label="Card actions"
            className="px-1 text-[18px] leading-none disabled:opacity-40"
            style={{ color: "var(--text-muted)" }}
          >
            ⋯
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={closeMenu} />
              <div
                className="absolute right-0 top-8 z-20 flex w-48 flex-col gap-1 rounded-xl p-1.5"
                style={{
                  background: "var(--elevated)",
                  border: "0.5px solid var(--border-strong)",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.28)",
                }}
              >
                {!confirmRemove ? (
                  <>
                    <button
                      onClick={openEdit}
                      className="rounded-lg px-3 py-2 text-left text-[13px]"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Edit card
                    </button>
                    <button
                      onClick={() => setConfirmRemove(true)}
                      className="rounded-lg px-3 py-2 text-left text-[13px]"
                      style={{ color: "var(--danger)" }}
                    >
                      Remove card
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 p-1.5">
                    <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                      Delete this card permanently?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={removeCard}
                        disabled={isPending}
                        className="flex-1 rounded-lg py-1.5 text-[12px] font-medium disabled:opacity-50"
                        style={{ background: "var(--danger)", color: "#fff" }}
                      >
                        {isPending ? "…" : "Delete"}
                      </button>
                      <button
                        onClick={() => setConfirmRemove(false)}
                        className="btn-ghost flex-1 py-1.5 text-[12px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="flex flex-1 flex-col">
          <div className="eyebrow2 mb-4">Edit card</div>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            spellCheck={false}
            autoFocus
            className="min-h-[220px] w-full flex-1 resize-y rounded-2xl p-4 font-mono text-[13px] leading-relaxed outline-none"
            style={{
              background: "var(--surface-1)",
              border: "0.5px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
          {editErr && (
            <p className="mt-2 text-[12px]" style={{ color: "var(--danger)" }}>
              {editErr}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              onClick={saveEdit}
              disabled={isPending || !editText.trim()}
              className="btn-brand px-5 py-2.5 text-[14px] disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save card"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="btn-ghost px-5 py-2.5 text-[14px]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
