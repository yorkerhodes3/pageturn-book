export function normalizeBookFontScale(value: number): number {
  const finite = Number.isFinite(value) ? value : 1;
  return Number(
    (Math.round(Math.min(1.3, Math.max(0.8, finite)) * 10) / 10).toFixed(1),
  );
}

export function readBookFontScale(bookId: string, fallback: number): number {
  try {
    const stored = globalThis.localStorage.getItem(
      `ethical-tech-book-font:${bookId}`,
    );
    return stored === null
      ? fallback
      : normalizeBookFontScale(Number(stored));
  } catch (error) {
    console.warn("Book text size preference could not be read", error);
    return fallback;
  }
}

export function writeBookFontScale(bookId: string, value: number): void {
  try {
    globalThis.localStorage.setItem(
      `ethical-tech-book-font:${bookId}`,
      String(value),
    );
  } catch (error) {
    console.warn("Book text size preference could not be saved", error);
  }
}
