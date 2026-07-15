import { asc, eq, and, lte, gte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { decks, cards, notes, reviews, folders } from "./db/schema";
import type { NoteFields, NoteType } from "./types";
import { serializeDeck, serializeCard, noteSummary } from "./serialize";
import { cardKinds } from "./cards";
import { intervalLabel } from "./fsrs";

export type SrState = "new" | "learning" | "review";

export interface DeckOverview {
  id: string;
  title: string;
  topic: string | null;
  tags: string[];
  folderId: string | null;
  sortOrder: number;
  total: number;
  due: number;
  /** Spaced-repetition breakdown by FSRS state. */
  fresh: number; // never studied (New)
  learning: number; // Learning + Relearning
  review: number; // graduated to Review
}

export async function getDecksOverview(now: number = Date.now()): Promise<DeckOverview[]> {
  const db = await getDb();
  const deckRows = await db
    .select()
    .from(decks)
    .orderBy(asc(decks.sortOrder), asc(decks.createdAt));
  const counts = await db
    .select({
      deckId: cards.deckId,
      total: sql<number>`count(*)`,
      due: sql<number>`sum(case when ${cards.due} <= ${now} then 1 else 0 end)`,
      fresh: sql<number>`sum(case when ${cards.state} = 0 then 1 else 0 end)`,
      learning: sql<number>`sum(case when ${cards.state} in (1, 3) then 1 else 0 end)`,
      review: sql<number>`sum(case when ${cards.state} = 2 then 1 else 0 end)`,
    })
    .from(cards)
    .groupBy(cards.deckId);

  const byDeck = new Map(counts.map((c) => [c.deckId, c]));
  return deckRows.map((d) => {
    const c = byDeck.get(d.id);
    return {
      id: d.id,
      title: d.title,
      topic: d.topic,
      tags: d.tags,
      folderId: d.folderId,
      sortOrder: d.sortOrder,
      total: Number(c?.total ?? 0),
      due: Number(c?.due ?? 0),
      fresh: Number(c?.fresh ?? 0),
      learning: Number(c?.learning ?? 0),
      review: Number(c?.review ?? 0),
    };
  });
}

export async function getFolders(): Promise<{ id: string; name: string }[]> {
  const db = await getDb();
  const rows = await db.select().from(folders).orderBy(asc(folders.name));
  return rows.map((f) => ({ id: f.id, name: f.name }));
}

export interface DecksPageData {
  decks: DeckOverview[];
  folders: { id: string; name: string }[];
}

export async function getDecksPageData(now: number = Date.now()): Promise<DecksPageData> {
  const [decksList, foldersList] = await Promise.all([getDecksOverview(now), getFolders()]);
  return { decks: decksList, folders: foldersList };
}

/** A single deck's importable markdown (what an export should contain). */
export async function getDeckMarkdown(
  deckId: string,
): Promise<{ title: string; markdown: string } | null> {
  const db = await getDb();
  const d = (await db.select().from(decks).where(eq(decks.id, deckId)).limit(1))[0];
  if (!d) return null;
  const noteRows = await db
    .select()
    .from(notes)
    .where(eq(notes.deckId, deckId))
    .orderBy(asc(notes.createdAt));
  const markdown = serializeDeck(
    { title: d.title, topic: d.topic, tags: d.tags },
    noteRows.map((n) => ({ type: n.type, fields: n.fields, tags: n.tags })),
  );
  return { title: d.title, markdown };
}

/** Every deck's markdown, in the on-screen order — one entry per deck, for a
 *  bulk export where each deck becomes its own file. */
export async function getAllDecksMarkdown(): Promise<
  { id: string; title: string; markdown: string }[]
> {
  const db = await getDb();
  const deckRows = await db
    .select()
    .from(decks)
    .orderBy(asc(decks.sortOrder), asc(decks.createdAt));
  const out: { id: string; title: string; markdown: string }[] = [];
  for (const d of deckRows) {
    const noteRows = await db
      .select()
      .from(notes)
      .where(eq(notes.deckId, d.id))
      .orderBy(asc(notes.createdAt));
    out.push({
      id: d.id,
      title: d.title,
      markdown: serializeDeck(
        { title: d.title, topic: d.topic, tags: d.tags },
        noteRows.map((n) => ({ type: n.type, fields: n.fields, tags: n.tags })),
      ),
    });
  }
  return out;
}

export interface QueueCard {
  cardId: string;
  kind: string;
  noteId: string;
  markdown: string;
  deckTitle: string;
  topic: string | null;
  noteType: NoteType;
  fields: NoteFields;
  sched: {
    due: number;
    stability: number;
    difficulty: number;
    elapsedDays: number;
    scheduledDays: number;
    learningSteps: number;
    reps: number;
    lapses: number;
    state: number;
    lastReview: number | null;
  };
}

export async function getDueQueue(
  now: number = Date.now(),
  deckId?: string,
  limit = 200,
): Promise<QueueCard[]> {
  const db = await getDb();
  const rows = await db
    .select({
      cardId: cards.id,
      kind: cards.kind,
      due: cards.due,
      stability: cards.stability,
      difficulty: cards.difficulty,
      elapsedDays: cards.elapsedDays,
      scheduledDays: cards.scheduledDays,
      learningSteps: cards.learningSteps,
      reps: cards.reps,
      lapses: cards.lapses,
      state: cards.state,
      lastReview: cards.lastReview,
      noteId: notes.id,
      noteType: notes.type,
      fields: notes.fields,
      noteTags: notes.tags,
      deckTitle: decks.title,
      topic: decks.topic,
    })
    .from(cards)
    .innerJoin(notes, eq(cards.noteId, notes.id))
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(
      deckId
        ? and(lte(cards.due, now), eq(cards.deckId, deckId))
        : lte(cards.due, now),
    )
    .orderBy(asc(cards.due))
    .limit(limit);

  return rows.map((r) => ({
    cardId: r.cardId,
    kind: r.kind,
    noteId: r.noteId,
    markdown: serializeCard(r.noteType, r.fields, r.noteTags),
    deckTitle: r.deckTitle,
    topic: r.topic,
    noteType: r.noteType,
    fields: r.fields,
    sched: {
      due: r.due,
      stability: r.stability,
      difficulty: r.difficulty,
      elapsedDays: r.elapsedDays,
      scheduledDays: r.scheduledDays,
      learningSteps: r.learningSteps,
      reps: r.reps,
      lapses: r.lapses,
      state: r.state,
      lastReview: r.lastReview,
    },
  }));
}

/** Re-read a note as a study queue card after it was edited — picks the same
 *  card kind if it still exists, else the first available kind. */
export async function getStudyCardByNote(
  noteId: string,
  preferKind: string,
): Promise<QueueCard | null> {
  const db = await getDb();
  const n = (await db.select().from(notes).where(eq(notes.id, noteId)).limit(1))[0];
  if (!n) return null;
  const kinds = cardKinds({ type: n.type, fields: n.fields, tags: n.tags });
  const kind = kinds.includes(preferKind) ? preferKind : kinds[0];
  if (!kind) return null;
  const c = (
    await db
      .select()
      .from(cards)
      .where(and(eq(cards.noteId, noteId), eq(cards.kind, kind)))
      .limit(1)
  )[0];
  if (!c) return null;
  const d = (
    await db
      .select({ title: decks.title, topic: decks.topic })
      .from(decks)
      .where(eq(decks.id, n.deckId))
      .limit(1)
  )[0];
  return {
    cardId: c.id,
    kind,
    noteId: n.id,
    markdown: serializeCard(n.type, n.fields, n.tags),
    deckTitle: d?.title ?? "",
    topic: d?.topic ?? null,
    noteType: n.type,
    fields: n.fields,
    sched: {
      due: c.due,
      stability: c.stability,
      difficulty: c.difficulty,
      elapsedDays: c.elapsedDays,
      scheduledDays: c.scheduledDays,
      learningSteps: c.learningSteps,
      reps: c.reps,
      lapses: c.lapses,
      state: c.state,
      lastReview: c.lastReview,
    },
  };
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export async function getStreak(now: number = Date.now()): Promise<number> {
  const db = await getDb();
  const rows = await db.select({ reviewedAt: reviews.reviewedAt }).from(reviews);
  if (rows.length === 0) return 0;
  const days = new Set(rows.map((r) => dayKey(r.reviewedAt)));

  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(dayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function getReviewedTodayCount(now: number = Date.now()): Promise<number> {
  const db = await getDb();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(reviews)
    .where(gte(reviews.reviewedAt, start.getTime()));
  return Number(rows[0]?.n ?? 0);
}

export interface DeckDetail {
  id: string;
  title: string;
  topic: string | null;
  tags: string[];
  total: number;
  due: number;
  markdown: string;
  items: {
    id: string;
    noteType: NoteType;
    fields: NoteFields;
    kinds: string[];
    summary: string;
    markdown: string;
    srState: SrState;
    dueLabel: string; // "" for new, else "due" or a compact interval like "3d"
  }[];
}

export async function getDeckDetail(
  deckId: string,
  now: number = Date.now(),
): Promise<DeckDetail | null> {
  const db = await getDb();
  const d = (await db.select().from(decks).where(eq(decks.id, deckId)).limit(1))[0];
  if (!d) return null;

  const noteRows = await db
    .select()
    .from(notes)
    .where(eq(notes.deckId, deckId))
    .orderBy(asc(notes.createdAt));
  const cardRows = await db
    .select({ noteId: cards.noteId, state: cards.state, due: cards.due })
    .from(cards)
    .where(eq(cards.deckId, deckId));

  // Group a note's cards so each browse row can show its scheduling state.
  const byNote = new Map<string, { state: number; due: number }[]>();
  for (const c of cardRows) {
    const arr = byNote.get(c.noteId);
    if (arr) arr.push({ state: c.state, due: c.due });
    else byNote.set(c.noteId, [{ state: c.state, due: c.due }]);
  }
  // Rank by maturity (New < Learning/Relearning < Review) so a multi-card
  // note surfaces its least-mature card.
  const maturity = (s: number) => (s === 0 ? 0 : s === 2 ? 2 : 1);

  const notesLite = noteRows.map((n) => ({ type: n.type, fields: n.fields, tags: n.tags }));

  return {
    id: d.id,
    title: d.title,
    topic: d.topic,
    tags: d.tags,
    total: cardRows.length,
    due: cardRows.filter((c) => c.due <= now).length,
    markdown: serializeDeck({ title: d.title, topic: d.topic, tags: d.tags }, notesLite),
    items: noteRows.map((n) => {
      const cs = byNote.get(n.id) ?? [];
      let repState = 0;
      let minDue = Infinity;
      let first = true;
      for (const c of cs) {
        if (c.due < minDue) minDue = c.due;
        if (first || maturity(c.state) < maturity(repState)) repState = c.state;
        first = false;
      }
      const srState: SrState =
        repState === 0 ? "new" : repState === 2 ? "review" : "learning";
      const dueLabel =
        srState === "new"
          ? ""
          : !isFinite(minDue) || minDue <= now
            ? "due"
            : intervalLabel(minDue, now);
      return {
        id: n.id,
        noteType: n.type,
        fields: n.fields,
        kinds: cardKinds({ type: n.type, fields: n.fields, tags: n.tags }),
        summary: noteSummary(n.type, n.fields),
        markdown: serializeCard(n.type, n.fields, n.tags),
        srState,
        dueLabel,
      };
    }),
  };
}
