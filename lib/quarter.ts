/** "2026-Q2" style quarter label keyed off today's date. */
export function currentQuarter(now: Date = new Date()): string {
  const year = now.getFullYear();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `${year}-Q${q}`;
}

/** "Q2 · 2026" — display variant used in the top bar / headers. */
export function formatQuarter(quarter: string): string {
  // Accepts "2026-Q2" — returns "Q2 · 2026"
  const match = /^(\d{4})-Q([1-4])$/.exec(quarter);
  if (!match) return quarter;
  return `Q${match[2]} · ${match[1]}`;
}
