import { notFound } from "next/navigation";
import { getSongBySlug } from "@/lib/songs";
import SongViewer from "@/components/SongViewer";

export const dynamic = "force-dynamic";

export default async function SongPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const song = await getSongBySlug(slug);

  if (!song) {
    notFound();
  }

  return <SongViewer song={song} />;
}
