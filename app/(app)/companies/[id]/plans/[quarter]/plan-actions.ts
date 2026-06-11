"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ClosePlanResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Mark an Active plan as Closed. DB trigger stamps closed_at. Refuses if the
 * plan isn't currently Active — Draft plans should be deleted from /edit,
 * Closed plans can't be re-closed.
 */
export async function closePlanAction(
  planId: string,
): Promise<ClosePlanResult> {
  const supabase = await createSupabaseServerClient();

  const { data: plan, error: fetchErr } = await supabase
    .from("plans")
    .select("id, company_id, quarter, status")
    .eq("id", planId)
    .maybeSingle();
  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!plan) return { ok: false, error: "Plan not found." };
  if (plan.status !== "Active") {
    return {
      ok: false,
      error: `Plan is ${plan.status}; only Active plans can be closed.`,
    };
  }

  const { error: updErr } = await supabase
    .from("plans")
    .update({ status: "Closed" })
    .eq("id", planId);
  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath(`/companies/${plan.company_id}`);
  revalidatePath(`/companies/${plan.company_id}/plans/${plan.quarter}`);
  revalidatePath("/portfolio");
  return { ok: true };
}
