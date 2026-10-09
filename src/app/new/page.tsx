import { redirect } from "next/navigation";
import { createSlip, defaultCurrency } from "@/lib/db";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

async function createAction(formData: FormData) {
  "use server";
  const customer_name = String(formData.get("customer_name") || "").trim();
  const customer_email =
    String(formData.get("customer_email") || "").trim() || null;
  const customer_phone =
    String(formData.get("customer_phone") || "").trim() || null;
  const job_ref = String(formData.get("job_ref") || "").trim() || null;
  const summary = String(formData.get("summary") || "").trim();
  const details = String(formData.get("details") || "").trim() || null;
  const currency =
    String(formData.get("currency") || defaultCurrency())
      .trim()
      .toUpperCase() || defaultCurrency();
  const amountRaw = String(formData.get("amount") || "").trim();

  if (!customer_name || !summary) {
    redirect("/new?error=required");
  }

  let amount_cents = 0;
  try {
    const dollars = parseFloat(amountRaw.replace(/,/g, ""));
    if (isNaN(dollars) || dollars < 0) throw new Error("bad");
    amount_cents = Math.round(dollars * 100);
  } catch {
    redirect("/new?error=amount");
  }

  const token = randomBytes(32).toString("hex");
  const id = await createSlip({
    token,
    customer_name,
    customer_email,
    customer_phone,
    job_ref,
    summary,
    details,
    amount_cents,
    currency,
  });
  redirect(`/slips/${id}`);
}

export default async function NewSlipPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const error = sp?.error;

  return (
    <>
      <p className="crumb">
        <a href="/">Slips</a> · New
      </p>
      <section className="card">
        <h1>New change slip</h1>
        <p className="lede">
          Type what the customer wants, price it, then share the magic link.
        </p>

        {error === "required" && (
          <ul className="flashes">
            <li className="flash flash-error">
              Customer name and summary are required.
            </li>
          </ul>
        )}
        {error === "amount" && (
          <ul className="flashes">
            <li className="flash flash-error">
              Amount must be a number ≥ 0 (Dollars).
            </li>
          </ul>
        )}

        <form action={createAction} className="stack">
          <label>
            Customer name *
            <input name="customer_name" required />
          </label>
          <label>
            Customer email
            <input type="email" name="customer_email" />
          </label>
          <label>
            Customer phone
            <input name="customer_phone" />
          </label>
          <label>
            Job / WO ref
            <input name="job_ref" />
          </label>
          <label>
            Summary *{" "}
            <span className="hint">
              (plain language &quot;customer wants X&quot;)
            </span>
            <input name="summary" required />
          </label>
          <label>
            Details
            <textarea name="details" rows={4} />
          </label>
          <label>
            Amount (Dollars) *
            <input
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              placeholder="250.00"
            />
          </label>
          <label>
            Currency
            <input name="currency" defaultValue={defaultCurrency()} />
          </label>
          <button type="submit" className="btn">
            Create slip
          </button>
        </form>
      </section>
    </>
  );
}
