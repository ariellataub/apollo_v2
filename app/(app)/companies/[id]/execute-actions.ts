"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ExecuteActionResult =
  | { ok: true }
  | { ok: false; error: string };

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Log a monthly KPI reading. Upserts on (kpi_id, reading_month) so re-logging
 * the same month overwrites the previous value (intentional — the operator
 * can correct mistakes, and we want one canonical reading per month).
 */
export async function logKpiReadingAction(
  kpiId: string,
  readingMonth: string,
  rawValue: string,
  note: string,
  companyId: string,
): Promise<ExecuteActionResult> {
  if (!MONTH_RE.test(readingMonth)) {
    return { ok: false, error: `Invalid month "${readingMonth}".` };
  }
  const value = Number(rawValue);
  if (rawValue.trim() === "" || Number.isNaN(value)) {
    return { ok: false, error: "Value must be a number." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized." };

  const { error } = await supabase.from("kpi_readings").upsert(
    {
      kpi_id: kpiId,
      reading_month: readingMonth,
      value,
      note: note.trim() || null,
      entered_by: user.id,
    },
    { onConflict: "kpi_id,reading_month" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/companies/${companyId}`);
  return { ok: true };
}

/**
 * Mark an action item Done. Flips status (DB trigger fills completed_at) and
 * writes a System event row to the activity timeline.
 */
export async function markActionItemDoneAction(
  actionItemId: string,
  companyId: string,
): Promise<ExecuteActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized." };

  // Look up the user's display name for the system event copy.
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  const authorLabel =
    profile?.full_name?.split(" ")[0] ??
    profile?.email?.split("@")[0] ??
    "Operator";
  const dateLabel = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const { error: updErr } = await supabase
    .from("action_items")
    .update({ status: "Done" })
    .eq("id", actionItemId);
  if (updErr) return { ok: false, error: updErr.message };

  const { error: evErr } = await supabase.from("action_item_updates").insert({
    action_item_id: actionItemId,
    author_id: user.id,
    source: "System",
    body: `Marked done by ${authorLabel} on ${dateLabel}`,
  });
  if (evErr) {
    console.error("[execute] Mark-done event insert failed:", evErr);
  }

  revalidatePath(`/companies/${companyId}`);
  return { ok: true };
}

/**
 * Post a manual update/comment on an action item.
 */
export async function postActionItemUpdateAction(
  actionItemId: string,
  body: string,
  companyId: string,
): Promise<ExecuteActionResult> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Comment can't be empty." };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized." };

  const { error } = await supabase.from("action_item_updates").insert({
    action_item_id: actionItemId,
    author_id: user.id,
    source: "App",
    body: trimmed,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/companies/${companyId}`);
  return { ok: true };
}
