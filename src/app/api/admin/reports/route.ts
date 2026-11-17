import { db } from "@/db";
import { accounts, appointments, auditLogs, customers, fraudReports, productInquiries, transactions } from "@/db/schema";
import { ensureBankingSeeded } from "@/db/seed";
import { getAdminSession, isSuperAdmin } from "@/lib/admin-auth";
import { desc } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function csv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "No data available\n";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n") + "\n";
}

export async function GET(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return new Response("Unauthorized", { status: 401 });
  if (!isSuperAdmin(admin)) return Response.json({ error: "Only a Super Admin may access global operations." }, { status: 403 });

  await ensureBankingSeeded();
  const type = (request.nextUrl.searchParams.get("type") ?? "customers").trim();

  let data: Record<string, unknown>[] = [];
  if (type === "customers") {
    data = (await db.select().from(customers).orderBy(desc(customers.id))).map((r) => ({
      id: r.id, username: r.username, fullName: r.fullName, email: r.email, phone: r.phone,
      tier: r.tier, status: r.status, kycStatus: r.kycStatus, relationshipSince: r.relationshipSince,
      lastSignInAt: r.lastSignInAt?.toISOString() ?? "",
    }));
  } else if (type === "accounts") {
    data = (await db.select().from(accounts).orderBy(desc(accounts.id))).map((r) => ({
      id: r.id, accountKey: r.accountKey, name: r.name, maskedNumber: r.maskedNumber,
      accountType: r.accountType, productLine: r.productLine, balance: r.balance,
      availableBalance: r.availableBalance, creditLimit: r.creditLimit, rateOrApr: r.rateOrApr,
      status: r.status, openedOn: r.openedOn,
    }));
  } else if (type === "transactions") {
    data = (await db.select().from(transactions).orderBy(desc(transactions.id))).map((r) => ({
      id: r.id, accountId: r.accountId, postedDate: r.postedDate, description: r.description,
      category: r.category, amount: r.amount, status: r.status, flagged: r.flagged,
      createdAt: r.createdAt?.toISOString() ?? "",
    }));
  } else if (type === "appointments") {
    data = (await db.select().from(appointments).orderBy(desc(appointments.id))).map((r) => ({
      confirmationCode: r.confirmationCode, fullName: r.fullName, email: r.email, topic: r.topic,
      branchName: r.branchName, appointmentDate: r.appointmentDate, appointmentTime: r.appointmentTime,
      status: r.status, createdAt: r.createdAt?.toISOString() ?? "",
    }));
  } else if (type === "fraud") {
    data = (await db.select().from(fraudReports).orderBy(desc(fraudReports.id))).map((r) => ({
      referenceCode: r.referenceCode, incidentType: r.incidentType, channel: r.channel,
      incidentDate: r.incidentDate, contactEmail: r.contactEmail, refundAmount: r.refundAmount,
      status: r.status, createdAt: r.createdAt?.toISOString() ?? "",
    }));
  } else if (type === "applications") {
    data = (await db.select().from(productInquiries).orderBy(desc(productInquiries.id))).map((r) => ({
      referenceCode: r.referenceCode, applicantName: r.applicantName, email: r.email,
      productName: r.productName, category: r.category, zipCode: r.zipCode, status: r.status,
      createdAt: r.createdAt?.toISOString() ?? "",
    }));
  } else if (type === "audit") {
    data = (await db.select().from(auditLogs).orderBy(desc(auditLogs.id))).map((r) => ({
      id: r.id, actor: r.actor, action: r.action, resource: r.resource,
      resourceLabel: r.resourceLabel, detail: r.detail, severity: r.severity,
      createdAt: r.createdAt?.toISOString() ?? "",
    }));
  } else {
    return new Response("Unknown report type", { status: 400 });
  }

  const filename = `wellsfargo-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv(data), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
