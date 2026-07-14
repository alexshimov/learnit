import {
  getDecksOverview,
  getStreak,
  getReviewedTodayCount,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)" }}>
      <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-medium">{value}</p>
    </div>
  );
}

export default async function StatsPage() {
  const now = Date.now();
  const [decks, streak, reviewedToday] = await Promise.all([
    getDecksOverview(now),
    getStreak(now),
    getReviewedTodayCount(now),
  ]);

  const totalCards = decks.reduce((s, d) => s + d.total, 0);
  const totalDue = decks.reduce((s, d) => s + d.due, 0);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-medium">Stats</h1>
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Current streak" value={`${streak} day${streak === 1 ? "" : "s"}`} />
        <Metric label="Reviewed today" value={reviewedToday} />
        <Metric label="Due now" value={totalDue} />
        <Metric label="Total cards" value={totalCards} />
      </div>
      <p className="px-1 text-[13px]" style={{ color: "var(--text-muted)" }}>
        Richer charts — retention, review history, forecast — are coming next.
      </p>
    </div>
  );
}
