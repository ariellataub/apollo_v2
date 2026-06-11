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

/** Validates the "YYYY-QN" shape (1 ≤ N ≤ 4). */
export function isValidQuarter(quarter: string): boolean {
  return /^\d{4}-Q[1-4]$/.test(quarter);
}

/**
 * Current quarter + the prior `count - 1` quarters, newest first.
 * Default of 9 covers backfill scenarios (current + 8 prior).
 */
export function buildRecentQuarters(
  count = 9,
  now: Date = new Date(),
): string[] {
  let year = now.getFullYear();
  let q = Math.floor(now.getMonth() / 3) + 1;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(`${year}-Q${q}`);
    q -= 1;
    if (q === 0) {
      q = 4;
      year -= 1;
    }
  }
  return out;
}

/**
 * Three YYYY-MM strings for the months in the given quarter.
 * "2026-Q2" → ["2026-04", "2026-05", "2026-06"]
 */
export function quarterMonths(quarter: string): string[] {
  const match = /^(\d{4})-Q([1-4])$/.exec(quarter);
  if (!match) return [];
  const year = Number(match[1]);
  const q = Number(match[2]);
  const startMonth = (q - 1) * 3 + 1; // Q1→1, Q2→4, Q3→7, Q4→10
  return [0, 1, 2].map((offset) => {
    const m = startMonth + offset;
    return `${year}-${m.toString().padStart(2, "0")}`;
  });
}

/** Short month label for axis ticks. "2026-04" → "Apr". */
export function shortMonthLabel(yyyyMm: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(yyyyMm);
  if (!match) return yyyyMm;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return months[Number(match[2]) - 1] ?? yyyyMm;
}

/** YYYY-MM string for a given Date (defaults to today). */
export function currentMonth(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  return `${y}-${m}`;
}

/** "Plan approved 18 Apr · 9 weeks remaining" — caption used in Execute header. */
export function planTimelineCaption(
  activatedAt: string | null,
  quarter: string,
  now: Date = new Date(),
): string {
  const approvedLabel = activatedAt
    ? new Date(activatedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;
  const match = /^(\d{4})-Q([1-4])$/.exec(quarter);
  let weeksRemaining: number | null = null;
  if (match) {
    const year = Number(match[1]);
    const q = Number(match[2]);
    const endMonth = q * 3 - 1; // last month of the quarter (0-indexed)
    const quarterEnd = new Date(year, endMonth + 1, 0); // last day of last month
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const diff = quarterEnd.getTime() - now.getTime();
    weeksRemaining = Math.max(0, Math.ceil(diff / msPerWeek));
  }
  const parts: string[] = [];
  if (approvedLabel) parts.push(`Plan approved ${approvedLabel}`);
  if (weeksRemaining !== null) {
    parts.push(
      weeksRemaining === 1
        ? "1 week remaining"
        : `${weeksRemaining} weeks remaining`,
    );
  }
  return parts.join(" · ");
}
