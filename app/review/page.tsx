import Link from "next/link";
import { Check, Play, ArrowLeft } from "@/app/components/icons";
import { getDueQueue, getDeckDirections, parseDirection } from "@/lib/queries";
import { ReviewSession } from "@/app/components/review-session";

export const dynamic = "force-dynamic";

const DIRECTION_LABEL = { ru: "RU → EN", en: "EN → RU" } as const;

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string; dir?: string }>;
}) {
  const { deck, dir } = await searchParams;
  const direction = parseDirection(dir);

  // A both-ways deck is studied one direction at a time — ask which, rather
  // than dealing a mixed queue where the sibling gives the answer away.
  if (deck && !direction) {
    const info = await getDeckDirections(deck);
    if (info?.bothWays) return <DirectionChoice deckId={deck} info={info} />;
  }

  const queue = await getDueQueue(Date.now(), deck, 200, direction);

  if (queue.length === 0) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 text-center">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "var(--success-bg)", color: "var(--success)" }}
        >
          <Check size={30} />
        </span>
        <h1 className="text-xl font-medium">All caught up</h1>
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          {direction
            ? `Nothing due in ${DIRECTION_LABEL[direction]} right now. The other direction may still have cards.`
            : "Nothing due right now. Come back later, or add a new deck."}
        </p>
        <Link href="/" className="btn-brand mt-2 px-6 py-2.5 text-[15px]">
          Back to today
        </Link>
      </div>
    );
  }

  return (
    <ReviewSession
      queue={queue}
      directionLabel={direction ? DIRECTION_LABEL[direction] : undefined}
    />
  );
}

function DirectionChoice({
  deckId,
  info,
}: {
  deckId: string;
  info: { title: string; dueRu: number; dueEn: number };
}) {
  const options = [
    { dir: "ru", label: DIRECTION_LABEL.ru, hint: "Recall the English word", due: info.dueRu },
    { dir: "en", label: DIRECTION_LABEL.en, hint: "Recall the Russian meaning", due: info.dueEn },
  ] as const;

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
        <div className="eyebrow2">{info.title}</div>
        <h1 className="q-prompt mt-2" style={{ fontSize: "1.6rem" }}>
          Which direction?
        </h1>
      </header>

      <div className="flex flex-col gap-2.5">
        {options.map((o) => (
          <Link
            key={o.dir}
            href={`/review?deck=${deckId}&dir=${o.dir}`}
            aria-disabled={o.due === 0}
            className="card flex items-center gap-3 px-4 py-3.5"
            style={o.due === 0 ? { opacity: 0.55, pointerEvents: "none" } : undefined}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
            >
              <Play size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">{o.label}</p>
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                {o.hint}
              </p>
            </div>
            <span
              className="shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-medium"
              style={
                o.due > 0
                  ? {
                      background: "var(--brand-tint)",
                      border: "0.5px solid var(--brand-line)",
                      color: "var(--brand)",
                    }
                  : { color: "var(--text-muted)" }
              }
            >
              {o.due > 0 ? `${o.due} due` : "none due"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
