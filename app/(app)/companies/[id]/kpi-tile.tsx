"use client";

import type { Kpi, KpiReading } from "@/lib/supabase/types";
import { shortMonthLabel } from "@/lib/quarter";

type Props = {
  kpi: Kpi;
  quarterMonths: string[]; // ["2026-04", "2026-05", "2026-06"]
  currentMonth: string;
  readings: KpiReading[]; // for this kpi, all months
  onLogReading: (kpi: Kpi, presetMonth?: string) => void;
};

export function KpiTile({
  kpi,
  quarterMonths,
  currentMonth,
  readings,
  onLogReading,
}: Props) {
  // Map readings within the quarter by month for fast lookup.
  const readingByMonth = new Map<string, KpiReading>();
  for (const r of readings) {
    if (quarterMonths.includes(r.reading_month)) {
      readingByMonth.set(r.reading_month, r);
    }
  }

  const currentReading = readingByMonth.get(currentMonth);
  const hasCurrent = currentReading != null;

  // For the headline number, prefer the current month's reading, else fall
  // back to the latest in-quarter reading, else baseline.
  const fallback = quarterMonths
    .filter((m) => readingByMonth.has(m))
    .map((m) => readingByMonth.get(m)!)
    .pop();
  const headlineValue =
    currentReading?.value ?? fallback?.value ?? kpi.baseline ?? null;
  const baseline = kpi.baseline;
  const target = kpi.target;

  // Delta vs baseline
  let deltaText = "—";
  let deltaClass = "apollo-kpi-delta-flat";
  if (
    headlineValue != null &&
    baseline != null &&
    (hasCurrent || fallback)
  ) {
    const delta = headlineValue - baseline;
    const towardTarget =
      (kpi.direction === "higher_better" && delta > 0) ||
      (kpi.direction === "lower_better" && delta < 0);
    if (delta === 0) {
      deltaText = `no change from ${formatNumber(baseline)}${kpi.unit} baseline`;
      deltaClass = "apollo-kpi-delta-flat";
    } else {
      const arrow = delta > 0 ? "↑" : "↓";
      deltaText = `${arrow} ${formatNumber(Math.abs(delta))}${kpi.unit} from ${formatNumber(baseline)}${kpi.unit} baseline`;
      deltaClass = towardTarget
        ? "apollo-kpi-delta-good"
        : "apollo-kpi-delta-bad";
    }
  }

  return (
    <div className="apollo-kpi-card">
      <div className="apollo-kpi-label">{kpi.name}</div>

      <div className="mt-2 flex items-baseline gap-3 flex-wrap">
        {hasCurrent || fallback ? (
          <>
            <div className="apollo-kpi-value">
              {formatNumber(headlineValue)}
              {kpi.unit}
            </div>
            <div className={`apollo-kpi-delta ${deltaClass}`}>{deltaText}</div>
          </>
        ) : (
          <>
            <div className="apollo-kpi-value text-apollo-mute">—</div>
            <button
              type="button"
              onClick={() => onLogReading(kpi, currentMonth)}
              className="apollo-kpi-delta apollo-kpi-delta-bad hover:underline"
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              Log {shortMonthLabel(currentMonth)} reading
            </button>
          </>
        )}
      </div>

      {baseline != null && target != null ? (
        <div className="apollo-kpi-chart mt-2">
          <Sparkline
            baseline={baseline}
            target={target}
            quarterMonths={quarterMonths}
            readingByMonth={readingByMonth}
          />
        </div>
      ) : (
        <div className="apollo-kpi-foot mt-3">
          {baseline == null ? "No baseline set." : null}
          {target == null ? " No target set." : null}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <div className="apollo-kpi-foot">
          {target != null ? `Target ${formatNumber(target)}${kpi.unit}` : ""}
          {target != null && kpi.cadence ? " · " : ""}
          {kpi.cadence}
        </div>
        <button
          type="button"
          onClick={() => onLogReading(kpi)}
          className="font-label text-xs text-apollo-accent hover:underline"
        >
          Log reading
        </button>
      </div>
    </div>
  );
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}

function Sparkline({
  baseline,
  target,
  quarterMonths,
  readingByMonth,
}: {
  baseline: number;
  target: number;
  quarterMonths: string[];
  readingByMonth: Map<string, { value: number }>;
}) {
  const W = 600;
  const H = 100;
  const padL = 14;
  const padR = 92;
  const padT = 14;
  const padB = 18;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  // X positions: baseline at 0, then one slot per quarter month.
  const xFor = (i: number) => padL + (innerW * i) / quarterMonths.length;

  const allReadings = quarterMonths
    .map((m) => readingByMonth.get(m)?.value)
    .filter((v): v is number => v != null);
  const allVals = [baseline, target, ...allReadings];
  let yMin = Math.min(...allVals);
  let yMax = Math.max(...allVals);
  const range = yMax - yMin || 1;
  yMin -= range * 0.2;
  yMax += range * 0.2;
  const yFor = (v: number) =>
    padT + innerH * (1 - (v - yMin) / (yMax - yMin));

  const targY = yFor(target);
  const points: Array<{ x: number; y: number }> = [
    { x: xFor(0), y: yFor(baseline) },
  ];
  quarterMonths.forEach((m, idx) => {
    const v = readingByMonth.get(m)?.value;
    if (v != null) points.push({ x: xFor(idx + 1), y: yFor(v) });
  });
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`}>
      <line
        className="target"
        x1={padL}
        x2={W - padR}
        y1={targY}
        y2={targY}
      />
      <text
        x={W - padR + 8}
        y={targY + 4}
        style={{
          fill: "#1f5d3f",
          fontWeight: 600,
          fontSize: 11,
          fontFamily: "var(--font-sans)",
        }}
      >
        Target {formatNumber(target)}
      </text>
      {quarterMonths.map((m, i) => (
        <text
          key={m}
          x={xFor(i + 1)}
          y={H - 4}
          textAnchor="middle"
          style={{
            fill: "var(--apollo-mute)",
            fontSize: 10,
            fontFamily: "var(--font-sans)",
          }}
        >
          {shortMonthLabel(m)}
        </text>
      ))}
      <path className="actual" d={pathD} />
      {points.slice(1).map((p, i) => (
        <circle key={i} className="actual-pt" cx={p.x} cy={p.y} r={3.5} />
      ))}
    </svg>
  );
}
