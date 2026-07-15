import { parseBlocks } from "@/lib/blocks";
import { mdToHtml } from "@/lib/md-render";

const DEFAULT_LABEL: Record<string, string> = {
  takeaway: "Takeaway",
  warn: "Watch out",
  note: "Note",
};

export function CardContent({ text }: { text: string }) {
  const blocks = parseBlocks(text);

  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === "para") {
          return (
            <div
              key={i}
              className="prose-card"
              dangerouslySetInnerHTML={{ __html: mdToHtml(b.text) }}
            />
          );
        }

        if (b.type === "pull") {
          return (
            <blockquote
              key={i}
              className="pull2"
              dangerouslySetInnerHTML={{ __html: mdToHtml(b.text) }}
            />
          );
        }

        if (b.type === "cascade") {
          return (
            <div key={i} className="cascade">
              {b.nodes.map((node, j) => (
                <div key={j}>
                  {j > 0 && (
                    <div className="casc-arw">
                      ↓{b.nodes[j - 1].connector ? ` ${b.nodes[j - 1].connector}` : ""}
                    </div>
                  )}
                  <div className={`casc-node${j === b.nodes.length - 1 ? " last" : ""}`}>
                    <span className="casc-b">{j + 1}</span>
                    <span className="casc-k">{node.title}</span>
                    {node.subtitle && <span className="casc-v">{node.subtitle}</span>}
                  </div>
                </div>
              ))}
            </div>
          );
        }

        if (b.type === "steps") {
          return (
            <ol key={i} className="steps2">
              {b.items.map((s, j) => (
                <li key={j} className="step2">
                  <span className="step2-n">{j + 1}</span>
                  <div
                    className="step2-t"
                    dangerouslySetInnerHTML={{ __html: mdToHtml(s) }}
                  />
                </li>
              ))}
            </ol>
          );
        }

        if (b.type === "compare") {
          return (
            <div key={i} className="compare2">
              {b.cols.map((c, j) => (
                <div
                  key={j}
                  className={`cmp-col${c.tone === "good" ? " cmp-good" : c.tone === "bad" ? " cmp-bad" : ""}`}
                >
                  <div className="cmp-label">{c.label}</div>
                  <div
                    className="cmp-text"
                    dangerouslySetInnerHTML={{ __html: mdToHtml(c.text) }}
                  />
                </div>
              ))}
            </div>
          );
        }

        const label = b.label ?? DEFAULT_LABEL[b.variant];
        return (
          <div key={i} className={`callout2 co-${b.variant}`}>
            <span className="co-l">{label}</span>
            <div className="co-b" dangerouslySetInnerHTML={{ __html: mdToHtml(b.text) }} />
          </div>
        );
      })}
    </>
  );
}
