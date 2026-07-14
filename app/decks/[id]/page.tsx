import { notFound } from "next/navigation";
import { getDeckDetail } from "@/lib/queries";
import { DeckManager } from "@/app/components/deck-manager";

export const dynamic = "force-dynamic";

export default async function DeckManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getDeckDetail(id);
  if (!detail) notFound();
  return <DeckManager detail={detail} />;
}
