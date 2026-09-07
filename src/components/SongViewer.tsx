"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Song } from "@/types/song";

/* =========================================================
   TYPES
========================================================= */

type ChordPosition = {
  chord: string;
  position: number;
};

type ParsedLine =
  | {
      type: "section";
      title: string;
    }
  | {
      type: "line";
      lyrics: string;
      chords: ChordPosition[];
    };

/* =========================================================
   CHORD TRANSPOSITION
========================================================= */

const SHARP_KEYS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

function normalizeChordRoot(root: string) {
  return FLAT_TO_SHARP[root] || root;
}

function transposeChord(
  chord: string,
  amount: number
): string {
  if (!amount) {
    return chord;
  }

  /*
   * Contoh:
   *
   * G
   * Cmaj7
   * F#m
   * Bb
   * G/B
   * C#m7
   */

  const match = chord.match(
    /^([A-G](?:#|b)?)(.*)$/
  );

  if (!match) {
    return chord;
  }

  const [, rawRoot, suffix] = match;

  const normalizedRoot =
    normalizeChordRoot(rawRoot);

  const index =
    SHARP_KEYS.indexOf(normalizedRoot);

  if (index === -1) {
    return chord;
  }

  const newIndex =
    (index + amount + 120) %
    12;

  return (
    SHARP_KEYS[newIndex] + suffix
  );
}

/* =========================================================
   TRANSPOSE WHOLE LYRIC TEXT
========================================================= */

function transposeLyrics(
  text: string,
  amount: number
): string {
  if (!amount) {
    return text;
  }

  return text.replace(
    /\[([A-G](?:#|b)?[^ \]\r\n]*)\]/g,
    (_full, chord: string) => {
      return `[${transposeChord(
        chord,
        amount
      )}]`;
    }
  );
}

/* =========================================================
   PARSER
========================================================= */

/**
 * Firebase menyimpan format seperti:
 *
 * [Intro]
 *
 * [G][C][G][C]
 *
 * [Verse 1]
 *
 * [G]I wanna be your[C] day
 *
 * Parser ini menghasilkan:
 *
 * lyrics:
 * I wanna be your day
 *
 * chords:
 * G -> position 0
 * C -> position 15
 */
function parseChordLyrics(
  text: string
): ParsedLine[] {
  const lines = text.replace(
    /\r\n/g,
    "\n"
  ).split("\n");

  const result: ParsedLine[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    /*
     * Section:
     *
     * [Intro]
     * [Verse 1]
     * [Pre-chorus]
     */

    const sectionMatch =
      line.match(
        /^\s*\[([^\]]+)\]\s*$/
      );

    if (sectionMatch) {
      result.push({
        type: "section",
        title: sectionMatch[1],
      });

      continue;
    }

    let lyrics = "";

    const chords: ChordPosition[] = [];

    /*
     * Kita membaca karakter demi karakter.
     *
     * Ini penting supaya posisi chord dihitung
     * berdasarkan panjang LIRIK yang sudah terbentuk,
     * bukan panjang string mentah yang masih memiliki
     * [G], [C], dll.
     */

    let i = 0;

    while (i < line.length) {
      /*
       * Chord marker:
       *
       * [G]
       * [C]
       * [F#m7]
       * [G/B]
       */

      if (line[i] === "[") {
        const close =
          line.indexOf("]", i + 1);

        if (close !== -1) {
          const inside =
            line.slice(
              i + 1,
              close
            );

          /*
           * Pastikan isi bracket memang
           * terlihat seperti chord.
           */

          const chordMatch =
            inside.match(
              /^([A-G](?:#|b)?)(.*)$/
            );

          if (chordMatch) {
            chords.push({
              chord: inside,
              position: lyrics.length,
            });

            i = close + 1;

            continue;
          }
        }
      }

      /*
       * Karakter biasa masuk ke lyrics.
       */

      lyrics += line[i];

      i++;
    }

    result.push({
      type: "line",
      lyrics,
      chords,
    });
  }

  return result;
}

/* =========================================================
   SECTION DETECTION
========================================================= */

function isChordOnlyLine(
  line: Extract<
    ParsedLine,
    { type: "line" }
  >
) {
  return (
    line.lyrics.trim() === "" &&
    line.chords.length > 0
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
        gap-2
      "
    >
      {chords.map(
        (item, index) => (
          <span
            key={`${item.chord}-${index}`}
            className="
              flex
              h-11
              min-w-11
              items-center
              justify-center
              rounded-xl
              border
              border-amber-400/20
              bg-amber-400/[0.055]
              px-3
              font-mono
              text-sm
              font-bold
              text-amber-400
              shadow-[0_0_25px_rgba(251,191,36,0.04)]
            "
          >
            {item.chord}
          </span>
        )
      )}
    </div>
  );
}

/* =========================================================
   CHORD + LYRIC LINE
========================================================= */

function ChordLyricLine({
  chords,
  lyrics,
}: {
  chords: ChordPosition[];
  lyrics: string;
}) {
  const maxChordEnd =
    chords.length > 0
      ? Math.max(
          ...chords.map(
            (item) =>
              item.position +
              item.chord.length
          )
        )
      : 0;

  const width =
    Math.max(
      lyrics.length,
      maxChordEnd,
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
        minWidth: `${width}ch`,
      }}
    >
      {/* CHORDS */}

      <div
        className="
          relative
          h-[1.45em]
        "
      >
        {chords.map(
          (item, index) => (
            <span
              key={`${item.chord}-${index}`}
              className="
                absolute
                top-0
                whitespace-nowrap
                font-mono
                text-[0.78em]
                font-bold
                leading-[1.45]
                text-amber-400
              "
              style={{
                left: `${item.position}ch`,
              }}
            >
              {item.chord}
            </span>
          )
        )}
      </div>

      {/* LYRICS */}

      <div
        className="
          whitespace-pre
          font-mono
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
   SECTION HEADER
========================================================= */

function SectionHeader({
  title,
}: {
  title: string;
}) {
  return (
    <div className="mb-5 mt-10 first:mt-0">
      <span
        className="
          inline-flex
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
        mb-6
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
          {chords.length !== 1
            ? "s"
            : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {chords.map(
          (chord, index) => (
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
              "
            >
              {chord}
            </span>
          )
        )}
      </div>
    </section>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function SongViewer({
  song,
}: {
  song: Song;
}) {
  /* =======================================================
     STATES
  ======================================================= */

  const [shift, setShift] =
    useState(0);

  const [fontSize, setFontSize] =
    useState(17);

  const [autoScroll, setAutoScroll] =
    useState(false);

  /*
   * Speed:
   *
   * 1 = lambat
   * 2 = normal
   * 3 = cepat
   * 4 = sangat cepat
   * 5 = ekstrem
   */

  const [scrollSpeed, setScrollSpeed] =
    useState(2);

  const scrollContainerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const animationRef =
    useRef<number | null>(null);

  /* =======================================================
     RAW FIREBASE DATA
  ======================================================= */

  const rawLyrics =
    song.lyricsWithChords || "";

  /* =======================================================
     TRANSPOSE
  ======================================================= */

  const transposedLyrics =
    useMemo(() => {
      return transposeLyrics(
        rawLyrics,
        shift
      );
    }, [
      rawLyrics,
      shift,
    ]);

  /* =======================================================
     PARSE
  ======================================================= */

  const parsedLines =
    useMemo(() => {
      return parseChordLyrics(
        transposedLyrics
      );
    }, [
      transposedLyrics,
    ]);

  /* =======================================================
     CHORD LIST
  ======================================================= */

  const detectedChords =
    useMemo(() => {
      const result: string[] = [];

      for (const line of parsedLines) {
        if (
          line.type !== "line"
        ) {
          continue;
        }

        for (const item of line.chords) {
          if (
            !result.includes(
              item.chord
            )
          ) {
            result.push(
              item.chord
            );
          }
        }
      }

      return result;
    }, [parsedLines]);

  /*
   * uniqueChords Firebase.
   *
   * Kita gabungkan dengan hasil parser
   * supaya tidak ada chord yang hilang.
   */

  const displayedChords =
    useMemo(() => {
      const result: string[] = [];

      for (const chord of [
        ...(song.uniqueChords || []),
        ...detectedChords,
      ]) {
        const value =
          chord.trim();

        if (!value) {
          continue;
        }

        /*
         * Jangan tampilkan nama section
         * sebagai chord.
         */

        const lower =
          value.toLowerCase();

        if (
          lower === "intro" ||
          lower === "verse" ||
          lower.startsWith(
            "verse "
          ) ||
          lower === "chorus" ||
          lower.startsWith(
            "chorus "
          ) ||
          lower === "pre-chorus" ||
          lower === "pre chorus" ||
          lower === "bridge" ||
          lower.startsWith(
            "bridge "
          ) ||
          lower === "music" ||
          lower === "solo" ||
          lower === "outro"
        ) {
          continue;
        }

        /*
         * Jika transpose aktif,
         * chord dari Firebase juga
         * harus mengikuti key baru.
         */

        const finalChord =
          shift !== 0
            ? transposeChord(
                value,
                shift
              )
            : value;

        if (
          !result.includes(
            finalChord
          )
        ) {
          result.push(
            finalChord
          );
        }
      }

      return result;
    }, [
      song.uniqueChords,
      detectedChords,
      shift,
    ]);

  /* =======================================================
     AUTO SCROLL
  ======================================================= */

  useEffect(() => {
    if (!autoScroll) {
      if (
        animationRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationRef.current
        );

        animationRef.current =
          null;
      }

      return;
    }

    const container =
      scrollContainerRef.current;

    if (!container) {
      return;
    }

    let lastTime = performance.now();

    /*
     * Kecepatan dalam pixel / detik.
     */

    const speedMap: Record<
      number,
      number
    > = {
      1: 8,
      2: 16,
      3: 26,
      4: 40,
      5: 60,
    };

    const pixelsPerSecond =
      speedMap[
        scrollSpeed
      ] || 16;

    const tick = (
      currentTime: number
    ) => {
      const delta =
        currentTime -
        lastTime;

      lastTime = currentTime;

      if (
        container.scrollTop +
          container.clientHeight <
        container.scrollHeight -
          2
      ) {
        container.scrollTop +=
          (pixelsPerSecond *
            delta) /
          1000;
      } else {
        setAutoScroll(false);

        return;
      }

      animationRef.current =
        requestAnimationFrame(
          tick
        );
    };

    animationRef.current =
      requestAnimationFrame(
        tick
      );

    return () => {
      if (
        animationRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationRef.current
        );

        animationRef.current =
          null;
      }
    };
  }, [
    autoScroll,
    scrollSpeed,
  ]);

  /* =======================================================
     RESET SCROLL
  ======================================================= */

  function resetScroll() {
    const container =
      scrollContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =======================================================
     FONT SIZE
  ======================================================= */

  function decreaseFont() {
    setFontSize(
      (value) =>
        Math.max(
          13,
          value - 1
        )
    );
  }

  function increaseFont() {
    setFontSize(
      (value) =>
        Math.min(
          26,
          value + 1
        )
    );
  }

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
            py-3
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

          <div
            className="
              flex
              items-center
              gap-1.5
              sm:gap-2
            "
          >
            {/* MINUS */}

            <button
              type="button"
              onClick={() =>
                setShift(
                  (value) =>
                    value - 1
                )
              }
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                border
                border-zinc-800
                bg-zinc-950
                text-lg
                text-zinc-300
                transition
                hover:border-zinc-600
              "
              aria-label="Transpose down"
            >
              −
            </button>

            {/* SHIFT */}

            <span
              className="
                flex
                min-w-[30px]
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
            </span>

            {/* PLUS */}

            <button
              type="button"
              onClick={() =>
                setShift(
                  (value) =>
                    value + 1
                )
              }
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                border
                border-zinc-800
                bg-zinc-950
                text-lg
                text-zinc-300
                transition
                hover:border-zinc-600
              "
              aria-label="Transpose up"
            >
              +
            </button>

            {/* FONT DOWN */}

            <button
              type="button"
              onClick={
                decreaseFont
              }
              className="
                flex
                h-11
                min-w-11
                items-center
                justify-center
                rounded-xl
                border
                border-zinc-800
                bg-zinc-950
                px-2
                text-sm
                font-bold
                text-zinc-300
                transition
                hover:border-zinc-600
              "
              aria-label="Decrease text size"
            >
              A−
            </button>

            {/* FONT UP */}

            <button
              type="button"
              onClick={
                increaseFont
              }
              className="
                flex
                h-11
                min-w-11
                items-center
                justify-center
                rounded-xl
                border
                border-zinc-800
                bg-zinc-950
                px-2
                text-sm
                font-bold
                text-zinc-300
                transition
                hover:border-zinc-600
              "
              aria-label="Increase text size"
            >
              A+
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
          pt-8
          sm:pt-12
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
                src={
                  song.coverImageUrl
                }
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
              {song.genre ||
                "Song"}
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

            <div
              className="
                mt-5
                flex
                flex-wrap
                gap-2
              "
            >
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
                  Key{" "}
                  {song.originalKey}
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
                Capo{" "}
                {song.capo ?? 0}
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

            <div
              className="
                mt-5
                flex
                flex-wrap
                gap-3
              "
            >
              {song.youtubeUrl && (
                <a
                  href={
                    song.youtubeUrl
                  }
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
                  href={
                    song.spotifyTrackUrl
                  }
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
          CHORDS
      ==================================================== */}

      <section
        className="
          mx-auto
          max-w-5xl
          px-4
          pb-6
        "
      >
        <ChordList
          chords={
            displayedChords
          }
        />
      </section>

      {/* ===================================================
          AUTO SCROLL CONTROL
      ==================================================== */}

      <section
        className="
          mx-auto
          max-w-5xl
          px-4
          pb-6
        "
      >
        <div
          className="
            rounded-[24px]
            border
            border-zinc-800
            bg-zinc-900/40
            p-4
            sm:p-5
          "
        >
          <div
            className="
              flex
              flex-col
              gap-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            {/* TITLE */}

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
                Auto Scroll
              </p>

              <p className="mt-1 text-sm text-zinc-400">
                Scroll otomatis untuk
                bermain gitar
              </p>
            </div>

            {/* BUTTONS */}

            <div
              className="
                flex
                flex-wrap
                gap-2
              "
            >
              {/* PLAY / PAUSE */}

              <button
                type="button"
                onClick={() =>
                  setAutoScroll(
                    (value) =>
                      !value
                  )
                }
                className={`
                  rounded-xl
                  px-4
                  py-2.5
                  text-sm
                  font-bold
                  transition
                  ${
                    autoScroll
                      ? "bg-amber-400 text-black"
                      : "border border-zinc-700 bg-zinc-950 text-zinc-200"
                  }
                `}
              >
                {autoScroll
                  ? "Ⅱ Pause"
                  : "▶ Play"}
              </button>

              {/* RESET */}

              <button
                type="button"
                onClick={
                  resetScroll
                }
                className="
                  rounded-xl
                  border
                  border-zinc-800
                  bg-zinc-950
                  px-4
                  py-2.5
                  text-sm
                  font-bold
                  text-zinc-300
                  transition
                  hover:border-zinc-600
                "
              >
                ↺ Reset
              </button>
            </div>
          </div>

          {/* SPEED */}

          <div className="mt-5">
            <div
              className="
                mb-2
                flex
                items-center
                justify-between
              "
            >
              <span className="text-xs text-zinc-500">
                Speed
              </span>

              <span
                className="
                  font-mono
                  text-xs
                  font-bold
                  text-amber-400
                "
              >
                {scrollSpeed}
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={scrollSpeed}
              onChange={(event) =>
                setScrollSpeed(
                  Number(
                    event.target.value
                  )
                )
              }
              className="
                h-1.5
                w-full
                cursor-pointer
                accent-amber-400
              "
            />

            <div
              className="
                mt-2
                flex
                justify-between
                text-[10px]
                uppercase
                tracking-wider
                text-zinc-700
              "
            >
              <span>
                Slow
              </span>

              <span>
                Normal
              </span>

              <span>
                Fast
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          CHORD SHEET
      ==================================================== */}

      <section
        className="
          mx-auto
          max-w-5xl
          px-4
          pb-12
        "
      >
        <div
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
            ref={
              scrollContainerRef
            }
            className="
              max-h-[75vh]
              overflow-y-auto
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
              {parsedLines.map(
                (
                  line,
                  index
                ) => {
                  /* =====================================
                     SECTION
                  ====================================== */

                  if (
                    line.type ===
                    "section"
                  ) {
                    return (
                      <SectionHeader
                        key={`section-${index}`}
                        title={
                          line.title
                        }
                      />
                    );
                  }

                  /* =====================================
                     CHORD PROGRESSION
                  ====================================== */

                  if (
                    isChordOnlyLine(
                      line
                    )
                  ) {
                    return (
                      <div
                        key={`progression-${index}`}
                        className="
                          mb-7
                        "
                      >
                        <ChordProgression
                          chords={
                            line.chords
                          }
                        />
                      </div>
                    );
                  }

                  /* =====================================
                     NORMAL LINE
                  ====================================== */

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
                          line.chords
                        }
                        lyrics={
                          line.lyrics
                        }
                      />
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
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
