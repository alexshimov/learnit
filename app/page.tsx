import Link from "next/link";
import { Flame, Play, BookOpen, Languages, ChevronRight, Sparkles, Folder } from "@/app/components/icons";
import {
  getDecksPageData,
  getStreak,
  getReviewedTodayCount,
  getLastStudiedMap,
  type DeckOverview,
} from "@/lib/queries";

/** How many recently-studied decks to offer picking back up. */
const CONTINUE_COUNT = 3;

/** Compact "how long ago", for the last time a deck was studied. */
function agoLabel(then: number, now: number): string {
  const mins = Math.round((now - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export const dynamic = "force-dynamic";

function greeting(hour: number): string {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function deckIcon(topic: string | null) {
  if (topic && /lang|english|vocab|word/i.test(topic)) return Languages;
  return BookOpen;
}

export default async function TodayPage() {
  const now = Date.now();
  const [{ decks, folders }, streak, reviewedToday, lastStudied] = await Promise.all([
    getDecksPageData(now),
    getStreak(now),
    getReviewedTodayCount(now),
    getLastStudiedMap(),
  ]);

  // Decks you were last working on that still have cards waiting — a deck
  // you've finished for now isn't worth offering.
  const continueDecks = decks
    .filter((d) => d.due > 0 && lastStudied.has(d.id))
    .sort((a, b) => lastStudied.get(b.id)! - lastStudied.get(a.id)!)
    .slice(0, CONTINUE_COUNT);

  const anyGrouped = decks.some((d) => d.folderId != null);
  const sections = anyGrouped
    ? [
        ...[...folders]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((f) => ({ key: f.id, name: f.name, decks: decks.filter((d) => d.folderId === f.id) }))
          .filter((s) => s.decks.length > 0),
        ...(decks.some((d) => d.folderId == null)
          ? [{ key: "ungrouped", name: "Ungrouped", decks: decks.filter((d) => d.folderId == null) }]
          : []),
      ]
    : [];

  const totalDue = decks.reduce((sum, d) => sum + d.due, 0);
  const denom = reviewedToday + totalDue;
  const progress = denom > 0 ? reviewedToday / denom : 0;
  const date = new Date(now);
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            {dateLabel}
          </p>
          <h1 className="text-xl font-medium">{greeting(date.getHours())}</h1>
        </div>
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)" }}
          title={`${streak}-day streak`}
        >
          <Flame size={16} style={{ color: streak > 0 ? "#e08a1e" : "var(--text-muted)" }} />
          <span className="text-[13px] font-medium">{streak}</span>
        </div>
      </header>

      {decks.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section
            className="rounded-2xl p-5"
            style={{ background: "var(--brand)", color: "var(--on-brand)" }}
          >
            <div className="flex items-center gap-4">
              <svg width="62" height="62" viewBox="0 0 62 62" aria-hidden="true">
                <circle cx="31" cy="31" r={r} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="6" />
                <circle
                  cx="31"
                  cy="31"
                  r={r}
                  fill="none"
                  stroke="#fff"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={offset}
                  transform="rotate(-90 31 31)"
                />
                <text x="31" y="35" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="500">
                  {Math.round(progress * 100)}%
                </text>
              </svg>
              <div>
                <p className="text-2xl font-medium leading-tight">
                  {totalDue === 0 ? "All caught up" : `${totalDue} cards`}
                </p>
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {totalDue === 0
                    ? `${reviewedToday} reviewed today`
                    : "due today"}
                </p>
              </div>
            </div>
            {totalDue > 0 && (
              <Link
                href="/review"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl py-2.5 text-[15px] font-medium"
                style={{ background: "#fff", color: "var(--brand)" }}
              >
                <Play size={17} fill="currentColor" /> Start review
              </Link>
            )}
          </section>

          {continueDecks.length > 0 && (
            <section className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <Play size={13} style={{ color: "var(--brand)" }} />
                <span className="eyebrow2">Pick up where you left off</span>
              </div>
              <div className="card overflow-hidden">
                {continueDecks.map((deck, i) => (
                  <DeckRow
                    key={deck.id}
                    deck={deck}
                    first={i === 0}
                    note={agoLabel(lastStudied.get(deck.id)!, now)}
                  />
                ))}
              </div>
            </section>
          )}

          {anyGrouped ? (
            <section className="flex flex-col gap-4">
              {sections.map((s) => (
                <div key={s.key} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <Folder size={15} style={{ color: "var(--text-muted)" }} />
                    <span className="eyebrow2">{s.name}</span>
                    <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                      {s.decks.length}
                    </span>
                  </div>
                  <div className="card overflow-hidden">
                    {s.decks.map((deck, i) => (
                      <DeckRow key={deck.id} deck={deck} first={i === 0} />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <section>
              <h2 className="mb-2 px-1 text-[13px]" style={{ color: "var(--text-muted)" }}>
                Your decks
              </h2>
              <div className="card overflow-hidden">
                {decks.map((deck, i) => (
                  <DeckRow key={deck.id} deck={deck} first={i === 0} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function DeckRow({
  deck,
  first,
  note,
}: {
  deck: DeckOverview;
  first: boolean;
  /** Extra context for this row, e.g. when the deck was last studied. */
  note?: string;
}) {
  const Icon = deckIcon(deck.topic);
  return (
    <Link
      href={`/review?deck=${deck.id}`}
      className="flex items-center gap-3 px-3.5 py-3"
      style={{ borderTop: first ? "none" : "0.5px solid var(--border)" }}
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
          {note ? `${note} · ` : deck.topic ? `${deck.topic} · ` : ""}
          {deck.total} card{deck.total === 1 ? "" : "s"}
        </p>
      </div>
      {deck.due > 0 ? (
        <span
          className="rounded-full px-2 py-0.5 text-[12px] font-medium"
          style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
        >
          {deck.due}
        </span>
      ) : (
        <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
      )}
    </Link>
  );
}

function EmptyState() {
  return (
    <section className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: "var(--surface-0)", color: "var(--brand)" }}
      >
        <Sparkles size={26} />
      </span>
      <h2 className="text-lg font-medium">No decks yet</h2>
      <p className="max-w-xs text-[14px]" style={{ color: "var(--text-secondary)" }}>
        Generate cards with ChatGPT or Claude, paste the markdown, and start
        remembering.
      </p>
      <Link
        href="/import"
        className="btn-brand mt-1 px-5 py-2.5 text-[15px]"
      >
        Import your first deck
      </Link>
    </section>
  );
}
