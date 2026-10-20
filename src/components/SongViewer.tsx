
"use client";

import Link from "next/link";
import {
  useCallback,
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

type LyricSegment = {
  chord: string;
  text: string;
  position: number;
};

/* =========================================================
   CONSTANTS
========================================================= */

const NOTES = [
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
] as const;

const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
  Cb: "B",
  Fb: "E",
  "E#": "F",
  "B#": "C",
};

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
  "chorus 3",
  "bridge",
  "music",
  "instrumental",
  "solo",
  "outro",
  "interlude",
  "refrain",
  "ending",
  "post-chorus",
  "post chorus",
]);

const SCROLL_SPEEDS: Record<number, number> = {
  1: 8,
  2: 16,
  3: 26,
  4: 40,
  5: 60,
};

const MIN_FONT_SIZE = 13;
const MAX_FONT_SIZE = 28;
const DEFAULT_FONT_SIZE = 16;

/* =========================================================
   CHORD UTILITIES
========================================================= */

function isSectionName(value: string): boolean {
  return SECTION_NAMES.has(value.trim().toLowerCase());
}

function normalizeRoot(root: string): string {
  return FLAT_TO_SHARP[root] ?? root;
}

function isValidRoot(root: string): boolean {
  return /^(?:[A-G](?:#|b)?)$/.test(root);
}

/**
 * Accepts common chord formats:
 * C, Am, F#m7, Cmaj7, Dsus4, Cadd9, C/E, Bb/D.
 *
 * This is intentionally a practical chord parser rather than
 * a complete music-theory grammar.
 */
function isChord(value: string): boolean {
  const chord = value.trim();

  if (!chord || isSectionName(chord)) return false;

  const match = chord.match(
    /^([A-G](?:#|b)?)(?:(?:m|min|maj|M|dim|aug|sus|add|no|ø|°)?(?:\d{0,2})?(?:\([#b+\-]?\d+\))?(?:[#b+\-]\d+)?)*(?:\/([A-G](?:#|b)?))?$/
  );

  if (!match) return false;

  return !match[2] || isValidRoot(match[2]);
}

function transposeNote(note: string, amount: number): string {
  const normalized = normalizeRoot(note);
  const index = NOTES.indexOf(normalized as (typeof NOTES)[number]);

  if (index < 0) return note;

  const nextIndex = ((index + amount) % 12 + 12) % 12;

  return NOTES[nextIndex];
}

function transposeChord(chord: string, amount: number): string {
  if (!amount) return chord;

  const match = chord.match(
    /^([A-G](?:#|b)?)(.*)$/
  );

  if (!match) return chord;

  const root = match[1];
  const suffix = match[2];

  // Transpose the bass note of slash chords as well.
  const slashMatch = suffix.match(
    /^(.*)\/([A-G](?:#|b)?)$/
  );

  if (slashMatch) {
    const [, quality, bass] = slashMatch;

    return (
      transposeNote(root, amount) +
      quality +
      "/" +
      transposeNote(bass, amount)
    );
  }

  return transposeNote(root, amount) + suffix;
}

function transposeLyrics(text: string, amount: number): string {
  if (!amount) return text;

  return text.replace(/\[([^\]]+)\]/g, (full, content: string) => {
    const chord = content.trim();

    if (!isChord(chord)) return full;

    return `[${transposeChord(chord, amount)}]`;
  });
}

/* =========================================================
   SECTION PARSER
========================================================= */

function parseChordLyrics(text: string): ParsedLine[] {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const result: ParsedLine[] = [];

  for (const rawLine of normalized.split("\n")) {
    if (rawLine.trim() === "") {
      result.push({
        type: "line",
        lyrics: "",
        chords: [],
      });

      continue;
    }

    // A standalone bracketed label is a section only when
    // it is a recognized section name.
    const sectionMatch = rawLine.match(/^\s*\[([^\]]+)\]\s*$/);

    if (sectionMatch && isSectionName(sectionMatch[1])) {
      result.push({
        type: "section",
        title: sectionMatch[1].trim(),
      });

      continue;
    }

    let lyrics = "";
    let cursor = 0;

    const chords: ChordPosition[] = [];

    while (cursor < rawLine.length) {
      if (rawLine[cursor] === "[") {
        const close = rawLine.indexOf("]", cursor + 1);

        if (close !== -1) {
          const content = rawLine.slice(cursor + 1, close).trim();

          if (isChord(content)) {
            chords.push({
              chord: content,
              position: lyrics.length,
            });

            cursor = close + 1;
            continue;
          }
        }
      }

      lyrics += rawLine[cursor];
      cursor++;
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
   CHORD PROGRESSION
========================================================= */

function ChordProgression({
  chords,
}: {
  chords: ChordPosition[];
}) {
  if (!chords.length) return null;

  return (
    <div className="flex max-w-full flex-wrap gap-2">
      {chords.map((item, index) => (
        <span
          key={`${item.chord}-${index}`}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/15 bg-amber-400/[0.055] px-3 font-mono text-sm font-bold text-amber-400"
        >
          {item.chord}
        </span>
      ))}
    </div>
  );
}

/* =========================================================
   CHORD + LYRIC LINE
========================================================= */

function buildSegments(
  lyrics: string,
  chords: ChordPosition[]
): LyricSegment[] {
  const sorted = [...chords].sort(
    (a, b) => a.position - b.position
  );

  if (!sorted.length) {
    return [
      {
        chord: "",
        text: lyrics,
        position: 0,
      },
    ];
  }

  const segments: LyricSegment[] = [];

  // Preserve the lyric text before the first chord.
  if (sorted[0].position > 0) {
    segments.push({
      chord: "",
      text: lyrics.slice(0, sorted[0].position),
      position: 0,
    });
  }

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const start = Math.max(
      0,
      Math.min(current.position, lyrics.length)
    );

    const end = next
      ? Math.max(start, Math.min(next.position, lyrics.length))
      : lyrics.length;

    segments.push({
      chord: current.chord,
      text: lyrics.slice(start, end),
      position: start,
    });
  }

  return segments;
}

function ChordLyricLine({
  chords,
  lyrics,
}: {
  chords: ChordPosition[];
  lyrics: string;
}) {
  if (!chords.length) {
    return (
      <div className="w-full whitespace-pre-wrap break-words font-mono leading-[1.8] text-zinc-200">
        {lyrics || "\u00A0"}
      </div>
    );
  }

  const segments = buildSegments(lyrics, chords);

  return (
    <div className="w-full font-mono leading-[1.8]">
      <div className="flex max-w-full flex-wrap items-end">
        {segments.map((segment, index) => (
          <span
            key={`${segment.position}-${segment.chord}-${index}`}
            className="relative inline-flex min-w-0 max-w-full flex-col align-bottom"
          >
            {segment.chord ? (
              <span className="mb-0.5 block whitespace-nowrap font-mono text-[0.85em] font-bold leading-[1.3] text-amber-400">
                {segment.chord}
              </span>
            ) : (
              <span
                aria-hidden="true"
                className="mb-0.5 block select-none text-[0.85em] leading-[1.3] text-transparent"
              >
                {"\u00A0"}
              </span>
            )}

            <span className="min-w-0 whitespace-pre-wrap break-words text-zinc-200">
              {segment.text || "\u00A0"}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-5 mt-10 first:mt-0">
      <span className="inline-flex max-w-full items-center rounded-xl border border-amber-400/15 bg-amber-400/[0.055] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-amber-400">
        {title}
      </span>
    </div>
  );
}

/* =========================================================
   CHORD LIST
========================================================= */

function ChordList({ chords }: { chords: string[] }) {
  if (!chords.length) return null;

  return (
    <section className="mb-8 border-b border-zinc-900 pb-7">
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
          Chords
        </p>

        <p className="mt-1 text-xs text-zinc-600">
          {chords.length} {chords.length === 1 ? "chord" : "chords"}
        </p>
      </div>

      <div className="flex max-w-full flex-wrap gap-2">
        {chords.map((chord, index) => (
          <span
            key={`${chord}-${index}`}
            className="rounded-xl border border-amber-400/10 bg-zinc-900/60 px-3.5 py-2 font-mono text-sm font-bold text-amber-400"
          >
            {chord}
          </span>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   MAIN SONG VIEWER
========================================================= */

export default function SongViewer({ song }: { song: Song }) {
  const [shift, setShift] = useState(0);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2);

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const rawLyrics = song.lyricsWithChords || "";

  /* -------------------------------------------------------
     PARSE SOURCE LYRICS FIRST
     Prevents the chord summary from being transposed twice.
  ------------------------------------------------------- */

  const originalLines = useMemo(
    () => parseChordLyrics(rawLyrics),
    [rawLyrics]
  );

  const transposedLyrics = useMemo(
    () => transposeLyrics(rawLyrics, shift),
    [rawLyrics, shift]
  );

  const parsedLines = useMemo(
    () => parseChordLyrics(transposedLyrics),
    [transposedLyrics]
  );

  /* -------------------------------------------------------
     CHORD SUMMARY
  ------------------------------------------------------- */

  const displayedChords = useMemo(() => {
    const result: string[] = [];

    const sourceChords = Array.isArray(song.uniqueChords)
      ? song.uniqueChords
      : [];

    const detectedChords: string[] = [];

    for (const line of originalLines) {
      if (line.type !== "line") continue;

      for (const item of line.chords) {
        if (!detectedChords.includes(item.chord)) {
          detectedChords.push(item.chord);
        }
      }
    }

    for (const value of [...sourceChords, ...detectedChords]) {
      const chord = String(value ?? "").trim();

      if (!isChord(chord)) continue;

      const transposed = transposeChord(chord, shift);

      if (!result.includes(transposed)) {
        result.push(transposed);
      }
    }

    return result;
  }, [song.uniqueChords, originalLines, shift]);

  const displayedKey = useMemo(() => {
    if (!song.originalKey) return null;

    return transposeChord(song.originalKey, shift);
  }, [song.originalKey, shift]);

  /* -------------------------------------------------------
     SCROLL CONTROLS
  ------------------------------------------------------- */

  const stopAutoScroll = useCallback(() => {
    setAutoScroll(false);
    lastTimeRef.current = null;

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!autoScroll) {
      lastTimeRef.current = null;
      return;
    }

    let cancelled = false;

    const pixelsPerSecond = SCROLL_SPEEDS[scrollSpeed] ?? 16;

    const tick = (timestamp: number) => {
      if (cancelled) return;

      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      // Avoid large jumps after the browser tab resumes.
      const delta = Math.min(
        timestamp - lastTimeRef.current,
        50
      );

      lastTimeRef.current = timestamp;

      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );

      const remaining = maxScroll - window.scrollY;

      if (remaining <= 1) {
        animationRef.current = null;
        lastTimeRef.current = null;
        setAutoScroll(false);
        return;
      }

      window.scrollBy({
        top: Math.min(
          (pixelsPerSecond * delta) / 1000,
          remaining
        ),
        behavior: "instant",
      });

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      lastTimeRef.current = null;
    };
  }, [autoScroll, scrollSpeed]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        lastTimeRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, []);

  const resetScroll = useCallback(() => {
    stopAutoScroll();
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [stopAutoScroll]);

  /* -------------------------------------------------------
     FONT CONTROLS
  ------------------------------------------------------- */

  const decreaseFont = useCallback(() => {
    setFontSize((current) =>
      Math.max(MIN_FONT_SIZE, current - 1)
    );
  }, []);

  const increaseFont = useCallback(() => {
    setFontSize((current) =>
      Math.min(MAX_FONT_SIZE, current + 1)
    );
  }, []);

  const resetTranspose = useCallback(() => {
    setShift(0);
  }, []);

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  return (
    <main className="min-h-screen w-full overflow-x-clip bg-[#050505] text-zinc-100">
      {/* STICKY NAVIGATION */}

      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-[#050505]/95 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link
            href="/songs"
            className="shrink-0 rounded-lg py-2 text-sm font-medium text-zinc-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            ← Songs
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* TRANSPOSE */}

            <div
              className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1"
              aria-label="Transpose controls"
            >
              <button
                type="button"
                onClick={() => setShift((value) => value - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-zinc-300 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 active:scale-95"
                aria-label="Transpose down one semitone"
              >
                −
              </button>

              <button
                type="button"
                onClick={resetTranspose}
                className="flex min-w-10 items-center justify-center rounded-lg px-1 font-mono text-xs font-bold text-zinc-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                title="Reset transpose"
                aria-label={`Transpose ${shift} semitones. Reset`}
              >
                {shift > 0 ? `+${shift}` : shift}
              </button>

              <button
                type="button"
                onClick={() => setShift((value) => value + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-zinc-300 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 active:scale-95"
                aria-label="Transpose up one semitone"
              >
                +
              </button>
            </div>

            {/* FONT SIZE */}

            <div
              className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1"
              aria-label="Font size controls"
            >
              <button
                type="button"
                onClick={decreaseFont}
                disabled={fontSize <= MIN_FONT_SIZE}
                className="flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Decrease text size"
              >
                A−
              </button>

              <span
                className="flex min-w-7 justify-center font-mono text-xs font-bold text-zinc-500"
                aria-live="polite"
                aria-label={`Font size ${fontSize} pixels`}
              >
                {fontSize}
              </span>

              <button
                type="button"
                onClick={increaseFont}
                disabled={fontSize >= MAX_FONT_SIZE}
                className="flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Increase text size"
              >
                A+
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* SONG INFORMATION */}

      <section className="mx-auto max-w-5xl px-4 pb-9 pt-8 sm:pb-10 sm:pt-12">
        <div className="grid gap-6 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-end">
          <div className="mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-[26px] bg-zinc-900 shadow-[0_30px_100px_rgba(0,0,0,0.45)] sm:mx-0 sm:max-w-none">
            {song.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={song.coverImageUrl}
                alt={`${song.title} cover`}
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-bold tracking-[0.2em] text-zinc-700">
                NO COVER
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
              {song.genre || "Song"}
            </p>

            <h1 className="mt-2 break-words text-4xl font-black tracking-[-0.045em] text-white sm:text-6xl">
              {song.title}
            </h1>

            <p className="mt-2 break-words text-lg font-medium text-zinc-400">
              {song.artist || "Unknown artist"}
            </p>

            <div className="mt-5 flex max-w-full flex-wrap gap-2">
              {displayedKey && (
                <span className="rounded-full bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                  Key {displayedKey}
                </span>
              )}

              <span className="rounded-full bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                Capo {song.capo ?? 0}
              </span>

              {song.bpm ? (
                <span className="rounded-full bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                  {song.bpm} BPM
                </span>
              ) : null}

              {song.tuning ? (
                <span className="max-w-full break-words rounded-full bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                  {song.tuning}
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {song.youtubeUrl ? (
                <a
                  href={song.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 active:scale-95"
                >
                  YouTube ↗
                </a>
              ) : null}

              {song.spotifyTrackUrl ? (
                <a
                  href={song.spotifyTrackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-bold text-zinc-200 transition hover:border-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 active:scale-95"
                >
                  Spotify ↗
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* CHORD SUMMARY */}

      <section className="mx-auto max-w-5xl px-4 pb-2">
        <ChordList chords={displayedChords} />
      </section>

      {/* AUTO SCROLL */}

      <section className="mx-auto max-w-5xl px-4 pb-8">
        <div className="rounded-[20px] border border-zinc-800 bg-zinc-900/40 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.12)] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
              Auto Scroll
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAutoScroll((value) => !value)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 active:scale-95 ${
                  autoScroll
                    ? "bg-amber-400 text-black"
                    : "border border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-500"
                }`}
                aria-pressed={autoScroll}
              >
                {autoScroll ? "Ⅱ Pause" : "▶ Play"}
              </button>

              <button
                type="button"
                onClick={resetScroll}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-zinc-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 active:scale-95"
              >
                ↺ Reset
              </button>

              <label className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-500">
                  Speed
                </span>

                <select
                  value={scrollSpeed}
                  onChange={(event) =>
                    setScrollSpeed(Number(event.target.value))
                  }
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-200 outline-none focus:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-400"
                  aria-label="Auto scroll speed"
                >
                  <option value={1}>1 - Slow</option>
                  <option value={2}>2 - Normal</option>
                  <option value={3}>3 - Fast</option>
                  <option value={4}>4 - Faster</option>
                  <option value={5}>5 - Fastest</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* LYRICS */}

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div
          className="w-full min-w-0 px-1 py-4 sm:px-4 sm:py-6"
          style={{ fontSize: `${fontSize}px` }}
        >
          {parsedLines.map((line, index) => {
            if (line.type === "section") {
              return (
                <SectionHeader
                  key={`section-${index}`}
                  title={line.title}
                />
              );
            }

            if (line.lyrics.trim() === "" && line.chords.length > 0) {
              return (
                <div
                  key={`progression-${index}`}
                  className="mb-8 max-w-full"
                >
                  <ChordProgression chords={line.chords} />
                </div>
              );
            }

            if (line.lyrics === "" && line.chords.length === 0) {
              return (
                <div
                  key={`empty-${index}`}
                  className="h-5"
                  aria-hidden="true"
                />
              );
            }

            return (
              <div
                key={`line-${index}`}
                className="mb-4 w-full min-w-0"
              >
                <ChordLyricLine
                  chords={line.chords}
                  lyrics={line.lyrics}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* FOOTER */}

      <footer className="mx-auto max-w-5xl px-4 pb-16 text-center text-xs text-zinc-700">
        {song.title}
        {song.artist ? ` · ${song.artist}` : ""}
      </footer>
    </main>
  );
}
