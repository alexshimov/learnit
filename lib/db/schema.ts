import { pgTable, text, integer, real, bigint, jsonb, index } from "drizzle-orm/pg-core";
import type { NoteFields, NoteType } from "../types";

// Millisecond epoch timestamps must be bigint — a Postgres `integer` is 32-bit
// and would overflow Date.now() (~1.7e12).
const ts = (name: string) => bigint(name, { mode: "number" });

export const folders = pgTable("folders", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: ts("created_at").notNull(),
});

export const decks = pgTable("decks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  topic: text("topic"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  folderId: text("folder_id").references(() => folders.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: ts("created_at").notNull(),
});

export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  deckId: text("deck_id")
    .notNull()
    .references(() => decks.id, { onDelete: "cascade" }),
  type: text("type").$type<NoteType>().notNull(),
  fields: jsonb("fields").$type<NoteFields>().notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  source: text("source"),
  createdAt: ts("created_at").notNull(),
});

export const cards = pgTable(
  "cards",
  {
    id: text("id").primaryKey(),
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    // FSRS scheduling state
    due: ts("due").notNull(),
    stability: real("stability").notNull().default(0),
    difficulty: real("difficulty").notNull().default(0),
    elapsedDays: real("elapsed_days").notNull().default(0),
    scheduledDays: real("scheduled_days").notNull().default(0),
    learningSteps: integer("learning_steps").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    state: integer("state").notNull().default(0),
    lastReview: ts("last_review"),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [index("cards_due_idx").on(t.due), index("cards_deck_idx").on(t.deckId)],
);

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  cardId: text("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  state: integer("state").notNull(),
  stability: real("stability").notNull(),
  difficulty: real("difficulty").notNull(),
  scheduledDays: real("scheduled_days").notNull(),
  reviewedAt: ts("reviewed_at").notNull(),
});

export type FolderRow = typeof folders.$inferSelect;
export type DeckRow = typeof decks.$inferSelect;
export type NoteRow = typeof notes.$inferSelect;
export type CardRow = typeof cards.$inferSelect;
export type ReviewRow = typeof reviews.$inferSelect;
