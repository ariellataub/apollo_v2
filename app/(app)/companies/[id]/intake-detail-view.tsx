"use client";

import { Fragment, useState, useActionState, useTransition } from "react";
import { Edit3, ExternalLink, FileText, Plus, Trash2, X } from "lucide-react";
import type {
  AssessmentMetric,
  AssessmentPriority,
  HealthAssessment,
  PillarFinding,
  PillarSlug,
} from "@/lib/supabase/types";
import { formatQuarter } from "@/lib/quarter";
import {
  confirmAssessmentAction,
  deleteAssessmentAction,
  revertAssessmentAction,
  updateAssessmentAction,
  type AssessmentActionState,
} from "./actions";
import { EditQuarterControl } from "./edit-quarter-control";

const PILLAR_NAMES: Record<PillarSlug, string> = {
  strategy: "Market Strategy",
  "sales-execution": "Sales Execution",
  "pipeline-generation": "Pipeline Generation",
  "people-org": "People & Organization",
  "operational-infrastructure": "Operational Infrastructure",
  "partnerships-alliances": "Partnerships & Alliances",
  "customer-success": "Customer Success",
};

const ALL_PILLAR_SLUGS: PillarSlug[] = [
  "strategy",
  "sales-execution",
  "pipeline-generation",
  "people-org",
  "operational-infrastructure",
  "partnerships-alliances",
  "customer-success",
];

const PRIORITY_OPTIONS: AssessmentPriority[] = [
  "Critical",
  "High",
  "Standard",
  "Light-touch",
];

type Props = {
  assessment: HealthAssessment;
  companyId: string;
  companyName: string;
  pdfUrl: string | null;
  quarterOptions: string[];
};

export function IntakeDetailView(props: Props) {
  if (props.assessment.status === "Draft") {
    return <DraftView {...props} />;
  }
  return <ConfirmedView {...props} />;
}

// =====================================================================
// Draft view — editable form with Save / Save & Confirm / Replace
// =====================================================================

