import Link from "next/link";
import { getPublishedSongs } from "@/lib/songs";

export default async function SongsPage() {
  const songs = await getPublishedSongs();
  return (
    <main className="min-h-screen">
      <header className="border-b border-zinc-800">
        <div className="mx-auto max-w-6xl px-5 py-5">
          <Link href="/" className="font-black">← CHORDBOOK</Link>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-12">
        <h1 className="text-4xl font-black">All songs</h1>
        <div className="mt-8 divide-y divide-zinc-800 rounded-2xl border border-zinc-800">
          {songs.map((song, i) => (
            <Link key={song.id} href={`/song/${song.slug}`} className="flex items-center gap-4 p-4 hover:bg-zinc-900">
              <span className="w-8 text-sm text-zinc-600">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{song.title}</div>
                <div className="text-sm text-zinc-500">{song.artist}</div>
              </div>
              <span className="hidden text-xs text-zinc-600 sm:block">{song.originalKey || ""}</span>
              <span className="text-zinc-500">→</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
