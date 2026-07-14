export type Block =
  | { type: "para"; text: string }
  | { type: "pull"; text: string }
  | { type: "cascade"; nodes: { title: string; subtitle?: string; connector?: string }[] }
  | { type: "callout"; variant: "takeaway" | "warn" | "note"; label?: string; text: string };

const KEYWORDS = ["cascade", "takeaway", "warn", "note", "pull"];

/**
 * Split card content into renderable blocks. Plain text becomes paragraphs;
 * lines that start with `::keyword` open a styled block whose body runs until
 * the next blank line or the next `::` block.
 */
export function parseBlocks(input: string): Block[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  const n = lines.length;

  const collect = (): string[] => {
    const out: string[] = [];
    while (i < n) {
      const l = lines[i];
      if (l.trim() === "" || /^::/.test(l.trim())) break;
      out.push(l);
      i++;
    }
    return out;
  };

  while (i < n) {
    const line = lines[i].trim();
    if (line === "") {
      i++;
      continue;
    }

    const m = /^::(\w+)\s*(.*)$/.exec(line);
    if (m && KEYWORDS.includes(m[1].toLowerCase())) {
      const kw = m[1].toLowerCase();
      const arg = m[2].trim();
      i++;
      const content = collect();

      if (kw === "cascade") {
        const nodes = content
          .map((c) => c.trim())
          .filter(Boolean)
          .map((c) => {
            const [title, subtitle, connector] = c.split("|").map((s) => s.trim());
            return {
              title: title ?? "",
              subtitle: subtitle || undefined,
              connector: connector || undefined,
            };
          });
        blocks.push({ type: "cascade", nodes });
      } else if (kw === "pull") {
        blocks.push({ type: "pull", text: content.join("\n").trim() });
      } else {
        blocks.push({
          type: "callout",
          variant: kw as "takeaway" | "warn" | "note",
          label: arg || undefined,
          text: content.join("\n").trim(),
        });
      }
      continue;
    }

    const para = collect();
    const text = para.join("\n").trim();
    if (text) blocks.push({ type: "para", text });
  }

  return blocks;
}
