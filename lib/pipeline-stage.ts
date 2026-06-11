import type { HealthAssessment, Plan } from "@/lib/supabase/types";

export type PipelineStage =
  | "Intake"
  | "Plan"
  | "Review"
  | "Executing"
  | "Closed";

/**
 * Derives the five-stage pipeline status from the (assessment, plan) pair for
 * a single quarter. Spec §2: Intake → Plan → Review → Execute → Close.
 */
export function derivePipelineStage(
  assessment: HealthAssessment | null,
  plan: Pick<Plan, "status"> | null,
): PipelineStage {
  if (!assessment || assessment.status !== "Confirmed") return "Intake";
  if (!plan) return "Plan";
  if (plan.status === "Draft") return "Review";
  if (plan.status === "Active") return "Executing";
  return "Closed";
}
