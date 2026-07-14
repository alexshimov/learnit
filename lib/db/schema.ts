import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import type { NoteFields, NoteType } from "../types";

export const decks = sqliteTable("decks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  topic: text("topic"),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
  createdAt: integer("created_at").notNull(),
});

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  deckId: text("deck_id")
    .notNull()
    .references(() => decks.id, { onDelete: "cascade" }),
  type: text("type").$type<NoteType>().notNull(),
  fields: text("fields", { mode: "json" }).$type<NoteFields>().notNull(),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
  source: text("source"),
  createdAt: integer("created_at").notNull(),
});

export const cards = sqliteTable(
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
    due: integer("due").notNull(),
    stability: real("stability").notNull().default(0),
    difficulty: real("difficulty").notNull().default(0),
    elapsedDays: real("elapsed_days").notNull().default(0),
    scheduledDays: real("scheduled_days").notNull().default(0),
    learningSteps: integer("learning_steps").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    state: integer("state").notNull().default(0),
    lastReview: integer("last_review"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("cards_due_idx").on(t.due), index("cards_deck_idx").on(t.deckId)],
);

export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  cardId: text("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  state: integer("state").notNull(),
  stability: real("stability").notNull(),
  difficulty: real("difficulty").notNull(),
  scheduledDays: real("scheduled_days").notNull(),
  reviewedAt: integer("reviewed_at").notNull(),
});

export type DeckRow = typeof decks.$inferSelect;
export type NoteRow = typeof notes.$inferSelect;
export type CardRow = typeof cards.$inferSelect;
export type ReviewRow = typeof reviews.$inferSelect;
