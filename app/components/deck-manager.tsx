"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Upload, Download, Trash, ChevronDown, Plus } from "@/app/components/icons";
import { CardFace } from "@/app/components/card-face";
import type { DeckDetail } from "@/lib/queries";
import {
  saveDeckContentAction,
  appendDeckFromMarkdownAction,
  deleteDeckAction,
  addCardAction,
  updateCardAction,
  deleteCardAction,
} from "@/app/actions";

function kindLabel(kind: string): string {
  if (kind === "reverse") return "Back → front";
  if (kind.startsWith("cloze:")) return `Cloze ${kind.split(":")[1]}`;
  return "Front → back";
}

export function DeckManager({ detail }: { detail: DeckDetail }) {
  const router = useRouter();
  const [md, setMd] = useState(detail.markdown);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [cardErr, setCardErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  function startAdd() {
    setCardErr(null);
    setEditText("Q: \nA: ");
    setEditingId("new");
  }
  function startEdit(id: string, markdown: string) {
    setCardErr(null);
    setEditText(markdown);
    setEditingId(id);
  }
  function cancelEdit() {
    setEditingId(null);
    setEditText("");
    setCardErr(null);
  }
  function saveCard() {
    setCardErr(null);
    start(async () => {
      const r =
        editingId === "new"
          ? await addCardAction(detail.id, editText)
          : await updateCardAction(editingId!, editText);
      if (r.ok) {
        cancelEdit();
        router.refresh();
      } else {
        setCardErr(r.error);
      }
    });
  }
  function removeCard(id: string) {
    start(async () => {
      const r = await deleteCardAction(id);
      if (r.ok) {
        setDeletingId(null);
        router.refresh();
      }
    });
  }

  const cardEditor = (
    <div className="flex flex-col gap-2">
      <textarea
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        spellCheck={false}
        autoFocus
        className="min-h-[150px] w-full resize-y rounded-xl p-3 font-mono text-[13px] leading-relaxed outline-none"
        style={{
          background: "var(--surface-1)",
          border: "0.5px solid var(--border)",
          color: "var(--text-primary)",
        }}
      />
      {cardErr && (
        <p className="text-[12px]" style={{ color: "var(--danger)" }}>
          {cardErr}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={saveCard}
          disabled={isPending || !editText.trim()}
          className="btn-brand px-4 py-2 text-[13px] disabled:opacity-50"
        >
          {isPending ? "Saving…" : editingId === "new" ? "Add card" : "Save"}
        </button>
        <button onClick={cancelEdit} className="btn-ghost px-4 py-2 text-[13px]">
          Cancel
        </button>
      </div>
    </div>
  );

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
        <a
          href={`/decks/${detail.id}/export`}
          download
          className="btn-ghost flex items-center gap-2 px-4 py-2.5 text-[14px]"
        >
          <Download size={15} /> Export .md
        </a>
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
        <div className="flex items-center justify-between">
          <div className="eyebrow2">Cards ({detail.items.length})</div>
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 text-[13px]"
            style={{ color: "var(--brand)" }}
          >
            <Plus size={16} /> Add card
          </button>
        </div>
        <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
          Tap a card to preview, edit, or delete it.
        </p>

        {editingId === "new" && (
          <div className="card flex flex-col gap-2 p-3.5">
            <div className="eyebrow2">New card</div>
            {cardEditor}
          </div>
        )}

        <div className="card overflow-hidden">
          {detail.items.map((it) => (
            <details key={it.id} className="deck-card-row">
              <summary>
                <span className="type-badge">{it.noteType}</span>
                <span className="truncate text-[13px]" style={{ color: "var(--text-secondary)" }}>
                  {it.summary}
                </span>
                <ChevronDown size={16} className="chev" />
              </summary>
              <div className="card-preview px-4 pb-4">
                {editingId === it.id ? (
                  <div className="pt-3">{cardEditor}</div>
                ) : (
                  <>
                    {it.kinds.map((kind, k) => (
                      <div key={k}>
                        {it.kinds.length > 1 && (
                          <div className="eyebrow2 mb-3 mt-5">{kindLabel(kind)}</div>
                        )}
                        <CardFace noteType={it.noteType} fields={it.fields} kind={kind} />
                      </div>
                    ))}
                    <div className="mt-5 flex gap-2">
                      <button
                        onClick={() => startEdit(it.id, it.markdown)}
                        className="btn-ghost px-3.5 py-1.5 text-[12px]"
                      >
                        Edit
                      </button>
                      {deletingId === it.id ? (
                        <>
                          <button
                            onClick={() => removeCard(it.id)}
                            disabled={isPending}
                            className="rounded-lg px-3.5 py-1.5 text-[12px] font-medium"
                            style={{ background: "var(--danger)", color: "#fff" }}
                          >
                            {isPending ? "Deleting…" : "Confirm delete"}
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="btn-ghost px-3.5 py-1.5 text-[12px]"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeletingId(it.id)}
                          className="btn-ghost px-3.5 py-1.5 text-[12px]"
                          style={{ color: "var(--danger)" }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </details>
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
