import { redirect } from "next/navigation";
import { SidebarNav } from "@/app/_components/sidebar-nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logoutAction } from "@/app/(auth)/actions";

function deriveInitials(fullName: string | null, email: string | null) {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Pull profile row (created by the auth-trigger on signup)
  let fullName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    fullName = profile?.full_name ?? null;
  }

  const initials = deriveInitials(fullName, user?.email ?? null);
  const displayName = fullName ?? user?.email ?? "";

  return (
    <div className="min-h-screen bg-apollo-bg text-apollo-ink">
      {/* Top bar */}
      <header className="flex items-center gap-4 border-b border-apollo-line bg-apollo-panel px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="apollo-brand-mark">A</div>
          <div className="text-lg" style={{ fontWeight: 600, letterSpacing: "0.3px" }}>
            Apollo
          </div>
        </div>
        <div className="flex-1" />
        <div className="font-label text-xs text-apollo-mute">Q2 · 2026</div>
        <div
          className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-apollo-line-soft text-xs text-apollo-ink-soft"
          title={displayName}
        >
          {initials}
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="flex">
        <aside className="flex min-h-[calc(100vh-53px)] w-52 shrink-0 flex-col border-r border-apollo-line bg-apollo-panel p-4">
          <SidebarNav />
          <div className="flex-1" />
          <div className="mt-4 border-t border-apollo-line-soft pt-4">
            {displayName ? (
              <div className="px-2 pb-2">
                <div className="truncate text-sm" style={{ fontWeight: 600 }}>
                  {fullName ?? user?.email}
                </div>
                {fullName ? (
                  <div className="truncate text-xs text-apollo-mute">
                    {user?.email}
                  </div>
                ) : null}
              </div>
            ) : null}
            <form action={logoutAction}>
              <button
                type="submit"
                className="font-label flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-apollo-mute hover:bg-apollo-panel2 hover:text-apollo-ink"
              >
                Log out
              </button>
            </form>
          </div>
        </aside>
        <main className="max-w-[1300px] flex-1 px-10 py-8">{children}</main>
      </div>
    </div>
  );
}
