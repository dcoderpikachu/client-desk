import Link from "next/link";

export function BillingTabs({ current }: { current: "direct" | "upwork" }) {
  return (
    <nav className="seg seg-lg" aria-label="Billing channel" style={{ alignSelf: "flex-start", padding: 5 }}>
      <Link href="/billing" aria-current={current === "direct" ? "page" : undefined}>Direct invoices</Link>
      <Link href="/billing/upwork" aria-current={current === "upwork" ? "page" : undefined}>Upwork</Link>
    </nav>
  );
}
