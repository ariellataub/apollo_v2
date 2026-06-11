"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type {
  AppUser,
  HealthAssessment,
  Plan,
} from "@/lib/supabase/types";
import { formatQuarter } from "@/lib/quarter";
import { AssessmentContextPanel } from "./assessment-context-panel";
import { ObjectiveCard } from "./objective-card";
import {
  emptyObjective,
  type ObjectiveDraft,
  type PlanDraft,
} from "./types";
import {
  activatePlanAction,
  savePlanDraftAction,
  type PlanActionResult,
} from "./actions";

type Props = {
  companyId: string;
  companyName: string;
  quarter: string;
  plan: Plan;
  assessment: HealthAssessment;
  users: AppUser[];
  initialDraft: PlanDraft;
};

export function PlanBuilderShell({
  companyId,
  companyName,
  quarter,
  plan,
  assessment,
  users,
  initialDraft,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<PlanDraft>(initialDraft);
  const [savedSnapshot, setSavedSnapshot] = useState<string>(
    JSON.stringify(initialDraft),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== savedSnapshot,
    [draft, savedSnapshot],
  );

  function updateObjective(clientId: string, patch: Partial<ObjectiveDraft>) {
    setDraft((d) => ({
      ...d,
      objectives: d.objectives.map((o) =>
        o._clientId === clientId ? { ...o, ...patch } : o,
      ),
    }));
  }

  function removeObjective(clientId: string) {
    setDraft((d) => ({
      ...d,
      objectives: d.objectives.filter((o) => o._clientId !== clientId),
    }));
  }

  function addObjective() {
    setDraft((d) => ({
      ...d,
      objectives: [...d.objectives, emptyObjective()],
    }));
  }

  function handleResult(result: PlanActionResult, refreshAfter: boolean) {
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setSavedSnapshot(JSON.stringify(draft));
    if (refreshAfter) {
      // Approve & activate → bounce to the company page (Execute view in Step 4)
      router.replace(`/companies/${companyId}?quarter=${quarter}`);
    } else {
      router.refresh();
    }
  }

  function onSaveDraft() {
    setError(null);
    startTransition(async () => {
      const result = await savePlanDraftAction(plan.id, draft);
      handleResult(result, false);
    });
  }

  function onActivate() {
    setError(null);
    startTransition(async () => {
      const result = await activatePlanAction(plan.id, draft);
      handleResult(result, true);
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(280px,30%)_1fr]">
      <div className="md:sticky md:top-6 md:self-start max-h-[calc(100vh-3rem)] overflow-auto">
        <AssessmentContextPanel
          assessment={assessment}
          companyName={companyName}
        />
      </div>

      <div className="min-w-0">
        <div className="font-label mb-4 flex items-center gap-2 text-xs text-apollo-mute">
          <Link href={`/companies/${companyId}`} className="hover:text-apollo-ink">
            {companyName}
          </Link>
          <span>›</span>
          <span className="text-apollo-ink">Plan Builder</span>
        </div>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1
              className="mb-2 text-2xl"
              style={{ fontWeight: 600, letterSpacing: "-0.2px" }}
            >
              {companyName} &mdash; {formatQuarter(quarter)} plan
            </h1>
            <div className="font-label flex items-center gap-3 text-xs uppercase tracking-wider text-apollo-mute">
              <span>Draft &middot; not yet activated</span>
              {isDirty ? (
                <span style={{ color: "var(--apollo-warn)" }}>
                  &middot; Unsaved changes
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <section className="apollo-panel p-4 mb-6">
          <div className="font-label mb-2 text-[10px] uppercase tracking-wider text-apollo-mute">
            Narrative summary
          </div>
          <textarea
            value={draft.narrative_summary}
            onChange={(e) =>
              setDraft((d) => ({ ...d, narrative_summary: e.target.value }))
            }
            placeholder="The story of the quarter: what we're tackling, why, what success looks like."
            rows={4}
            className="apollo-input"
            style={{ resize: "vertical", lineHeight: 1.55 }}
          />
        </section>

        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base" style={{ fontWeight: 600 }}>
            Objectives
          </h2>
          <span className="font-label text-xs text-apollo-mute">
            {draft.objectives.length}{" "}
            {draft.objectives.length === 1 ? "objective" : "objectives"}
          </span>
        </div>

        {draft.objectives.length === 0 ? (
          <div className="apollo-panel p-6 text-center text-sm italic text-apollo-mute">
            No objectives yet. Click &ldquo;Add objective&rdquo; below to start.
          </div>
        ) : (
          <div className="space-y-3">
            {draft.objectives.map((o, i) => (
              <ObjectiveCard
                key={o._clientId}
                objective={o}
                index={i}
                users={users}
                onChange={(patch) => updateObjective(o._clientId, patch)}
                onRemove={() => removeObjective(o._clientId)}
              />
            ))}
          </div>
        )}

        <div className="mt-4">
          <button
            type="button"
            onClick={addObjective}
            className="apollo-btn-ghost"
          >
            <Plus size={14} /> Add objective
          </button>
        </div>

        {error ? (
          <div
            className="mt-6 rounded-md border p-3 text-sm"
            style={{
              borderColor: "#ecc4c0",
              background: "#fdf3f1",
              color: "#9b2f2f",
            }}
          >
            {error}
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between border-t border-apollo-line-soft pt-6">
          <Link
            href={`/companies/${companyId}?quarter=${quarter}`}
            className="font-label text-xs text-apollo-mute hover:text-apollo-ink"
          >
            ← Cancel
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isPending}
              className="apollo-btn-ghost disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              onClick={onActivate}
              disabled={isPending}
              className="apollo-btn disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Activating…" : "Approve & activate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
