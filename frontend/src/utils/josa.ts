const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;

function hasBatchim(word: string): boolean {
  const trimmed = word.trim();
  const code = trimmed.charCodeAt(trimmed.length - 1);
  if (code < HANGUL_BASE || code > HANGUL_LAST) return false;
  return (code - HANGUL_BASE) % 28 !== 0;
}

export function josaIGa(word: string): string {
  return hasBatchim(word) ? '이' : '가';
}

export function josaEunNeun(word: string): string {
  return hasBatchim(word) ? '은' : '는';
}
