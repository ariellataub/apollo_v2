"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildRecentQuarters,
  formatQuarter,
  isValidQuarter,
} from "@/lib/quarter";
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

export type UpdateQuarterResult =
  | { ok: true; quarter: string }
  | {
      ok: false;
      error: string;
      existing?: { status: AssessmentStatus; quarter: string };
    };

export async function updateAssessmentQuarterAction(
  assessmentId: string,
  newQuarter: string,
  replace: boolean,
): Promise<UpdateQuarterResult> {
  if (!isValidQuarter(newQuarter) || !buildRecentQuarters().includes(newQuarter)) {
    return { ok: false, error: `Invalid quarter "${newQuarter}".` };
  }

  const supabase = await createSupabaseServerClient();
  const { data: source, error: srcErr } = await supabase
    .from("health_assessments")
    .select("id, company_id, quarter, uploaded_pdf_path")
    .eq("id", assessmentId)
    .maybeSingle();

  if (srcErr) return { ok: false, error: srcErr.message };
  if (!source) return { ok: false, error: "Assessment not found." };

  if (newQuarter === source.quarter) {
    return { ok: true, quarter: newQuarter };
  }

  const { data: target, error: targetErr } = await supabase
    .from("health_assessments")
    .select("id, status, quarter, uploaded_pdf_path")
    .eq("company_id", source.company_id)
    .eq("quarter", newQuarter)
    .maybeSingle();

  if (targetErr) return { ok: false, error: targetErr.message };

  if (target && !replace) {
    return {
      ok: false,
      error: `An assessment already exists at ${formatQuarter(newQuarter)}.`,
      existing: { status: target.status, quarter: target.quarter },
    };
  }

  let adminSupabase;
  try {
    adminSupabase = createSupabaseAdminClient();
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Server misconfiguration: ${err.message}`
          : "Server misconfiguration",
    };
  }

  // Tear down the target row + its PDF if replacing.
  if (target && replace) {
    if (target.uploaded_pdf_path) {
      await adminSupabase.storage
        .from("assessments")
        .remove([target.uploaded_pdf_path]);
    }
    const { error: delErr } = await supabase
      .from("health_assessments")
      .delete()
      .eq("id", target.id);
    if (delErr) {
      return { ok: false, error: `Failed to clear target: ${delErr.message}` };
    }
  }

  // Move the source's PDF to the canonical new-quarter path so a future
  // upload to the OLD quarter won't overwrite this assessment's PDF.
  const newPath = `${source.company_id}/${newQuarter}/assessment.pdf`;
  let updatedPath: string | null = source.uploaded_pdf_path;
  if (source.uploaded_pdf_path && source.uploaded_pdf_path !== newPath) {
    await adminSupabase.storage.from("assessments").remove([newPath]);
    const { error: moveErr } = await adminSupabase.storage
      .from("assessments")
      .move(source.uploaded_pdf_path, newPath);
    if (moveErr) {
      return { ok: false, error: `Failed to move PDF: ${moveErr.message}` };
    }
    updatedPath = newPath;
  }

  const { error: updErr } = await supabase
    .from("health_assessments")
    .update({ quarter: newQuarter, uploaded_pdf_path: updatedPath })
    .eq("id", assessmentId);

  if (updErr) {
    return { ok: false, error: `Failed to update quarter: ${updErr.message}` };
  }

  revalidatePath(`/companies/${source.company_id}`);
  revalidatePath("/portfolio");
  return { ok: true, quarter: newQuarter };
}

export async function deleteAssessmentAction(
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
