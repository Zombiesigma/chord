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

const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
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
  "bridge",
  "music",
  "instrumental",
  "solo",
  "outro",
  "interlude",
]);

function isSectionName(value: string) {
  return SECTION_NAMES.has(value.trim().toLowerCase());
}

function isChord(value: string) {
  const chord = value.trim();

  if (!chord) return false;
  if (isSectionName(chord)) return false;

  return /^[A-G](?:#|b)?(?:(?:m|min|maj|sus|add|dim|aug|no)\d*(?:[+\-])?(?:\/[A-G](?:#|b)?)?)?$/.test(
    chord
  );
}

/* =========================================================
   NOTE NORMALIZATION
========================================================= */

function normalizeRoot(root: string) {
  return FLAT_TO_SHARP[root] || root;
}

/* =========================================================
   TRANSPOSE SINGLE NOTE
========================================================= */

function transposeNote(note: string, amount: number) {
  const normalized = normalizeRoot(note);
  const index = SHARP_KEYS.indexOf(normalized);

  if (index === -1) return note;

  const newIndex = (index + amount + 120) % 12;
  return SHARP_KEYS[newIndex];
}

/* =========================================================
   TRANSPOSE CHORD
========================================================= */

function transposeChord(chord: string, amount: number) {
  if (!amount) return chord;

  const match = chord.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!match) return chord;

  const root = match[1];
  const suffix = match[2];

  const slashMatch = suffix.match(/^(.*)\/([A-G](?:#|b)?)$/);
  if (slashMatch) {
    const chordSuffix = slashMatch[1];
    const bass = slashMatch[2];
    return transposeNote(root, amount) + chordSuffix + "/" + transposeNote(bass, amount);
  }

  return transposeNote(root, amount) + suffix;
}

/* =========================================================
   TRANSPOSE FULL LYRIC STRING
========================================================= */

function transposeLyrics(text: string, amount: number) {
  if (!amount) return text;

  return text.replace(/\[([^\]]+)\]/g, (full, content: string) => {
    const value = content.trim();

    if (!isChord(value)) return full;

    return `[${transposeChord(value, amount)}]`;
  });
}

/* =========================================================
   PARSER
========================================================= */

function parseChordLyrics(text: string): ParsedLine[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const result: ParsedLine[] = [];

  for (const rawLine of lines) {
    const line = rawLine;

    if (line.trim() === "") {
      result.push({ type: "line", lyrics: "", chords: [] });
      continue;
    }

    const sectionMatch = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (sectionMatch) {
      const title = sectionMatch[1].trim();
      result.push({ type: "section", title });
      continue;
    }

    let lyrics = "";
    const chords: ChordPosition[] = [];
    let index = 0;

    while (index < line.length) {
      if (line[index] === "[") {
        const close = line.indexOf("]", index + 1);
        if (close !== -1) {
          const content = line.slice(index + 1, close);
          if (isChord(content)) {
            chords.push({
              chord: content.trim(),
              position: lyrics.length,
            });
            index = close + 1;
            continue;
          }
        }
      }

      lyrics += line[index];
      index++;
    }

    result.push({ type: "line", lyrics, chords });
  }

  return result;
}

/* =========================================================
   CHORD PROGRESSION (Chord-only line)
========================================================= */

function ChordProgression({ chords }: { chords: ChordPosition[] }) {
  if (!chords.length) return null;

  return (
    <div className="flex max-w-full flex-wrap gap-2">
      {chords.map((item, index) => (
        <span
          key={`${item.chord}-${index}`}
          className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/15 bg-amber-400/[0.055] px-3 font-mono text-sm font-bold text-amber-400"
        >
          {item.chord}
        </span>
      ))}
    </div>
  );
}

/* =========================================================
   RESPONSIVE CHORD + LYRIC LINE
========================================================= */

function ChordLyricLine({
  chords,
  lyrics,
}: {
  chords: ChordPosition[];
  lyrics: string;
}) {
  if (!chords.length) {
    return (
      <div className="w-full min-w-0 whitespace-pre-wrap break-words font-mono leading-[1.8] tracking-normal text-zinc-200">
        {lyrics || "\u00A0"}
      </div>
    );
  }

  const sortedChords = [...chords].sort((a, b) => a.position - b.position);

  type Segment = {
    chord: string;
    text: string;
  };

  const segments: Segment[] = [];
  const first = sortedChords[0];

  if (first.position > 0) {
    segments.push({
      chord: "",
      text: lyrics.slice(0, first.position),
    });
  }

  for (let i = 0; i < sortedChords.length; i++) {
    const current = sortedChords[i];
    const next = sortedChords[i + 1];
    const start = Math.max(0, current.position);
    const end = next ? Math.max(start, next.position) : lyrics.length;

    segments.push({
      chord: current.chord,
      text: lyrics.slice(start, end),
    });
  }

  return (
    <div className="w-full min-w-0 font-mono leading-[1.8]">
      <div className="flex w-full min-w-0 flex-wrap items-end">
        {segments.map((segment, index) => (
          <span
            key={`${segment.chord}-${index}`}
            className="inline-flex min-w-0 max-w-full flex-col align-bottom"
          >
            {segment.chord && (
              <span className="mb-0.5 whitespace-nowrap font-mono text-[0.85em] font-bold leading-[1.3] text-amber-400">
                {segment.chord}
              </span>
            )}

            <span className="min-w-0 max-w-full whitespace-pre-wrap break-words text-zinc-200">
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
    <div className="mb-6 mt-12 first:mt-0">
      <span className="inline-flex items-center rounded-xl border border-amber-400/15 bg-amber-400/[0.055] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-amber-400">
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
          {chords.length} chord{chords.length !== 1 ? "s" : ""}
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
  /* =======================================================
     STATE
  ====================================================== */

  const [shift, setShift] = useState(0);
  const [fontSize, setFontSize] = useState(15); // ukuran default diperkecil
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2);

  const pageRef = useRef<HTMLElement | null>(null);
  const animationRef = useRef<number | null>(null);

  /* =======================================================
     SOURCE DATA
  ====================================================== */

  const rawLyrics = song.lyricsWithChords || "";

  /* =======================================================
     TRANSPOSED LYRICS
  ====================================================== */

  const transposedLyrics = useMemo(
    () => transposeLyrics(rawLyrics, shift),
    [rawLyrics, shift]
  );

  /* =======================================================
     PARSED LYRICS
  ====================================================== */

  const parsedLines = useMemo(
    () => parseChordLyrics(transposedLyrics),
    [transposedLyrics]
  );

  /* =======================================================
     DETECT CHORDS FROM LYRICS
  ====================================================== */

  const detectedChords = useMemo(() => {
    const result: string[] = [];

    for (const line of parsedLines) {
      if (line.type !== "line") continue;

      for (const chord of line.chords) {
        if (!result.includes(chord.chord)) {
          result.push(chord.chord);
        }
      }
    }

    return result;
  }, [parsedLines]);

  /* =======================================================
     DISPLAYED CHORD LIST
  ====================================================== */

  const displayedChords = useMemo(() => {
    const result: string[] = [];
    const firebaseChords = Array.isArray(song.uniqueChords) ? song.uniqueChords : [];

    for (const chord of [...firebaseChords, ...detectedChords]) {
      const value = String(chord ?? "").trim();

      if (!value) continue;
      if (isSectionName(value)) continue;
      if (!isChord(value)) continue;

      const finalChord = shift !== 0 ? transposeChord(value, shift) : value;

      if (!result.includes(finalChord)) {
        result.push(finalChord);
      }
    }

    return result;
  }, [song.uniqueChords, detectedChords, shift]);

  /* =======================================================
     TRANSPOSE LABEL
  ====================================================== */

  const displayedKey = song.originalKey ? transposeChord(song.originalKey, shift) : null;

  /* =======================================================
     AUTO SCROLL
  ====================================================== */

  useEffect(() => {
    if (!autoScroll) {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    let lastTime = performance.now();

    const speedMap: Record<number, number> = {
      1: 8,
      2: 16,
      3: 26,
      4: 40,
      5: 60,
    };

    const pixelsPerSecond = speedMap[scrollSpeed] ?? 16;

    const tick = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;

      const documentHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      const currentScroll = window.scrollY;
      const maxScroll = Math.max(0, documentHeight - viewportHeight);

      if (currentScroll < maxScroll - 1) {
        window.scrollBy({
          top: (pixelsPerSecond * delta) / 1000,
          left: 0,
        });

        animationRef.current = requestAnimationFrame(tick);
      } else {
        setAutoScroll(false);
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [autoScroll, scrollSpeed]);

  /* =======================================================
     RESET SCROLL
  ====================================================== */

  function resetScroll() {
    setAutoScroll(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* =======================================================
     FONT CONTROLS
  ====================================================== */

  function decreaseFont() {
    setFontSize((current) => Math.max(13, current - 1));
  }

  function increaseFont() {
    setFontSize((current) => Math.min(28, current + 1));
  }

  /* =======================================================
     RESET TRANSPOSE
  ====================================================== */

  function resetTranspose() {
    setShift(0);
  }

  /* =======================================================
     RENDER
  ====================================================== */

  return (
    <main
      ref={pageRef}
      className="min-h-screen w-full overflow-x-hidden bg-[#050505] text-zinc-100"
    >
      {/* =================================================
          STICKY TOP NAVIGATION
      ================================================= */}

      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-[#050505]/90 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          {/* Left: back button */}
          <Link
            href="/songs"
            className="shrink-0 text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            ← Songs
          </Link>

          {/* Right: tools */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Transpose group */}
            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
              <button
                type="button"
                onClick={() => setShift((value) => value - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-zinc-300 transition hover:bg-zinc-800 hover:text-white active:scale-95"
                aria-label="Transpose down"
              >
                −
              </button>

              <button
                type="button"
                onClick={resetTranspose}
                className="flex min-w-[36px] justify-center font-mono text-xs font-bold text-zinc-400 transition hover:text-white"
                title="Reset transpose"
              >
                {shift > 0 ? `+${shift}` : shift}
              </button>

              <button
                type="button"
                onClick={() => setShift((value) => value + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-zinc-300 transition hover:bg-zinc-800 hover:text-white active:scale-95"
                aria-label="Transpose up"
              >
                +
              </button>
            </div>

            {/* Font size group */}
            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
              <button
                type="button"
                onClick={decreaseFont}
                className="flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800 hover:text-white active:scale-95"
                aria-label="Decrease text size"
              >
                A−
              </button>

              <span className="flex min-w-[28px] justify-center font-mono text-xs font-bold text-zinc-500">
                {fontSize}
              </span>

              <button
                type="button"
                onClick={increaseFont}
                className="flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800 hover:text-white active:scale-95"
                aria-label="Increase text size"
              >
                A+
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* =================================================
          SONG HEADER
      ================================================= */}

      <section className="mx-auto max-w-5xl px-4 pb-10 pt-8 sm:pt-12">
        <div className="grid gap-7 sm:grid-cols-[180px_1fr] sm:items-end">
          {/* COVER */}
          <div className="aspect-square overflow-hidden rounded-[26px] bg-zinc-900 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
            {song.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={song.coverImageUrl}
                alt={`${song.title} cover`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-bold tracking-[0.2em] text-zinc-700">
                NO COVER
              </div>
            )}
          </div>

          {/* INFORMATION */}
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
              {song.genre || "Song"}
            </p>

            <h1 className="mt-2 break-words text-4xl font-black tracking-[-0.045em] text-white sm:text-6xl">
              {song.title}
            </h1>

            <p className="mt-2 text-lg font-medium text-zinc-400">
              {song.artist || "Unknown artist"}
            </p>

            {/* META */}
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
                <span className="max-w-full rounded-full bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                  {song.tuning}
                </span>
              ) : null}
            </div>

            {/* EXTERNAL LINKS */}
            <div className="mt-5 flex flex-wrap gap-3">
              {song.youtubeUrl ? (
                <a
                  href={song.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-zinc-200 active:scale-95"
                >
                  YouTube
                </a>
              ) : null}

              {song.spotifyTrackUrl ? (
                <a
                  href={song.spotifyTrackUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-bold text-zinc-200 transition hover:border-zinc-600 active:scale-95"
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

      <section className="mx-auto max-w-5xl px-4 pb-2">
        <ChordList chords={displayedChords} />
      </section>

      {/* =================================================
          AUTO SCROLL PANEL (lebih ringkas)
      ================================================= */}

      <section className="mx-auto max-w-5xl px-4 pb-8">
        <div className="rounded-[20px] border border-zinc-800 bg-zinc-900/40 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.12)] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                Auto Scroll
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAutoScroll((value) => !value)}
                className={`
                  rounded-xl px-4 py-2 text-sm font-bold transition active:scale-95
                  ${
                    autoScroll
                      ? "bg-amber-400 text-black"
                      : "border border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-500"
                  }
                `}
              >
                {autoScroll ? "Ⅱ Pause" : "▶ Play"}
              </button>

              <button
                type="button"
                onClick={resetScroll}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-zinc-600 hover:text-white active:scale-95"
              >
                ↺ Reset
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-500">Speed</span>
                <select
                  value={scrollSpeed}
                  onChange={(e) => setScrollSpeed(Number(e.target.value))}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-amber-400"
                  aria-label="Auto scroll speed"
                >
                  <option value={1}>1 - Slow</option>
                  <option value={2}>2 - Normal</option>
                  <option value={3}>3 - Fast</option>
                  <option value={4}>4 - Faster</option>
                  <option value={5}>5 - Fastest</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================
          LYRICS / CHORD SHEET
      ================================================= */}

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="w-full min-w-0">
          <div
            className="w-full min-w-0 px-1 py-4 sm:px-4 sm:py-6"
            style={{ fontSize: `${fontSize}px` }}
          >
            {parsedLines.map((line, index) => {
              if (line.type === "section") {
                return <SectionHeader key={`section-${index}`} title={line.title} />;
              }

              if (line.lyrics.trim() === "" && line.chords.length > 0) {
                return (
                  <div key={`progression-${index}`} className="mb-8 max-w-full">
                    <ChordProgression chords={line.chords} />
                  </div>
                );
              }

              if (line.lyrics === "" && line.chords.length === 0) {
                return <div key={`empty-${index}`} className="h-5" />;
              }

              return (
                <div key={`line-${index}`} className="mb-4 w-full min-w-0">
                  <ChordLyricLine chords={line.chords} lyrics={line.lyrics} />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="mx-auto max-w-5xl px-4 pb-16 text-center text-xs text-zinc-700">
        {song.title}
        {song.artist ? ` · ${song.artist}` : ""}
      </footer>
    </main>
  );
}
