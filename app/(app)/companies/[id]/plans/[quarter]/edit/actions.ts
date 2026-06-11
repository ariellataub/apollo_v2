"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActionOwnerType,
  KpiCadence,
  KpiDirection,
  PillarSlug,
} from "@/lib/supabase/types";
import type { PlanDraft } from "./types";

export type PlanActionResult =
  | { ok: true; planId: string }
  | { ok: false; error: string };

const VALID_PILLARS: PillarSlug[] = [
  "strategy",
  "sales-execution",
  "pipeline-generation",
  "people-org",
  "operational-infrastructure",
  "partnerships-alliances",
  "customer-success",
];
const VALID_DIRECTIONS: KpiDirection[] = ["higher_better", "lower_better"];
const VALID_CADENCES: KpiCadence[] = ["Weekly", "Monthly", "Quarterly"];
const VALID_OWNER_TYPES: ActionOwnerType[] = ["Greenfield", "Company"];

/**
 * Save a Draft plan. Full-replace pattern: delete all existing objectives
 * for this plan (cascades KPIs + action_items), then re-insert from the
 * client's form state. Safe at Draft stage because no kpi_readings or
 * action_item_updates exist yet (those are Execute-stage rows).
 *
 * Once a plan is Active, structural saves are blocked — operators must add
 * action items individually via the Execute view or close+recreate the plan.
 */
export async function savePlanDraftAction(
  planId: string,
  draft: PlanDraft,
): Promise<PlanActionResult> {
  return persistPlan(planId, draft, false);
}

/**
 * Approve & activate: same persistence as save, then flip status → Active
 * and write a "Created on {date}" system event for every action item using
 * plan.activated_at as the date. Activated_at is set by DB trigger.
 */
export async function activatePlanAction(
  planId: string,
  draft: PlanDraft,
): Promise<PlanActionResult> {
  return persistPlan(planId, draft, true);
}

