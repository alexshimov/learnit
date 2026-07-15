import JSZip from "jszip";
import { getAllDecksMarkdown } from "@/lib/queries";
import { deckSlug, attachment } from "@/lib/export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const all = await getAllDecksMarkdown();
  if (all.length === 0) return new Response("No decks to export", { status: 404 });

  const zip = new JSZip();
  const used = new Set<string>();
  for (const d of all) {
    const base = deckSlug(d.title);
    let name = `${base}.md`;
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base}-${n}.md`;
    used.add(name.toLowerCase());
    zip.file(name, d.markdown);
  }

  const bytes = await zip.generateAsync({ type: "arraybuffer" });
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": attachment("learnit-decks.zip"),
    },
  });
}