function DraftView({ assessment, companyId, pdfUrl, quarterOptions }: Props) {
  const [pillarTags, setPillarTags] = useState<PillarFinding[]>(
    assessment.pillar_tags ?? [],
  );

  const wrappedAction = async (
    prev: AssessmentActionState,
    formData: FormData,
  ): Promise<AssessmentActionState> => {
    const intent = String(formData.get("intent") ?? "save");
    if (intent === "confirm") {
      return confirmAssessmentAction(assessment.id, prev, formData);
    }
    return updateAssessmentAction(assessment.id, prev, formData);
  };

  const [state, formAction, isPending] = useActionState<
    AssessmentActionState,
    FormData
  >(wrappedAction, null);

  return (
    <>
      <form action={formAction}>
        <input
          type="hidden"
          name="pillar_tags"
          value={JSON.stringify(pillarTags)}
        />

        <div className="mb-6 grid gap-6 md:grid-cols-3">
          {/* Left column */}
          <div className="space-y-4 md:col-span-1">
            <FileCard assessment={assessment} pdfUrl={pdfUrl} />
            <HealthPriorityCard
              assessment={assessment}
              companyId={companyId}
              quarterOptions={quarterOptions}
              mode="edit"
            />
          </div>

          {/* Right column — narratives */}
          <div className="space-y-4 md:col-span-2">
            <NarrativeBucket
              label="What's going well"
              name="going_well"
              value={assessment.going_well ?? ""}
              mode="edit"
            />
            <NarrativeBucket
              label="Needs improvement"
              name="needs_improvement"
              value={assessment.needs_improvement ?? ""}
              mode="edit"
            />
            <NarrativeBucket
              label="How can Greenfield help"
              name="how_greenfield_supports"
              value={assessment.how_greenfield_supports ?? ""}
              mode="edit"
            />
            <NarrativeBucket
              label="Team input requests"
              name="team_requests"
              value={assessment.team_requests ?? ""}
              mode="edit"
            />
          </div>
        </div>

        <PillarFindingsEditor
          findings={pillarTags}
          onChange={setPillarTags}
        />

        <MetricsTable metrics={assessment.metrics ?? []} />

        {/* Banner */}
        {state?.error ? (
          <div
            className="mt-6 rounded-md border p-3 text-sm"
            style={{
              borderColor: "#ecc4c0",
              background: "#fdf3f1",
              color: "#9b2f2f",
            }}
          >
            {state.error}
          </div>
        ) : null}
        {state?.ok && !state?.error ? (
          <div
            className="mt-6 rounded-md border p-3 text-sm"
            style={{
              borderColor: "#d6e6dc",
              background: "#eaf2ed",
              color: "#1f5d3f",
            }}
          >
            Saved.
          </div>
        ) : null}

        {/* Action row */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-apollo-mute">
            <Edit3 size={13} />
            <span className="font-label">Draft &middot; not yet confirmed</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <DeleteForm assessmentId={assessment.id} />
            <ReplaceForm assessmentId={assessment.id} />
            <button
              type="submit"
              name="intent"
              value="save"
              disabled={isPending}
              className="apollo-btn-ghost disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save changes"}
            </button>
            <button
              type="submit"
              name="intent"
              value="confirm"
              disabled={isPending}
              className="apollo-btn disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Confirm extraction"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

// =====================================================================
// Confirmed view — read-only, with Edit button
// =====================================================================

function ConfirmedView({ assessment, companyId, pdfUrl, quarterOptions }: Props) {
  return (
    <>
      <div className="mb-6 grid gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-1">
          <FileCard assessment={assessment} pdfUrl={pdfUrl} />
          <HealthPriorityCard
            assessment={assessment}
            companyId={companyId}
            quarterOptions={quarterOptions}
            mode="view"
          />
        </div>

        <div className="space-y-4 md:col-span-2">
          <NarrativeBucket
            label="What's going well"
            name="going_well"
            value={assessment.going_well ?? ""}
            mode="view"
          />
          <NarrativeBucket
            label="Needs improvement"
            name="needs_improvement"
            value={assessment.needs_improvement ?? ""}
            mode="view"
          />
          <NarrativeBucket
            label="How can Greenfield help"
            name="how_greenfield_supports"
            value={assessment.how_greenfield_supports ?? ""}
            mode="view"
          />
          <NarrativeBucket
            label="Team input requests"
            name="team_requests"
            value={assessment.team_requests ?? ""}
            mode="view"
          />
        </div>
      </div>

      <PillarFindingsDisplay findings={assessment.pillar_tags ?? []} />

      <MetricsTable metrics={assessment.metrics ?? []} />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-apollo-mute">
          <FileText size={13} />
          <span className="font-label">
            Confirmed
            {assessment.completed_at
              ? ` ${new Date(assessment.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
              : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <DeleteForm assessmentId={assessment.id} />
          <ReplaceForm assessmentId={assessment.id} />
          <RevertForm assessmentId={assessment.id} />
        </div>
      </div>
    </>
  );
}

// =====================================================================
// Subcomponents
// =====================================================================

function FileCard({
  assessment,
  pdfUrl,
}: {
  assessment: HealthAssessment;
  pdfUrl: string | null;
}) {
  const created = new Date(assessment.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <div className="apollo-panel p-4">
      <div className="flex items-start gap-3">
        <FileText size={20} style={{ color: "var(--apollo-accent2)" }} />
        <div className="flex-1 min-w-0">
          <div className="text-sm" style={{ fontWeight: 600 }}>
            {formatQuarter(assessment.quarter)} assessment
          </div>
          <div className="font-label mt-1 text-xs text-apollo-mute">
            Uploaded {created}
          </div>
          {pdfUrl ? (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="font-label mt-2 inline-flex items-center gap-1 text-xs text-apollo-accent hover:underline"
            >
              View PDF <ExternalLink size={11} />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function HealthPriorityCard({
  assessment,
  companyId,
  quarterOptions,
  mode,
}: {
  assessment: HealthAssessment;
  companyId: string;
  quarterOptions: string[];
  mode: "edit" | "view";
}) {
  return (
    <div className="apollo-panel p-4">
      <div className="font-label mb-3 text-[10px] uppercase tracking-wider text-apollo-mute">
        Quarter
      </div>
      <EditQuarterControl
        assessmentId={assessment.id}
        companyId={companyId}
        currentQuarter={assessment.quarter}
        quarterOptions={quarterOptions}
      />

      <div className="font-label mt-5 mb-3 text-[10px] uppercase tracking-wider text-apollo-mute">
        Health
      </div>
      {mode === "edit" ? (
        <input
          type="number"
          name="health_score"
          min={1}
          max={10}
          step={1}
          defaultValue={assessment.health_score ?? ""}
          className="apollo-input"
          style={{ maxWidth: 80 }}
        />
      ) : (
        <div>
          {assessment.health_score != null ? (
            <span
              className={`apollo-health-pill apollo-health-${assessment.health_score}`}
            >
              {assessment.health_score}
            </span>
          ) : (
            <span className="text-apollo-mute">—</span>
          )}
        </div>
      )}

      <div
        className="font-label mt-5 mb-3 text-[10px] uppercase tracking-wider text-apollo-mute"
      >
        Priority
      </div>
      {mode === "edit" ? (
        <select
          name="priority"
          defaultValue={assessment.priority ?? ""}
          className="apollo-input"
        >
          <option value="">— None —</option>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      ) : assessment.priority ? (
        <span
          className={`apollo-chip apollo-chip-priority-${assessment.priority}`}
        >
          {assessment.priority}
        </span>
      ) : (
        <span className="text-apollo-mute">—</span>
      )}
    </div>
  );
}

function NarrativeBucket({
  label,
  name,
  value,
  mode,
}: {
  label: string;
  name: string;
  value: string;
  mode: "edit" | "view";
}) {
  return (
    <div className="apollo-panel p-4">
      <div className="font-label mb-2 text-[10px] uppercase tracking-wider text-apollo-mute">
        {label}
      </div>
      {mode === "edit" ? (
        <textarea
          name={name}
          defaultValue={value}
          rows={Math.min(10, Math.max(3, Math.ceil(value.length / 80)))}
          className="apollo-input"
          style={{ resize: "vertical", lineHeight: 1.55 }}
        />
      ) : value ? (
        <div
          className="text-sm"
          style={{ lineHeight: 1.55, whiteSpace: "pre-wrap" }}
        >
          {value}
        </div>
      ) : (
        <div className="text-sm italic text-apollo-mute">Not provided.</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Pillar findings — editor (Draft) and grouped display (Confirmed)
// ---------------------------------------------------------------------

function PillarFindingsEditor({
  findings,
  onChange,
}: {
  findings: PillarFinding[];
  onChange: (next: PillarFinding[]) => void;
}) {
  function update(index: number, patch: Partial<PillarFinding>) {
    onChange(findings.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }
  function remove(index: number) {
    onChange(findings.filter((_, i) => i !== index));
  }
  function add() {
    onChange([
      ...findings,
      { finding: "", pillar_slug: "strategy" satisfies PillarSlug },
    ]);
  }

  return (
    <div className="apollo-panel mt-6 p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <div className="text-sm" style={{ fontWeight: 600 }}>
          Pillar findings
        </div>
        <span className="font-label text-xs text-apollo-mute">
          {findings.length} {findings.length === 1 ? "finding" : "findings"}
        </span>
      </div>

      {findings.length === 0 ? (
        <div className="mb-3 text-sm italic text-apollo-mute">
          No findings tagged.
        </div>
      ) : (
        <div className="space-y-2">
          {findings.map((f, i) => (
            <div
              key={i}
              className="grid items-start gap-2"
              style={{ gridTemplateColumns: "180px 1fr 28px" }}
            >
              <select
                value={f.pillar_slug}
                onChange={(e) =>
                  update(i, { pillar_slug: e.target.value as PillarSlug })
                }
                className="apollo-input"
                style={{ height: 36 }}
              >
                {ALL_PILLAR_SLUGS.map((slug) => (
                  <option key={slug} value={slug}>
                    {PILLAR_NAMES[slug]}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={f.finding}
                onChange={(e) => update(i, { finding: e.target.value })}
                className="apollo-input"
                style={{ height: 36 }}
                placeholder="Finding"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="inline-flex h-9 w-9 items-center justify-center rounded text-apollo-mute hover:bg-apollo-panel2 hover:text-apollo-bad"
                title="Remove finding"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={add}
        className="font-label mt-3 inline-flex items-center gap-1 text-xs text-apollo-accent hover:underline"
      >
        <Plus size={12} /> Add finding
      </button>
    </div>
  );
}

function PillarFindingsDisplay({ findings }: { findings: PillarFinding[] }) {
  if (findings.length === 0) {
    return (
      <div className="apollo-panel mt-6 p-5">
        <div className="mb-3 text-sm" style={{ fontWeight: 600 }}>
          Pillar findings
        </div>
        <div className="text-sm italic text-apollo-mute">
          No findings tagged.
        </div>
      </div>
    );
  }

  // Group by pillar, preserving canonical pillar order
  const grouped: Record<PillarSlug, string[]> = {
    strategy: [],
    "sales-execution": [],
    "pipeline-generation": [],
    "people-org": [],
    "operational-infrastructure": [],
    "partnerships-alliances": [],
    "customer-success": [],
  };
  for (const f of findings) {
    if (f.pillar_slug in grouped) {
      grouped[f.pillar_slug].push(f.finding);
    }
  }

  return (
    <div className="apollo-panel mt-6 p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <div className="text-sm" style={{ fontWeight: 600 }}>
          Pillar findings
        </div>
        <span className="font-label text-xs text-apollo-mute">
          {findings.length} {findings.length === 1 ? "finding" : "findings"}
        </span>
      </div>

      <div className="space-y-5">
        {ALL_PILLAR_SLUGS.map((slug) => {
          const items = grouped[slug];
          if (items.length === 0) return null;
          return (
            <div key={slug}>
              <span
                className={`apollo-chip apollo-chip-pillar-${slug}`}
                style={{ marginBottom: 8 }}
              >
                {PILLAR_NAMES[slug]}
              </span>
              <ul
                className="mt-2 space-y-1.5 pl-4 text-sm"
                style={{ listStyleType: "disc", lineHeight: 1.55 }}
              >
                {items.map((finding, i) => (
                  <li key={i}>{finding}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Metrics table
// ---------------------------------------------------------------------

function MetricsTable({ metrics }: { metrics: AssessmentMetric[] }) {
  if (metrics.length === 0) return null;

  // Collect periods in order of first appearance
  const periods: string[] = [];
  const seen = new Set<string>();
  for (const row of metrics) {
    for (const v of row.values) {
      if (!seen.has(v.period)) {
        seen.add(v.period);
        periods.push(v.period);
      }
    }
  }

  // Group by category, preserving order
  const groups: Array<{ category: string; rows: AssessmentMetric[] }> = [];
  const groupIndex = new Map<string, number>();
  for (const row of metrics) {
    const idx = groupIndex.get(row.category);
    if (idx === undefined) {
      groupIndex.set(row.category, groups.length);
      groups.push({ category: row.category, rows: [row] });
    } else {
      groups[idx].rows.push(row);
    }
  }

  const colCount = 1 + periods.length + 1; // metric + periods + status

  return (
    <div className="apollo-panel mt-6 overflow-hidden">
      <div className="flex items-baseline justify-between p-5 pb-3">
        <div className="text-sm" style={{ fontWeight: 600 }}>
          Financial metrics
        </div>
        <span className="font-label text-xs text-apollo-mute">
          Extracted from PDF · read-only
        </span>
      </div>
      <table className="apollo-table w-full">
        <thead
          className="bg-apollo-panel2"
          style={{ borderTop: "1px solid var(--apollo-line)" }}
        >
          <tr>
            <th className="p-3 text-left">Metric</th>
            {periods.map((p) => (
              <th key={p} className="p-3 text-right">
                {p}
              </th>
            ))}
            <th className="p-3 text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <Fragment key={g.category}>
              <tr style={{ background: "var(--apollo-panel2)" }}>
                <td
                  colSpan={colCount}
                  className="font-label px-3 py-2 text-xs uppercase tracking-wider text-apollo-mute"
                  style={{ borderTop: "1px solid var(--apollo-line)" }}
                >
                  {g.category}
                </td>
              </tr>
              {g.rows.map((row) => (
                <tr
                  key={`${g.category}-${row.name}`}
                  style={{ borderTop: "1px solid var(--apollo-line-soft)" }}
                >
                  <td className="p-3">{row.name}</td>
                  {periods.map((p) => {
                    const val = row.values.find((v) => v.period === p);
                    return (
                      <td key={p} className="p-3 text-right text-apollo-mute">
                        {formatMetricValue(val?.value)}
                      </td>
                    );
                  })}
                  <td className="p-3 text-right text-apollo-mute">
                    {row.status ?? "—"}
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatMetricValue(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------
// Replace / Revert / Delete forms — small standalone forms with bound actions
// ---------------------------------------------------------------------

function ReplaceForm({ assessmentId }: { assessmentId: string }) {
  // Plain button + useTransition, not <form action={...}> — in DraftView this
  // component is rendered inside the outer save/confirm <form>, and the
  // browser flattens the nested form, redirecting the submit to the wrong
  // action.
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await deleteAssessmentAction(assessmentId);
          } catch (err) {
            console.error("Replace (delete) failed:", err);
          }
        })
      }
      className="apollo-btn-ghost disabled:cursor-not-allowed disabled:opacity-60"
      title="Delete this assessment and return to the upload state"
    >
      {isPending ? "Removing…" : "Replace PDF"}
    </button>
  );
}

function DeleteForm({ assessmentId }: { assessmentId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-md border p-1.5 pl-3"
        style={{ borderColor: "#ecc4c0", background: "#fdf3f1" }}
      >
        <span className="text-xs" style={{ color: "#9b2f2f", fontWeight: 600 }}>
          Delete this assessment?
        </span>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="apollo-btn-ghost"
          style={{ padding: "4px 10px", fontSize: 12 }}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                await deleteAssessmentAction(assessmentId);
              } catch (err) {
                console.error("Delete failed:", err);
              }
            })
          }
          className="apollo-btn"
          style={{
            padding: "4px 10px",
            fontSize: 12,
            background: "#9b2f2f",
            borderColor: "#9b2f2f",
          }}
        >
          {isPending ? "Deleting…" : "Yes, delete"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="apollo-btn-ghost"
      style={{ color: "#9b2f2f" }}
      title="Permanently delete this assessment and its PDF"
    >
      <Trash2 size={13} /> Delete
    </button>
  );
}

function RevertForm({ assessmentId }: { assessmentId: string }) {
  return (
    <form action={revertAssessmentAction.bind(null, assessmentId)}>
      <button type="submit" className="apollo-btn">
        Edit
      </button>
    </form>
  );
}