async function persistPlan(
  planId: string,
  draft: PlanDraft,
  activate: boolean,
): Promise<PlanActionResult> {
  const supabase = await createSupabaseServerClient();

  const { data: plan, error: planErr } = await supabase
    .from("plans")
    .select("id, company_id, quarter, status")
    .eq("id", planId)
    .maybeSingle();
  if (planErr) return { ok: false, error: planErr.message };
  if (!plan) return { ok: false, error: "Plan not found." };
  if (plan.status !== "Draft") {
    return {
      ok: false,
      error: `Plan is ${plan.status}; only Draft plans can be edited.`,
    };
  }

  const validation = validateDraft(draft, activate);
  if (validation) return { ok: false, error: validation };

  // Wipe existing objectives — cascades KPIs and action_items.
  const { error: delErr } = await supabase
    .from("objectives")
    .delete()
    .eq("plan_id", planId);
  if (delErr) return { ok: false, error: `Failed to clear plan: ${delErr.message}` };

  // Insert objectives, get back ids in order
  const objectivesInsert = draft.objectives.map((o, i) => ({
    plan_id: planId,
    title: o.title.trim(),
    rationale: o.rationale.trim() || null,
    pillar_slug: o.pillar_slug,
    display_order: i,
  }));

  const insertedObjectiveIds: string[] = [];
  if (objectivesInsert.length > 0) {
    const { data: insertedObjectives, error: objErr } = await supabase
      .from("objectives")
      .insert(objectivesInsert)
      .select("id");
    if (objErr) {
      return { ok: false, error: `Failed to save objectives: ${objErr.message}` };
    }
    // Postgres returns the inserted rows in input order (the order we sent).
    for (const row of insertedObjectives) insertedObjectiveIds.push(row.id);
  }

  // KPIs + action items, flattened with the new objective ids
  const kpiRows: Array<{
    objective_id: string;
    name: string;
    unit: string;
    baseline: number | null;
    target: number | null;
    direction: KpiDirection;
    cadence: KpiCadence;
    display_order: number;
  }> = [];
  const actionRows: Array<{
    objective_id: string;
    title: string;
    description: string | null;
    owner_type: ActionOwnerType;
    owner_user_id: string | null;
    owner_external_name: string | null;
    owner_external_email: string | null;
    due_date: string | null;
    display_order: number;
  }> = [];

  draft.objectives.forEach((o, oi) => {
    const objectiveId = insertedObjectiveIds[oi];
    o.kpis.forEach((k, ki) => {
      kpiRows.push({
        objective_id: objectiveId,
        name: k.name.trim(),
        unit: k.unit.trim(),
        baseline: k.baseline.trim() === "" ? null : Number(k.baseline),
        target: k.target.trim() === "" ? null : Number(k.target),
        direction: k.direction,
        cadence: k.cadence,
        display_order: ki,
      });
    });
    o.actionItems.forEach((a, ai) => {
      actionRows.push({
        objective_id: objectiveId,
        title: a.title.trim(),
        description: a.description.trim() || null,
        owner_type: a.owner_type,
        owner_user_id:
          a.owner_type === "Greenfield" ? a.owner_user_id : null,
        owner_external_name:
          a.owner_type === "Company" ? a.owner_external_name.trim() : null,
        owner_external_email:
          a.owner_type === "Company"
            ? a.owner_external_email.trim() || null
            : null,
        due_date: a.due_date || null,
        display_order: ai,
      });
    });
  });

  if (kpiRows.length > 0) {
    const { error: kpiErr } = await supabase.from("kpis").insert(kpiRows);
    if (kpiErr) {
      return { ok: false, error: `Failed to save KPIs: ${kpiErr.message}` };
    }
  }

  let insertedActionIds: string[] = [];
  if (actionRows.length > 0) {
    const { data: insertedActions, error: aiErr } = await supabase
      .from("action_items")
      .insert(actionRows)
      .select("id");
    if (aiErr) {
      return { ok: false, error: `Failed to save action items: ${aiErr.message}` };
    }
    insertedActionIds = insertedActions.map((r) => r.id);
  }

  // Update the plan-level fields. If activating, transition status here so
  // the DB trigger stamps activated_at, then read it back for the system
  // events below.
  const planUpdate: {
    narrative_summary: string | null;
    status?: "Active";
  } = {
    narrative_summary: draft.narrative_summary.trim() || null,
  };
  if (activate) planUpdate.status = "Active";

  const { data: updatedPlan, error: updErr } = await supabase
    .from("plans")
    .update(planUpdate)
    .eq("id", planId)
    .select("activated_at")
    .single();
  if (updErr) {
    return { ok: false, error: `Failed to update plan: ${updErr.message}` };
  }

  // System events on activation. One row per action item.
  if (activate && insertedActionIds.length > 0) {
    const activatedAt = updatedPlan.activated_at ?? new Date().toISOString();
    const dateLabel = new Date(activatedAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const eventRows = insertedActionIds.map((id) => ({
      action_item_id: id,
      author_id: null,
      source: "System" as const,
      body: `Created on ${dateLabel}`,
      created_at: activatedAt,
    }));
    const { error: evErr } = await supabase
      .from("action_item_updates")
      .insert(eventRows);
    if (evErr) {
      // Plan is already activated; events are nice-to-have, log and continue.
      console.error("[plans] Failed to write activation events:", evErr);
    }
  }

  revalidatePath(`/companies/${plan.company_id}`);
  revalidatePath(`/companies/${plan.company_id}/plans/${plan.quarter}/edit`);
  revalidatePath(`/companies/${plan.company_id}/plans/${plan.quarter}`);
  revalidatePath("/portfolio");

  return { ok: true, planId };
}

function validateDraft(draft: PlanDraft, strict: boolean): string | null {
  for (let i = 0; i < draft.objectives.length; i++) {
    const o = draft.objectives[i];
    if (!o.title.trim()) {
      return `Objective ${i + 1} needs a title.`;
    }
    if (!VALID_PILLARS.includes(o.pillar_slug)) {
      return `Objective ${i + 1} has an invalid pillar.`;
    }
    for (let j = 0; j < o.kpis.length; j++) {
      const k = o.kpis[j];
      if (!k.name.trim()) {
        return `KPI ${j + 1} in objective "${o.title}" needs a name.`;
      }
      if (!VALID_DIRECTIONS.includes(k.direction)) {
        return `KPI "${k.name}" has an invalid direction.`;
      }
      if (!VALID_CADENCES.includes(k.cadence)) {
        return `KPI "${k.name}" has an invalid cadence.`;
      }
      if (k.baseline.trim() && Number.isNaN(Number(k.baseline))) {
        return `KPI "${k.name}" baseline must be a number.`;
      }
      if (k.target.trim() && Number.isNaN(Number(k.target))) {
        return `KPI "${k.name}" target must be a number.`;
      }
    }
    for (let j = 0; j < o.actionItems.length; j++) {
      const a = o.actionItems[j];
      if (!a.title.trim()) {
        return `Action item ${j + 1} in objective "${o.title}" needs a title.`;
      }
      if (!VALID_OWNER_TYPES.includes(a.owner_type)) {
        return `Action item "${a.title}" has an invalid owner type.`;
      }
      if (a.owner_type === "Greenfield" && !a.owner_user_id) {
        return `Action item "${a.title}" needs a Greenfield owner.`;
      }
      if (a.owner_type === "Company" && !a.owner_external_name.trim()) {
        return `Action item "${a.title}" needs a Company owner name.`;
      }
    }
  }

  if (strict) {
    if (draft.objectives.length === 0) {
      return "Add at least one objective before activating.";
    }
  }

  return null;
}
