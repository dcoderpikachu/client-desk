import Link from "next/link";
import { IconChevronLeft } from "@/components/Icons";
import { UpworkImport } from "@/components/UpworkImport";

export default function UpworkImportPage() {
  return (
    <>
      <Link href="/billing/upwork" className="row gap-6 small strong" style={{ textDecoration: "none", minHeight: 44, alignSelf: "flex-start" }}>
        <IconChevronLeft />
        Upwork billing
      </Link>
      <header className="stack gap-6">
        <h1 className="h1">Upload the Upwork export</h1>
        <p className="lead">Once a month, after your withdrawal lands. You&apos;ll check what&apos;s in the file before anything is saved.</p>
      </header>
      <section className="card" style={{ maxWidth: 760, gap: 10 }}>
        <h2 className="h3">Getting the file</h2>
        <ol className="small muted stack gap-4" style={{ margin: 0, paddingLeft: 18 }}>
          <li>In Upwork, open Reports, then Transaction history.</li>
          <li>Pick the date range. Overlapping last month is fine; nothing gets counted twice.</li>
          <li>Download it as CSV and choose it below.</li>
        </ol>
      </section>
      <UpworkImport />
    </>
  );
}
