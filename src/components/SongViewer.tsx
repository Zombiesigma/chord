"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Song } from "@/types/song";
import { renderChordLines, transposeText } from "@/lib/chords";

export default function SongViewer({ song }: {song: Song}) {
  const [shift, setShift] = useState(0);
  const [font, setFont] = useState(18);
  const raw = song.lyricsWithChords || "";
  const content = useMemo(() => transposeText(raw, shift), [raw, shift]);
  const lines = useMemo(() => renderChordLines(content), [content]);

  return (
    <main className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-20 border-b border-zinc-800/90 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <Link href="/songs" className="text-sm text-zinc-400 hover:text-white">← Songs</Link>
          <div className="flex items-center gap-2">
            <button onClick={() => setShift(v => v - 1)} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">−</button>
            <span className="min-w-12 text-center text-xs text-zinc-500">{shift > 0 ? `+${shift}` : shift}</span>
            <button onClick={() => setShift(v => v + 1)} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">+</button>
            <button onClick={() => setFont(v => Math.min(26, v + 1))} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">A+</button>
            <button onClick={() => setFont(v => Math.max(14, v - 1))} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">A−</button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-10 pt-10">
        <div className="grid gap-7 sm:grid-cols-[180px_1fr]">
          <div className="aspect-square overflow-hidden rounded-2xl bg-zinc-900">
            {song.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={song.coverImageUrl} alt={song.title} className="h-full w-full object-cover" />
            ) : <div className="flex h-full items-center justify-center text-zinc-700">NO COVER</div>}
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">{song.genre || "Song"}</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">{song.title}</h1>
            <p className="mt-2 text-lg text-zinc-400">{song.artist}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-zinc-400">
              {song.originalKey && <span className="rounded-full bg-zinc-900 px-3 py-2">Key {song.originalKey}</span>}
              <span className="rounded-full bg-zinc-900 px-3 py-2">Capo {song.capo ?? 0}</span>
              {song.bpm && <span className="rounded-full bg-zinc-900 px-3 py-2">{song.bpm} BPM</span>}
              {song.tuning && <span className="rounded-full bg-zinc-900 px-3 py-2">{song.tuning}</span>}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {song.youtubeUrl && <a href={song.youtubeUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-black">YouTube</a>}
              {song.spotifyTrackUrl && <a href={song.spotifyTrackUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold">Spotify</a>}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-24">
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">Chords</p>
          <div className="flex flex-wrap gap-2">
            {(song.uniqueChords || []).map((chord, i) => (
              <span key={`${chord}-${i}`} className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-bold text-yellow-400">
                {chord}
              </span>
            ))}
          </div>
        </div>

        <article
          className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-8"
          style={{fontSize: `${font}px`, lineHeight: 1.85}}
        >
          {lines.map((line, i) => (
            <div key={i} className="min-h-[1.85em] whitespace-pre-wrap">
              {line.map((part, j) => part.type === "chord"
                ? <span key={j} className="chord">[{part.value}]</span>
                : <span key={j}>{part.value}</span>
              )}
            </div>
          ))}
        </article>
      </section>
    </main>
  );
}
