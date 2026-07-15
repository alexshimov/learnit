"use client";

import { useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleAlert, Upload } from "@/app/components/icons";
import { parseDeck } from "@/lib/markdown";
import { cardKinds } from "@/lib/cards";
import { importDeckAction } from "@/app/actions";

const EXAMPLE = `---
deck: Linear algebra
topic: math
tags: [foundations]
---

Q: What is an eigenvector of a matrix A?
A: A non-zero vector **v** whose direction is unchanged by A — only scaled: A·v = λv.

---

Q: What does the determinant of a 2x2 matrix measure?
A: The signed area scaling factor of the linear map.
reverse: true

---

Q: What is an eigenvalue?
A: The scalar factor λ by which an eigenvector is stretched or shrunk.`;

export default function ImportPage() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setText(await file.text());
  }

  const preview = useMemo(() => {
    if (!text.trim()) return null;
    try {
      const deck = parseDeck(text);
      let cardCount = 0;
      const byType: Record<string, number> = {};
      for (const n of deck.notes) {
        cardCount += cardKinds(n).length;
        byType[n.type] = (byType[n.type] ?? 0) + 1;
      }
      const breakdown = Object.entries(byType)
        .map(([t, n]) => `${n} ${t}`)
        .join(", ");
      return { deck, cardCount, breakdown };
    } catch {
      return null;
    }
  }, [text]);

  function onImport() {
    setError(null);
    startTransition(async () => {
      const result = await importDeckAction(text);
      if (result.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const canImport = !!preview && preview.deck.notes.length > 0 && !isPending;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            New deck
          </p>
          <h1 className="text-xl font-medium">Paste markdown</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-ghost px-3 py-1.5 text-[13px]"
          >
            From file
          </button>
          <button
            onClick={() => setText(EXAMPLE)}
            className="btn-ghost px-3 py-1.5 text-[13px]"
          >
            Use example
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          hidden
          onChange={onFile}
        />
      </header>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"---\ndeck: My deck\ntopic: management\n---\n\nQ: A question?\nA: The answer.\n\n---\n\nQ: Another question?\nA: Another answer."}
        spellCheck={false}
        className="min-h-[280px] w-full resize-y rounded-2xl p-4 font-mono text-[13px] leading-relaxed outline-none"
        style={{
          background: "var(--surface-1)",
          border: "0.5px solid var(--border)",
          color: "var(--text-primary)",
        }}
      />

      {preview && preview.deck.notes.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <CircleCheck size={18} style={{ color: "var(--success)" }} />
            <p className="text-[14px]">
              <span className="font-medium">{preview.deck.title}</span>
              <span style={{ color: "var(--text-muted)" }}>
                {" "}
                — {preview.cardCount} card{preview.cardCount === 1 ? "" : "s"} ·{" "}
                {preview.breakdown}
              </span>
            </p>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {preview.deck.notes.slice(0, 3).map((n, i) => (
              <div
                key={i}
                className="rounded-lg px-3 py-2 text-[13px]"
                style={{ background: "var(--surface-0)" }}
              >
                <p className="truncate">
                  {n.type === "basic"
                    ? (n.fields as { front: string }).front
                    : n.type === "vocab"
                      ? `${(n.fields as { ru: string }).ru} → ${(n.fields as { en: string }).en}`
                      : (n.fields as { text: string }).text.replace(
                          /\{\{c\d+::(.+?)(?:::.+?)?\}\}/g,
                          "[…]",
                        )}
                </p>
                <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {n.type}
                </p>
              </div>
            ))}
            {preview.deck.notes.length > 3 && (
              <p className="px-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
                +{preview.deck.notes.length - 3} more
              </p>
            )}
          </div>
        </div>
      )}

      {text.trim() && preview && preview.deck.notes.length === 0 && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
          <CircleAlert size={16} />
          <p className="text-[13px]">No cards found. Use Q: / A: pairs (see the example).</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
          <CircleAlert size={16} />
          <p className="text-[13px]">{error}</p>
        </div>
      )}

      <button
        onClick={onImport}
        disabled={!canImport}
        className="btn-brand flex items-center justify-center gap-2 py-3.5 text-[15px] disabled:opacity-50"
      >
        <Upload size={17} />
        {isPending ? "Importing…" : "Import deck"}
      </button>

      <p className="px-1 text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
        Tip: ask ChatGPT or Claude to &ldquo;turn this chapter into a deck&rdquo; using this exact
        format — frontmatter, then <span className="font-mono">Q:</span>/
        <span className="font-mono">A:</span> pairs separated by{" "}
        <span className="font-mono">---</span>.
      </p>
    </div>
  );
}
