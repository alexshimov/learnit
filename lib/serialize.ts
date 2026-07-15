import type {
  NoteType,
  NoteFields,
  BasicFields,
  ClozeFields,
  VocabFields,
} from "./types";

/** Short one-line summary of a note for browse lists. */
export function noteSummary(type: NoteType, fields: NoteFields): string {
  if (type === "vocab") {
    const f = fields as VocabFields;
    return `${f.ru} → ${f.en}`;
  }
  if (type === "cloze") {
    return (fields as ClozeFields).text.replace(
      /\{\{c\d+::(.+?)(?:::.+?)?\}\}/g,
      "[…]",
    );
  }
  return (fields as BasicFields).front;
}

/** Serialize a single note back into its one-card markdown (for per-card editing). */
export function serializeCard(
  type: NoteType,
  fields: NoteFields,
  tags: string[],
): string {
  const lines: string[] = [];
  if (type === "vocab") {
    const f = fields as VocabFields;
    lines.push(`en: ${f.en}`);
    lines.push(`ru: ${f.ru}`);
    if (f.usage) lines.push(`usage: ${f.usage}`);
    for (const ex of f.examples ?? []) lines.push(`example: ${ex}`);
    if (f.antonyms) lines.push(`antonyms: ${f.antonyms}`);
    if (f.related) lines.push(`related: ${f.related}`);
  } else if (type === "cloze") {
    const f = fields as ClozeFields;
    lines.push(f.text);
    if (f.hint) lines.push(`hint: ${f.hint}`);
  } else {
    const f = fields as BasicFields;
    lines.push(`Q: ${f.front}`);
    lines.push(`A: ${f.back}`);
    if (f.reverse) lines.push("reverse: true");
    if (f.hint) lines.push(`hint: ${f.hint}`);
  }
  if (tags && tags.length) lines.push(`tags: ${tags.join(", ")}`);
  return lines.join("\n");
}

/** Turn a deck + its notes back into importable markdown (for editing/export). */
export function serializeDeck(
  deck: { title: string; topic: string | null; tags: string[] },
  notes: { type: NoteType; fields: NoteFields; tags: string[] }[],
): string {
  const fm = ["---", `deck: ${deck.title}`];
  if (deck.topic) fm.push(`topic: ${deck.topic}`);
  if (deck.tags && deck.tags.length) fm.push(`tags: [${deck.tags.join(", ")}]`);
  fm.push("---");

  const blocks = notes.map((n) => serializeCard(n.type, n.fields, n.tags));
  return `${fm.join("\n")}\n\n${blocks.join("\n\n---\n\n")}\n`;
}
