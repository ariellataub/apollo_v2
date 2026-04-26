"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompanyStatus } from "@/lib/supabase/types";

export type CompanyFormState = { error: string | null; ok?: boolean } | null;

const VALID_STATUS: CompanyStatus[] = ["Active", "Watch", "Exited"];

function parseFormData(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const sector = String(formData.get("sector") ?? "").trim() || null;
  const stage = String(formData.get("stage") ?? "").trim() || null;
  const leadId = String(formData.get("lead_partner_id") ?? "").trim() || null;
  const statusRaw = String(formData.get("status") ?? "Active");
  const status = (VALID_STATUS as string[]).includes(statusRaw)
    ? (statusRaw as CompanyStatus)
    : "Active";
  return { name, sector, stage, lead_partner_id: leadId, status };
}

export async function addCompanyAction(
  _prev: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const fields = parseFormData(formData);
  if (!fields.name) {
    return { error: "Company name is required." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("companies").insert(fields);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/portfolio");
  revalidatePath("/settings");
  return { error: null, ok: true };
}

/**
 * Edit action factory — bind the company id with `.bind(null, id)` at the
 * call site so the form's action signature stays `(prev, formData)`.
 */
export async function editCompanyAction(
  id: string,
  _prev: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const fields = parseFormData(formData);
  if (!fields.name) {
    return { error: "Company name is required." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("companies")
    .update(fields)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/portfolio");
  revalidatePath("/settings");
  revalidatePath(`/companies/${id}`);
  redirect("/settings");
}
