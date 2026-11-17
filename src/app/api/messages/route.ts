import { db } from "@/db";
import { customers, supportMessages } from "@/db/schema";
import { ensureEngagementSeeded } from "@/db/seed";
import { getAdminSession, isSuperAdmin } from "@/lib/admin-auth";
import { getCustomerSession } from "@/lib/customer-auth";
import { and, asc, desc, eq, or } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await ensureEngagementSeeded();
  const scope = request.nextUrl.searchParams.get("scope");
  const admin = await getAdminSession();
  const customer = await getCustomerSession();

  if (scope === "admin") {
    if (!admin) return Response.json({ error: "Administrator session required." }, { status: 401 });
    const scoped = isSuperAdmin(admin)
      ? undefined
      : or(eq(supportMessages.assignedAdminId, admin.id), eq(customers.assignedAdminId, admin.id));
    const rows = await db
      .select({
        id: supportMessages.id,
        threadCode: supportMessages.threadCode,
        subject: supportMessages.subject,
        senderRole: supportMessages.senderRole,
        senderName: supportMessages.senderName,
        body: supportMessages.body,
        status: supportMessages.status,
        isReadByAdmin: supportMessages.isReadByAdmin,
        createdAt: supportMessages.createdAt,
        customerName: customers.fullName,
        customerUsername: customers.username,
      })
      .from(supportMessages)
      .innerJoin(customers, eq(supportMessages.customerId, customers.id))
      .where(scoped)
      .orderBy(desc(supportMessages.id))
      .limit(200);
    return Response.json({ messages: rows }, { headers: { "Cache-Control": "no-store" } });
  }

  if (!customer) {
    return Response.json({ messages: [], authenticated: false }, { status: 200 });
  }
  const rows = await db
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.customerId, customer.id))
    .orderBy(asc(supportMessages.id));
  return Response.json({ messages: rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  await ensureEngagementSeeded();
  const body = (await request.json()) as Record<string, unknown>;
  const subject = String(body.subject ?? "").trim().slice(0, 160);
  const text = String(body.body ?? "").trim().slice(0, 4000);
  const threadCode = String(body.threadCode ?? "").trim().slice(0, 24);
  const admin = await getAdminSession();
  const customer = await getCustomerSession();

  if (!text) return Response.json({ error: "Enter a message." }, { status: 400 });

  if (admin && threadCode) {
    if (admin.roleType === "auditor") {
      return Response.json({ error: "Read-Only Auditors cannot reply to messages." }, { status: 403 });
    }
    const [original] = await db.select().from(supportMessages).where(eq(supportMessages.threadCode, threadCode)).limit(1);
    if (!original) return Response.json({ error: "Thread not found." }, { status: 404 });
    const [threadCustomer] = await db.select().from(customers).where(eq(customers.id, original.customerId)).limit(1);
    if (!isSuperAdmin(admin) && threadCustomer?.assignedAdminId !== admin.id) {
      return Response.json({ error: "You can only reply to users assigned to you." }, { status: 403 });
    }
    const [created] = await db
      .insert(supportMessages)
      .values({
        threadCode,
        customerId: original.customerId,
        subject: original.subject,
        senderRole: "admin",
        senderName: admin.fullName,
        body: text,
        status: "Answered",
        isReadByAdmin: true,
        assignedAdminId: threadCustomer?.assignedAdminId ?? admin.id,
      })
      .returning();
    await db.update(supportMessages).set({ status: "Answered" }).where(eq(supportMessages.threadCode, threadCode));
    return Response.json({ message: created }, { status: 201 });
  }

  if (!customer) return Response.json({ error: "Sign on to send a secure message." }, { status: 401 });
  const [profile] = await db.select().from(customers).where(eq(customers.id, customer.id)).limit(1);
  const code = threadCode || `MSG-${Math.floor(10000 + Math.random() * 89999)}`;
  const [existing] = threadCode
    ? await db.select().from(supportMessages).where(eq(supportMessages.threadCode, threadCode)).limit(1)
    : [undefined];
  const [created] = await db
    .insert(supportMessages)
    .values({
      threadCode: code,
      customerId: customer.id,
      subject: subject || existing?.subject || "General banking question",
      senderRole: "customer",
      senderName: customer.fullName,
      body: text,
      status: existing ? "Awaiting Reply" : "Open",
      isReadByCustomer: true,
      assignedAdminId: profile?.assignedAdminId ?? null,
    })
    .returning();
  return Response.json({ message: created }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  await ensureEngagementSeeded();
  const body = (await request.json()) as Record<string, unknown>;
  const threadCode = String(body.threadCode ?? "").trim().slice(0, 24);
  const action = String(body.action ?? "read");
  if (!threadCode) return Response.json({ error: "Thread code required." }, { status: 400 });

  const admin = await getAdminSession();
  const customer = await getCustomerSession();
  if (!admin && !customer) return Response.json({ error: "Not authorized." }, { status: 401 });
  if (admin?.roleType === "auditor") {
    return Response.json({ error: "Read-Only Auditors cannot modify message threads." }, { status: 403 });
  }

  const rows = await db.select().from(supportMessages).where(eq(supportMessages.threadCode, threadCode));
  if (!rows.length) return Response.json({ error: "Thread not found." }, { status: 404 });
  if (customer && !admin && rows[0].customerId !== customer.id) {
    return Response.json({ error: "Not authorized." }, { status: 403 });
  }
  if (admin && !isSuperAdmin(admin)) {
    const [owner] = await db.select().from(customers).where(eq(customers.id, rows[0].customerId)).limit(1);
    if (owner?.assignedAdminId !== admin.id) {
      return Response.json({ error: "You can only manage threads for your assigned users." }, { status: 403 });
    }
  }

  for (const row of rows) {
    if (action === "close") {
      await db.update(supportMessages).set({ status: "Closed" }).where(eq(supportMessages.id, row.id));
    } else if (admin) {
      await db.update(supportMessages).set({ isReadByAdmin: true }).where(eq(supportMessages.id, row.id));
    } else {
      await db.update(supportMessages).set({ isReadByCustomer: true }).where(eq(supportMessages.id, row.id));
    }
  }
  return Response.json({ ok: true, action });
}
