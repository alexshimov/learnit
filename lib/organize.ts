import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { decks, folders } from "./db/schema";

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
