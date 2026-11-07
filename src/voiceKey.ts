// How a spoken text is cut and looked up among the recorded clips. Shared by the app (audio.ts) and
// the scripts that generate the clips (scripts/voice/), so this file stays import-free and uses only
// erasable TypeScript (it runs under Node type stripping).

/**
 * Sentences of a text: each one is spoken (or recorded) on its own. « : » and « … » stay inside a
 * sentence (« Touche le mot : avion ! », « pa… pi… yon »).
 */
export function sentences(text: string): string[] {
  const parts = text
    .match(/[^.!?]+(?:[.!?]+|$)/g)
    ?.map((p) => p.trim())
    .filter(Boolean);
  return parts?.length ? parts : [text.trim()];
}

/** Pieces of a sentence cut after each « … » (« mouton… bateau… »), for clips recorded word by word. */
export function pieces(sentence: string): string[] {
  return (
    sentence
      .match(/[^…]+…|[^…]+$/g)
      ?.map((p) => p.trim())
      .filter(Boolean) ?? [sentence]
  );
}

/** Lookup key of a sentence: same words and punctuation, whatever the case, quotes or spaces. */
export function voiceKey(sentence: string): string {
  return sentence
    .normalize('NFC')
    .replace(/[’‘]/g, "'")
    .replace(/[  \s]+/g, ' ')
    .replace(/\s+([!?:;…,.])/g, '$1')
    .trim()
    .toLowerCase();
}
