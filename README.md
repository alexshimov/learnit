# learnit

A personal spaced-repetition app (Memrise + Anki, for anything — vocabulary,
books, programming, math). Cards are authored in a simple markdown format that
ChatGPT or Claude can generate from your study material. Scheduling uses
[FSRS](https://github.com/open-spaced-repetition/ts-fsrs), the modern algorithm
Anki now ships.

## Stack

- **Next.js 16** (App Router) — deploys to Vercel as one app
- **Drizzle ORM** + **Postgres** — embedded [PGlite](https://pglite.dev) in dev, [Neon](https://neon.tech) in prod
- **ts-fsrs** — spaced-repetition scheduling
- **Tailwind v4** — installable PWA, mobile-first, dark mode

## Getting started

```bash
pnpm install
pnpm seed        # load the example decks (creates the local db automatically)
pnpm dev         # http://localhost:3210
```

No environment variables are needed locally — the app runs an embedded Postgres
(PGlite) with data in `./.local-pg`, and applies the schema automatically.

## Deck markdown format

One `.md` file is one deck. Frontmatter sets deck metadata; cards are separated
by `---`.

```markdown
---
deck: The First 90 Days
topic: management
tags: [onboarding]
---

Q: What is a "quick win"?
A: An early, visible result that builds **credibility**.
tags: ch1

---

Q: Name the five situations in the STARS model.
A: Start-up, Turnaround, Accelerated growth, Realignment, Sustaining success.
reverse: true

---

The {{c1::STARS}} model matches strategy to the {{c2::business situation}}.
```

- A block with `Q:` / `A:` is a **basic** card. Add `reverse: true` for a back→front card too.
- A block containing `{{c1::…}}` is a **cloze** card (multiple deletions supported).
- Optional per-card lines: `tags:`, `hint:`.
- Answers accept markdown — bold, italics, `code`, links, and `![](image-url)`.

Paste a file into the **Add** screen, preview, and import. Reusable prompt for
an LLM: *"Turn this chapter into a deck using this exact markdown format."*

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run the dev server on port 3210 |
| `pnpm db:push` | Sync the Drizzle schema to the database |
| `pnpm seed` | Import every `seed/*.md` deck |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm build` | Production build |

## Deploy to Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Add **Neon Postgres** from the project's **Storage** tab — Vercel sets the
   `DATABASE_URL` env var for you.
3. Create the tables once against that database (e.g. from your machine):
   `DATABASE_URL="postgres://…" pnpm db:push`  (optionally `pnpm seed` too).
4. Deploy. Install it on your iPhone via Share → Add to Home Screen.

## Project layout

```
app/            routes: / (today), /review, /import, /decks, /stats
  components/   BottomNav, ReviewSession, icons
  actions.ts    server actions: importDeck, submitReview
lib/
  db/           Drizzle schema + Postgres client (Neon / PGlite)
  markdown.ts   deck markdown parser
  cards.ts      note → cards expansion + rendering
  fsrs.ts       FSRS wrapper (scheduling + previews)
  queries.ts    dashboard / review reads
seed/           example decks
```

## Roadmap

- Card browser + inline editing
- Image/audio upload (Vercel Blob) and image occlusion
- Raw-text → AI card generation (Claude API)
- Richer stats (retention, forecast) and offline sync
