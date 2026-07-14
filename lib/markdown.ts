import type {
  ParsedDeck,
  ParsedNote,
  BasicFields,
  ClozeFields,
  VocabFields,
} from "./types";

const CLOZE_RE = /\{\{c(\d+)::(.+?)(?:::(.+?))?\}\}/g;

export function parseDeck(md: string): ParsedDeck {
  const src = md.replace(/\r\n/g, "\n").trim();
  let body = src;
  let meta: Record<string, string> = {};

  if (src.startsWith("---")) {
    const end = src.indexOf("\n---", 3);
    if (end !== -1) {
      meta = parseFrontmatter(src.slice(3, end).trim());
      body = src.slice(end + 4).trim();
    }
  }

  const notes = splitBlocks(body)
    .map(parseBlock)
    .filter((n): n is ParsedNote => n !== null);

  return {
    title: meta.deck || meta.title || "Untitled deck",
    topic: meta.topic,
    tags: parseList(meta.tags),
    notes,
  };
}

function splitBlocks(body: string): string[] {
  return body
    .split(/\n\s*---\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
}

function isVocab(block: string): boolean {
  return /(^|\n)\s*en\s*:/i.test(block) && /(^|\n)\s*ru\s*:/i.test(block);
}

function parseVocab(block: string): ParsedNote {
  const fields: VocabFields = { en: "", ru: "" };
  const examples: string[] = [];
  const tags: string[] = [];

  for (const raw of block.split("\n")) {
    const m = /^(\w+)\s*:\s*(.*)$/.exec(raw.trim());
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    switch (key) {
      case "en":
      case "word":
        fields.en = val;
        break;
      case "ru":
      case "translation":
        fields.ru = val;
        break;
      case "usage":
        fields.usage = val;
        break;
      case "example":
      case "examples":
        if (val) examples.push(val);
        break;
      case "antonyms":
      case "antonym":
        fields.antonyms = val;
        break;
      case "related":
        fields.related = val;
        break;
      case "tags":
        tags.push(...parseList(val));
        break;
    }
  }

  if (examples.length) fields.examples = examples;
  return { type: "vocab", fields, tags };
}

function parseBlock(block: string): ParsedNote | null {
  if (isVocab(block)) return parseVocab(block);

  const contentLines: string[] = [];
  const meta: Record<string, string> = {};

  for (const line of block.split("\n")) {
    const m = /^(tags|reverse|hint)\s*:\s*(.*)$/i.exec(line.trim());
    if (m) meta[m[1].toLowerCase()] = m[2].trim();
    else contentLines.push(line);
  }

  const content = contentLines.join("\n").trim();
  if (!content) return null;

  const tags = parseList(meta.tags);
  const hint = meta.hint || undefined;

  CLOZE_RE.lastIndex = 0;
  if (CLOZE_RE.test(content)) {
    const fields: ClozeFields = { text: content, ...(hint ? { hint } : {}) };
    return { type: "cloze", fields, tags };
  }

  const aIdx = content.search(/(^|\n)\s*A\s*:/i);
  const hasQ = /(^|\n)\s*Q\s*:/i.test(content);
  if (hasQ && aIdx !== -1) {
    const front = content
      .slice(0, aIdx)
      .replace(/^\s*Q\s*:/i, "")
      .trim();
    const back = content
      .slice(aIdx)
      .replace(/^\n?\s*A\s*:/i, "")
      .trim();
    const reverse = /^(true|yes|1)$/i.test(meta.reverse ?? "");
    const fields: BasicFields = {
      front,
      back,
      reverse,
      ...(hint ? { hint } : {}),
    };
    return { type: "basic", fields, tags };
  }

  return null;
}

function parseFrontmatter(fm: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of fm.split("\n")) {
    const m = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line.trim());
    if (m) out[m[1].toLowerCase()] = m[2].trim();
  }
  return out;
}

function parseList(v?: string): string[] {
  if (!v) return [];
  return v
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}
