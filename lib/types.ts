export type NoteType = "basic" | "cloze" | "vocab";

export interface BasicFields {
  front: string;
  back: string;
  reverse?: boolean;
  hint?: string;
}

export interface ClozeFields {
  text: string;
  hint?: string;
}

export interface VocabFields {
  en: string;
  ru: string;
  usage?: string;
  examples?: string[];
  antonyms?: string;
  related?: string;
}

export type NoteFields = BasicFields | ClozeFields | VocabFields;

export interface ParsedNote {
  type: NoteType;
  fields: NoteFields;
  tags: string[];
  source?: string;
}

export interface ParsedDeck {
  title: string;
  topic?: string;
  tags: string[];
  notes: ParsedNote[];
}

export interface RenderedCard {
  front: string;
  back: string;
}
