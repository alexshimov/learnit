import type { VocabFields } from "@/lib/types";
import { mdToHtml } from "@/lib/md-render";

function splitList(v?: string): string[] {
  if (!v) return [];
  const t = v.trim();
  if (!t || t === "—" || t === "-" || /^\(?\s*(none|нет|—)\s*\)?$/i.test(t)) return [];
  return t
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function VocabBack({ fields }: { fields: VocabFields }) {
  const antonyms = splitList(fields.antonyms);
  const related = splitList(fields.related);

  return (
    <div>
      <div className="vocab-answer">{fields.en}</div>
      <p className="vocab-ru">{fields.ru}</p>

      {fields.usage && (
        <div className="field">
          <span className="field-label">Usage</span>
          <div
            className="field-body"
            dangerouslySetInnerHTML={{ __html: mdToHtml(fields.usage) }}
          />
        </div>
      )}

      {fields.examples && fields.examples.length > 0 && (
        <div className="field">
          <span className="field-label">Examples</span>
          <ul className="ex-list">
            {fields.examples.map((ex, i) => (
              <li
                key={i}
                className="ex-item"
                dangerouslySetInnerHTML={{ __html: mdToHtml(ex) }}
              />
            ))}
          </ul>
        </div>
      )}

      {antonyms.length > 0 && (
        <div className="field">
          <span className="field-label">Antonyms</span>
          <div className="chiprow">
            {antonyms.map((a, i) => (
              <span key={i} className="chip">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div className="field">
          <span className="field-label">Related</span>
          <div className="chiprow">
            {related.map((r, i) => (
              <span key={i} className="chip brandchip">
                {r}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
