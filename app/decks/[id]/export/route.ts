import { getDeckMarkdown } from "@/lib/queries";
import { deckSlug, attachment } from "@/lib/export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const deck = await getDeckMarkdown(id);
  if (!deck) return new Response("Deck not found", { status: 404 });

  return new Response(deck.markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": attachment(`${deckSlug(deck.title)}.md`),
    },
  });
}
