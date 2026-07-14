import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { insertDeck } from "../lib/import";

async function main() {
  const dir = join(process.cwd(), "seed");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));

  if (files.length === 0) {
    console.log("No .md files in seed/ — nothing to do.");
    return;
  }

  for (const file of files) {
    const md = readFileSync(join(dir, file), "utf8");
    const result = await insertDeck(md);
    if (result.ok) {
      console.log(`✓ ${result.deckTitle} — ${result.noteCount} notes, ${result.cardCount} cards`);
    } else {
      console.error(`✗ ${file}: ${result.error}`);
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
