"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconGrid, IconReceipt, IconSettings, IconUsers } from "@/components/Icons";

export function NavLinks({ clientCount, lateCount }: { clientCount: number; lateCount: number }) {
  const path = usePathname();
  const is = (p: string) => (p === "/" ? path === "/" : path === p || path.startsWith(`${p}/`));
  return (
    <nav className="nav" aria-label="Main">
      <Link href="/" aria-current={is("/") ? "page" : undefined}>
        <IconGrid />
        <span>Dashboard</span>
      </Link>
      <Link href="/clients" aria-current={is("/clients") ? "page" : undefined}>
        <IconUsers />
        <span>Clients</span>
        <span className="nav-count">{clientCount}</span>
      </Link>
      <Link href="/billing" aria-current={is("/billing") ? "page" : undefined}>
        <IconReceipt />
        <span>Billing</span>
        {lateCount > 0 && <span className="nav-late">{lateCount} late</span>}
      </Link>
      <Link href="/settings" aria-current={is("/settings") ? "page" : undefined}>
        <IconSettings />
        <span>Settings</span>
      </Link>
    </nav>
  );
}
