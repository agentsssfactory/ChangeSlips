import { createClient, type Client, type InValue } from "@libsql/client";
import path from "path";
import fs from "fs";

// ---------------------------------------------------------------------------
// Client singleton (works with Turso remote OR local file)
// ---------------------------------------------------------------------------

const globalForDb = globalThis as unknown as { __changeslipClient?: Client };

function getClient(): Client {
  if (globalForDb.__changeslipClient) {
    return globalForDb.__changeslipClient;
  }

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  let client: Client;

  if (tursoUrl) {
    // Production / Vercel: connect to Turso
    client = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });
  } else {
    // Local development: use a file-based SQLite database
    const dataDir = process.env.DATABASE_PATH
      ? path.dirname(process.env.DATABASE_PATH)
      : path.join(process.cwd(), "data");

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath =
      process.env.DATABASE_PATH || path.join(dataDir, "changeslip.db");

    // file: protocol — works only on Node.js (dev / local)
    client = createClient({
      url: `file:${dbPath}`,
    });
  }

  globalForDb.__changeslipClient = client;
  return client;
}

// Ensure schema exists (idempotent)
let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    const db = getClient();
    await db.batch(
      [
        `CREATE TABLE IF NOT EXISTS slips (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token TEXT NOT NULL UNIQUE,
          customer_name TEXT NOT NULL,
          customer_email TEXT,
          customer_phone TEXT,
          job_ref TEXT,
          summary TEXT NOT NULL,
          details TEXT,
          amount_cents INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'USD',
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL,
          accepted_at TEXT,
          declined_at TEXT,
          voided_at TEXT,
          typed_name TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          slip_id INTEGER NOT NULL,
          kind TEXT NOT NULL,
          at TEXT NOT NULL,
          meta TEXT,
          FOREIGN KEY (slip_id) REFERENCES slips(id)
        )`,
      ],
      "write"
    );
  })();

  return schemaReady;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Slip = {
  id: number;
  token: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  job_ref: string | null;
  summary: string;
  details: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  voided_at: string | null;
  typed_name: string | null;
};

