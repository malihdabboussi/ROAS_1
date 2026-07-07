export function revealByChar(
  text: string,
  frame: number,
  startFrame: number,
  framesPerChar: number,
): string {
  const t = Math.max(0, frame - startFrame);
  const n = Math.min(text.length, Math.floor(t / framesPerChar));
  return text.slice(0, n);
}

export function revealByWord(
  text: string,
  frame: number,
  startFrame: number,
  framesPerWord: number,
): string {
  const t = Math.max(0, frame - startFrame);
  const w = Math.floor(t / framesPerWord);
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '';
  }
  const n = Math.min(words.length, Math.max(0, w));
  return words.slice(0, n).join(' ');
}
