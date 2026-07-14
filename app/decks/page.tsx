import Link from "next/link";
import { BookOpen, Languages, ChevronRight, Plus } from "@/app/components/icons";
import { getDecksOverview } from "@/lib/queries";

export const dynamic = "force-dynamic";

function deckIcon(topic: string | null) {
  if (topic && /lang|english|vocab|word/i.test(topic)) return Languages;
  return BookOpen;
}

export default async function DecksPage() {
  const decks = await getDecksOverview(Date.now());

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Decks</h1>
        <Link
          href="/import"
          className="flex items-center gap-1.5 text-[14px]"
          style={{ color: "var(--brand)" }}
        >
          <Plus size={17} /> New
        </Link>
      </header>

      {decks.length === 0 ? (
        <div className="card px-6 py-10 text-center">
          <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
            No decks yet. Import one to get started.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {decks.map((deck, i) => {
            const Icon = deckIcon(deck.topic);
            return (
              <Link
                key={deck.id}
                href={`/decks/${deck.id}`}
                className="flex items-center gap-3 px-3.5 py-3"
                style={{ borderTop: i === 0 ? "none" : "0.5px solid var(--border)" }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "var(--surface-0)", color: "var(--text-secondary)" }}
                >
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{deck.title}</p>
                  <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                    {deck.topic ? `${deck.topic} · ` : ""}
                    {deck.total} card{deck.total === 1 ? "" : "s"}
                    {deck.due > 0 ? ` · ${deck.due} due` : ""}
                  </p>
                </div>
                <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
