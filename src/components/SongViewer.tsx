"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Song } from "@/types/song";
import {
  parseLyrics,
  transposeText,
  type ChordPosition,
  type ParsedSection,
} from "@/lib/chords";

type SongViewerProps = {
  song: Song;
};

/**
 * Membuat baris chord dengan posisi yang sama
 * seperti posisi chord pada lirik.
 *
 * Contoh:
 *
 * chords:
 * G -> 0
 * C -> 17
 *
 * menghasilkan:
 *
 * G                 C
 */
function buildChordLine(
  chords: ChordPosition[]
): string {
  if (!chords.length) {
    return "";
  }

  let result = "";
  let cursor = 0;

  for (const item of chords) {
    const targetPosition = Math.max(
      item.position,
      cursor
    );

    const spaces = targetPosition - result.length;

    if (spaces > 0) {
      result += " ".repeat(spaces);
    }

    result += item.chord;

    cursor = result.length;
  }

  return result;
}

/**
 * Apakah baris ini hanya berisi chord?
 *
 * Contoh:
 *
 * [G][C][G][C]
 *
 * dianggap progression.
 */
function isChordOnlyLine(
  section: Extract<ParsedSection, { type: "line" }>
): boolean {
  return (
    section.chords.length > 0 &&
    section.lyrics.trim() === ""
  );
}

/**
 * Render chord progression secara horizontal.
 *
 * G   C   G   C
 */
function ChordProgression({
  chords,
}: {
  chords: ChordPosition[];
}) {
  return (
    <div className="my-3 flex flex-wrap items-center gap-2">
      {chords.map((item, index) => (
        <span
          key={`${item.chord}-${index}`}
          className="
            inline-flex
            min-w-[42px]
            items-center
            justify-center
            rounded-xl
            border
            border-amber-400/20
            bg-amber-400/[0.07]
            px-3
            py-2
            font-mono
            text-[15px]
            font-bold
            text-amber-400
            shadow-[0_0_20px_rgba(251,191,36,0.04)]
          "
        >
          {item.chord}
        </span>
      ))}
    </div>
  );
}

/**
 * Render satu baris chord + lyric.
 *
 * Contoh:
 *
 * G                    C
 * I wanna be your      day
 */
function ChordLyricLine({
  chords,
  lyrics,
}: {
  chords: ChordPosition[];
  lyrics: string;
}) {
  const chordLine = buildChordLine(chords);

  return (
    <div className="group relative">
      {chords.length > 0 && (
        <div
          className="
            overflow-x-auto
            whitespace-pre
            font-mono
            text-[14px]
            font-bold
            leading-none
            text-amber-400
            scrollbar-none
          "
        >
          {chordLine}
        </div>
      )}

      <div
        className="
          overflow-x-auto
          whitespace-pre
          font-mono
          text-[17px]
          leading-[1.9]
          tracking-[-0.01em]
          text-zinc-200
          scrollbar-none
        "
      >
        {lyrics || "\u00A0"}
      </div>
    </div>
  );
}

/**
 * Daftar chord yang digunakan lagu.
 */
