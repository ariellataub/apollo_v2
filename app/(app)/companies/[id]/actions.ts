"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AssessmentPriority,
  AssessmentStatus,
  PillarFinding,
  PillarSlug,
} from "@/lib/supabase/types";

const VALID_PRIORITY: AssessmentPriority[] = [
  "Critical",
  "High",
  "Standard",
  "Light-touch",
];

const VALID_PILLAR_SLUGS: PillarSlug[] = [
  "strategy",
  "sales-execution",
  "pipeline-generation",
  "people-org",
  "operational-infrastructure",
  "partnerships-alliances",
  "customer-success",
];

export type AssessmentActionState = {
  error: string | null;
  ok?: boolean;
} | null;

type ParsedFields = {
  health_score: number | null;
  priority: AssessmentPriority | null;
  going_well: string;
  needs_improvement: string;
  how_greenfield_supports: string;
  team_requests: string;
  pillar_tags: PillarFinding[];
};

function parseAssessmentForm(
  formData: FormData,
): { ok: true; fields: ParsedFields } | { ok: false; error: string } {
  const healthScoreRaw = formData.get("health_score");
  const priorityRaw = String(formData.get("priority") ?? "");
  const going_well = String(formData.get("going_well") ?? "");
  const needs_improvement = String(formData.get("needs_improvement") ?? "");
  const how_greenfield_supports = String(
    formData.get("how_greenfield_supports") ?? "",
  );
  const team_requests = String(formData.get("team_requests") ?? "");
  const pillarTagsRaw = String(formData.get("pillar_tags") ?? "[]");

  let pillar_tags: PillarFinding[];
  try {
    const parsed = JSON.parse(pillarTagsRaw);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    for (const tag of parsed) {
      if (
        typeof tag !== "object" ||
        tag === null ||
        typeof tag.finding !== "string" ||
        typeof tag.pillar_slug !== "string" ||
        !VALID_PILLAR_SLUGS.includes(tag.pillar_slug as PillarSlug)
      ) {
        throw new Error("malformed entry");
      }
    }
    pillar_tags = parsed as PillarFinding[];
  } catch {
    return {
      ok: false,
      error: "Pillar tags are not a valid array of {finding, pillar_slug}.",
    };
  }

  let health_score: number | null = null;
  if (healthScoreRaw && String(healthScoreRaw).trim() !== "") {
    const n = Number(healthScoreRaw);
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      return { ok: false, error: "Health score must be an integer 1-10." };
    }
    health_score = n;
  }

  let priority: AssessmentPriority | null = null;
  if (priorityRaw) {
    if (!VALID_PRIORITY.includes(priorityRaw as AssessmentPriority)) {
      return { ok: false, error: "Invalid priority." };
    }
    priority = priorityRaw as AssessmentPriority;
  }

  return {
    ok: true,
    fields: {
      health_score,
      priority,
      going_well,
      needs_improvement,
      how_greenfield_supports,
      team_requests,
      pillar_tags,
    },
  };
}

async function applyAssessmentUpdate(
  assessmentId: string,
  fields: ParsedFields,
  status: AssessmentStatus | null,
): Promise<{ error: string | null; companyId?: string }> {
  const supabase = await createSupabaseServerClient();
  const updatePayload: ParsedFields & { status?: AssessmentStatus } = {
    ...fields,
  };
  if (status) updatePayload.status = status;

  const { data, error } = await supabase
    .from("health_assessments")
    .update(updatePayload)
    .eq("id", assessmentId)
    .select("company_id")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/companies/${data.company_id}`);
  revalidatePath("/portfolio");
  return { error: null, companyId: data.company_id };
}

export async function updateAssessmentAction(
  assessmentId: string,
  _prev: AssessmentActionState,
  formData: FormData,
): Promise<AssessmentActionState> {
  const parsed = parseAssessmentForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const result = await applyAssessmentUpdate(assessmentId, parsed.fields, null);
  if (result.error) return { error: result.error };
  return { error: null, ok: true };
}

export async function confirmAssessmentAction(
  assessmentId: string,
  _prev: AssessmentActionState,
  formData: FormData,
): Promise<AssessmentActionState> {
  const parsed = parseAssessmentForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const result = await applyAssessmentUpdate(
    assessmentId,
    parsed.fields,
    "Confirmed",
  );
  if (result.error) return { error: result.error };
  return { error: null, ok: true };
}

export async function revertAssessmentAction(
  assessmentId: string,
  _formData?: FormData,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("health_assessments")
    .update({ status: "Draft" })
    .eq("id", assessmentId)
    .select("company_id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${data.company_id}`);
  revalidatePath("/portfolio");
}

export async function replaceAssessmentAction(
  assessmentId: string,
  _formData?: FormData,
) {
  const supabase = await createSupabaseServerClient();

  const { data: assessment, error: fetchErr } = await supabase
    .from("health_assessments")
    .select("id, company_id, uploaded_pdf_path")
    .eq("id", assessmentId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!assessment) throw new Error("Assessment not found.");

  if (assessment.uploaded_pdf_path) {
    await supabase.storage
      .from("assessments")
      .remove([assessment.uploaded_pdf_path]);
  }

  const { error: deleteErr } = await supabase
    .from("health_assessments")
    .delete()
    .eq("id", assessmentId);

  if (deleteErr) throw new Error(deleteErr.message);

  revalidatePath(`/companies/${assessment.company_id}`);
  revalidatePath("/portfolio");
}
