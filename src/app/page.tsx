export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { getPublishedSongs } from "@/lib/songs";

/* =========================================================
   ICONS
========================================================= */

function ArrowIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function DiscIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 3v7" />
    </svg>
  );
}

/* =========================================================
   SAFE IMAGE
   ---------------------------------------------------------
   Cover image dari database bisa berasal dari berbagai
   sumber. Komponen ini memberi fallback kalau URL rusak,
   expired, atau gagal dimuat browser.
========================================================= */

function CoverImage({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const cleanSrc =
    typeof src === "string"
      ? src.trim()
      : "";

  if (!cleanSrc) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-[#0d0d0d] ${className}`}
      >
        <div className="flex flex-col items-center gap-2 text-zinc-700">
          <DiscIcon />

          <span className="text-[9px] font-bold tracking-[0.18em]">
            NO COVER
          </span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={(event) => {
        /*
         * Jangan biarkan gambar rusak menampilkan
         * broken-image icon.
         */
        const image =
          event.currentTarget;

        image.style.display = "none";

        const parent =
          image.parentElement;

        if (!parent) {
          return;
        }

        /*
         * Hindari membuat fallback
         * lebih dari satu kali.
         */
        if (
          parent.querySelector(
            "[data-cover-fallback]"
          )
        ) {
          return;
        }

        const fallback =
          document.createElement(
            "div"
          );

        fallback.setAttribute(
          "data-cover-fallback",
          "true"
        );

        fallback.className =
          "absolute inset-0 flex items-center justify-center bg-[#0d0d0d]";

        fallback.innerHTML = `
          <div class="flex flex-col items-center gap-2 text-zinc-700">
            <span class="text-lg">♪</span>
            <span class="text-[9px] font-bold tracking-[0.18em]">
              NO COVER
            </span>
          </div>
        `;

        /*
         * Parent yang tidak position-relative
         * tetap aman karena fallback hanya
         * digunakan pada container gambar.
         */
        parent.style.position =
          "relative";

        parent.appendChild(
          fallback
        );
      }}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}

/* =========================================================
   MAIN
========================================================= */

export default async function Home() {
  /*
   * Karena page menggunakan:
   *
   * force-dynamic
   * revalidate = 0
   *
   * data ini dibaca kembali ketika halaman
   * diminta, bukan mengandalkan hasil build lama.
   */
  const songs =
    await getPublishedSongs();

  /* =======================================================
     DATA
  ====================================================== */

  const featuredSongs =
    songs.slice(0, 4);

  const latestSongs =
    songs.slice(0, 9);

  /* =======================================================
     ARTISTS
  ====================================================== */

  const artistMap = new Map<
    string,
    {
      name: string;
      cover: string;
      count: number;
    }
  >();

  for (const song of songs) {
    const artist =
      song.artist?.trim() ||
      "Unknown Artist";

    const existing =
      artistMap.get(artist);

    if (existing) {
      existing.count += 1;

      /*
       * Kalau artist belum punya cover,
       * coba ambil dari lagu berikutnya.
       */
      if (
        !existing.cover &&
        song.coverImageUrl
      ) {
        existing.cover =
          song.coverImageUrl;
      }
    } else {
      artistMap.set(
        artist,
        {
          name: artist,
          cover:
            song.coverImageUrl ||
            "",
          count: 1,
        }
      );
    }
  }

  const artists =
    Array.from(
      artistMap.values()
    ).slice(0, 8);

  /* =======================================================
     HERO
  ====================================================== */

  const heroSong =
    songs[0];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] text-zinc-100">
      {/* =================================================
          BACKGROUND
      ================================================= */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-300px] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-amber-400/[0.035] blur-[140px]" />

        <div className="absolute right-[-250px] top-[500px] h-[500px] w-[500px] rounded-full bg-amber-500/[0.025] blur-[120px]" />
      </div>

      {/* =================================================
          NAVBAR
      ================================================= */}

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-[70px] max-w-7xl items-center justify-between gap-6 px-5 lg:px-8">
          {/* LOGO */}

          <Link
            href="/"
            className="shrink-0 text-[19px] font-black tracking-[-0.04em] text-white sm:text-xl"
          >
            M4N
            <span className="text-amber-400">
              {" "}
              CHORD
            </span>
            <span className="text-zinc-600">
              .
            </span>
          </Link>

          {/* NAVIGATION */}

          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link
              href="/"
              className="relative py-2 text-white"
            >
              Home

              <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-amber-400" />
            </Link>

            <Link
              href="/songs"
              className="py-2 text-zinc-500 transition hover:text-white"
            >
              Songs
            </Link>

            <Link
              href="/artists"
              className="py-2 text-zinc-500 transition hover:text-white"
            >
              Artists
            </Link>
          </nav>

          {/* RIGHT SIDE */}

          <div className="flex items-center gap-2">
            <Link
              href="/songs"
              className="hidden h-10 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-4 text-xs text-zinc-500 transition hover:border-white/[0.15] hover:text-zinc-200 sm:flex"
            >
              <SearchIcon />

              <span>
                Search songs...
              </span>
            </Link>

            <Link
              href="/songs"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] text-zinc-400 transition hover:border-amber-400/30 hover:text-amber-400 sm:hidden"
              aria-label="Search songs"
            >
              <SearchIcon />
            </Link>

            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] text-sm text-zinc-400 transition hover:border-amber-400/30 hover:text-amber-400 sm:flex"
              aria-label="Appearance"
            >
              ◐
            </button>
          </div>
        </div>
      </header>

      {/* =================================================
          HERO
      ================================================= */}

      <section className="relative isolate mx-auto max-w-7xl px-5 pt-8 sm:pt-12 lg:px-8 lg:pt-16">
        <div className="relative min-h-[560px] overflow-hidden rounded-[30px] border border-white/[0.07] bg-[#090909] sm:min-h-[600px] lg:min-h-[620px]">
          {/* HERO COVER */}

          {heroSong?.coverImageUrl ? (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center opacity-[0.13]"
                style={{
                  backgroundImage: `url("${heroSong.coverImageUrl}")`,
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-r from-[#090909] via-[#090909]/95 to-[#090909]/35" />

              <div className="absolute inset-0 bg-gradient-to-t from-[#090909] via-transparent to-transparent" />
            </>
          ) : null}

          {/* DECORATIVE CIRCLES */}

          <div className="absolute right-[-100px] top-[-100px] h-[450px] w-[450px] rounded-full border border-amber-400/[0.04]" />

          <div className="absolute bottom-[-180px] right-[10%] h-[420px] w-[420px] rounded-full border border-amber-400/[0.035]" />

          {/* HERO CONTENT */}

          <div className="relative flex min-h-[560px] flex-col justify-between p-7 sm:min-h-[600px] sm:p-10 lg:min-h-[620px] lg:p-14">
            <div className="max-w-[700px] pt-4 sm:pt-8 lg:pt-10">
              <div className="mb-5 flex items-center gap-3">
                <span className="h-px w-8 bg-amber-400" />

                <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-amber-400 sm:text-xs">
                  Guitar Chords & Lyrics
                </span>
              </div>

              <h1 className="max-w-[700px] text-[48px] font-black leading-[0.94] tracking-[-0.055em] text-white sm:text-6xl lg:text-[78px]">
                Play the song.
                <br />

                <span className="text-zinc-500">
                  Not the screen.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
                Chord dan lirik langsung
                dari database musik kamu.
                <br className="hidden sm:block" />
                Satu data untuk aplikasi
                dan website.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/songs"
                  className="group flex items-center gap-3 rounded-full bg-amber-400 px-5 py-3.5 text-sm font-bold text-black transition hover:bg-amber-300 active:scale-[0.98]"
                >
                  <MusicIcon />

                  Browse Songs

                  <span className="transition-transform group-hover:translate-x-1">
                    <ArrowIcon />
                  </span>
                </Link>

                <Link
                  href="/artists"
                  className="flex items-center gap-3 rounded-full border border-white/[0.1] bg-white/[0.035] px-5 py-3.5 text-sm font-bold text-zinc-200 transition hover:border-white/[0.2] hover:bg-white/[0.07]"
                >
                  <UsersIcon />

                  Explore Artists
                </Link>
              </div>
            </div>

            {/* STATS */}

            <div className="mt-12 flex flex-wrap items-end gap-x-8 gap-y-5 sm:gap-x-12">
              <div>
                <p className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {songs.length}+
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Songs
                </p>
              </div>

              <div className="h-9 w-px bg-white/[0.08]" />

              <div>
                <p className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {artists.length}+
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Artists
                </p>
              </div>

              <div className="h-9 w-px bg-white/[0.08]" />

              <div>
                <p className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  100%
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Free
                </p>
              </div>
            </div>

            {/* SIDE QUOTE */}

            <div className="absolute bottom-10 right-8 hidden rotate-[-8deg] font-serif text-2xl italic text-amber-400/60 lg:block">
              Good music
              <br />
              lives longer

              <div className="ml-auto mt-2 h-px w-8 bg-amber-400/50" />
            </div>
          </div>
        </div>
      </section>

      {/* =================================================
          FEATURED SONGS
      ================================================= */}

      <section className="mx-auto max-w-7xl px-5 pb-8 pt-20 lg:px-8 lg:pt-24">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400">
              Discover
            </p>

            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Featured songs
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              Pilihan lagu yang tersedia
              di M4N Chord.
            </p>
          </div>

          <Link
            href="/songs"
            className="hidden items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-amber-400 sm:flex"
          >
            View all
            <ArrowIcon />
          </Link>
        </div>

        {featuredSongs.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredSongs.map(
              (song) => (
                <Link
                  key={song.id}
                  href={`/song/${encodeURIComponent(
                    song.slug
                  )}`}
                  className="group relative overflow-hidden rounded-[22px] border border-white/[0.07] bg-[#090909] transition duration-300 hover:-translate-y-1 hover:border-amber-400/20"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
                    <CoverImage
                      src={
                        song.coverImageUrl
                      }
                      alt={`${song.title} cover`}
                      priority
                      className="transition duration-700 group-hover:scale-105"
                    />

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/50 to-transparent" />

                    {song.originalKey && (
                      <span className="absolute right-3 top-3 rounded-lg border border-white/[0.08] bg-black/70 px-2.5 py-1.5 font-mono text-xs font-bold text-white backdrop-blur-md">
                        {song.originalKey}
                      </span>
                    )}

                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="line-clamp-2 text-base font-bold leading-snug text-white">
                        {song.title}
                      </h3>

                      <p className="mt-1 truncate text-sm text-zinc-400">
                        {song.artist ||
                          "Unknown Artist"}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.06] p-10 text-center text-sm text-zinc-600">
            Belum ada lagu
            published.
          </div>
        )}

        <Link
          href="/songs"
          className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-white/[0.07] py-3 text-sm font-medium text-zinc-500 transition hover:border-white/[0.14] hover:text-white sm:hidden"
        >
          View all songs
          <ArrowIcon />
        </Link>
      </section>

      {/* =================================================
          LATEST SONGS
      ================================================= */}

      <section className="mx-auto max-w-7xl px-5 pb-8 pt-16 lg:px-8 lg:pt-20">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400">
              Fresh from the database
            </p>

            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Latest songs
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              Lagu terbaru yang sudah
              tersedia.
            </p>
          </div>

          <Link
            href="/songs"
            className="hidden items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-amber-400 sm:flex"
          >
            View all
            <ArrowIcon />
          </Link>
        </div>

        {latestSongs.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {latestSongs.map(
              (song) => (
                <Link
                  key={song.id}
                  href={`/song/${encodeURIComponent(
                    song.slug
                  )}`}
                  className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.05] bg-[#090909]/70 p-2.5 transition hover:border-white/[0.11] hover:bg-[#0c0c0c]"
                >
                  <div className="relative h-[62px] w-[62px] shrink-0 overflow-hidden rounded-xl bg-zinc-900">
                    <CoverImage
                      src={
                        song.coverImageUrl
                      }
                      alt=""
                      className="transition duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-zinc-200 transition group-hover:text-white">
                      {song.title}
                    </h3>

                    <p className="mt-1 truncate text-xs text-zinc-600">
                      {song.artist ||
                        "Unknown Artist"}
                    </p>
                  </div>

                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.06] text-zinc-600 transition group-hover:border-amber-400/20 group-hover:text-amber-400">
                    <ArrowIcon />
                  </span>
                </Link>
              )
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.06] p-8 text-center text-sm text-zinc-600">
            Belum ada lagu
            published.
          </div>
        )}
      </section>

      {/* =================================================
          TOP ARTISTS
      ================================================= */}

      {artists.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-8 pt-16 lg:px-8 lg:pt-20">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400">
                Artists
              </p>

              <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Top artists
              </h2>

              <p className="mt-1 text-sm text-zinc-600">
                Temukan lagu dari artist
                favorit kamu.
              </p>
            </div>

            <Link
              href="/artists"
              className="hidden items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-amber-400 sm:flex"
            >
              View all
              <ArrowIcon />
            </Link>
          </div>

          <div className="flex gap-5 overflow-x-auto pb-5 scrollbar-none">
            {artists.map(
              (artist) => (
                <Link
                  key={artist.name}
                  href={`/artists/${encodeURIComponent(
                    artist.name
                  )}`}
                  className="group w-[90px] shrink-0 text-center sm:w-[105px]"
                >
                  <div className="relative mx-auto aspect-square w-[76px] overflow-hidden rounded-full border border-white/[0.08] bg-zinc-900 p-[2px] transition duration-300 group-hover:border-amber-400/40 sm:w-[88px]">
                    <div className="relative h-full w-full overflow-hidden rounded-full">
                      <CoverImage
                        src={
                          artist.cover
                        }
                        alt={
                          artist.name
                        }
                        className="grayscale-[25%] transition duration-500 group-hover:scale-105 group-hover:grayscale-0"
                      />
                    </div>
                  </div>

                  <p className="mt-3 truncate text-xs font-bold text-zinc-300 transition group-hover:text-white">
                    {artist.name}
                  </p>

                  <p className="mt-1 text-[10px] text-zinc-600">
                    {artist.count}{" "}
                    {artist.count ===
                    1
                      ? "song"
                      : "songs"}
                  </p>
                </Link>
              )
            )}
          </div>
        </section>
      )}

      {/* =================================================
          CTA
      ================================================= */}

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-16 lg:px-8 lg:pt-24">
        <div className="relative overflow-hidden rounded-[28px] border border-amber-400/10 bg-gradient-to-br from-amber-400/[0.16] via-amber-400/[0.05] to-transparent p-7 sm:p-10 lg:p-12">
          <div className="absolute right-[-80px] top-[-100px] h-[300px] w-[300px] rounded-full bg-amber-400/[0.08] blur-[80px]" />

          <div className="relative flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400">
                M4N Chord
              </p>

              <h2 className="max-w-xl text-3xl font-black leading-tight tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                Music feels better
                <br />
                when you play it.
              </h2>

              <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-500">
                Semua chord dan lirik
                yang kamu butuhkan
                untuk memainkan lagu
                favoritmu.
              </p>
            </div>

            <Link
              href="/songs"
              className="group flex w-fit shrink-0 items-center gap-3 rounded-full bg-amber-400 px-6 py-3.5 text-sm font-bold text-black transition hover:bg-amber-300"
            >
              Explore Songs

              <span className="transition-transform group-hover:translate-x-1">
                <ArrowIcon />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="border-t border-white/[0.05]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <Link
            href="/"
            className="text-sm font-black tracking-tight text-zinc-300"
          >
            M4N{" "}
            <span className="text-amber-400">
              CHORD
            </span>
            .
          </Link>

          <p className="text-xs text-zinc-700">
            Chords & lyrics for musicians.
          </p>
        </div>
      </footer>
    </main>
  );
}
