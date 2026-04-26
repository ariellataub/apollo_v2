"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/portfolio", label: "Portfolio", icon: LayoutGrid },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      <div className="font-label px-2 py-2 text-[10px] uppercase tracking-wider text-apollo-mute">
        Workspace
      </div>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="apollo-nav-item"
            data-active={isActive}
          >
            <Icon size={15} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
