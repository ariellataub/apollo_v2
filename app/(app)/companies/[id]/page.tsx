import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { currentQuarter, formatQuarter } from "@/lib/quarter";
import { IntakeUploadZone } from "./intake-upload-zone";
import { IntakeDetailView } from "./intake-detail-view";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const quarter = currentQuarter();

  const [companyRes, assessmentRes] = await Promise.all([
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
      .eq("quarter", quarter)
      .maybeSingle(),
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
  const assessment = assessmentRes.data ?? null;

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

  return (
    <div>
      <div className="font-label mb-4 flex items-center gap-2 text-xs text-apollo-mute">
        <Link href="/portfolio" className="hover:text-apollo-ink">
          Portfolio
        </Link>
        <span>›</span>
        <span className="text-apollo-ink">{company.name}</span>
      </div>

      <div className="mb-8 flex items-start justify-between">
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
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base" style={{ fontWeight: 600 }}>
            Intake
          </h2>
          <span className="font-label text-xs text-apollo-mute">
            {formatQuarter(quarter)}
          </span>
        </div>

        {assessment ? (
          <IntakeDetailView
            assessment={assessment}
            companyName={company.name}
            pdfUrl={pdfUrl}
          />
        ) : (
          <IntakeUploadZone
            companyId={company.id}
            companyName={company.name}
            quarter={quarter}
          />
        )}

        <div className="mt-6 flex items-center justify-between border-t border-apollo-line-soft pt-6">
          <div className="text-xs text-apollo-mute">
            Plan generation comes in Phase 2 &mdash; once the assessment is
            confirmed.
          </div>
          <button
            type="button"
            disabled
            className="apollo-btn disabled:cursor-not-allowed disabled:opacity-50"
            title="Available in Phase 2 (after assessment is confirmed)"
          >
            Generate plan
          </button>
        </div>
      </section>
    </div>
  );
}
