"use client";

import { X } from "lucide-react";
import type { KpiCadence, KpiDirection } from "@/lib/supabase/types";
import type { KpiDraft } from "./types";

const CADENCES: KpiCadence[] = ["Weekly", "Monthly", "Quarterly"];

type Props = {
  kpi: KpiDraft;
  onChange: (patch: Partial<KpiDraft>) => void;
  onRemove: () => void;
};

export function KpiEditor({ kpi, onChange, onRemove }: Props) {
  return (
    <div
      className="apollo-panel-2 rounded-md p-3"
      style={{ borderColor: "var(--apollo-line-soft)" }}
    >
      <div className="flex items-start gap-2">
        <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_120px_120px_110px]">
          <input
            type="text"
            value={kpi.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="KPI name (e.g. Pipeline coverage)"
            className="apollo-input"
            style={{ height: 34 }}
          />
          <input
            type="text"
            value={kpi.unit}
            onChange={(e) => onChange({ unit: e.target.value })}
            placeholder="Unit"
            className="apollo-input"
            style={{ height: 34 }}
          />
          <input
            type="text"
            inputMode="decimal"
            value={kpi.baseline}
            onChange={(e) => onChange({ baseline: e.target.value })}
            placeholder="Baseline"
            className="apollo-input"
            style={{ height: 34 }}
          />
          <input
            type="text"
            inputMode="decimal"
            value={kpi.target}
            onChange={(e) => onChange({ target: e.target.value })}
            placeholder="Target"
            className="apollo-input"
            style={{ height: 34 }}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded text-apollo-mute hover:bg-apollo-panel hover:text-apollo-bad"
          title="Remove KPI"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-apollo-mute">
        <span className="font-label">Direction</span>
        <label className="inline-flex items-center gap-1.5">
          <input
            type="radio"
            name={`dir-${kpi._clientId}`}
            checked={kpi.direction === "higher_better"}
            onChange={() =>
              onChange({ direction: "higher_better" as KpiDirection })
            }
          />
          Higher is better
        </label>
        <label className="inline-flex items-center gap-1.5">
          <input
            type="radio"
            name={`dir-${kpi._clientId}`}
            checked={kpi.direction === "lower_better"}
            onChange={() =>
              onChange({ direction: "lower_better" as KpiDirection })
            }
          />
          Lower is better
        </label>

        <span className="font-label ml-2">Cadence</span>
        <select
          value={kpi.cadence}
          onChange={(e) => onChange({ cadence: e.target.value as KpiCadence })}
          className="apollo-input"
          style={{ width: "auto", height: 28, padding: "2px 8px", fontSize: 12 }}
        >
          {CADENCES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
