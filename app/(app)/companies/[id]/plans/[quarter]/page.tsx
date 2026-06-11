import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit3 } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatQuarter, isValidQuarter } from "@/lib/quarter";
import type {
  ActionItem,
  AppUser,
  Kpi,
  Objective,
  PillarSlug,
  Plan,
} from "@/lib/supabase/types";
import {
  deriveDisplayStatus,
  formatDueShort,
  ownerLabel,
  statusChipClass,
  statusLabel,
} from "@/lib/action-item-helpers";
import { ClosePlanForm } from "./close-plan-form";

const PILLAR_NAMES: Record<PillarSlug, string> = {
  strategy: "Market Strategy",
  "sales-execution": "Sales Execution",
  "pipeline-generation": "Pipeline Generation",
  "people-org": "People & Organization",
  "operational-infrastructure": "Operational Infrastructure",
  "partnerships-alliances": "Partnerships & Alliances",
  "customer-success": "Customer Success",
};

const KPI_DIRECTION_LABEL: Record<string, string> = {
  higher_better: "Higher is better",
  lower_better: "Lower is better",
};

export default async function PlanViewPage({
  params,
}: {
  params: Promise<{ id: string; quarter: string }>;
}) {
  const { id: companyId, quarter } = await params;
  if (!isValidQuarter(quarter)) notFound();

  const supabase = await createSupabaseServerClient();

  const [companyRes, planRes] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .maybeSingle(),
    supabase
      .from("plans")
      .select("*")
      .eq("company_id", companyId)
      .eq("quarter", quarter)
      .maybeSingle(),
  ]);

  if (companyRes.error || !companyRes.data) notFound();
  if (planRes.error || !planRes.data) notFound();
  const company = companyRes.data;
  const plan = planRes.data as Plan;

  const { data: objectives } = await supabase
    .from("objectives")
    .select("*")
    .eq("plan_id", plan.id)
    .order("display_order", { ascending: true });
  const objectiveIds = (objectives ?? []).map((o) => o.id);

  const [kpisRes, actionsRes, usersRes] = await Promise.all([
    objectiveIds.length > 0
      ? supabase
          .from("kpis")
          .select("*")
          .in("objective_id", objectiveIds)
          .order("display_order", { ascending: true })
      : Promise.resolve({ data: [] as Kpi[], error: null }),
    objectiveIds.length > 0
      ? supabase
          .from("action_items")
          .select("*")
          .in("objective_id", objectiveIds)
          .order("display_order", { ascending: true })
      : Promise.resolve({ data: [] as ActionItem[], error: null }),
    supabase
      .from("users")
      .select("*")
      .order("full_name", { ascending: true }),
  ]);

  const objs = (objectives ?? []) as Objective[];
  const kpis = (kpisRes.data ?? []) as Kpi[];
  const actionItems = (actionsRes.data ?? []) as ActionItem[];
  const users = (usersRes.data ?? []) as AppUser[];

  const kpisByObjective = new Map<string, Kpi[]>();
  for (const k of kpis) {
    const arr = kpisByObjective.get(k.objective_id) ?? [];
    arr.push(k);
    kpisByObjective.set(k.objective_id, arr);
  }
  const actionsByObjective = new Map<string, ActionItem[]>();
  for (const a of actionItems) {
    const arr = actionsByObjective.get(a.objective_id) ?? [];
    arr.push(a);
    actionsByObjective.set(a.objective_id, arr);
  }
  const usersById = new Map(users.map((u) => [u.id, u]));

  return (
    <div>
      <div className="font-label mb-4 flex items-center gap-2 text-xs text-apollo-mute">
        <Link href="/portfolio" className="hover:text-apollo-ink">
          Portfolio
        </Link>
        <span>›</span>
        <Link
          href={`/companies/${companyId}`}
          className="hover:text-apollo-ink"
        >
          {company.name}
        </Link>
        <span>›</span>
        <span className="text-apollo-ink">
          {formatQuarter(plan.quarter)} plan
        </span>
      </div>

      <PlanBanner plan={plan} companyId={companyId} />

      <h1
        className="mb-2 mt-6 text-2xl"
        style={{ fontWeight: 600, letterSpacing: "-0.2px" }}
      >
        {company.name} &mdash; {formatQuarter(plan.quarter)} plan
      </h1>

      <section className="apollo-panel mb-6 p-4">
        <div className="font-label mb-2 text-[10px] uppercase tracking-wider text-apollo-mute">
          Narrative summary
        </div>
        {plan.narrative_summary ? (
          <div
            className="text-sm"
            style={{ lineHeight: 1.55, whiteSpace: "pre-wrap" }}
          >
            {plan.narrative_summary}
          </div>
        ) : (
          <div className="text-sm italic text-apollo-mute">Not provided.</div>
        )}
      </section>

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base" style={{ fontWeight: 600 }}>
          Objectives
        </h2>
        <span className="font-label text-xs text-apollo-mute">
          {objs.length} {objs.length === 1 ? "objective" : "objectives"}
        </span>
      </div>

      {objs.length === 0 ? (
        <div className="apollo-panel p-6 text-center text-sm italic text-apollo-mute">
          No objectives on this plan.
        </div>
      ) : (
        <div className="space-y-3">
          {objs.map((o, i) => (
            <ObjectiveDisplay
              key={o.id}
              objective={o}
              index={i}
              kpis={kpisByObjective.get(o.id) ?? []}
              actionItems={actionsByObjective.get(o.id) ?? []}
              usersById={usersById}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Banner (status-aware, with Edit / Close affordances)
// ---------------------------------------------------------------------

function PlanBanner({ plan, companyId }: { plan: Plan; companyId: string }) {
  const editUrl = `/companies/${companyId}/plans/${plan.quarter}/edit`;
  let label = "";
  let dateLine: string | null = null;
  let bg = "var(--apollo-panel2)";
  let borderColor = "var(--apollo-line)";
  let textColor = "var(--apollo-ink)";

  if (plan.status === "Draft") {
    label = "Draft plan";
    dateLine = plan.created_at
      ? `Created ${formatDate(plan.created_at)}`
      : null;
  } else if (plan.status === "Active") {
    label = "Active plan";
    dateLine = plan.activated_at
      ? `Approved ${formatDate(plan.activated_at)}`
      : null;
    bg = "#eaf2ed";
    borderColor = "#d6e6dc";
    textColor = "#1f5d3f";
  } else {
    label = "Closed plan";
    dateLine = plan.closed_at ? `Closed ${formatDate(plan.closed_at)}` : null;
    bg = "#f0eee8";
    borderColor = "#e6e2da";
    textColor = "#5a554c";
  }

  return (
    <div
      className="rounded-md border p-3"
      style={{ background: bg, borderColor }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span
            className="text-sm"
            style={{ fontWeight: 600, color: textColor }}
          >
            {label}
          </span>
          {dateLine ? (
            <span className="font-label text-xs" style={{ color: textColor, opacity: 0.85 }}>
              · {dateLine}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {plan.status === "Draft" ? (
            <Link href={editUrl} className="apollo-btn-ghost">
              <Edit3 size={13} /> Edit
            </Link>
          ) : null}
          {plan.status === "Active" ? <ClosePlanForm planId={plan.id} /> : null}
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------
// Objective display (server-rendered)
// ---------------------------------------------------------------------

function ObjectiveDisplay({
  objective,
  index,
  kpis,
  actionItems,
  usersById,
}: {
  objective: Objective;
  index: number;
  kpis: Kpi[];
  actionItems: ActionItem[];
  usersById: Map<string, AppUser>;
}) {
  return (
    <div className="apollo-panel p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className="font-label text-[10px] uppercase tracking-wider text-apollo-mute"
          style={{ minWidth: 56 }}
        >
          Objective {index + 1}
        </span>
        <span className={`apollo-chip apollo-chip-pillar-${objective.pillar_slug}`}>
          {PILLAR_NAMES[objective.pillar_slug] ?? objective.pillar_slug}
        </span>
        <span className="text-sm" style={{ fontWeight: 600 }}>
          {objective.title}
        </span>
      </div>

      {objective.rationale ? (
        <div className="mb-4 text-sm" style={{ lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
          {objective.rationale}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <div className="font-label mb-2 text-[10px] uppercase tracking-wider text-apollo-mute">
            KPIs
          </div>
          {kpis.length === 0 ? (
            <div className="text-xs italic text-apollo-mute">No KPIs.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {kpis.map((k) => (
                <li
                  key={k.id}
                  className="apollo-panel-2 rounded-md p-3"
                  style={{ borderColor: "var(--apollo-line-soft)" }}
                >
                  <div style={{ fontWeight: 600 }}>{k.name}</div>
                  <div className="font-label mt-1 text-xs text-apollo-mute">
                    Baseline {k.baseline ?? "—"}
                    {k.unit} · Target {k.target ?? "—"}
                    {k.unit} · {KPI_DIRECTION_LABEL[k.direction] ?? k.direction} · {k.cadence}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="font-label mb-2 text-[10px] uppercase tracking-wider text-apollo-mute">
            Action items
          </div>
          {actionItems.length === 0 ? (
            <div className="text-xs italic text-apollo-mute">No action items.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {actionItems.map((a) => {
                const status = deriveDisplayStatus(a);
                return (
                  <li
                    key={a.id}
                    className="apollo-panel-2 rounded-md p-3"
                    style={{ borderColor: "var(--apollo-line-soft)" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div style={{ fontWeight: 600 }}>{a.title}</div>
                      <span className={statusChipClass(status)}>
                        {statusLabel(status)}
                      </span>
                    </div>
                    <div className="font-label mt-1 text-xs text-apollo-mute">
                      {ownerLabel(a, usersById)}
                      {a.due_date ? ` · Due ${formatDueShort(a.due_date)}` : ""}
                    </div>
                    {a.description ? (
                      <div
                        className="mt-1 text-xs text-apollo-mute"
                        style={{ lineHeight: 1.5, whiteSpace: "pre-wrap" }}
                      >
                        {a.description}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
