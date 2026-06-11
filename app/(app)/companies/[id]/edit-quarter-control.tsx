"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Edit3 } from "lucide-react";
import { formatQuarter } from "@/lib/quarter";
import { updateAssessmentQuarterAction } from "./actions";

type Props = {
  assessmentId: string;
  companyId: string;
  currentQuarter: string;
  quarterOptions: string[];
};

type Conflict = { status: "Draft" | "Confirmed"; quarter: string };

export function EditQuarterControl({
  assessmentId,
  companyId,
  currentQuarter,
  quarterOptions,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string>(currentQuarter);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [isPending, startTransition] = useTransition();

  function cancel() {
    setEditing(false);
    setSelected(currentQuarter);
    setError(null);
    setConflict(null);
  }

  function save(replace: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await updateAssessmentQuarterAction(
        assessmentId,
        selected,
        replace,
      );
      if (!result.ok) {
        if (result.existing) {
          setConflict(result.existing);
        } else {
          setError(result.error);
        }
        return;
      }
      router.replace(`/companies/${companyId}?quarter=${result.quarter}`);
      setEditing(false);
      setConflict(null);
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="apollo-chip apollo-chip-quarter">
          {formatQuarter(currentQuarter)}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="font-label inline-flex items-center gap-1 text-xs text-apollo-accent hover:underline"
        >
          <Edit3 size={11} /> Edit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <select
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          setConflict(null);
          setError(null);
        }}
        disabled={isPending}
        className="apollo-input"
        style={{ width: "auto", minWidth: 140, height: 32, padding: "2px 8px" }}
      >
        {quarterOptions.map((q) => (
          <option key={q} value={q}>
            {formatQuarter(q)}
          </option>
        ))}
      </select>

      {conflict ? (
        <div
          className="rounded-md border p-2 text-xs"
          style={{
            borderColor: "#e5d4a8",
            background: "#fbf6e8",
            color: "#5a3c14",
          }}
        >
          <div className="flex items-start gap-1.5">
            <AlertTriangle
              size={12}
              style={{ marginTop: 2, flexShrink: 0, color: "#8c4f1c" }}
            />
            <div>
              <div style={{ fontWeight: 600 }}>
                An assessment already exists at {formatQuarter(conflict.quarter)} ({conflict.status}).
              </div>
              <div className="mt-1" style={{ color: "#7a5520" }}>
                Replacing will delete it and move this assessment in its place.
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={cancel}
                  disabled={isPending}
                  className="apollo-btn-ghost"
                  style={{ padding: "3px 9px", fontSize: 12 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => save(true)}
                  disabled={isPending}
                  className="apollo-btn"
                  style={{ padding: "3px 9px", fontSize: 12 }}
                >
                  {isPending ? "Replacing…" : "Replace it"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={cancel}
            disabled={isPending}
            className="apollo-btn-ghost"
            style={{ padding: "3px 9px", fontSize: 12 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => save(false)}
            disabled={isPending || selected === currentQuarter}
            className="apollo-btn"
            style={{ padding: "3px 9px", fontSize: 12 }}
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      )}

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
    </div>
  );
}
