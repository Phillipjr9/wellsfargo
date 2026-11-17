import { db } from "@/db";
import { customers, notifications, supportMessages } from "@/db/schema";
import { ensureAdminHierarchySeeded } from "@/db/seed";
import { AdminAuthError, getAdminCustomerScope, isSuperAdmin, requireAdmin, writeAudit } from "@/lib/admin-auth";
import { and, asc, desc, eq, inArray, or, type SQL } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type MessageRow = {
  id: number;
  threadCode: string;
  customerId: number;
  subject: string;
  senderRole: string;
  senderName: string;
  body: string;
  status: string;
  isReadByAdmin: boolean;
  createdAt: Date;
  customerName: string;
  customerUsername: string;
  ownerAdminId: number | null;
};

async function scopeCondition(admin: Awaited<ReturnType<typeof requireAdmin>>): Promise<SQL | undefined> {
  if (isSuperAdmin(admin)) return undefined;
  const scope = await getAdminCustomerScope(admin);
  if (!scope || scope.length === 0) return eq(customers.id, -1);
  return or(eq(customers.assignedAdminId, admin.id), inArray(customers.id, scope));
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    await ensureAdminHierarchySeeded();
    const scoped = await scopeCondition(admin);
    const rows = (await db
      .select({
        id: supportMessages.id,
        threadCode: supportMessages.threadCode,
        customerId: supportMessages.customerId,
        subject: supportMessages.subject,
        senderRole: supportMessages.senderRole,
        senderName: supportMessages.senderName,
        body: supportMessages.body,
        status: supportMessages.status,
        isReadByAdmin: supportMessages.isReadByAdmin,
        createdAt: supportMessages.createdAt,
        customerName: customers.fullName,
        customerUsername: customers.username,
        ownerAdminId: customers.assignedAdminId,
      })
      .from(supportMessages)
      .innerJoin(customers, eq(supportMessages.customerId, customers.id))
      .where(scoped)
      .orderBy(asc(supportMessages.id))) as MessageRow[];

    const threads = new Map<string, {
      threadCode: string;
      customerId: number;
      customerName: string;
      customerUsername: string;
      ownerAdminId: number | null;
      subject: string;
      status: string;
      lastMessageAt: Date;
      unread: number;
      messages: MessageRow[];
    }>();
    for (const row of rows) {
      const thread = threads.get(row.threadCode) ?? {
        threadCode: row.threadCode,
        customerId: row.customerId,
        customerName: row.customerName,
        customerUsername: row.customerUsername,
        ownerAdminId: row.ownerAdminId,
        subject: row.subject,
        status: row.status,
        lastMessageAt: row.createdAt,
        unread: 0,
        messages: [],
      };
      thread.messages.push(row);
      if (!row.isReadByAdmin && row.senderRole === "customer") thread.unread += 1;
      thread.status = row.status;
      thread.subject = row.subject;
      thread.lastMessageAt = row.createdAt;
      threads.set(row.threadCode, thread);
    }
    const list = [...threads.values()].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    return Response.json({
      threads: list,
      unread: list.reduce((sum, t) => sum + t.unread, 0),
      viewer: { id: admin.id, fullName: admin.fullName, roleType: admin.roleType, username: admin.username },
      canReply: admin.roleType !== "auditor",
    });
  } catch (error) {
    if (error instanceof AdminAuthError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: "Unable to load support inbox." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (admin.roleType === "auditor") return Response.json({ error: "Read-Only Auditors cannot send support messages." }, { status: 403 });
    await ensureAdminHierarchySeeded();
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "reply");
    const text = String(body.body ?? "").trim().slice(0, 4000);
    if (!text) return Response.json({ error: "Enter a message." }, { status: 400 });

    let customerId = Number(body.customerId);
    let threadCode = String(body.threadCode ?? "").trim().slice(0, 24);
    let subject = String(body.subject ?? "").trim().slice(0, 160);
    let ownerAdminId: number | null = admin.id;

    if (action === "reply") {
      const [original] = await db.select().from(supportMessages).where(eq(supportMessages.threadCode, threadCode)).limit(1);
      if (!original) return Response.json({ error: "Thread not found." }, { status: 404 });
      customerId = original.customerId;
      subject = original.subject;
      const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
      ownerAdminId = customer?.assignedAdminId ?? admin.id;
      if (!isSuperAdmin(admin) && ownerAdminId !== admin.id) {
        return Response.json({ error: "You can only reply to your assigned users." }, { status: 403 });
      }
      await db.update(supportMessages).set({ status: "Answered" }).where(eq(supportMessages.threadCode, threadCode));
    } else {
      if (!Number.isInteger(customerId)) return Response.json({ error: "Choose a user." }, { status: 400 });
      const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
      if (!customer) return Response.json({ error: "User not found." }, { status: 404 });
      ownerAdminId = customer.assignedAdminId;
      if (!isSuperAdmin(admin) && ownerAdminId !== admin.id) {
        return Response.json({ error: "You can only message your assigned users." }, { status: 403 });
      }
      threadCode = `MSG-${Math.floor(10000 + Math.random() * 89999)}`;
      subject = subject || "Message from your Wells Fargo support agent";
    }

    const [created] = await db.insert(supportMessages).values({
      threadCode,
      customerId,
      subject,
      senderRole: "admin",
      senderName: admin.fullName,
      body: text,
      status: "Answered",
      isReadByAdmin: true,
      assignedAdminId: isSuperAdmin(admin) ? ownerAdminId : admin.id,
    }).returning();
    await db.insert(notifications).values({
      customerId,
      title: `New message from ${admin.fullName}`,
      body: text.slice(0, 140),
      kind: "Message",
      href: "/online-banking/messages",
    });
    await writeAudit({
      actor: admin.username,
      action: action === "reply" ? "support_reply" : "support_message",
      resource: "support_messages",
      resourceLabel: `${subject} · ${threadCode}`,
      detail: `Support agent ${admin.fullName} sent a message`,
      severity: "Info",
    });
    return Response.json({ message: created, threadCode }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAuthError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: "Unable to send message." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as Record<string, unknown>;
    const threadCode = String(body.threadCode ?? "").trim().slice(0, 24);
    const status = String(body.status ?? "") === "Closed" ? "Closed" : "Answered";
    if (!threadCode) return Response.json({ error: "Thread code required." }, { status: 400 });
    const rows = await db.select().from(supportMessages).where(eq(supportMessages.threadCode, threadCode));
    if (!rows.length) return Response.json({ error: "Thread not found." }, { status: 404 });
    if (!isSuperAdmin(admin)) {
      const [customer] = await db.select().from(customers).where(eq(customers.id, rows[0].customerId)).limit(1);
      if (customer?.assignedAdminId !== admin.id) return Response.json({ error: "Not your assigned user." }, { status: 403 });
    }
    for (const row of rows) {
      await db.update(supportMessages).set({ status, isReadByAdmin: true }).where(eq(supportMessages.id, row.id));
    }
    return Response.json({ ok: true, status });
  } catch (error) {
    if (error instanceof AdminAuthError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: "Unable to update thread." }, { status: 500 });
  }
}
