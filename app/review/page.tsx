import Link from "next/link";
import { Check, Play, ArrowLeft } from "@/app/components/icons";
import { getDueQueue, getDeckDirections, parseDirection } from "@/lib/queries";
import { parseLimit } from "@/lib/session";
import { ReviewSession } from "@/app/components/review-session";
import { StudyStarter } from "@/app/components/study-starter";

export const dynamic = "force-dynamic";

const DIRECTION_LABEL = { ru: "RU → EN", en: "EN → RU" } as const;

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string; dir?: string; n?: string }>;
}) {
  const { deck, dir, n } = await searchParams;
  const direction = parseDirection(dir);

  // A both-ways deck is studied one direction at a time — ask which, rather
  // than dealing a mixed queue where the sibling gives the answer away.
  if (deck && !direction) {
    const info = await getDeckDirections(deck);
    if (info?.bothWays) return <DirectionChoice deckId={deck} info={info} />;
  }

  const queue = await getDueQueue(Date.now(), deck, parseLimit(n), direction);

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
          Start a session
        </h1>
      </header>

      <StudyStarter
        deckId={deckId}
        size="lg"
        options={[
          { dir: "ru", label: DIRECTION_LABEL.ru, due: info.dueRu },
          { dir: "en", label: DIRECTION_LABEL.en, due: info.dueEn },
        ]}
      />
    </div>
  );
}
