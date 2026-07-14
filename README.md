# learnit

A personal spaced-repetition app (Memrise + Anki, for anything — vocabulary,
books, programming, math). Cards are authored in a simple markdown format that
ChatGPT or Claude can generate from your study material. Scheduling uses
[FSRS](https://github.com/open-spaced-repetition/ts-fsrs), the modern algorithm
Anki now ships.

## Stack

- **Next.js 16** (App Router) — deploys to Vercel as one app
- **Drizzle ORM** + **libSQL/SQLite** — local file in dev, [Turso](https://turso.tech) in prod
- **ts-fsrs** — spaced-repetition scheduling
- **Tailwind v4** — installable PWA, mobile-first, dark mode

## Getting started

```bash
pnpm install
pnpm db:push     # create tables in ./local.db
pnpm seed        # load the example decks in seed/*.md
pnpm dev         # http://localhost:3210
```

No environment variables are needed locally — the app uses a SQLite file at
`./local.db` automatically.

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

1. Create a Turso database and copy its URL + auth token (see `.env.example`).
2. Import the repo into Vercel; add `DATABASE_URL` and `DATABASE_AUTH_TOKEN` as env vars.
3. Run `pnpm db:push` once against the Turso URL to create the tables.
4. Deploy. Install it to your iPhone home screen via Share → Add to Home Screen.

## Project layout

```
app/            routes: / (today), /review, /import, /decks, /stats
  components/   BottomNav, ReviewSession, icons
  actions.ts    server actions: importDeck, submitReview
lib/
  db/           Drizzle schema + libSQL client
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
