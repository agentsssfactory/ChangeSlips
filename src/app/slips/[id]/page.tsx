import { notFound, redirect } from "next/navigation";
import {
  getSlipById,
  getEvents,
  formatMoney,
  publicBaseUrl,
  voidSlip,
} from "@/lib/db";
import { CopyButton } from "@/components/CopyButton";

export const dynamic = "force-dynamic";

async function voidAction(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  await voidSlip(id);
  redirect(`/slips/${id}`);
}

export default async function SlipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const slipId = Number(id);
  const slip = await getSlipById(slipId);
  if (!slip) notFound();

  const events = await getEvents(slipId);
  const publicUrl = `${publicBaseUrl()}/c/${slip.token}`;

  return (
    <>
      <p className="crumb">
        <a href="/">Slips</a> · #{slip.id}
      </p>
      <section className="card">
        <div className="seq-head">
          <div>
            <h1>{slip.customer_name}</h1>
            <p className="lede">{slip.summary}</p>
          </div>
          <span className={`badge badge-${slip.status}`}>{slip.status}</span>
        </div>

        <dl className="facts">
          <div>
            <dt>Amount</dt>
            <dd className="amount-big">
              {formatMoney(slip.amount_cents, slip.currency)}
            </dd>
          </div>
          {slip.job_ref && (
            <div>
              <dt>Job / WO</dt>
              <dd>{slip.job_ref}</dd>
            </div>
          )}
          {slip.customer_email && (
            <div>
              <dt>Email</dt>
              <dd>{slip.customer_email}</dd>
            </div>
          )}
          {slip.customer_phone && (
            <div>
              <dt>Phone</dt>
              <dd>{slip.customer_phone}</dd>
            </div>
          )}
          {slip.details && (
            <div>
              <dt>Details</dt>
              <dd className="body">{slip.details}</dd>
            </div>
          )}
          <div>
            <dt>Created</dt>
            <dd>{slip.created_at}</dd>
          </div>
          {slip.accepted_at && (
            <div>
              <dt>Accepted</dt>
              <dd>
                {slip.accepted_at}
                {slip.typed_name ? ` by ${slip.typed_name}` : ""}
              </dd>
            </div>
          )}
        </dl>

        <h2>Magic link</h2>
        <div className="copy-fields">
          <p className="hint">{publicUrl}</p>
          <div className="btn-row no-print">
            <CopyButton text={publicUrl} label="Copy link" />
          </div>
        </div>

        {slip.status === "pending" && (
          <form
            action={voidAction}
            className="no-print"
            style={{ marginTop: "1rem" }}
          >
            <input type="hidden" name="id" value={slip.id} />
            <button type="submit" className="btn btn-danger">
              Void slip
            </button>
          </form>
        )}

        {slip.status === "accepted" && (
          <p className="no-print" style={{ marginTop: "1rem" }}>
            <a className="btn" href={`/c/${slip.token}/receipt`}>
              View receipt
            </a>
          </p>
        )}
      </section>

      <section className="card">
        <h2>Timeline</h2>
        <ul className="timeline">
          {events.map((e) => (
            <li key={e.id}>
              <span className="kind">{e.kind}</span>
              <span className="at">{e.at}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
