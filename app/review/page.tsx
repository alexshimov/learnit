import Link from "next/link";
import { Check } from "@/app/components/icons";
import { getDueQueue } from "@/lib/queries";
import { ReviewSession } from "@/app/components/review-session";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string }>;
}) {
  const { deck } = await searchParams;
  const queue = await getDueQueue(Date.now(), deck);

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
          Nothing due right now. Come back later, or add a new deck.
        </p>
        <Link href="/" className="btn-brand mt-2 px-6 py-2.5 text-[15px]">
          Back to today
        </Link>
      </div>
    );
  }

  return <ReviewSession queue={queue} />;
}
