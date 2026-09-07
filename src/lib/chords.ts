const ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const aliases: Record<string, string> = {
  Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#"
};

export function transposeChord(chord: string, semitones: number): string {
  const match = chord.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!match) return chord;
  const root = aliases[match[1]] ?? match[1];
  const index = ROOTS.indexOf(root);
  if (index < 0) return chord;
  return ROOTS[(index + semitones % 12 + 12) % 12] + match[2];
}

export function transposeText(text: string, semitones: number): string {
  // Chords are expected to be enclosed in [Chord], preserving all lyrics text.
  return text.replace(/\[([A-G](?:#|b)?[^\\]\n]*)\]/g, (_, chord) => `[${transposeChord(chord, semitones)}]`);
}

export function renderChordLines(text: string): Array<{type: "text"|"chord"; value: string}[]> {
  return text.split(/\r?\n/).map(line => {
    const parts: Array<{type: "text"|"chord"; value: string}> = [];
    let last = 0;
    const re = /\[([A-G](?:#|b)?[^\\]\n]*)\]/g;
    let m;
    while ((m = re.exec(line))) {
      if (m.index > last) parts.push({type: "text", value: line.slice(last, m.index)});
      parts.push({type: "chord", value: m[1]});
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push({type: "text", value: line.slice(last)});
    return parts.length ? parts : [{type: "text", value: line}];
  });
}
