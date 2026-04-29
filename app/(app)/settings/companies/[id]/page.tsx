import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyForm } from "../../company-form";
import { editCompanyAction } from "../../actions";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [companyRes, usersRes] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, domain, sector, stage, lead_partner_id, status")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("users")
      .select("id, full_name, email")
      .order("full_name", { ascending: true, nullsFirst: false }),
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
  const users = usersRes.data ?? [];
  const leadOptions = users.map((u) => ({
    id: u.id,
    label: u.full_name?.trim() ? `${u.full_name} · ${u.email}` : u.email,
  }));

  const boundEditAction = editCompanyAction.bind(null, id);

  return (
    <div>
      <div className="font-label mb-4 flex items-center gap-2 text-xs text-apollo-mute">
        <Link href="/settings" className="hover:text-apollo-ink">
          Settings
        </Link>
        <span>›</span>
        <span className="text-apollo-ink">Edit company</span>
      </div>

      <h1
        className="mb-2 text-2xl"
        style={{ fontWeight: 600, letterSpacing: "-0.2px" }}
      >
        Edit {company.name}
      </h1>
      <p className="mb-6 text-sm text-apollo-mute">
        Changes save immediately and propagate to the Portfolio dashboard.
      </p>

      <div className="apollo-panel p-6">
        <CompanyForm
          mode="edit"
          action={boundEditAction}
          leadOptions={leadOptions}
          defaults={{
            name: company.name,
            domain: company.domain,
            sector: company.sector,
            stage: company.stage,
            lead_partner_id: company.lead_partner_id,
            status: company.status,
          }}
        />
      </div>
    </div>
  );
}
