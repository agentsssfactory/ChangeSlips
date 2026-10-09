import Link from "next/link";
import { listSlips, formatMoney } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const slips = await listSlips();

  return (
    <>
      <div
        className="page-head"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1>Change slips</h1>
          <p className="lede">
            Newest first. Share the magic link before work continues.
          </p>
        </div>
        <Link className="btn" href="/new">
          New slip
        </Link>
      </div>

      {!slips.length ? (
        <section className="card">
          <p className="empty">
            No change slips yet. Create one when a customer asks for an extra
            mid-job.
          </p>
        </section>
      ) : (
        <section className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Summary</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th>Accepted</th>
              </tr>
            </thead>
            <tbody>
              {slips.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/slips/${s.id}`}>{s.customer_name}</Link>
                  </td>
                  <td>{s.summary}</td>
                  <td>{formatMoney(s.amount_cents, s.currency)}</td>
                  <td>
                    <span className={`badge badge-${s.status}`}>{s.status}</span>
                  </td>
                  <td>{s.created_at}</td>
                  <td>{s.accepted_at || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
