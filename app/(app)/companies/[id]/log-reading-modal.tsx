"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { Kpi } from "@/lib/supabase/types";
import { shortMonthLabel } from "@/lib/quarter";
import { logKpiReadingAction } from "./execute-actions";

type Props = {
  kpi: Kpi;
  quarterMonths: string[];
  presetMonth?: string;
  companyId: string;
  onClose: () => void;
};

export function LogReadingModal({
  kpi,
  quarterMonths,
  presetMonth,
  companyId,
  onClose,
}: Props) {
  const router = useRouter();
  const [month, setMonth] = useState(presetMonth ?? quarterMonths[0]);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSave() {
    setError(null);
    startTransition(async () => {
      const result = await logKpiReadingAction(
        kpi.id,
        month,
        value,
        note,
        companyId,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className="apollo-modal-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="apollo-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460 }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--apollo-line)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="font-label text-xs text-apollo-mute">
                Log monthly reading
              </div>
              <h3 className="mt-1 text-lg" style={{ fontWeight: 600 }}>
                {kpi.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="apollo-btn-ghost"
              style={{ padding: "6px 8px" }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div style={{ padding: "20px 24px" }}>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="reading-month"
                className="font-label mb-1 block text-[10px] uppercase tracking-wider text-apollo-mute"
              >
                Month
              </label>
              <select
                id="reading-month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                disabled={isPending}
                className="apollo-input"
              >
                {quarterMonths.map((m) => (
                  <option key={m} value={m}>
                    {shortMonthLabel(m)} {m.slice(0, 4)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="reading-value"
                className="font-label mb-1 block text-[10px] uppercase tracking-wider text-apollo-mute"
              >
                Value{kpi.unit ? ` (${kpi.unit})` : ""}
              </label>
              <input
                id="reading-value"
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={kpi.baseline?.toString() ?? "0"}
                disabled={isPending}
                className="apollo-input"
              />
              <div className="font-label mt-1 text-[10px] text-apollo-mute">
                Baseline {kpi.baseline ?? "—"}
                {kpi.unit} · Target {kpi.target ?? "—"}
                {kpi.unit}
              </div>
            </div>

            <div>
              <label
                htmlFor="reading-note"
                className="font-label mb-1 block text-[10px] uppercase tracking-wider text-apollo-mute"
              >
                Note (optional)
              </label>
              <textarea
                id="reading-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Context for this reading"
                rows={2}
                disabled={isPending}
                className="apollo-input"
                style={{ resize: "vertical" }}
              />
            </div>

            {error ? (
              <div
                className="rounded-md border p-2 text-xs"
                style={{
                  borderColor: "#ecc4c0",
                  background: "#fdf3f1",
                  color: "#9b2f2f",
                }}
              >
                {error}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="apollo-btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={isPending || !value.trim()}
                className="apollo-btn disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Saving…" : "Save reading"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
