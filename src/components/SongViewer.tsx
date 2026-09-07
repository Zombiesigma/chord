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

/* =========================================================
   CHORD SHEET
   ========================================================= */

/**
 * Render satu baris chord + lirik.
 *
 * Contoh data:
 *
 * [G]I wanna be your[C] day
 *
 * Menjadi:
 *
 * G                   C
 * I wanna be your     day
 *
 * Posisi chord menggunakan "ch" supaya mengikuti
 * lebar karakter monospace.
 */
function ChordLyricLine({
  chords,
  lyrics,
}: {
  chords: ChordPosition[];
  lyrics: string;
}) {
  /**
   * Panjang minimum supaya chord terakhir tidak
   * terpotong ketika chord berada dekat ujung lirik.
   */
  const contentLength = Math.max(
    lyrics.length,
    ...chords.map((item) => item.position + item.chord.length),
    1
  );

  return (
    <div
      className="
        relative
        w-max
        min-w-full
        font-mono
      "
      style={{
        minWidth: `${contentLength}ch`,
      }}
    >
      {/* =====================================================
          CHORD LAYER
      ====================================================== */}

      <div
        className="
          relative
          h-[1.5em]
          whitespace-pre
        "
      >
        {chords.map((item, index) => (
          <span
            key={`${item.chord}-${index}`}
            className="
              absolute
              top-0
              whitespace-nowrap
              font-mono
              text-[0.78em]
              font-bold
              leading-[1.5]
              text-amber-400
            "
            style={{
              left: `${item.position}ch`,
            }}
          >
            {item.chord}
          </span>
        ))}
      </div>

      {/* =====================================================
          LYRIC LAYER
      ====================================================== */}

      <div
        className="
          whitespace-pre
          font-mono
          text-[1em]
          leading-[1.8]
          tracking-normal
          text-zinc-200
        "
      >
        {lyrics || "\u00A0"}
      </div>
    </div>
  );
}

/* =========================================================
   CHORD PROGRESSION
   ========================================================= */

function ChordProgression({
  chords,
}: {
  chords: ChordPosition[];
}) {
  return (
    <div
      className="
        my-4
        flex
        flex-wrap
        items-center
        gap-2
      "
    >
      {chords.map((item, index) => (
        <span
          key={`${item.chord}-${index}`}
          className="
            inline-flex
            h-12
            min-w-12
            items-center
            justify-center
            rounded-xl
            border
            border-amber-400/20
            bg-amber-400/[0.06]
            px-3
            font-mono
            text-base
            font-bold
            text-amber-400
            shadow-[0_0_25px_rgba(251,191,36,0.04)]
          "
        >
          {item.chord}
        </span>
      ))}
    </div>
  );
}

/* =========================================================
   SECTION HEADER
   ========================================================= */

function SectionHeader({
  title,
}: {
  title: string;
}) {
  return (
    <div className="mb-5 mt-9 first:mt-0">
      <span
        className="
          inline-flex
          items-center
          rounded-xl
          border
          border-amber-400/15
          bg-amber-400/[0.06]
          px-3.5
          py-2
          font-mono
          text-xs
          font-bold
          uppercase
          tracking-[0.12em]
          text-amber-400
        "
      >
        {title}
      </span>
    </div>
  );
}

