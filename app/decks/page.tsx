import { getDecksPageData } from "@/lib/queries";
import { DecksManager } from "@/app/components/decks-manager";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const { decks, folders } = await getDecksPageData(Date.now());

  if (decks.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-medium">Decks</h1>
        <div className="card px-6 py-10 text-center">
          <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
            No decks yet. Import one to get started.
          </p>
        </div>
      </div>
    );
  }

  return <DecksManager decks={decks} folders={folders} />;
}
