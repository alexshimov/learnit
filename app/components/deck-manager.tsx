"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Upload, Trash } from "@/app/components/icons";
import type { DeckDetail } from "@/lib/queries";
import {
  saveDeckContentAction,
  appendDeckFromMarkdownAction,
  deleteDeckAction,
} from "@/app/actions";

export function DeckManager({ detail }: { detail: DeckDetail }) {
  const router = useRouter();
  const [md, setMd] = useState(detail.markdown);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [isPending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = md !== detail.markdown;

  function save() {
    setMsg(null);
    start(async () => {
      const r = await saveDeckContentAction(detail.id, md);
      if (r.ok) {
        setMd(r.markdown);
        setMsg({
          kind: "ok",
          text: `Saved — ${r.added} added, ${r.removed} removed, ${r.kept} kept.`,
        });
        router.refresh();
      } else {
        setMsg({ kind: "err", text: r.error });
      }
    });
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMsg(null);
    start(async () => {
      const text = await file.text();
      const r = await appendDeckFromMarkdownAction(detail.id, text);
      if (r.ok) {
        setMd(r.markdown);
        setMsg({
          kind: "ok",
          text: `Added ${r.added} new card${r.added === 1 ? "" : "s"}, skipped ${r.skipped} duplicate${r.skipped === 1 ? "" : "s"}.`,
        });
        router.refresh();
      } else {
        setMsg({ kind: "err", text: r.error });
      }
    });
  }

  function del() {
    start(async () => {
      await deleteDeckAction(detail.id);
      router.push("/decks");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/decks"
        className="flex items-center gap-1.5 text-[13px]"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={16} /> Decks
      </Link>

      <header>
        <div className="eyebrow2">
          {detail.topic ? `${detail.topic} · ` : ""}
          {detail.total} card{detail.total === 1 ? "" : "s"}
          {detail.due > 0 ? ` · ${detail.due} due` : ""}
        </div>
        <h1 className="q-prompt mt-2" style={{ fontSize: "1.6rem" }}>
          {detail.title}
        </h1>
      </header>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/review?deck=${detail.id}`}
          className="btn-brand flex items-center gap-2 px-5 py-2.5 text-[14px]"
        >
          <Play size={15} /> Study{detail.due > 0 ? ` · ${detail.due}` : ""}
        </Link>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isPending}
          className="btn-ghost flex items-center gap-2 px-4 py-2.5 text-[14px] disabled:opacity-50"
        >
          <Upload size={15} /> Update from file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          hidden
          onChange={onFile}
        />
      </div>

      {msg && (
        <div
          className="rounded-xl px-3 py-2.5 text-[13px]"
          style={{
            background: msg.kind === "ok" ? "var(--success-bg)" : "var(--danger-bg)",
            color: msg.kind === "ok" ? "var(--success)" : "var(--danger)",
          }}
        >
          {msg.text}
        </div>
      )}

      <section className="flex flex-col gap-2">
        <div className="eyebrow2">Content</div>
        <textarea
          value={md}
          onChange={(e) => setMd(e.target.value)}
          spellCheck={false}
          className="min-h-[320px] w-full resize-y rounded-2xl p-4 font-mono text-[13px] leading-relaxed outline-none"
          style={{
            background: "var(--surface-1)",
            border: "0.5px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
        <div>
          <button
            onClick={save}
            disabled={!dirty || isPending}
            className="btn-brand px-5 py-2.5 text-[14px] disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="eyebrow2">Cards ({detail.items.length})</div>
        <div className="card overflow-hidden">
          {detail.items.map((it, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3.5 py-2.5"
              style={{ borderTop: i === 0 ? "none" : "0.5px solid var(--border)" }}
            >
              <span
                className="shrink-0 text-[10px] uppercase"
                style={{
                  fontFamily: "var(--font-sp-mono), monospace",
                  color: "var(--text-muted)",
                  width: 42,
                }}
              >
                {it.type}
              </span>
              <span className="truncate text-[13px]" style={{ color: "var(--text-secondary)" }}>
                {it.summary}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-2 flex flex-col gap-2">
        <div className="eyebrow2" style={{ color: "var(--danger)" }}>
          Danger zone
        </div>
        {confirmDel ? (
          <div
            className="flex flex-col gap-3 rounded-xl p-3.5"
            style={{ background: "var(--danger-bg)", border: "0.5px solid var(--danger)" }}
          >
            <p className="text-[13px]" style={{ color: "var(--danger)" }}>
              Delete “{detail.title}” and all {detail.total} cards? This can’t be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={del}
                disabled={isPending}
                className="rounded-xl px-4 py-2 text-[13px] font-medium"
                style={{ background: "var(--danger)", color: "#fff" }}
              >
                {isPending ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                className="btn-ghost px-4 py-2 text-[13px]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDel(true)}
            className="btn-ghost flex items-center gap-2 self-start px-4 py-2.5 text-[14px]"
            style={{ color: "var(--danger)" }}
          >
            <Trash size={15} /> Delete deck
          </button>
        )}
      </section>
    </div>
  );
}
