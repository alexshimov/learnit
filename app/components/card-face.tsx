import { renderCard } from "@/lib/cards";
import { CardContent } from "@/app/components/card-content";
import { VocabBack } from "@/app/components/vocab-card";
import type { NoteType, NoteFields, VocabFields } from "@/lib/types";

/** Renders a single card's front (and optionally its back) exactly as it
 *  appears in review. Shared by the review session and the deck preview. */
export function CardFace({
  noteType,
  fields,
  kind,
  showBack = true,
}: {
  noteType: NoteType;
  fields: NoteFields;
  kind: string;
  showBack?: boolean;
}) {
  const divider = (
    <div className="my-6 border-t" style={{ borderColor: "var(--border)" }} />
  );

  if (noteType === "vocab") {
    const f = fields as VocabFields;
    return (
      <>
        <div className="q-prompt">{f.ru}</div>
        {showBack && (
          <>
            {divider}
            <VocabBack fields={f} />
          </>
        )}
      </>
    );
  }

  const face = renderCard(noteType, fields, kind);
  return (
    <>
      <div className="q-prompt">
        <CardContent text={face.front} />
      </div>
      {showBack && (
        <>
          {divider}
          <div className="voice">
            <CardContent text={face.back} />
          </div>
        </>
      )}
    </>
  );
}
