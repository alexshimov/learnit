"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { cards, reviews } from "@/lib/db/schema";
import {
  insertDeck,
  appendToDeck,
  replaceDeckContent,
  deleteDeck,
  addCardToDeck,
  updateCard,
  deleteCard,
  type InsertResult,
} from "@/lib/import";
import { applyRating, type Grade, type Sched } from "@/lib/fsrs";

export async function importDeckAction(markdown: string): Promise<InsertResult> {
  const input = z.string().min(1).safeParse(markdown);
  if (!input.success) return { ok: false, error: "Paste some markdown first." };

  const result = await insertDeck(input.data);
  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/decks");
  }
  return result;
}

export async function appendDeckFromMarkdownAction(
  deckId: string,
  markdown: string,
): Promise<
  { ok: true; added: number; skipped: number; markdown: string } | { ok: false; error: string }
> {
  const input = z.string().min(1).safeParse(markdown);
  if (!input.success) return { ok: false, error: "The file is empty." };
  const result = await appendToDeck(deckId, input.data);
  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/decks");
    revalidatePath(`/decks/${deckId}`);
  }
  return result;
}

export async function saveDeckContentAction(
  deckId: string,
  markdown: string,
): Promise<
  | { ok: true; added: number; removed: number; kept: number; markdown: string }
  | { ok: false; error: string }
> {
  const input = z.string().min(1).safeParse(markdown);
  if (!input.success) return { ok: false, error: "Content cannot be empty." };
  const result = await replaceDeckContent(deckId, input.data);
  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/decks");
    revalidatePath(`/decks/${deckId}`);
  }
  return result;
}

export async function deleteDeckAction(
  deckId: string,
): Promise<{ ok: boolean }> {
  const input = z.string().min(1).safeParse(deckId);
  if (!input.success) return { ok: false };
  await deleteDeck(input.data);
  revalidatePath("/");
  revalidatePath("/decks");
  return { ok: true };
}

export async function addCardAction(
  deckId: string,
  markdown: string,
): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  const input = z.string().min(1).safeParse(markdown);
  if (!input.success) return { ok: false, error: "The card is empty." };
  const result = await addCardToDeck(deckId, input.data);
  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/decks");
    revalidatePath(`/decks/${deckId}`);
  }
  return result;
}

export async function updateCardAction(
  noteId: string,
  markdown: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const input = z.string().min(1).safeParse(markdown);
  if (!input.success) return { ok: false, error: "The card is empty." };
  const result = await updateCard(noteId, input.data);
  if (!result.ok) return result;
  revalidatePath("/");
  revalidatePath("/decks");
  revalidatePath(`/decks/${result.deckId}`);
  return { ok: true };
}

export async function deleteCardAction(
  noteId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const input = z.string().min(1).safeParse(noteId);
  if (!input.success) return { ok: false, error: "Invalid card." };
  const result = await deleteCard(input.data);
  if (!result.ok) return result;
  revalidatePath("/");
  revalidatePath("/decks");
  revalidatePath(`/decks/${result.deckId}`);
  return { ok: true };
}

export async function submitReviewAction(
  cardId: string,
  rating: number,
): Promise<{ ok: boolean; due?: number }> {
  const grade = z.number().int().min(1).max(4).safeParse(rating);
  if (!grade.success) return { ok: false };

  const db = await getDb();
  const now = Date.now();
  const rows = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
  const row = rows[0];
  if (!row) return { ok: false };

  const current: Sched = {
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsedDays,
    scheduledDays: row.scheduledDays,
    learningSteps: row.learningSteps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    lastReview: row.lastReview,
  };

  const { sched, log } = applyRating(current, grade.data as Grade, now);

  await db.update(cards).set(sched).where(eq(cards.id, cardId));
  await db.insert(reviews).values({
    id: randomUUID(),
    cardId,
    rating: log.rating,
    state: log.state,
    stability: log.stability,
    difficulty: log.difficulty,
    scheduledDays: log.scheduledDays,
    reviewedAt: log.reviewedAt,
  });

  revalidatePath("/");
  return { ok: true, due: sched.due };
}
