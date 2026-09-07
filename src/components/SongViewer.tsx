"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
   CHORD UTILITIES
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

const FLAT_TO_SHARP: Record<
  string,
  string
> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

/*
 * Nama section yang TIDAK BOLEH dianggap chord.
 *
 * Penting karena:
 *
 * [Chorus]
 *
 * diawali huruf C, sehingga parser chord
 * sederhana bisa salah menganggapnya sebagai
 * chord "Chorus".
 */

const SECTION_NAMES = new Set([
  "intro",
  "verse",
  "verse 1",
  "verse 2",
  "verse 3",
  "verse 4",
  "pre-chorus",
  "pre chorus",
  "chorus",
  "chorus 1",
  "chorus 2",
  "bridge",
  "music",
  "instrumental",
  "solo",
  "outro",
  "interlude",
]);

function isSectionName(
  value: string
) {
  return SECTION_NAMES.has(
    value
      .trim()
      .toLowerCase()
  );
}

/*
 * Mengecek apakah isi [...] benar-benar
 * sebuah chord.
 *
 * Contoh valid:
 *
 * G
 * Gm
 * G7
 * Gmaj7
 * C#m
 * F#m7
 * Asus4
 * Cadd9
 * G/B
 * D/F#
 *
 * Contoh invalid:
 *
 * Chorus
 * Intro
 * Verse 1
 */

