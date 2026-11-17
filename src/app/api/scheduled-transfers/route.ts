import { db } from "@/db";
import { accounts, customers, scheduledTransfers } from "@/db/schema";
import { ensureBankingSeeded, ensureEngagementSeeded } from "@/db/seed";
import { getAdminSession } from "@/lib/admin-auth";
import { getCustomerSession } from "@/lib/customer-auth";
import { processDueSchedules } from "@/lib/scheduled-transfers";
import { asc, desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const FREQUENCIES = ["Weekly", "Biweekly", "Monthly", "Quarterly"];

async function resolveCustomer(userParam?: string | null) {
  const session = await getCustomerSession();
  if (session && (!userParam || userParam === session.username)) {
    return { id: session.id, username: session.username };
  }
  if (userParam) {
    const [row] = await db
      .select({ id: customers.id, username: customers.username })
      .from(customers)
      .where(eq(customers.username, userParam.trim().slice(0, 60)))
      .limit(1);
    if (row) return row;
  }
  return session ? { id: session.id, username: session.username } : null;
}

export async function GET(request: NextRequest) {
  await ensureBankingSeeded();
  await ensureEngagementSeeded();
  const scope = request.nextUrl.searchParams.get("scope");
  const admin = await getAdminSession();

  if (scope === "admin") {
    if (!admin) return Response.json({ error: "Super Admin session required." }, { status: 401 });
    const rows = await db.select().from(scheduledTransfers).orderBy(desc(scheduledTransfers.id)).limit(200);
    return Response.json({ schedules: rows }, { headers: { "Cache-Control": "no-store" } });
  }

  const customer = await resolveCustomer(request.nextUrl.searchParams.get("user"));
  if (!customer) return Response.json({ error: "Sign on to view scheduled transfers." }, { status: 401 });

  const job = await processDueSchedules(customer.id);
  const rows = await db
    .select()
    .from(scheduledTransfers)
    .where(eq(scheduledTransfers.customerId, customer.id))
    .orderBy(asc(scheduledTransfers.id));

  return Response.json({ schedules: rows, job }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  await ensureBankingSeeded();
  await ensureEngagementSeeded();
  const body = (await request.json()) as Record<string, unknown>;
  const customer = await resolveCustomer(typeof body.user === "string" ? body.user : null);
  if (!customer) return Response.json({ error: "Sign on to schedule a transfer." }, { status: 401 });

  const label = String(body.label ?? "").trim().slice(0, 140);
  const fromAccountKey = String(body.fromAccountKey ?? "").trim().slice(0, 40);
  const toAccountKey = String(body.toAccountKey ?? "").trim().slice(0, 40);
  const amount = Number(body.amount);
  const frequency = String(body.frequency ?? "Monthly");
  const nextRunDate = String(body.nextRunDate ?? "").slice(0, 10);

  if (!label || !fromAccountKey || !toAccountKey || fromAccountKey === toAccountKey) {
    return Response.json({ error: "Enter a schedule name and choose two different accounts." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 50000) {
    return Response.json({ error: "Enter an amount between $0.01 and $50,000." }, { status: 400 });
  }
  if (!FREQUENCIES.includes(frequency)) return Response.json({ error: "Unsupported frequency." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextRunDate)) return Response.json({ error: "Choose a valid start date." }, { status: 400 });

  const owned = await db.select({ key: accounts.accountKey }).from(accounts).where(eq(accounts.customerId, customer.id));
  const keys = new Set(owned.map((o) => o.key));
  if (!keys.has(fromAccountKey) || !keys.has(toAccountKey)) {
    return Response.json({ error: "Choose accounts that belong to your profile." }, { status: 400 });
  }

  const [created] = await db
    .insert(scheduledTransfers)
    .values({
      customerId: customer.id,
      label,
      transferType: "transfer",
      fromAccountKey,
      toAccountKey,
      amount: amount.toFixed(2),
      frequency,
      nextRunDate,
      status: "Active",
    })
    .returning();

  return Response.json({ schedule: created }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  await ensureBankingSeeded();
  const body = (await request.json()) as Record<string, unknown>;
  const customer = await resolveCustomer(typeof body.user === "string" ? body.user : null);
  if (!customer) return Response.json({ error: "Sign on first." }, { status: 401 });

  const id = Number(body.id);
  const status = String(body.status ?? "");
  if (!Number.isInteger(id) || !["Active", "Paused", "Canceled"].includes(status)) {
    return Response.json({ error: "Invalid schedule update." }, { status: 400 });
  }
  const [row] = await db.select().from(scheduledTransfers).where(eq(scheduledTransfers.id, id)).limit(1);
  if (!row || row.customerId !== customer.id) return Response.json({ error: "Schedule not found." }, { status: 404 });

  await db.update(scheduledTransfers).set({ status }).where(eq(scheduledTransfers.id, id));
  return Response.json({ ok: true, status });
}