export type Event = {
  id: number;
  slip_id: number;
  kind: string;
  at: string;
  meta: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatMoney(
  amountCents: number,
  currency: string = "USD"
): string {
  const dollars = amountCents / 100;
  if ((currency || "USD").toUpperCase() === "USD") {
    return `$${dollars.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${dollars.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export function utcNowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function rowToSlip(row: Record<string, unknown>): Slip {
  return {
    id: Number(row.id),
    token: String(row.token),
    customer_name: String(row.customer_name),
    customer_email: (row.customer_email as string) ?? null,
    customer_phone: (row.customer_phone as string) ?? null,
    job_ref: (row.job_ref as string) ?? null,
    summary: String(row.summary),
    details: (row.details as string) ?? null,
    amount_cents: Number(row.amount_cents),
    currency: String(row.currency || "USD"),
    status: String(row.status),
    created_at: String(row.created_at),
    accepted_at: (row.accepted_at as string) ?? null,
    declined_at: (row.declined_at as string) ?? null,
    voided_at: (row.voided_at as string) ?? null,
    typed_name: (row.typed_name as string) ?? null,
  };
}

function rowToEvent(row: Record<string, unknown>): Event {
  return {
    id: Number(row.id),
    slip_id: Number(row.slip_id),
    kind: String(row.kind),
    at: String(row.at),
    meta: (row.meta as string) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Public API (all async)
// ---------------------------------------------------------------------------

export async function listSlips(): Promise<Slip[]> {
  await ensureSchema();
  const db = getClient();
  const result = await db.execute(
    "SELECT * FROM slips ORDER BY id DESC"
  );
  return result.rows.map((r) => rowToSlip(r as Record<string, unknown>));
}

export async function getSlipById(id: number): Promise<Slip | undefined> {
  await ensureSchema();
  const db = getClient();
  const result = await db.execute({
    sql: "SELECT * FROM slips WHERE id = ?",
    args: [id],
  });
  if (result.rows.length === 0) return undefined;
  return rowToSlip(result.rows[0] as Record<string, unknown>);
}

export async function getSlipByToken(
  token: string
): Promise<Slip | undefined> {
  await ensureSchema();
  const db = getClient();
  const result = await db.execute({
    sql: "SELECT * FROM slips WHERE token = ?",
    args: [token],
  });
  if (result.rows.length === 0) return undefined;
  return rowToSlip(result.rows[0] as Record<string, unknown>);
}

export async function createSlip(data: {
  token: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  job_ref?: string | null;
  summary: string;
  details?: string | null;
  amount_cents: number;
  currency: string;
}): Promise<number> {
  await ensureSchema();
  const db = getClient();
  const now = utcNowIso();

  const result = await db.execute({
    sql: `INSERT INTO slips (
      token, customer_name, customer_email, customer_phone, job_ref,
      summary, details, amount_cents, currency, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    args: [
      data.token,
      data.customer_name,
      data.customer_email || null,
      data.customer_phone || null,
      data.job_ref || null,
      data.summary,
      data.details || null,
      data.amount_cents,
      data.currency,
      now,
    ] as InValue[],
  });

  const id = Number(result.lastInsertRowid);
  await addEvent(id, "created");
  return id;
}

export async function addEvent(
  slipId: number,
  kind: string,
  meta?: string
): Promise<void> {
  await ensureSchema();
  const db = getClient();
  await db.execute({
    sql: "INSERT INTO events (slip_id, kind, at, meta) VALUES (?, ?, ?, ?)",
    args: [slipId, kind, utcNowIso(), meta || null],
  });
}

export async function getEvents(slipId: number): Promise<Event[]> {
  await ensureSchema();
  const db = getClient();
  const result = await db.execute({
    sql: "SELECT * FROM events WHERE slip_id = ? ORDER BY id ASC",
    args: [slipId],
  });
  return result.rows.map((r) => rowToEvent(r as Record<string, unknown>));
}

export async function acceptSlip(
  token: string,
  typedName?: string | null
): Promise<boolean> {
  const slip = await getSlipByToken(token);
  if (!slip || slip.status !== "pending") return false;

  const db = getClient();
  const now = utcNowIso();
  await db.execute({
    sql: "UPDATE slips SET status = 'accepted', accepted_at = ?, typed_name = ? WHERE token = ?",
    args: [now, typedName || null, token],
  });
  await addEvent(slip.id, "accepted", typedName || undefined);
  return true;
}

export async function declineSlip(token: string): Promise<boolean> {
  const slip = await getSlipByToken(token);
  if (!slip || slip.status !== "pending") return false;

  const db = getClient();
  const now = utcNowIso();
  await db.execute({
    sql: "UPDATE slips SET status = 'declined', declined_at = ? WHERE token = ?",
    args: [now, token],
  });
  await addEvent(slip.id, "declined");
  return true;
}

export async function voidSlip(id: number): Promise<boolean> {
  const slip = await getSlipById(id);
  if (!slip || slip.status !== "pending") return false;

  const db = getClient();
  const now = utcNowIso();
  await db.execute({
    sql: "UPDATE slips SET status = 'void', voided_at = ? WHERE id = ?",
    args: [now, id],
  });
  await addEvent(id, "voided");
  return true;
}

// ---------------------------------------------------------------------------
// Config helpers (sync – pure env reads)
// ---------------------------------------------------------------------------

export function publicBaseUrl(): string {
  return (process.env.PUBLIC_BASE_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export function businessName(): string {
  return process.env.BUSINESS_NAME || "ChangeSlip";
}

export function ownerPassword(): string {
  return (process.env.OWNER_PASSWORD || "").trim();
}

export function requireTypedName(): boolean {
  return ["1", "true", "yes", "on"].includes(
    (process.env.REQUIRE_TYPED_NAME || "").toLowerCase()
  );
}

export function defaultCurrency(): string {
  return (process.env.DEFAULT_CURRENCY || "USD").toUpperCase();
}
