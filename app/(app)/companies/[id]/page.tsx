import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: company, error } = await supabase
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
    .maybeSingle();

  if (error) {
    return (
      <div
        className="rounded-md border p-3 text-sm"
        style={{
          borderColor: "#ecc4c0",
          background: "#fdf3f1",
          color: "#9b2f2f",
        }}
      >
        Couldn&rsquo;t load the company: {error.message}
      </div>
    );
  }

  if (!company) notFound();

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

      <div className="apollo-panel p-8">
        <div className="text-base" style={{ fontWeight: 600 }}>
          Company workspace
        </div>
        <p className="mt-2 max-w-xl text-sm text-apollo-mute">
          The KPI dashboard, workplan calendar, and activity timeline land in
          later phases (after Orion intake and plan generation are wired up).
          For now this is a stub so the row click works.
        </p>
      </div>
    </div>
  );
}