function isValidChord(
  value: string
) {
  const chord =
    value.trim();

  if (!chord) {
    return false;
  }

  if (
    isSectionName(chord)
  ) {
    return false;
  }

  /*
   * Root + optional suffix.
   *
   * Kita sengaja cukup fleksibel supaya
   * chord custom dari database tetap bisa
   * ditampilkan.
   */

  return /^
    [A-G]
    (?:#|b)?
    (?:
      m|min|maj|sus|add|dim|aug|no
    )?
    \d*
    (?:
      [+\-]
    )?
    (?:
      [/#]
      [A-G]
      (?:#|b)?
    )?
    $
  /x.test(
    chord
  );
}

/*
 * JavaScript tidak mendukung /x regex flag.
 * Jadi versi runtime-nya dibuat di bawah.
 */

function isChord(value: string) {
  const chord =
    value.trim();

  if (!chord) {
    return false;
  }

  if (
    isSectionName(chord)
  ) {
    return false;
  }

  return /^[A-G](?:#|b)?(?:(?:m|min|maj|sus|add|dim|aug|no)\d*(?:[+\-])?(?:\/[A-G](?:#|b)?)?)?$/.test(
    chord
  );
}

/* =========================================================
   NOTE NORMALIZATION
========================================================= */

function normalizeRoot(
  root: string
) {
  return (
    FLAT_TO_SHARP[root] ||
    root
  );
}

/* =========================================================
   TRANSPOSE SINGLE NOTE
========================================================= */

function transposeNote(
  note: string,
  amount: number
) {
  const normalized =
    normalizeRoot(note);

  const index =
    SHARP_KEYS.indexOf(
      normalized
    );

  if (index === -1) {
    return note;
  }

  const newIndex =
    (index + amount + 120) %
    12;

  return SHARP_KEYS[
    newIndex
  ];
}

/* =========================================================
   TRANSPOSE CHORD
========================================================= */

function transposeChord(
  chord: string,
  amount: number
) {
  if (!amount) {
    return chord;
  }

  const match =
    chord.match(
      /^([A-G](?:#|b)?)(.*)$/
    );

  if (!match) {
    return chord;
  }

  const root =
    match[1];

  const suffix =
    match[2];

  /*
   * Handle slash chord.
   *
   * G/B
   *
   * menjadi:
   *
   * A/C#
   */

  const slashMatch =
    suffix.match(
      /^(.*)\/([A-G](?:#|b)?)$/
    );

  if (slashMatch) {
    const chordSuffix =
      slashMatch[1];

    const bass =
      slashMatch[2];

    return (
      transposeNote(
        root,
        amount
      ) +
      chordSuffix +
      "/" +
      transposeNote(
        bass,
        amount
      )
    );
  }

  return (
    transposeNote(
      root,
      amount
    ) + suffix
  );
}

/* =========================================================
   TRANSPOSE FULL LYRIC STRING
========================================================= */

function transposeLyrics(
  text: string,
  amount: number
) {
  if (!amount) {
    return text;
  }

  return text.replace(
    /\[([^\]]+)\]/g,
    (
      full,
      content: string
    ) => {
      const value =
        content.trim();

      if (
        !isChord(value)
      ) {
        return full;
      }

      return `[${transposeChord(
        value,
        amount
      )}]`;
    }
  );
}

/* =========================================================
   PARSER
========================================================= */

/*
 * Input Firebase:
 *
 * [Intro]
 *
 * [G][C][G][C]
 *
 * [Verse 1]
 *
 * [G]I wanna be your[C] day
 *
 * Output:
 *
 * section
 * line
 * progression
 * etc.
 */

function parseChordLyrics(
  text: string
): ParsedLine[] {
  const lines =
    text
      .replace(
        /\r\n/g,
        "\n"
      )
      .replace(
        /\r/g,
        "\n"
      )
      .split("\n");

  const result: ParsedLine[] =
    [];

  for (
    const rawLine of lines
  ) {
    const line =
      rawLine;

    /*
     * Empty line.
     */

    if (
      line.trim() === ""
    ) {
      result.push({
        type: "line",
        lyrics: "",
        chords: [],
      });

      continue;
    }

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

    if (
      sectionMatch
    ) {
      const title =
        sectionMatch[1].trim();

      /*
       * Semua standalone [....]
       * dianggap section.
       */

      result.push({
        type: "section",
        title,
      });

      continue;
    }

    let lyrics = "";

    const chords: ChordPosition[] =
      [];

    let index = 0;

    while (
      index < line.length
    ) {
      /*
       * Cari bracket.
       */

      if (
        line[index] === "["
      ) {
        const close =
          line.indexOf(
            "]",
            index + 1
          );

        if (
          close !== -1
        ) {
          const content =
            line.slice(
              index + 1,
              close
            );

          if (
            isChord(content)
          ) {
            chords.push({
              chord:
                content.trim(),
              position:
                lyrics.length,
            });

            index =
              close + 1;

            continue;
          }
        }
      }

      /*
       * Karakter biasa.
       */

      lyrics +=
        line[index];

      index++;
    }

    /*
     * Jika ternyata tidak ada chord
     * dan isinya adalah section-like marker,
     * tetap aman.
     */

    result.push({
      type: "line",
      lyrics,
      chords,
    });
  }

  return result;
}

/* =========================================================
   CHORD PROGRESSION
========================================================= */

function ChordProgression({
  chords,
}: {
  chords: ChordPosition[];
}) {
  if (!chords.length) {
    return null;
  }

  return (
    <div
      className="
        flex
        max-w-full
        flex-wrap
        gap-2
      "
    >
      {chords.map(
        (
          item,
          index
        ) => (
          <span
            key={`${item.chord}-${index}`}
            className="
              flex
              h-11
              min-w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-amber-400/15
              bg-amber-400/[0.055]
              px-3
              font-mono
              text-sm
              font-bold
              text-amber-400
              transition
              duration-200
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
   RESPONSIVE CHORD + LYRIC LINE
========================================================= */

/*
 * Ini bagian terpenting.
 *
 * Kita TIDAK memakai:
 *
 * w-max
 * min-width panjang
 * overflow-x-auto
 *
 * karena itu menyebabkan horizontal scrolling.
 *
 * Sebaliknya setiap chord + potongan lirik
 * menjadi sebuah segment yang bisa wrap.
 */

function ChordLyricLine({
  chords,
  lyrics,
}: {
  chords: ChordPosition[];
  lyrics: string;
}) {
  /*
   * Tidak ada chord.
   */

  if (!chords.length) {
    return (
      <div
        className="
          w-full
          min-w-0
          whitespace-pre-wrap
          break-words
          font-mono
          leading-[1.8]
          tracking-normal
          text-zinc-200
        "
      >
        {lyrics || "\u00A0"}
      </div>
    );
  }

  /*
   * Pastikan chord tersusun berdasarkan
   * posisi aslinya.
   */

  const sortedChords =
    [...chords].sort(
      (a, b) =>
        a.position -
        b.position
    );

  type Segment = {
    chord: string;
    text: string;
  };

  const segments: Segment[] =
    [];

  /*
   * Text sebelum chord pertama.
   */

  const first =
    sortedChords[0];

  if (
    first.position > 0
  ) {
    segments.push({
      chord: "",
      text: lyrics.slice(
        0,
        first.position
      ),
    });
  }

  /*
   * Setiap chord menjadi segment.
   */

  for (
    let i = 0;
    i <
    sortedChords.length;
    i++
  ) {
    const current =
      sortedChords[i];

    const next =
      sortedChords[i + 1];

    const start =
      Math.max(
        0,
        current.position
      );

    const end =
      next
        ? Math.max(
            start,
            next.position
          )
        : lyrics.length;

    segments.push({
      chord:
        current.chord,
      text: lyrics.slice(
        start,
        end
      ),
    });
  }

  return (
    <div
      className="
        w-full
        min-w-0
        font-mono
        leading-[1.8]
      "
    >
      <div
        className="
          flex
          w-full
          min-w-0
          flex-wrap
          items-end
        "
      >
        {segments.map(
          (
            segment,
            index
          ) => (
            <span
              key={`${segment.chord}-${index}`}
              className="
                inline-flex
                min-w-0
                max-w-full
                flex-col
                align-bottom
              "
            >
              {segment.chord && (
                <span
                  className="
                    mb-0.5
                    whitespace-nowrap
                    font-mono
                    text-[0.78em]
                    font-bold
                    leading-[1.3]
                    text-amber-400
                  "
                >
                  {
                    segment.chord
                  }
                </span>
              )}

              <span
                className="
                  min-w-0
                  max-w-full
                  whitespace-pre-wrap
                  break-words
                  text-zinc-200
                "
              >
                {segment.text ||
                  "\u00A0"}
              </span>
            </span>
          )
        )}
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
    <div
      className="
        mb-6
        mt-11
        first:mt-0
      "
    >
      <span
        className="
          inline-flex
          items-center
          rounded-xl
          border
          border-amber-400/15
          bg-amber-400/[0.055]
          px-4
          py-2.5
          font-mono
          text-xs
          font-bold
          uppercase
          tracking-[0.12em]
          text-amber-400
          shadow-[0_0_30px_rgba(251,191,36,0.03)]
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
        shadow-[0_20px_70px_rgba(0,0,0,0.15)]
        sm:p-6
      "
    >
      <div className="mb-4">
        <p
          className="
            text-[10px]
            font-bold
            uppercase
            tracking-[0.3em]
            text-zinc-500
          "
        >
          Chords
        </p>

        <p
          className="
            mt-1
            text-xs
            text-zinc-600
          "
        >
          {chords.length} chord
          {chords.length !==
          1
            ? "s"
            : ""}
        </p>
      </div>

      <div
        className="
          flex
          max-w-full
          flex-wrap
          gap-2
        "
      >
        {chords.map(
          (
            chord,
            index
          ) => (
            <span
              key={`${chord}-${index}`}
              className="
                rounded-xl
                border
                border-amber-400/10
                bg-[#050505]
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
   MAIN SONG VIEWER
========================================================= */

export default function SongViewer({
  song,
}: {
  song: Song;
}) {
  /* =======================================================
     STATE
  ====================================================== */

  const [shift, setShift] =
    useState(0);

  const [fontSize, setFontSize] =
    useState(17);

  const [autoScroll, setAutoScroll] =
    useState(false);

  const [scrollSpeed, setScrollSpeed] =
    useState(2);

  const scrollContainerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const animationRef =
    useRef<number | null>(
      null
    );

  /* =======================================================
     SOURCE DATA
  ====================================================== */

  const rawLyrics =
    song.lyricsWithChords ||
    "";

  /* =======================================================
     TRANSPOSED LYRICS
  ====================================================== */

  const transposedLyrics =
    useMemo(
      () =>
        transposeLyrics(
          rawLyrics,
          shift
        ),
      [
        rawLyrics,
        shift,
      ]
    );

  /* =======================================================
     PARSED LYRICS
  ====================================================== */

  const parsedLines =
    useMemo(
      () =>
        parseChordLyrics(
          transposedLyrics
        ),
      [
        transposedLyrics,
      ]
    );

  /* =======================================================
     DETECT CHORDS FROM LYRICS
  ====================================================== */

  const detectedChords =
    useMemo(() => {
      const result: string[] =
        [];

      for (
        const line of parsedLines
      ) {
        if (
          line.type !==
          "line"
        ) {
          continue;
        }

        for (
          const chord of line.chords
        ) {
          if (
            !result.includes(
              chord.chord
            )
          ) {
            result.push(
              chord.chord
            );
          }
        }
      }

      return result;
    }, [parsedLines]);

  /* =======================================================
     DISPLAYED CHORD LIST
  ====================================================== */

  const displayedChords =
    useMemo(() => {
      const result: string[] =
        [];

      const firebaseChords =
        Array.isArray(
          song.uniqueChords
        )
          ? song.uniqueChords
          : [];

      for (
        const chord of [
          ...firebaseChords,
          ...detectedChords,
        ]
      ) {
        const value =
          String(
            chord ?? ""
          ).trim();

        if (!value) {
          continue;
        }

        /*
         * Section names tidak boleh
         * masuk daftar chord.
         */

        if (
          isSectionName(value)
        ) {
          continue;
        }

        /*
         * Pastikan hanya chord valid.
         */

        if (
          !isChord(value)
        ) {
          continue;
        }

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
     TRANSPOSE LABEL
  ====================================================== */

  const displayedKey =
    song.originalKey
      ? transposeChord(
          song.originalKey,
          shift
        )
      : null;

  /* =======================================================
     AUTO SCROLL
  ====================================================== */

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

    let lastTime =
      performance.now();

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
      ] ?? 16;

    const tick = (
      currentTime: number
    ) => {
      const delta =
        currentTime -
        lastTime;

      lastTime =
        currentTime;

      const maxScroll =
        container.scrollHeight -
        container.clientHeight;

      if (
        container.scrollTop <
        maxScroll - 1
      ) {
        container.scrollTop +=
          (pixelsPerSecond *
            delta) /
          1000;

        animationRef.current =
          requestAnimationFrame(
            tick
          );
      } else {
        setAutoScroll(
          false
        );

        animationRef.current =
          null;
      }
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
  ====================================================== */

  function resetScroll() {
    setAutoScroll(
      false
    );

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
     FONT CONTROLS
  ====================================================== */

  function decreaseFont() {
    setFontSize(
      (current) =>
        Math.max(
          13,
          current - 1
        )
    );
  }

  function increaseFont() {
    setFontSize(
      (current) =>
        Math.min(
          28,
          current + 1
        )
    );
  }

  /* =======================================================
     RENDER
  ====================================================== */

  return (
    <main
      className="
        min-h-screen
        overflow-x-hidden
        bg-[#050505]
        text-zinc-100
      "
    >
      {/* =================================================
          TOP NAVIGATION
      ================================================= */}

      <header
        className="
          sticky
          top-0
          z-50
          border-b
          border-zinc-800/80
          bg-[#050505]/90
          backdrop-blur-2xl
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

          <div
            className="
              flex
              items-center
              gap-1.5
              sm:gap-2
            "
          >
            {/* TRANSPOSE DOWN */}

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
                hover:text-white
                active:scale-95
              "
              aria-label="Transpose down"
            >
              −
            </button>

            {/* TRANSPOSE VALUE */}

            <span
              className="
                flex
                min-w-[32px]
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

            {/* TRANSPOSE UP */}

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
                hover:text-white
                active:scale-95
              "
              aria-label="Transpose up"
            >
              +
            </button>

            {/* FONT SMALL */}

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
                hover:text-white
                active:scale-95
              "
              aria-label="Decrease text size"
            >
              A−
            </button>

            {/* FONT LARGE */}

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
                hover:text-white
                active:scale-95
              "
              aria-label="Increase text size"
            >
              A+
            </button>
          </div>
        </div>
      </header>

      {/* =================================================
          SONG HEADER
      ================================================= */}

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
              shadow-[0_30px_100px_rgba(0,0,0,0.45)]
            "
          >
            {song.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={
                  song.coverImageUrl
                }
                alt={`${song.title} cover`}
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
                  tracking-[0.2em]
                  text-zinc-700
                "
              >
                NO COVER
              </div>
            )}
          </div>

          {/* INFORMATION */}

          <div className="min-w-0">
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
                break-words
                text-4xl
                font-black
                tracking-[-0.045em]
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
                max-w-full
                flex-wrap
                gap-2
              "
            >
              {displayedKey && (
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
                  {displayedKey}
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

              {song.bpm ? (
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
              ) : null}

              {song.tuning ? (
                <span
                  className="
                    max-w-full
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
              ) : null}
            </div>

            {/* EXTERNAL LINKS */}

            <div
              className="
                mt-5
                flex
                flex-wrap
                gap-3
              "
            >
              {song.youtubeUrl ? (
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
                    active:scale-95
                  "
                >
                  YouTube
                </a>
              ) : null}

              {song.spotifyTrackUrl ? (
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
                    active:scale-95
                  "
                >
                  Spotify
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* =================================================
          CHORD SUMMARY
      ================================================= */}

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

      {/* =================================================
          AUTO SCROLL PANEL
      ================================================= */}

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
            shadow-[0_20px_70px_rgba(0,0,0,0.12)]
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
            <div>
              <p
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.3em]
                  text-zinc-500
                "
              >
                Auto Scroll
              </p>

              <p
                className="
                  mt-1
                  text-sm
                  text-zinc-400
                "
              >
                Scroll otomatis
                untuk bermain
                tanpa menyentuh
                layar.
              </p>
            </div>

            <div
              className="
                flex
                flex-wrap
                gap-2
              "
            >
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
                  active:scale-95
                  ${
                    autoScroll
                      ? "bg-amber-400 text-black"
                      : "border border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-500"
                  }
                `}
              >
                {autoScroll
                  ? "Ⅱ Pause"
                  : "▶ Play"}
              </button>

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
                  hover:text-white
                  active:scale-95
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
              <span
                className="
                  text-xs
                  font-medium
                  text-zinc-500
                "
              >
                Scroll speed
              </span>

              <span
                className="
                  rounded-md
                  bg-amber-400/10
                  px-2
                  py-1
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
              value={
                scrollSpeed
              }
              onChange={(event) =>
                setScrollSpeed(
                  Number(
                    event.target
                      .value
                  )
                )
              }
              className="
                h-1.5
                w-full
                cursor-pointer
                accent-amber-400
              "
              aria-label="Auto scroll speed"
            />

            <div
              className="
                mt-2
                flex
                justify-between
                text-[9px]
                font-bold
                uppercase
                tracking-[0.15em]
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

      {/* =================================================
          CHORD SHEET
      ================================================= */}

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
            shadow-[0_30px_100px_rgba(0,0,0,0.3)]
          "
        >
          <div
            ref={
              scrollContainerRef
            }
            className="
              max-h-[75vh]
              overflow-x-hidden
              overflow-y-auto
              overscroll-contain
              px-5
              py-8
              sm:px-9
              sm:py-10
            "
          >
            <div
              className="
                w-full
                min-w-0
              "
              style={{
                fontSize: `${fontSize}px`,
              }}
            >
              {parsedLines.map(
                (
                  line,
                  index
                ) => {
                  /*
                   * SECTION
                   */

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

                  /*
                   * CHORD-ONLY LINE
                   *
                   * [G][C][G][C]
                   */

                  if (
                    line.lyrics.trim() ===
                      "" &&
                    line.chords
                      .length > 0
                  ) {
                    return (
                      <div
                        key={`progression-${index}`}
                        className="
                          mb-8
                          max-w-full
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

                  /*
                   * EMPTY LINE
                   */

                  if (
                    line.lyrics ===
                      "" &&
                    line.chords
                      .length === 0
                  ) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="
                          h-5
                        "
                      />
                    );
                  }

                  /*
                   * NORMAL CHORD + LYRICS
                   */

                  return (
                    <div
                      key={`line-${index}`}
                      className="
                        mb-4
                        w-full
                        min-w-0
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

      {/* =================================================
          FOOTER
      ================================================= */}

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
