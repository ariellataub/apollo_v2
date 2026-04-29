import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyForm } from "./company-form";
import { addCompanyAction } from "./actions";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();

  const [companiesRes, usersRes] = await Promise.all([
    supabase
      .from("companies")
      .select(
        `
        id,
        name,
        domain,
        sector,
        stage,
        status,
        lead:lead_partner_id ( full_name, email )
      `,
      )
      .order("name", { ascending: true }),
    supabase
      .from("users")
      .select("id, full_name, email")
      .order("full_name", { ascending: true, nullsFirst: false }),
  ]);

  const companies = companiesRes.data ?? [];
  const users = usersRes.data ?? [];

  const leadOptions = users.map((u) => ({
    id: u.id,
    label: u.full_name?.trim() ? `${u.full_name} · ${u.email}` : u.email,
  }));

  return (
    <div>
      <h1
        className="mb-2 text-3xl"
        style={{ fontWeight: 600, letterSpacing: "-0.2px" }}
      >
        Settings
      </h1>
      <p className="mb-8 text-sm text-apollo-mute">
        Companies admin · more sections come in later phases.
      </p>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base" style={{ fontWeight: 600 }}>
            Companies
          </h2>
          <span className="font-label text-xs text-apollo-mute">
            {companies.length} {companies.length === 1 ? "company" : "companies"}
          </span>
        </div>

        {/* List */}
        <div className="apollo-panel mb-6 overflow-hidden">
          {companies.length === 0 ? (
            <div className="p-6 text-center text-sm text-apollo-mute">
              No companies yet. Add your first one below.
            </div>
          ) : (
            <table className="apollo-table w-full">
              <thead
                className="bg-apollo-panel2"
                style={{ borderBottom: "1px solid var(--apollo-line)" }}
              >
                <tr>
                  <th className="p-3 text-left">Company</th>
                  <th className="p-3 text-left">Domain</th>
                  <th className="p-3 text-left">Sector</th>
                  <th className="p-3 text-left">Stage</th>
                  <th className="p-3 text-left">Lead</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">{""}</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => {
                  const lead = Array.isArray(c.lead)
                    ? (c.lead[0] ?? null)
                    : (c.lead ?? null);
                  const leadName =
                    lead?.full_name ??
                    (lead?.email ? lead.email.split("@")[0] : null);
                  return (
                    <tr
                      key={c.id}
                      style={{ borderTop: "1px solid var(--apollo-line-soft)" }}
                    >
                      <td className="p-3">
                        <Link
                          href={`/companies/${c.id}`}
                          className="hover:text-apollo-accent"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="p-3 text-apollo-mute">
                        {c.domain ?? "—"}
                      </td>
                      <td className="p-3 text-apollo-mute">
                        {c.sector ?? "—"}
                      </td>
                      <td className="p-3 text-apollo-mute">
                        {c.stage ?? "—"}
                      </td>
                      <td className="p-3 text-apollo-mute">
                        {leadName ?? "—"}
                      </td>
                      <td className="p-3">
                        <span className={`apollo-chip apollo-chip-priority-${chipForStatus(c.status)}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/settings/companies/${c.id}`}
                          className="font-label text-xs text-apollo-mute hover:text-apollo-accent"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Add form */}
        <div className="apollo-panel p-6">
          <div className="mb-4 text-sm" style={{ fontWeight: 600 }}>
            Add company
          </div>
          <CompanyForm
            mode="add"
            action={addCompanyAction}
            leadOptions={leadOptions}
          />
        </div>
      </section>
    </div>
  );
}

function chipForStatus(status: "Active" | "Watch" | "Exited") {
  switch (status) {
    case "Active":
      return "Light-touch"; // green
    case "Watch":
      return "High"; // amber
    case "Exited":
      return "Standard"; // gray
  }
}
