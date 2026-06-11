import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidQuarter } from "@/lib/quarter";
import type {
  ActionItem,
  AppUser,
  HealthAssessment,
  Kpi,
  Objective,
  Plan,
} from "@/lib/supabase/types";
import { objectivesToDrafts } from "./types";
import { PlanBuilderShell } from "./plan-builder-shell";

export default async function PlanBuilderPage({
  params,
}: {
  params: Promise<{ id: string; quarter: string }>;
}) {
  const { id: companyId, quarter } = await params;

  if (!isValidQuarter(quarter)) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [companyRes, assessmentRes, planRes, usersRes] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, sector, stage, status")
      .eq("id", companyId)
      .maybeSingle(),
    supabase
      .from("health_assessments")
      .select("*")
      .eq("company_id", companyId)
      .eq("quarter", quarter)
      .maybeSingle(),
    supabase
      .from("plans")
      .select("*")
      .eq("company_id", companyId)
      .eq("quarter", quarter)
      .maybeSingle(),
    supabase
      .from("users")
      .select("id, email, full_name, created_at, updated_at")
      .order("full_name", { ascending: true }),
  ]);

  if (companyRes.error || !companyRes.data) notFound();
  const company = companyRes.data;
  const assessment = assessmentRes.data as HealthAssessment | null;
  const existingPlan = planRes.data as Plan | null;
  const users = (usersRes.data ?? []) as AppUser[];

  // Gating: you can only build a plan against a Confirmed assessment.
  if (!assessment || assessment.status !== "Confirmed") {
    redirect(`/companies/${companyId}?quarter=${quarter}`);
  }

  // Auto-create a Draft plan on first visit. If a plan already exists,
  // route by status: Draft → continue editing; Active/Closed → bounce to
  // the read-only view (Step 5) — for now, back to the company page.
  let plan: Plan;
  if (!existingPlan) {
    const { data: inserted, error: insErr } = await supabase
      .from("plans")
      .insert({
        company_id: companyId,
        assessment_id: assessment.id,
        quarter,
        status: "Draft",
        created_by: user.id,
      })
      .select("*")
      .single();
    if (insErr || !inserted) {
      return (
        <div className="rounded-md border p-3 text-sm"
             style={{ borderColor: "#ecc4c0", background: "#fdf3f1", color: "#9b2f2f" }}>
          Couldn&rsquo;t create plan: {insErr?.message ?? "unknown error"}
        </div>
      );
    }
    plan = inserted as Plan;
  } else if (existingPlan.status !== "Draft") {
    redirect(`/companies/${companyId}?quarter=${quarter}`);
  } else {
    plan = existingPlan;
  }

  // Load the plan tree (objectives → kpis + action_items)
  const { data: objectives } = await supabase
    .from("objectives")
    .select("*")
    .eq("plan_id", plan.id)
    .order("display_order", { ascending: true });

  const objectiveIds = (objectives ?? []).map((o) => o.id);

  const [kpisRes, actionsRes] = await Promise.all([
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
  ]);

  const kpisByObjective = new Map<string, Kpi[]>();
  for (const k of (kpisRes.data ?? []) as Kpi[]) {
    const arr = kpisByObjective.get(k.objective_id) ?? [];
    arr.push(k);
    kpisByObjective.set(k.objective_id, arr);
  }
  const actionsByObjective = new Map<string, ActionItem[]>();
  for (const a of (actionsRes.data ?? []) as ActionItem[]) {
    const arr = actionsByObjective.get(a.objective_id) ?? [];
    arr.push(a);
    actionsByObjective.set(a.objective_id, arr);
  }

  const initialObjectives = objectivesToDrafts(
    (objectives ?? []) as Objective[],
    kpisByObjective,
    actionsByObjective,
  );

  return (
    <PlanBuilderShell
      companyId={company.id}
      companyName={company.name}
      quarter={quarter}
      plan={plan}
      assessment={assessment}
      users={users}
      initialDraft={{
        narrative_summary: plan.narrative_summary ?? "",
        objectives: initialObjectives,
      }}
    />
  );
}
