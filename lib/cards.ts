import type {
  NoteType,
  NoteFields,
  BasicFields,
  ClozeFields,
  VocabFields,
  ParsedNote,
  RenderedCard,
} from "./types";

const CLOZE_RE = /\{\{c(\d+)::(.+?)(?:::(.+?))?\}\}/g;

export function clozeNumbers(text: string): number[] {
  const nums = new Set<number>();
  let m: RegExpExecArray | null;
  CLOZE_RE.lastIndex = 0;
  while ((m = CLOZE_RE.exec(text))) nums.add(parseInt(m[1], 10));
  return [...nums].sort((a, b) => a - b);
}

/** The card "kinds" a note expands into (one review card per kind). */
export function cardKinds(note: ParsedNote): string[] {
  if (note.type === "vocab") return ["vocab"];
  if (note.type === "cloze") {
    return clozeNumbers((note.fields as ClozeFields).text).map((n) => `cloze:${n}`);
  }
  const kinds = ["forward"];
  if ((note.fields as BasicFields).reverse) kinds.push("reverse");
  return kinds;
}

/**
 * Render a card's front and back from its note fields + kind.
 * Cloze blanks use [[B:hint]] on the front and [[C:answer]] on the back,
 * which the markdown renderer turns into styled spans.
 */
export function renderCard(
  type: NoteType,
  fields: NoteFields,
  kind: string,
): RenderedCard {
  if (type === "vocab") {
    const f = fields as VocabFields;
    return { front: f.ru, back: f.en };
  }
  if (type === "cloze") {
    const { text } = fields as ClozeFields;
    const target = parseInt(kind.split(":")[1] ?? "1", 10);
    const front = text.replace(CLOZE_RE, (_all, num, ans, hint) =>
      Number(num) === target ? `[[B:${hint ?? ""}]]` : ans,
    );
    const back = text.replace(CLOZE_RE, (_all, num, ans) =>
      Number(num) === target ? `[[C:${ans}]]` : ans,
    );
    return { front, back };
  }

  const f = fields as BasicFields;
  if (kind === "reverse") return { front: f.back, back: f.front };
  return { front: f.front, back: f.back };
}
