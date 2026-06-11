import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildRecentQuarters,
  currentQuarter,
  formatQuarter,
  isValidQuarter,
} from "@/lib/quarter";
import { derivePipelineStage } from "@/lib/pipeline-stage";
import type {
  ActionItem,
  ActionItemUpdate,
  AppUser,
  Kpi,
  KpiReading,
  Objective,
} from "@/lib/supabase/types";
import { IntakeUploadZone } from "./intake-upload-zone";
import { IntakeDetailView } from "./intake-detail-view";
import { QuarterNavigator } from "./quarter-navigator";
import { AddAssessmentButton } from "./add-assessment-button";
import { PipelineStageChip } from "./pipeline-stage-chip";
import { ExecuteView } from "./execute-view";

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ quarter?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const defaultQuarter = currentQuarter();
  const quarterOptions = buildRecentQuarters();

  const requestedQuarter =
    sp.quarter && isValidQuarter(sp.quarter) ? sp.quarter : null;

  const [companyRes, allAssessmentsRes, allPlansRes] = await Promise.all([
    supabase
      .from("companies")
      .select(
        `
        id,
        name,
        sector,
        stage,
        status,
        created_at,
        updated_at,
        lead:lead_partner_id ( full_name, email )
      `,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("health_assessments")
      .select("*")
      .eq("company_id", id)
      .order("quarter", { ascending: false }),
    supabase
      .from("plans")
      .select("*")
      .eq("company_id", id),
  ]);

  if (companyRes.error) {
    return (
      <div
        className="rounded-md border p-3 text-sm"
        style={{
          borderColor: "#ecc4c0",
          background: "#fdf3f1",
          color: "#9b2f2f",
        }}
      >
        Couldn&rsquo;t load the company: {companyRes.error.message}
      </div>
    );
  }

  if (!companyRes.data) notFound();

  const company = companyRes.data;
  const allAssessments = allAssessmentsRes.data ?? [];
  const allPlans = allPlansRes.data ?? [];
  const existingQuarters = allAssessments.map((a) => a.quarter);

  // Pick which assessment to display:
  //   - If ?quarter=X, that one (may be null if X has no row yet).
  //   - Else the most-recent quarter's assessment (allAssessments is desc).
  //   - Else null (show upload zone with current-quarter default).
  const activeQuarter =
    requestedQuarter ?? allAssessments[0]?.quarter ?? defaultQuarter;
  const assessment =
    allAssessments.find((a) => a.quarter === activeQuarter) ?? null;
  const plan = allPlans.find((p) => p.quarter === activeQuarter) ?? null;
  const stage = derivePipelineStage(assessment, plan);
  const planUrlEdit = `/companies/${company.id}/plans/${activeQuarter}/edit`;
  const planUrlView = `/companies/${company.id}/plans/${activeQuarter}`;
  const stageChipHref = stage === "Plan" ? planUrlEdit : null;

  // If we're in the Executing stage, swap to the Execute view. Load the
  // full plan tree (objectives + kpis + readings + action items + updates)
  // plus the user roster for the owner labels.
  let executeData: {
    objectives: Objective[];
    kpis: Kpi[];
    kpiReadings: KpiReading[];
    actionItems: ActionItem[];
    actionItemUpdates: ActionItemUpdate[];
    users: AppUser[];
  } | null = null;
  if (stage === "Executing" && plan && assessment) {
    const { data: objectives = [] } = await supabase
      .from("objectives")
      .select("*")
      .eq("plan_id", plan.id)
      .order("display_order", { ascending: true });
    const objectiveIds = (objectives ?? []).map((o) => o.id);
    const [kpisRes, kpiReadingsRes, actionsRes, updatesRes, usersRes] =
      await Promise.all([
        objectiveIds.length > 0
          ? supabase
              .from("kpis")
              .select("*")
              .in("objective_id", objectiveIds)
              .order("display_order", { ascending: true })
          : Promise.resolve({ data: [] as Kpi[], error: null }),
        objectiveIds.length > 0
          ? supabase
              .from("kpi_readings")
              .select("*, kpis!inner(objective_id)")
              .in("kpis.objective_id", objectiveIds)
          : Promise.resolve({ data: [] as KpiReading[], error: null }),
        objectiveIds.length > 0
          ? supabase
              .from("action_items")
              .select("*")
              .in("objective_id", objectiveIds)
              .order("display_order", { ascending: true })
          : Promise.resolve({ data: [] as ActionItem[], error: null }),
        objectiveIds.length > 0
          ? supabase
              .from("action_item_updates")
              .select("*, action_items!inner(objective_id)")
              .in("action_items.objective_id", objectiveIds)
              .order("created_at", { ascending: true })
          : Promise.resolve({ data: [] as ActionItemUpdate[], error: null }),
        supabase
          .from("users")
          .select("*")
          .order("full_name", { ascending: true }),
      ]);
    executeData = {
      objectives: (objectives ?? []) as Objective[],
      kpis: (kpisRes.data ?? []) as Kpi[],
      kpiReadings: (kpiReadingsRes.data ?? []) as KpiReading[],
      actionItems: (actionsRes.data ?? []) as ActionItem[],
      actionItemUpdates: (updatesRes.data ?? []) as ActionItemUpdate[],
      users: (usersRes.data ?? []) as AppUser[],
    };
  }

  // For the file card "View PDF" link, the bucket is private — we need a
  // signed URL valid for an hour. Cheap to regenerate on every page render.
  let pdfUrl: string | null = null;
  if (assessment?.uploaded_pdf_path) {
    const { data: signed } = await supabase.storage
      .from("assessments")
      .createSignedUrl(assessment.uploaded_pdf_path, 60 * 60);
    pdfUrl = signed?.signedUrl ?? null;
  }

  const lead = Array.isArray(company.lead)
    ? (company.lead[0] ?? null)
    : (company.lead ?? null);
  const leadName = lead?.full_name ?? lead?.email ?? null;

  // Execute view replaces everything below the breadcrumb when the plan is
  // Active. It owns its own header (with health pill + priority chip + stage
  // chip + caption inline, per the wireframe).
  if (executeData && plan && assessment) {
    return (
      <div>
        {existingQuarters.length > 1 ? (
          <div className="mb-4">
            <QuarterNavigator
              companyId={company.id}
              existingQuarters={existingQuarters}
              activeQuarter={activeQuarter}
            />
          </div>
        ) : null}
        <ExecuteView
          companyId={company.id}
          companyName={company.name}
          plan={plan}
          assessment={assessment}
          objectives={executeData.objectives}
          kpis={executeData.kpis}
          kpiReadings={executeData.kpiReadings}
          actionItems={executeData.actionItems}
          actionItemUpdates={executeData.actionItemUpdates}
          users={executeData.users}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="font-label mb-4 flex items-center gap-2 text-xs text-apollo-mute">
        <Link href="/portfolio" className="hover:text-apollo-ink">
          Portfolio
        </Link>
        <span>›</span>
        <span className="text-apollo-ink">{company.name}</span>
      </div>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1
            className="mb-3 text-2xl"
            style={{ fontWeight: 600, letterSpacing: "-0.2px" }}
          >
            {company.name}
          </h1>
          <div className="font-label text-xs uppercase tracking-wider text-apollo-mute">
            {[company.sector, company.stage, company.status]
              .filter(Boolean)
              .join(" · ")}
            {leadName ? ` · Lead: ${leadName}` : ""}
          </div>
        </div>
        <PipelineStageChip stage={stage} href={stageChipHref} />
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base" style={{ fontWeight: 600 }}>
            Intake
          </h2>
          <span className="font-label text-xs text-apollo-mute">
            {formatQuarter(activeQuarter)}
          </span>
        </div>

        {existingQuarters.length > 0 ? (
          <QuarterNavigator
            companyId={company.id}
            existingQuarters={existingQuarters}
            activeQuarter={activeQuarter}
          />
        ) : null}

        {assessment ? (
          <>
            <IntakeDetailView
              assessment={assessment}
              companyId={company.id}
              companyName={company.name}
              pdfUrl={pdfUrl}
              quarterOptions={quarterOptions}
            />
            <AddAssessmentButton
              companyId={company.id}
              companyName={company.name}
              defaultQuarter={defaultQuarter}
              quarterOptions={quarterOptions}
            />
          </>
        ) : (
          <IntakeUploadZone
            companyId={company.id}
            companyName={company.name}
            defaultQuarter={activeQuarter}
            quarterOptions={quarterOptions}
          />
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-apollo-line-soft pt-6">
          <div className="text-xs text-apollo-mute">
            {stage === "Intake"
              ? "Confirm the assessment to start building the plan."
              : stage === "Plan"
                ? "Draft a plan manually for now. AI generation lands in Phase 3."
                : stage === "Review"
                  ? "Draft plan in progress — continue editing or activate when ready."
                  : stage === "Executing"
                    ? plan?.activated_at
                      ? `Plan activated ${new Date(plan.activated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`
                      : "Plan is active."
                    : plan?.closed_at
                      ? `Plan closed ${new Date(plan.closed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`
                      : "Plan is closed."}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              className="apollo-btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
              title="AI plan generation lands in Phase 3"
            >
              Generate plan
            </button>
            {stage === "Plan" ? (
              <Link href={planUrlEdit} className="apollo-btn">
                Build plan
              </Link>
            ) : stage === "Review" ? (
              <Link href={planUrlEdit} className="apollo-btn">
                Continue plan
              </Link>
            ) : stage === "Executing" || stage === "Closed" ? (
              <Link href={planUrlView} className="apollo-btn">
                View plan
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="apollo-btn disabled:cursor-not-allowed disabled:opacity-50"
                title="Confirm the assessment first"
              >
                Build plan
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
