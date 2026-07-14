import { randomUUID, createHash } from "node:crypto";
import { eq, inArray, asc } from "drizzle-orm";
import { db } from "./db";
import { decks, notes, cards, reviews } from "./db/schema";
import { parseDeck } from "./markdown";
import { cardKinds } from "./cards";
import { newCardState } from "./fsrs";
import { serializeDeck } from "./serialize";
import type {
  NoteType,
  NoteFields,
  ParsedNote,
  BasicFields,
  ClozeFields,
  VocabFields,
} from "./types";

export type InsertResult =
  | { ok: true; deckId: string; deckTitle: string; noteCount: number; cardCount: number }
  | { ok: false; error: string };

const US = "\u0001"; // field separator
const RS = "\u0002"; // list-item separator

function norm(s: unknown): string {
  return String(s ?? "").trim().replace(/\s+/g, " ");
}

function chunk<T>(arr: T[], size = 400): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Stable content identity of a note — used to dedup and to preserve FSRS
 *  state for a card whose learnable content is unchanged. Tags are excluded. */
export function noteHash(type: NoteType, fields: NoteFields): string {
  let canonical: string;
  if (type === "vocab") {
    const f = fields as VocabFields;
    canonical = [
      "vocab",
      norm(f.en),
      norm(f.ru),
      norm(f.usage),
      (f.examples ?? []).map(norm).join(RS),
      norm(f.antonyms),
      norm(f.related),
    ].join(US);
  } else if (type === "cloze") {
    const f = fields as ClozeFields;
    canonical = ["cloze", norm(f.text), norm(f.hint)].join(US);
  } else {
    const f = fields as BasicFields;
    canonical = ["basic", norm(f.front), norm(f.back), f.reverse ? "1" : "0", norm(f.hint)].join(US);
  }
  return createHash("sha1").update(canonical).digest("hex");
}

async function insertNote(deckId: string, note: ParsedNote, now: number): Promise<number> {
  const noteId = randomUUID();
  await db.insert(notes).values({
    id: noteId,
    deckId,
    type: note.type,
    fields: note.fields,
    tags: note.tags,
    source: note.source ?? null,
    createdAt: now,
  });
  let count = 0;
  for (const kind of cardKinds(note)) {
    await db.insert(cards).values({
      id: randomUUID(),
      noteId,
      deckId,
      kind,
      createdAt: now,
      ...newCardState(now),
    });
    count++;
  }
  return count;
}

async function deleteNotes(noteIds: string[]): Promise<void> {
  for (const batch of chunk(noteIds)) {
    const cardRows = await db
      .select({ id: cards.id })
      .from(cards)
      .where(inArray(cards.noteId, batch));
    const cardIds = cardRows.map((r) => r.id);
    for (const cb of chunk(cardIds)) {
      await db.delete(reviews).where(inArray(reviews.cardId, cb));
    }
    await db.delete(cards).where(inArray(cards.noteId, batch));
    await db.delete(notes).where(inArray(notes.id, batch));
  }
}

/** Current deck content as importable markdown (what the editor should show). */
async function serializeCurrentDeck(deckId: string): Promise<string> {
  const d = (await db.select().from(decks).where(eq(decks.id, deckId)).limit(1))[0];
  const noteRows = await db
    .select()
    .from(notes)
    .where(eq(notes.deckId, deckId))
    .orderBy(asc(notes.createdAt));
  return serializeDeck(
    { title: d.title, topic: d.topic, tags: d.tags },
    noteRows.map((n) => ({ type: n.type, fields: n.fields, tags: n.tags })),
  );
}

/** Create a brand-new deck from markdown. */
export async function insertDeck(markdown: string): Promise<InsertResult> {
  const deck = parseDeck(markdown);
  if (deck.notes.length === 0) {
    return { ok: false, error: "No cards found — check the Q:/A:, cloze, or vocab format." };
  }

  const now = Date.now();
  const deckId = randomUUID();
  await db.insert(decks).values({
    id: deckId,
    title: deck.title,
    topic: deck.topic ?? null,
    tags: deck.tags,
    createdAt: now,
  });

  let cardCount = 0;
  const seen = new Set<string>();
  for (const note of deck.notes) {
    const h = noteHash(note.type, note.fields);
    if (seen.has(h)) continue;
    seen.add(h);
    cardCount += await insertNote(deckId, note, now);
  }

  return { ok: true, deckId, deckTitle: deck.title, noteCount: seen.size, cardCount };
}

