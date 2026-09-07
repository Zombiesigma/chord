import Link from "next/link";
import { getPublishedSongs } from "@/lib/songs";

export default async function SongsPage() {
  const songs = await getPublishedSongs();

  return (
    <main className="min-h-screen bg-[#050505] text-zinc-100">
      {/* HEADER */}
      <header className="border-b border-zinc-800/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link
            href="/"
            className="
              text-lg
              font-black
              tracking-tight
              transition
              hover:text-zinc-300
            "
          >
            ← CHORDBOOK<span className="text-zinc-600">.</span>
          </Link>

          <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-600">
            {songs.length} songs
          </span>
        </div>
      </header>

      {/* CONTENT */}
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        {/* TITLE */}
        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-zinc-600">
            Chordbook
          </p>

          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">
            All songs
          </h1>
        </div>

        {/* SONG LIST */}
        {songs.length > 0 ? (
          <div
            className="
              overflow-hidden
              rounded-[24px]
              border
              border-zinc-800
              bg-zinc-950/70
            "
          >
            {songs.map((song, i) => (
              <Link
                key={song.id}
                href={`/song/${encodeURIComponent(song.slug)}`}
                className="
                  group
                  flex
                  min-w-0
                  items-center
                  gap-4
                  border-b
                  border-zinc-800/80
                  p-3
                  transition
                  duration-200
                  last:border-b-0
                  hover:bg-zinc-900/70
                  sm:gap-5
                  sm:p-4
                "
              >
                {/* COVER */}
                <div
                  className="
                    relative
                    h-16
                    w-16
                    shrink-0
                    overflow-hidden
                    rounded-xl
                    bg-zinc-900
                    ring-1
                    ring-white/[0.04]
                    sm:h-20
                    sm:w-20
                  "
                >
                  {song.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={song.coverImageUrl}
                      alt={`${song.title} cover`}
                      className="
                        h-full
                        w-full
                        object-cover
                        transition
                        duration-500
                        group-hover:scale-110
                      "
                    />
                  ) : (
                    <div
                      className="
                        flex
                        h-full
                        w-full
                        items-center
                        justify-center
                        px-2
                        text-center
                        text-[9px]
                        font-bold
                        tracking-[0.12em]
                        text-zinc-700
                      "
                    >
                      NO COVER
                    </div>
                  )}

                  {/* subtle overlay */}
                  <div
                    className="
                      pointer-events-none
                      absolute
                      inset-0
                      bg-black/0
                      transition
                      duration-300
                      group-hover:bg-black/10
                    "
                  />
                </div>

                {/* SONG INFO */}
                <div className="min-w-0 flex-1">
                  <div
                    className="
                      truncate
                      text-base
                      font-bold
                      text-zinc-100
                      transition
                      group-hover:text-white
                      sm:text-lg
                    "
                  >
                    {song.title}
                  </div>

                  <div className="mt-1 truncate text-sm text-zinc-500">
                    {song.artist || "Unknown artist"}
                  </div>
                </div>

                {/* KEY */}
                {song.originalKey ? (
                  <span
                    className="
                      hidden
                      shrink-0
                      rounded-xl
                      border
                      border-zinc-800
                      bg-zinc-900/70
                      px-3
                      py-2
                      font-mono
                      text-xs
                      font-bold
                      text-zinc-400
                      sm:block
                    "
                  >
                    {song.originalKey}
                  </span>
                ) : null}

                {/* ARROW */}
                <span
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    text-lg
                    text-zinc-600
                    transition
                    duration-200
                    group-hover:translate-x-1
                    group-hover:text-zinc-200
                  "
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div
            className="
              rounded-[24px]
              border
              border-zinc-800
              bg-zinc-950
              px-6
              py-16
              text-center
            "
          >
            <p className="text-sm text-zinc-500">
              Belum ada lagu published.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