/* =========================================================
   CHORD LIST
   ========================================================= */

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
        rounded-[24px]
        border
        border-zinc-800
        bg-zinc-900/40
        p-5
        sm:p-6
      "
    >
      <div className="mb-4">
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

      <div className="flex flex-wrap gap-2">
        {chords.map((chord, index) => (
          <span
            key={`${chord}-${index}`}
            className="
              rounded-xl
              border
              border-amber-400/10
              bg-zinc-950
              px-3.5
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

/* =========================================================
   HELPER
   ========================================================= */

/**
 * Menentukan apakah satu baris hanya berisi chord.
 *
 * [G][C][G][C]
 */
function isChordOnlyLine(
  section: Extract<ParsedSection, { type: "line" }>
) {
  return (
    section.chords.length > 0 &&
    section.lyrics.trim() === ""
  );
}

/**
 * Filter nama section dari uniqueChords.
 */
function isSectionName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase();

  return (
    normalized === "intro" ||
    normalized === "verse" ||
    normalized.startsWith("verse ") ||
    normalized === "chorus" ||
    normalized.startsWith("chorus ") ||
    normalized === "pre-chorus" ||
    normalized === "pre chorus" ||
    normalized === "bridge" ||
    normalized.startsWith("bridge ") ||
    normalized === "music" ||
    normalized === "solo" ||
    normalized === "outro"
  );
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export default function SongViewer({
  song,
}: SongViewerProps) {
  const [shift, setShift] = useState(0);

  const [fontSize, setFontSize] =
    useState(17);

  const [showChords, setShowChords] =
    useState(true);

  /* =======================================================
     ORIGINAL LYRICS
  ======================================================= */

  const rawLyrics =
    song.lyricsWithChords || "";

  /* =======================================================
     TRANSPOSE
  ======================================================= */

  const transposedLyrics = useMemo(() => {
    return transposeText(
      rawLyrics,
      shift
    );
  }, [rawLyrics, shift]);

  /* =======================================================
     PARSE
  ======================================================= */

  const sections = useMemo(() => {
    return parseLyrics(
      transposedLyrics
    );
  }, [transposedLyrics]);

  /* =======================================================
     CHORDS FROM PARSER
  ======================================================= */

  const parsedChords = useMemo(() => {
    const result: string[] = [];

    for (const section of sections) {
      if (section.type !== "line") {
        continue;
      }

      for (const item of section.chords) {
        if (
          !result.includes(item.chord)
        ) {
          result.push(item.chord);
        }
      }
    }

    return result;
  }, [sections]);

  /* =======================================================
     CHORDS FROM FIREBASE
  ======================================================= */

  const firebaseChords = useMemo(() => {
    const result: string[] = [];

    for (const chord of song.uniqueChords || []) {
      if (
        !chord ||
        isSectionName(chord)
      ) {
        continue;
      }

      if (!result.includes(chord)) {
        result.push(chord);
      }
    }

    return result;
  }, [song.uniqueChords]);

  /* =======================================================
     DISPLAY CHORDS
  ======================================================= */

  const displayedChords =
    firebaseChords.length > 0
      ? firebaseChords
      : parsedChords;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main
      className="
        min-h-screen
        bg-[#050505]
        text-zinc-100
      "
    >
      {/* ===================================================
          TOP BAR
      ==================================================== */}

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
          {/* BACK */}

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

          {/* CONTROLS */}

          <div className="flex items-center gap-2">
            {/* TRANSPOSE DOWN */}

            <button
              type="button"
              onClick={() =>
                setShift(
                  (value) => value - 1
                )
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

            {/* KEY SHIFT */}

            <div
              className="
                flex
                min-w-[36px]
                justify-center
                font-mono
                text-xs
                font-bold
                text-zinc-500
              "
            >
              {shift > 0
                ? `+${shift}`
                : shift}
            </div>

            {/* TRANSPOSE UP */}

            <button
              type="button"
              onClick={() =>
                setShift(
                  (value) => value + 1
                )
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

            {/* FONT */}

            <button
              type="button"
              onClick={() =>
                setFontSize(
                  (value) =>
                    Math.min(
                      25,
                      value + 1
                    )
                )
              }
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

            <button
              type="button"
              onClick={() =>
                setFontSize(
                  (value) =>
                    Math.max(
                      13,
                      value - 1
                    )
                )
              }
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

      {/* ===================================================
          SONG HEADER
      ==================================================== */}

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

          {/* SONG INFO */}

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
              {song.artist ||
                "Unknown artist"}
            </p>

            {/* META */}

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

      {/* ===================================================
          CHORD SECTION
      ==================================================== */}

      <section className="mx-auto max-w-5xl px-4 pb-10">
        <ChordList
          chords={displayedChords}
        />

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
              setShowChords(
                (value) => !value
              )
            }
            className={`
              rounded-xl
              px-4
              py-2
              text-xs
              font-bold
              ${
                showChords
                  ? "bg-amber-400 text-black"
                  : "bg-zinc-800 text-zinc-400"
              }
            `}
          >
            {showChords
              ? "ON"
              : "OFF"}
          </button>
        </div>

        {/* =================================================
            CHORD SHEET
        ================================================== */}

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
          <div
            className="
              overflow-x-auto
              px-5
              py-8
              sm:px-9
              sm:py-10
            "
          >
            <div
              style={{
                fontSize: `${fontSize}px`,
              }}
            >
              {sections.map(
                (section, index) => {
                  /* =======================================
                     SECTION
                  ======================================= */

                  if (
                    section.type ===
                    "section"
                  ) {
                    return (
                      <SectionHeader
                        key={`section-${index}`}
                        title={
                          section.title
                        }
                      />
                    );
                  }

                  /* =======================================
                     CHORD PROGRESSION
                  ======================================= */

                  if (
                    isChordOnlyLine(
                      section
                    )
                  ) {
                    return (
                      <div
                        key={`progression-${index}`}
                        className="mb-6"
                      >
                        {showChords && (
                          <ChordProgression
                            chords={
                              section.chords
                            }
                          />
                        )}
                      </div>
                    );
                  }

                  /* =======================================
                     LYRIC + CHORD
                  ======================================= */

                  return (
                    <div
                      key={`line-${index}`}
                      className="
                        mb-4
                        last:mb-0
                      "
                    >
                      <ChordLyricLine
                        chords={
                          showChords
                            ? section.chords
                            : []
                        }
                        lyrics={
                          section.lyrics
                        }
                      />
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </article>
      </section>

      {/* ===================================================
          FOOTER
      ==================================================== */}

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
