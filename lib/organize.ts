import { randomUUID } from "node:crypto";
import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { decks, folders, notes, cards, reviews } from "./db/schema";
import { newCardState } from "./fsrs";

const REVERSE_KIND = "vocab:en";

/**
 * Turn the reverse (EN → RU) direction on or off for a deck's vocab notes.
 * Enabling adds a fresh reverse card per vocab note; disabling deletes those
 * cards and their review history. The forward cards are never touched, so
 * their scheduling survives toggling either way.
 */
export async function setDeckBothWays(
  deckId: string,
  bothWays: boolean,
): Promise<{ added: number; removed: number }> {
  const db = await getDb();
  await db.update(decks).set({ bothWays }).where(eq(decks.id, deckId));

  const vocabNotes = await db
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.deckId, deckId), eq(notes.type, "vocab")));
  const noteIds = vocabNotes.map((n) => n.id);
  if (noteIds.length === 0) return { added: 0, removed: 0 };

  if (!bothWays) {
    const doomed = await db
      .select({ id: cards.id })
      .from(cards)
      .where(and(eq(cards.deckId, deckId), eq(cards.kind, REVERSE_KIND)));
    const ids = doomed.map((c) => c.id);
    if (ids.length) {
      await db.delete(reviews).where(inArray(reviews.cardId, ids));
      await db.delete(cards).where(inArray(cards.id, ids));
    }
    return { added: 0, removed: ids.length };
  }

  const existing = await db
    .select({ noteId: cards.noteId })
    .from(cards)
    .where(and(eq(cards.deckId, deckId), eq(cards.kind, REVERSE_KIND)));
  const have = new Set(existing.map((c) => c.noteId));

  const now = Date.now();
  let added = 0;
  for (const noteId of noteIds) {
    if (have.has(noteId)) continue;
    await db.insert(cards).values({
      id: randomUUID(),
      noteId,
      deckId,
      kind: REVERSE_KIND,
      createdAt: now,
      ...newCardState(now),
    });
    added++;
  }
  return { added, removed: 0 };
}

export async function renameDeck(deckId: string, title: string): Promise<void> {
  const db = await getDb();
  await db.update(decks).set({ title }).where(eq(decks.id, deckId));
}

export async function setDeckTags(deckId: string, tags: string[]): Promise<void> {
  const db = await getDb();
  await db.update(decks).set({ tags }).where(eq(decks.id, deckId));
}

export async function createFolder(name: string): Promise<{ id: string; name: string }> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(folders).values({ id, name, createdAt: Date.now() });
  return { id, name };
}

export async function renameFolder(folderId: string, name: string): Promise<void> {
  const db = await getDb();
  await db.update(folders).set({ name }).where(eq(folders.id, folderId));
}

/** Delete a folder; its decks fall back to "ungrouped". */
export async function deleteFolder(folderId: string): Promise<void> {
  const db = await getDb();
  await db.update(decks).set({ folderId: null }).where(eq(decks.folderId, folderId));
  await db.delete(folders).where(eq(folders.id, folderId));
}

/** Persist the full ordering + folder assignment of every deck in one shot.
 *  The client sends the flattened order (folders' decks, then ungrouped); each
 *  deck's position becomes its sortOrder and its folder is set. */
export async function organizeDecks(
  order: { id: string; folderId: string | null }[],
): Promise<void> {
  const db = await getDb();
  for (let i = 0; i < order.length; i++) {
    await db
      .update(decks)
      .set({ sortOrder: i, folderId: order[i].folderId })
      .where(eq(decks.id, order[i].id));
  }
}
