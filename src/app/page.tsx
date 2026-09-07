import Link from "next/link";
import { getPublishedSongs } from "@/lib/songs";

export default async function Home() {
  const songs = await getPublishedSongs();

  return (
    <main className="min-h-screen">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-xl font-black tracking-tight">CHORDBOOK<span className="text-zinc-500">.</span></Link>
          <nav className="flex gap-5 text-sm text-zinc-400">
            <Link href="/songs" className="hover:text-white">Songs</Link>
            <Link href="/artists" className="hover:text-white">Artists</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-12 pt-20">
        <p className="mb-3 text-sm uppercase tracking-[0.25em] text-zinc-500">Guitar chords & lyrics</p>
        <h1 className="max-w-3xl text-5xl font-black tracking-tight sm:text-7xl">
          Play the song.<br />Not the screen.
        </h1>
        <p className="mt-6 max-w-xl text-zinc-400">
          Chord dan lirik langsung dari database musik kamu. Satu data untuk aplikasi dan website.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Latest songs</h2>
          <Link href="/songs" className="text-sm text-zinc-400 hover:text-white">View all →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {songs.map(song => (
            <Link key={song.id} href={`/song/${song.slug}`} className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-3 transition hover:border-zinc-600">
              <div className="aspect-[16/10] overflow-hidden rounded-xl bg-zinc-900">
                {song.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={song.coverImageUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : <div className="flex h-full items-center justify-center text-zinc-700">NO COVER</div>}
              </div>
              <div className="px-1 pb-1 pt-4">
                <h3 className="font-bold">{song.title}</h3>
                <p className="mt-1 text-sm text-zinc-500">{song.artist || "Unknown artist"}</p>
              </div>
            </Link>
          ))}
        </div>
        {songs.length === 0 && <p className="text-zinc-500">Belum ada lagu published.</p>}
      </section>
    </main>
  );
}
