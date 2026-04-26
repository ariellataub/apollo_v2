import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CompanyRow = {
  id: string;
  name: string;
  status: "Active" | "Watch" | "Exited";
  updated_at: string;
  lead: { full_name: string | null; email: string } | null;
};

function formatLastUpdate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function PortfolioPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("companies")
    .select(
      `
      id,
      name,
      status,
      updated_at,
      lead:lead_partner_id ( full_name, email )
    `,
    )
    .order("name", { ascending: true });

  // Supabase types the joined `lead` as an array (one-to-many) by default; for
  // a foreign key on the parent it's actually 0-or-1. Normalize.
  const rows: CompanyRow[] = (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    updated_at: c.updated_at,
    lead: Array.isArray(c.lead) ? (c.lead[0] ?? null) : (c.lead ?? null),
  }));

  return (
    <div>
      <h1
        className="mb-8 text-3xl"
        style={{ fontWeight: 600, letterSpacing: "-0.2px" }}
      >
        Greenfield Portfolio · Q2&rsquo;26
      </h1>

      {error ? (
        <div
          className="rounded-md border p-3 text-sm"
          style={{
            borderColor: "#ecc4c0",
            background: "#fdf3f1",
            color: "#9b2f2f",
          }}
        >
          Couldn&rsquo;t load the portfolio: {error.message}
        </div>
      ) : rows.length === 0 ? (
        <div className="apollo-panel p-10 text-center">
          <div className="text-base" style={{ fontWeight: 600 }}>
            No companies yet
          </div>
          <p className="mx-auto mt-2 max-w-md text-sm text-apollo-mute">
            Add your portfolio companies in{" "}
            <Link
              href="/settings"
              className="text-apollo-accent hover:underline"
              style={{ fontWeight: 600 }}
            >
              Settings → Companies
            </Link>
            . They&rsquo;ll show up here once you do.
          </p>
        </div>
      ) : (
        <div className="apollo-panel overflow-hidden">
          <table className="apollo-table w-full">
            <thead className="bg-apollo-panel2" style={{ borderBottom: "1px solid var(--apollo-line)" }}>
              <tr>
                <th className="p-3 text-left">Company</th>
                <th className="p-3 text-left">Health</th>
                <th className="p-3 text-left">Priority</th>
                <th className="p-3 text-left">Lead</th>
                <th className="p-3 text-left">Plan progress</th>
                <th className="p-3 text-left">KPIs on track</th>
                <th className="p-3 text-left">Last update</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const leadName =
                  c.lead?.full_name ??
                  (c.lead?.email ? c.lead.email.split("@")[0] : null);
                return (
                  <tr key={c.id} className="apollo-row">
                    <td className="p-3">
                      <Link
                        href={`/companies/${c.id}`}
                        className="block hover:text-apollo-accent"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="p-3 text-apollo-mute">—</td>
                    <td className="p-3 text-apollo-mute">—</td>
                    <td className="p-3 text-apollo-mute">
                      {leadName ?? "—"}
                    </td>
                    <td className="p-3 text-apollo-mute">—</td>
                    <td className="p-3 text-apollo-mute">—</td>
                    <td className="p-3 text-sm text-apollo-mute">
                      {formatLastUpdate(c.updated_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 ? (
        <p className="mt-4 text-xs text-apollo-mute">
          Health, priority, plan progress, and KPI tracking populate from
          assessments and plans. Those land in Phase 1+.
        </p>
      ) : null}
    </div>
  );
}
