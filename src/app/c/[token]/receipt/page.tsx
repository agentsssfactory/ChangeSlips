import { notFound } from "next/navigation";
import { getSlipByToken, formatMoney, businessName } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const slip = await getSlipByToken(token);
  if (!slip || slip.status !== "accepted") notFound();

  const name = businessName();

  return (
    <section className="card public-card">
      <p className="hint">{name}</p>
      <h1>Receipt</h1>
      <p className="lede">Change order accepted</p>

      <dl className="facts">
        <div>
          <dt>Customer</dt>
          <dd>{slip.customer_name}</dd>
        </div>
        {slip.job_ref && (
          <div>
            <dt>Job / WO</dt>
            <dd>{slip.job_ref}</dd>
          </div>
        )}
        <div>
          <dt>Summary</dt>
          <dd>{slip.summary}</dd>
        </div>
        {slip.details && (
          <div>
            <dt>Details</dt>
            <dd className="body">{slip.details}</dd>
          </div>
        )}
        <div>
          <dt>Amount</dt>
          <dd className="amount-big">
            {formatMoney(slip.amount_cents, slip.currency)}
          </dd>
        </div>
        <div>
          <dt>Accepted at</dt>
          <dd>{slip.accepted_at} UTC</dd>
        </div>
        {slip.typed_name && (
          <div>
            <dt>Signed by</dt>
            <dd>{slip.typed_name}</dd>
          </div>
        )}
      </dl>

      <p className="hint no-print">Print this page for your records.</p>
    </section>
  );
}
