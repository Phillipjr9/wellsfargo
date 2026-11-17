import { db } from "@/db";
import { notifications } from "@/db/schema";
import { ensureEngagementSeeded } from "@/db/seed";
import { getAdminSession } from "@/lib/admin-auth";
import { getCustomerSession } from "@/lib/customer-auth";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureEngagementSeeded();
  const customer = await getCustomerSession();
  if (!customer) {
    return Response.json({ notifications: [], unread: 0, authenticated: false }, { status: 200 });
  }

  const rows = await db
    .select()
    .from(notifications)
    .where(or(eq(notifications.customerId, customer.id), isNull(notifications.customerId)))
    .orderBy(desc(notifications.id))
    .limit(40);

  const unread = rows.filter((r) => !r.isRead).length;
  return Response.json({ notifications: rows, unread }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  await ensureEngagementSeeded();
  const admin = await getAdminSession();
  if (!admin) return Response.json({ error: "Super Admin session required." }, { status: 401 });
  if (admin.role.includes("Read-Only")) {
    return Response.json({ error: "Read-Only Auditors cannot publish announcements." }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const title = String(body.title ?? "").trim().slice(0, 160);
  const text = String(body.body ?? "").trim().slice(0, 1000);
  const kind = String(body.kind ?? "Notice").trim().slice(0, 40);
  if (!title || !text) return Response.json({ error: "Title and message are required." }, { status: 400 });

  const [created] = await db
    .insert(notifications)
    .values({ customerId: null, title, body: text, kind, href: String(body.href ?? "/help").slice(0, 200) })
    .returning();
  return Response.json({ notification: created }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  await ensureEngagementSeeded();
  const customer = await getCustomerSession();
  if (!customer) return Response.json({ error: "Sign on first." }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const id = Number(body.id);

  if (Number.isInteger(id) && id > 0) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, id),
          or(eq(notifications.customerId, customer.id), isNull(notifications.customerId)),
        ),
      );
  } else {
    const rows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(or(eq(notifications.customerId, customer.id), isNull(notifications.customerId)));
    for (const row of rows) {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, row.id));
    }
  }
  return Response.json({ ok: true });
}
