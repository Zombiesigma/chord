import { notFound } from "next/navigation";
import { getSongBySlug } from "@/lib/songs";
import SongViewer from "@/components/SongViewer";

export const dynamic = "force-dynamic";

type SongPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function SongPage({
  params,
}: SongPageProps) {
  const { slug } = await params;

  const song = await getSongBySlug(slug);

  if (!song) {
    notFound();
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#050505] text-zinc-100">
      <SongViewer song={song} />
    </main>
  );
}