/** Add cards from a file into an existing deck, skipping ones already present. */
export async function appendToDeck(
  deckId: string,
  markdown: string,
): Promise<
  { ok: true; added: number; skipped: number; markdown: string } | { ok: false; error: string }
> {
  const deckRow = (await db.select().from(decks).where(eq(decks.id, deckId)).limit(1))[0];
  if (!deckRow) return { ok: false, error: "Deck not found." };

  const parsed = parseDeck(markdown);
  if (parsed.notes.length === 0) return { ok: false, error: "No cards found in the file." };

  const existing = await db
    .select({ type: notes.type, fields: notes.fields })
    .from(notes)
    .where(eq(notes.deckId, deckId));
  const have = new Set(existing.map((n) => noteHash(n.type, n.fields)));

  const now = Date.now();
  let added = 0;
  let skipped = 0;
  for (const note of parsed.notes) {
    const h = noteHash(note.type, note.fields);
    if (have.has(h)) {
      skipped++;
      continue;
    }
    have.add(h);
    await insertNote(deckId, note, now);
    added++;
  }
  return { ok: true, added, skipped, markdown: await serializeCurrentDeck(deckId) };
}

/** Replace a deck's content with edited markdown. A note whose content hash is
 *  unchanged keeps its scheduling (its fields/tags are refreshed in place);
 *  new notes are added, and notes no longer present are removed. */
export async function replaceDeckContent(
  deckId: string,
  markdown: string,
): Promise<
  | { ok: true; added: number; removed: number; kept: number; markdown: string }
  | { ok: false; error: string }
> {
  const deckRow = (await db.select().from(decks).where(eq(decks.id, deckId)).limit(1))[0];
  if (!deckRow) return { ok: false, error: "Deck not found." };

  const parsed = parseDeck(markdown);
  if (parsed.notes.length === 0) {
    return { ok: false, error: "A deck must have at least one card." };
  }

  const existing = await db
    .select({ id: notes.id, type: notes.type, fields: notes.fields })
    .from(notes)
    .where(eq(notes.deckId, deckId));

  const existingByHash = new Map<string, string>();
  for (const n of existing) existingByHash.set(noteHash(n.type, n.fields), n.id);

  const desired = new Map<string, ParsedNote>();
  for (const note of parsed.notes) desired.set(noteHash(note.type, note.fields), note);

  const now = Date.now();

  const toRemove = existing
    .filter((n) => !desired.has(noteHash(n.type, n.fields)))
    .map((n) => n.id);
  await deleteNotes(toRemove);

  let added = 0;
  let kept = 0;
  for (const [h, note] of desired) {
    const existingId = existingByHash.get(h);
    if (existingId) {
      // Same card — refresh non-structural fields (tags, whitespace) but keep scheduling.
      await db.update(notes).set({ fields: note.fields, tags: note.tags }).where(eq(notes.id, existingId));
      kept++;
    } else {
      await insertNote(deckId, note, now);
      added++;
    }
  }

  await db
    .update(decks)
    .set({ title: parsed.title, topic: parsed.topic ?? null, tags: parsed.tags })
    .where(eq(decks.id, deckId));

  return { ok: true, added, removed: toRemove.length, kept, markdown: await serializeCurrentDeck(deckId) };
}

/** Delete a deck and everything under it (notes, cards, review history). */
export async function deleteDeck(deckId: string): Promise<void> {
  const cardRows = await db
    .select({ id: cards.id })
    .from(cards)
    .where(eq(cards.deckId, deckId));
  const cardIds = cardRows.map((r) => r.id);
  for (const batch of chunk(cardIds)) {
    await db.delete(reviews).where(inArray(reviews.cardId, batch));
  }
  await db.delete(cards).where(eq(cards.deckId, deckId));
  await db.delete(notes).where(eq(notes.deckId, deckId));
  await db.delete(decks).where(eq(decks.id, deckId));
}
