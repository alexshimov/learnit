import { asc, eq, and, lte, gte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { decks, cards, notes, reviews } from "./db/schema";
import type { NoteFields, NoteType } from "./types";
import { serializeDeck, noteSummary } from "./serialize";

export interface DeckOverview {
  id: string;
  title: string;
  topic: string | null;
  total: number;
  due: number;
}

export async function getDecksOverview(now: number = Date.now()): Promise<DeckOverview[]> {
  const db = await getDb();
  const deckRows = await db.select().from(decks).orderBy(asc(decks.createdAt));
  const counts = await db
    .select({
      deckId: cards.deckId,
      total: sql<number>`count(*)`,
      due: sql<number>`sum(case when ${cards.due} <= ${now} then 1 else 0 end)`,
    })
    .from(cards)
    .groupBy(cards.deckId);

  const byDeck = new Map(counts.map((c) => [c.deckId, c]));
  return deckRows.map((d) => ({
    id: d.id,
    title: d.title,
    topic: d.topic,
    total: Number(byDeck.get(d.id)?.total ?? 0),
    due: Number(byDeck.get(d.id)?.due ?? 0),
  }));
}

export interface QueueCard {
  cardId: string;
  kind: string;
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
      noteType: notes.type,
      fields: notes.fields,
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
  items: { summary: string; type: NoteType }[];
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
    .select({ due: cards.due })
    .from(cards)
    .where(eq(cards.deckId, deckId));

  const notesLite = noteRows.map((n) => ({ type: n.type, fields: n.fields, tags: n.tags }));

  return {
    id: d.id,
    title: d.title,
    topic: d.topic,
    tags: d.tags,
    total: cardRows.length,
    due: cardRows.filter((c) => c.due <= now).length,
    markdown: serializeDeck({ title: d.title, topic: d.topic, tags: d.tags }, notesLite),
    items: notesLite.map((n) => ({ summary: noteSummary(n.type, n.fields), type: n.type })),
  };
}
