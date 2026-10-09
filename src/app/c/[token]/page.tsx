import { notFound, redirect } from "next/navigation";
import {
  getSlipByToken,
  formatMoney,
  businessName,
  acceptSlip,
  declineSlip,
  requireTypedName,
} from "@/lib/db";

export const dynamic = "force-dynamic";

async function acceptAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token") || "");
  const typedName = String(formData.get("typed_name") || "").trim() || null;
  if (requireTypedName() && !typedName) {
    redirect(`/c/${token}?error=name`);
  }
  await acceptSlip(token, typedName);
  redirect(`/c/${token}`);
}

async function declineAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token") || "");
  await declineSlip(token);
  redirect(`/c/${token}`);
}

export default async function PublicSlipPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const slip = await getSlipByToken(token);
  if (!slip) notFound();

  const name = businessName();
  const typedRequired = requireTypedName();

  return (
    <section className="card public-card">
      <p className="hint">{name}</p>
      <h1>Change order</h1>
      <p className="lede">
        For {slip.customer_name}
        {slip.job_ref ? ` · Job ${slip.job_ref}` : ""}
      </p>

      <h2>{slip.summary}</h2>
      {slip.details && <p className="body">{slip.details}</p>}

      <p className="amount-big">
        {formatMoney(slip.amount_cents, slip.currency)}
      </p>
      <p className="hint">Created {slip.created_at} UTC</p>

      {sp?.error === "name" && (
        <ul className="flashes">
          <li className="flash flash-error">
            Please type your full name to Accept.
          </li>
        </ul>
      )}

      {slip.status === "pending" && (
        <div className="btn-row">
          <form
            action={acceptAction}
            className="stack"
            style={{ flex: 1, minWidth: "12rem" }}
          >
            <input type="hidden" name="token" value={token} />
            {typedRequired && (
              <label>
                Type your full name to Accept
                <input
                  name="typed_name"
                  required
                  placeholder="Your full name"
                />
              </label>
            )}
            <button type="submit" className="btn">
              Accept
            </button>
          </form>
          <form action={declineAction}>
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="btn btn-danger">
              Decline
            </button>
          </form>
        </div>
      )}

      {slip.status === "accepted" && (
        <div>
          <p className="flash flash-ok">This change order was accepted.</p>
          {slip.typed_name && (
            <p className="hint">Signed: {slip.typed_name}</p>
          )}
          <p>
            <a className="btn" href={`/c/${token}/receipt`}>
              View receipt
            </a>
          </p>
        </div>
      )}

      {slip.status === "declined" && (
        <p className="flash flash-error">This change order was declined.</p>
      )}

      {slip.status === "void" && (
        <p className="flash flash-error">
          This change order was voided by the owner.
        </p>
      )}
    </section>
  );
}