function ChordList({
  chords,
}: {
  chords: string[];
}) {
  if (!chords.length) {
    return null;
  }

  return (
    <section
      className="
        mb-8
        overflow-hidden
        rounded-[24px]
        border
        border-zinc-800
        bg-zinc-900/40
        p-5
        shadow-[0_10px_50px_rgba(0,0,0,0.15)]
        sm:p-6
      "
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p
            className="
              text-[11px]
              font-bold
              uppercase
              tracking-[0.28em]
              text-zinc-500
            "
          >
            Chords
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            {chords.length} chord
            {chords.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {chords.map((chord, index) => (
          <span
            key={`${chord}-${index}`}
            className="
              rounded-xl
              border
              border-amber-400/10
              bg-zinc-950
              px-3
              py-2
              font-mono
              text-sm
              font-bold
              text-amber-400
              transition
              hover:border-amber-400/30
              hover:bg-amber-400/[0.06]
            "
          >
            {chord}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function SongViewer({
  song,
}: SongViewerProps) {
  const [shift, setShift] = useState(0);
  const [fontSize, setFontSize] = useState(17);
  const [showChords, setShowChords] = useState(true);

  const rawLyrics = song.lyricsWithChords || "";

  /**
   * Transpose dilakukan terhadap data asli,
   * bukan data yang sudah ditranspose sebelumnya.
   */
  const transposedLyrics = useMemo(() => {
    return transposeText(rawLyrics, shift);
  }, [rawLyrics, shift]);

  /**
   * Parse setelah transpose.
   *
   * Jadi:
   *
   * [G]Hello[C] world
   *
   * menjadi:
   *
   * G          C
   * Hello      world
   */
  const sections = useMemo(() => {
    return parseLyrics(transposedLyrics);
  }, [transposedLyrics]);

  /**
   * Ambil semua chord dari lyrics.
   *
   * Ini dipakai sebagai fallback apabila uniqueChords
   * Firebase tidak tersedia.
   */
  const parsedChords = useMemo(() => {
    const unique: string[] = [];

    for (const section of sections) {
      if (section.type !== "line") {
        continue;
      }

      for (const chord of section.chords) {
        if (!unique.includes(chord.chord)) {
          unique.push(chord.chord);
        }
      }
    }

    return unique;
  }, [sections]);

  /**
   * uniqueChords dari Firebase.
   *
   * "Chorus" bukan chord, jadi kita filter.
   */
  const firebaseChords = useMemo(() => {
    return (song.uniqueChords || []).filter(
      (chord) => {
        const value = chord.trim().toLowerCase();

        return (
          value !== "chorus" &&
          value !== "verse" &&
          value !== "intro" &&
          value !== "bridge" &&
          value !== "music" &&
          value !== "solo" &&
          value !== "outro"
        );
      }
    );
  }, [song.uniqueChords]);

  /**
   * Kalau Firebase punya uniqueChords,
   * pakai itu.
   *
   * Kalau tidak, gunakan hasil parser.
   */
  const displayedChords =
    firebaseChords.length > 0
      ? firebaseChords.map((chord) =>
          shift !== 0
            ? chord
            : chord
        )
      : parsedChords;

  return (
    <main
      className="
        min-h-screen
        bg-[#050505]
        text-zinc-100
      "
    >
      {/* =====================================================
          TOP BAR
      ====================================================== */}

      <header
        className="
          sticky
          top-0
          z-50
          border-b
          border-zinc-800/80
          bg-[#050505]/90
          backdrop-blur-xl
        "
      >
        <div
          className="
            mx-auto
            flex
            max-w-5xl
            items-center
            justify-between
            gap-3
            px-4
            py-4
          "
        >
          <Link
            href="/songs"
            className="
              shrink-0
              text-sm
              font-medium
              text-zinc-400
              transition
              hover:text-white
            "
          >
            ← Songs
          </Link>

          <div className="flex items-center gap-2">
            {/* TRANSPOSE DOWN */}

            <button
              type="button"
              onClick={() =>
                setShift((value) => value - 1)
              }
              aria-label="Transpose down"
              className="
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-xl
                border
                border-zinc-800
                bg-zinc-950
                text-xl
                text-zinc-300
                transition
                hover:border-zinc-600
                hover:bg-zinc-900
              "
            >
              −
            </button>

            {/* TRANSPOSE VALUE */}

            <div
              className="
                flex
                min-w-[38px]
                items-center
                justify-center
                font-mono
                text-xs
                font-bold
                text-zinc-500
              "
            >
              {shift > 0 ? `+${shift}` : shift}
            </div>

            {/* TRANSPOSE UP */}

            <button
              type="button"
              onClick={() =>
                setShift((value) => value + 1)
              }
              aria-label="Transpose up"
              className="
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-xl
                border
                border-zinc-800
                bg-zinc-950
                text-xl
                text-zinc-300
                transition
                hover:border-zinc-600
                hover:bg-zinc-900
              "
            >
              +
            </button>

            {/* FONT UP */}

            <button
              type="button"
              onClick={() =>
                setFontSize((value) =>
                  Math.min(25, value + 1)
                )
              }
              aria-label="Increase font size"
              className="
                hidden
                h-12
                rounded-xl
                border
                border-zinc-800
                bg-zinc-950
                px-4
                text-sm
                font-medium
                text-zinc-300
                transition
                hover:border-zinc-600
                hover:bg-zinc-900
                sm:block
              "
            >
              A+
            </button>

            {/* FONT DOWN */}

            <button
              type="button"
              onClick={() =>
                setFontSize((value) =>
                  Math.max(13, value - 1)
                )
              }
              aria-label="Decrease font size"
              className="
                hidden
                h-12
                rounded-xl
                border
                border-zinc-800
                bg-zinc-950
                px-4
                text-sm
                font-medium
                text-zinc-300
                transition
                hover:border-zinc-600
                hover:bg-zinc-900
                sm:block
              "
            >
              A−
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          SONG HEADER
      ====================================================== */}

      <section
        className="
          mx-auto
          max-w-5xl
          px-4
          pb-10
          pt-10
          sm:pt-14
        "
      >
        <div
          className="
            grid
            gap-7
            sm:grid-cols-[180px_1fr]
            sm:items-end
          "
        >
          {/* COVER */}

          <div
            className="
              aspect-square
              overflow-hidden
              rounded-[26px]
              bg-zinc-900
              shadow-[0_25px_80px_rgba(0,0,0,0.4)]
            "
          >
            {song.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={song.coverImageUrl}
                alt={song.title}
                className="
                  h-full
                  w-full
                  object-cover
                "
              />
            ) : (
              <div
                className="
                  flex
                  h-full
                  items-center
                  justify-center
                  text-xs
                  font-bold
                  tracking-widest
                  text-zinc-700
                "
              >
                NO COVER
              </div>
            )}
          </div>

          {/* INFO */}

          <div>
            <p
              className="
                text-xs
                font-medium
                uppercase
                tracking-[0.28em]
                text-zinc-500
              "
            >
              {song.genre || "Song"}
            </p>

            <h1
              className="
                mt-2
                text-4xl
                font-black
                tracking-[-0.04em]
                text-white
                sm:text-6xl
              "
            >
              {song.title}
            </h1>

            <p
              className="
                mt-2
                text-lg
                font-medium
                text-zinc-400
              "
            >
              {song.artist || "Unknown artist"}
            </p>

            {/* METADATA */}

            <div className="mt-5 flex flex-wrap gap-2">
              {song.originalKey && (
                <span
                  className="
                    rounded-full
                    bg-zinc-900
                    px-3
                    py-2
                    text-xs
                    text-zinc-400
                  "
                >
                  Key {song.originalKey}
                </span>
              )}

              <span
                className="
                  rounded-full
                  bg-zinc-900
                  px-3
                  py-2
                  text-xs
                  text-zinc-400
                "
              >
                Capo {song.capo ?? 0}
              </span>

              {song.bpm && (
                <span
                  className="
                    rounded-full
                    bg-zinc-900
                    px-3
                    py-2
                    text-xs
                    text-zinc-400
                  "
                >
                  {song.bpm} BPM
                </span>
              )}

              {song.tuning && (
                <span
                  className="
                    rounded-full
                    bg-zinc-900
                    px-3
                    py-2
                    text-xs
                    text-zinc-400
                  "
                >
                  {song.tuning}
                </span>
              )}
            </div>

            {/* LINKS */}

            <div className="mt-5 flex flex-wrap gap-3">
              {song.youtubeUrl && (
                <a
                  href={song.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="
                    rounded-xl
                    bg-white
                    px-4
                    py-2.5
                    text-sm
                    font-bold
                    text-black
                    transition
                    hover:bg-zinc-200
                  "
                >
                  YouTube
                </a>
              )}

              {song.spotifyTrackUrl && (
                <a
                  href={song.spotifyTrackUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="
                    rounded-xl
                    border
                    border-zinc-800
                    bg-zinc-950
                    px-4
                    py-2.5
                    text-sm
                    font-bold
                    text-zinc-200
                    transition
                    hover:border-zinc-600
                    hover:bg-zinc-900
                  "
                >
                  Spotify
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          CHORD AREA
      ====================================================== */}

      <section className="mx-auto max-w-5xl px-4 pb-10">
        <ChordList chords={displayedChords} />

        {/* MOBILE CHORD TOGGLE */}

        <div
          className="
            mb-5
            flex
            items-center
            justify-between
            rounded-2xl
            border
            border-zinc-800
            bg-zinc-900/30
            p-3
            sm:hidden
          "
        >
          <div>
            <p className="text-sm font-semibold">
              Chords
            </p>

            <p className="text-xs text-zinc-500">
              Tampilkan chord di atas lirik
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowChords((value) => !value)
            }
            className={`
              rounded-xl
              px-4
              py-2
              text-xs
              font-bold
              transition
              ${
                showChords
                  ? "bg-amber-400 text-black"
                  : "bg-zinc-800 text-zinc-400"
              }
            `}
          >
            {showChords ? "ON" : "OFF"}
          </button>
        </div>

        {/* =====================================================
            CHORD SHEET
        ====================================================== */}

        <article
          className="
            overflow-hidden
            rounded-[26px]
            border
            border-zinc-800
            bg-[#070707]
            shadow-[0_25px_100px_rgba(0,0,0,0.25)]
          "
        >
          <div className="px-5 py-7 sm:px-9 sm:py-10">
            <div
              style={{
                fontSize: `${fontSize}px`,
              }}
            >
              {sections.map((section, index) => {
                /**
                 * SECTION HEADER
                 */

                if (section.type === "section") {
                  return (
                    <div
                      key={`section-${index}`}
                      className="
                        mb-5
                        mt-8
                        first:mt-0
                      "
                    >
                      <span
                        className="
                          inline-flex
                          rounded-lg
                          border
                          border-amber-400/10
                          bg-amber-400/[0.07]
                          px-3
                          py-1.5
                          font-mono
                          text-[12px]
                          font-bold
                          uppercase
                          tracking-wider
                          text-amber-400
                        "
                      >
                        {section.title}
                      </span>
                    </div>
                  );
                }

                /**
                 * CHORD ONLY
                 *
                 * [G][C][G][C]
                 */

                if (isChordOnlyLine(section)) {
                  return (
                    <div
                      key={`progression-${index}`}
                      className="mb-5"
                    >
                      {showChords ? (
                        <ChordProgression
                          chords={section.chords}
                        />
                      ) : null}
                    </div>
                  );
                }

                /**
                 * NORMAL LYRIC + CHORD
                 */

                return (
                  <div
                    key={`line-${index}`}
                    className="mb-4"
                  >
                    <ChordLyricLine
                      chords={
                        showChords
                          ? section.chords
                          : []
                      }
                      lyrics={section.lyrics}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </article>
      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer
        className="
          mx-auto
          max-w-5xl
          px-4
          pb-12
          pt-4
          text-center
          text-xs
          text-zinc-700
        "
      >
        {song.title}
        {song.artist
          ? ` · ${song.artist}`
          : ""}
      </footer>
    </main>
  );
}
