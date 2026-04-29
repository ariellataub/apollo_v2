"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompanyStatus } from "@/lib/supabase/types";

export type CompanyFormState = { error: string | null; ok?: boolean } | null;

const VALID_STATUS: CompanyStatus[] = ["Active", "Watch", "Exited"];

// Canonicalize a user-entered domain so the column stores comparable values
// across rows (downstream Snowflake / dedupe / lookups stay simple).
// "  Https://WWW.Acme.com/about?x=1 " → "acme.com"
function normalizeDomain(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const stripped = trimmed
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0]
    .split("#")[0]
    .replace(/\.$/, "");
  return stripped || null;
}

function parseFormData(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const domain = normalizeDomain(String(formData.get("domain") ?? ""));
  const sector = String(formData.get("sector") ?? "").trim() || null;
  const stage = String(formData.get("stage") ?? "").trim() || null;
  const leadId = String(formData.get("lead_partner_id") ?? "").trim() || null;
  const statusRaw = String(formData.get("status") ?? "Active");
  const status = (VALID_STATUS as string[]).includes(statusRaw)
    ? (statusRaw as CompanyStatus)
    : "Active";
  return { name, domain, sector, stage, lead_partner_id: leadId, status };
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
