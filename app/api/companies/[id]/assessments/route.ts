import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { extractAssessment } from "@/lib/anthropic/extract-assessment";
import { buildRecentQuarters, currentQuarter, isValidQuarter } from "@/lib/quarter";

const MAX_PDF_BYTES = 4 * 1024 * 1024; // 4 MB — matches Storage bucket cap

/**
 * Bytes → base64 using only Web-standard APIs (Cloudflare-safe).
 * Chunked to avoid call-stack overflow from spreading large arrays.
 */
function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK)),
    );
  }
  return btoa(binary);
}

/**
 * Pre-flight conflict check for the upload UI: does an assessment already
 * exist for (companyId, quarter)? Returned shape lets the client render a
 * "Replace it?" warning before sending the PDF.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: companyId } = await params;
  const quarter = req.nextUrl.searchParams.get("quarter") ?? "";
  if (!isValidQuarter(quarter)) {
    return NextResponse.json(
      { error: `Invalid quarter "${quarter}".` },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("health_assessments")
    .select("status, quarter")
    .eq("company_id", companyId)
    .eq("quarter", quarter)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) return NextResponse.json({ exists: false });
  return NextResponse.json({
    exists: true,
    status: data.status,
    quarter: data.quarter,
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    return await handlePost(req, ctx);
  } catch (err) {
    console.error("[assessments] Unhandled error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Unhandled error: ${err.message}`
            : "Unhandled error",
      },
      { status: 500 },
    );
  }
}

async function handlePost(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: companyId } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .maybeSingle();

  if (companyErr || !company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not parse upload (is it multipart/form-data?)" },
      { status: 400 },
    );
  }

  const file = formData.get("pdf");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Missing PDF file (form field "pdf")' },
      { status: 400 },
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }

  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      {
        error: `PDF must be smaller than ${MAX_PDF_BYTES / 1024 / 1024} MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB)`,
      },
      { status: 413 },
    );
  }

  const quarterRaw = String(formData.get("quarter") ?? "").trim();
  const quarter = quarterRaw || currentQuarter();
  if (!isValidQuarter(quarter) || !buildRecentQuarters().includes(quarter)) {
    return NextResponse.json(
      { error: `Invalid quarter "${quarter}".` },
      { status: 400 },
    );
  }

  const replace = String(formData.get("replace") ?? "") === "true";

  // Conflict check: if a row already exists for this (company, quarter),
  // refuse unless the caller explicitly asked to replace. Defense in depth —
  // the upload UI also pre-flights via GET and warns before posting.
  const { data: existing, error: existingErr } = await supabase
    .from("health_assessments")
    .select("id, status, quarter, uploaded_pdf_path")
    .eq("company_id", companyId)
    .eq("quarter", quarter)
    .maybeSingle();

  if (existingErr) {
    console.error("[assessments] Conflict check failed:", existingErr);
    return NextResponse.json(
      { error: `Failed to check for existing assessment: ${existingErr.message}` },
      { status: 500 },
    );
  }

  if (existing && !replace) {
    return NextResponse.json(
      {
        error: `An assessment already exists for ${company.name} ${quarter}.`,
        existing: { status: existing.status, quarter: existing.quarter },
      },
      { status: 409 },
    );
  }

  const pdfBytes = new Uint8Array(await file.arrayBuffer());
  const pdfBase64 = bytesToBase64(pdfBytes);

  // 1. Extract via Claude
  let extracted;
  try {
    extracted = await extractAssessment(pdfBase64, company.name);
  } catch (err) {
    console.error("[assessments] Claude extraction failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Extraction failed: ${err.message}`
            : "Extraction failed",
      },
      { status: 502 },
    );
  }

  // 2. Upload PDF to Storage using the admin client (service role key)
  // so RLS on storage.objects doesn't block server-side writes.
  let adminSupabase;
  try {
    adminSupabase = createSupabaseAdminClient();
  } catch (err) {
    console.error("[assessments] Admin client init failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Server misconfiguration: ${err.message}`
            : "Server misconfiguration",
      },
      { status: 500 },
    );
  }

  // If replacing, tear down the existing row + its storage file first so
  // the subsequent insert doesn't trip the (company_id, quarter) unique
  // constraint. Mirrors the existing deleteAssessmentAction semantics.
  if (existing && replace) {
    if (existing.uploaded_pdf_path) {
      await adminSupabase.storage
        .from("assessments")
        .remove([existing.uploaded_pdf_path]);
    }
    const { error: delErr } = await supabase
      .from("health_assessments")
      .delete()
      .eq("id", existing.id);
    if (delErr) {
      console.error("[assessments] Replace delete failed:", delErr);
      return NextResponse.json(
        { error: `Failed to clear existing assessment: ${delErr.message}` },
        { status: 500 },
      );
    }
  }

  const storagePath = `${companyId}/${quarter}/assessment.pdf`;
  const { error: uploadErr } = await adminSupabase.storage
    .from("assessments")
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadErr) {
    console.error("[assessments] Storage upload failed:", uploadErr);
    return NextResponse.json(
      { error: `Failed to save PDF: ${uploadErr.message}` },
      { status: 500 },
    );
  }

  // 3. Insert the new assessment row. Conflict was already checked above —
  // either none existed, or the existing row was just deleted.
  const { data: assessment, error: dbErr } = await supabase
    .from("health_assessments")
    .insert({
      company_id: companyId,
      quarter,
      assessor_id: user.id,
      uploaded_pdf_path: storagePath,
      health_score: extracted.health_score,
      priority: extracted.priority,
      going_well: extracted.going_well,
      needs_improvement: extracted.needs_improvement,
      how_greenfield_supports: extracted.how_greenfield_supports,
      team_requests: extracted.team_requests,
      pillar_tags: extracted.pillar_tags,
      metrics: extracted.metrics,
      status: "Draft",
    })
    .select()
    .single();

  if (dbErr) {
    console.error("[assessments] DB insert failed:", dbErr);
    return NextResponse.json(
      { error: `Failed to save assessment: ${dbErr.message}` },
      { status: 500 },
    );
  }

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/portfolio");

  return NextResponse.json({ assessment });
}
