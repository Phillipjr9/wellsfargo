import { db } from "@/db";
import {
  accounts,
  appointments,
  auditLogs,
  bills,
  branches,
  cards,
  contentSettings,
  customerAlerts,
  customers,
  fraudReports,
  productInquiries,
  siteSearchItems,
  statements,
  transactions,
  zelleRecipients,
} from "@/db/schema";
import { ensureAdminSeeded, ensureBankingSeeded, ensureBranchesSeeded, ensureSearchSeeded } from "@/db/seed";
import { AdminAuthError, requireSuperAdmin } from "@/lib/admin-auth";
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

async function guard() {
  try {
    await requireSuperAdmin();
    return null;
  } catch (error) {
    if (error instanceof AdminAuthError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
}

export async function GET(request: NextRequest) {
  const denied = await guard();
  if (denied) return denied;

  await Promise.all([ensureBankingSeeded(), ensureBranchesSeeded(), ensureSearchSeeded(), ensureAdminSeeded()]);

  const sp = request.nextUrl.searchParams;
  const resource = sp.get("resource") ?? "customers";
  const q = (sp.get("q") ?? "").trim().slice(0, 120);
  const status = (sp.get("status") ?? "").trim();
  const type = (sp.get("type") ?? "").trim();
  const limit = Math.min(Number(sp.get("limit") ?? 250) || 250, 500);

  try {
    if (resource === "customers") {
      const conds: SQL[] = [];
      if (q) {
        const match = or(
          ilike(customers.fullName, `%${q}%`),
          ilike(customers.username, `%${q}%`),
          ilike(customers.email, `%${q}%`),
          ilike(customers.phone, `%${q}%`),
          ilike(customers.tier, `%${q}%`),
        );
        if (match) conds.push(match);
      }
      if (status) conds.push(eq(customers.status, status));
      if (type) conds.push(eq(customers.tier, type));

      const rows = await db
        .select({
          id: customers.id,
          username: customers.username,
          fullName: customers.fullName,
          email: customers.email,
          phone: customers.phone,
          tier: customers.tier,
          status: customers.status,
          kycStatus: customers.kycStatus,
          twoFactorEnabled: customers.twoFactorEnabled,
          passkeyEnabled: customers.passkeyEnabled,
          homeBranchCode: customers.homeBranchCode,
          relationshipSince: customers.relationshipSince,
          lastSignInAt: customers.lastSignInAt,
          createdAt: customers.createdAt,
          accountCount: sql<number>`(select count(*)::int from ${accounts} where ${accounts.customerId} = ${customers.id})`,
          totalDeposits: sql<string>`(select coalesce(sum(${accounts.balance}::numeric),0) from ${accounts} where ${accounts.customerId} = ${customers.id} and ${accounts.accountType} in ('Checking','Savings','CD','Business Checking','Business Savings'))`,
          totalCreditUsed: sql<string>`(select coalesce(sum(${accounts.balance}::numeric),0) from ${accounts} where ${accounts.customerId} = ${customers.id} and ${accounts.accountType} like '%Credit Card%')`,
          totalAum: sql<string>`(select coalesce(sum(${accounts.balance}::numeric),0) from ${accounts} where ${accounts.customerId} = ${customers.id} and ${accounts.accountType} in ('Investment','Trust'))`,
        })
        .from(customers)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(asc(customers.id))
        .limit(limit);

      return Response.json({ rows }, { headers: { "Cache-Control": "no-store" } });
    }

    if (resource === "accounts") {
      const conds: SQL[] = [];
      if (q) {
        const match = or(
          ilike(accounts.name, `%${q}%`),
          ilike(accounts.maskedNumber, `%${q}%`),
          ilike(accounts.productLine, `%${q}%`),
          ilike(accounts.accountKey, `%${q}%`),
        );
        if (match) conds.push(match);
      }
      if (status) conds.push(eq(accounts.status, status));
      if (type) conds.push(eq(accounts.accountType, type));

      const rows = await db
        .select({
          id: accounts.id,
          accountKey: accounts.accountKey,
          name: accounts.name,
          nickname: accounts.nickname,
          maskedNumber: accounts.maskedNumber,
          accountType: accounts.accountType,
          productLine: accounts.productLine,
          balance: accounts.balance,
          availableBalance: accounts.availableBalance,
          creditLimit: accounts.creditLimit,
          rateOrApr: accounts.rateOrApr,
          monthlyPayment: accounts.monthlyPayment,
          nextPaymentDate: accounts.nextPaymentDate,
          status: accounts.status,
          openedOn: accounts.openedOn,
          customerId: accounts.customerId,
          customerName: customers.fullName,
          customerTier: customers.tier,
          customerStatus: customers.status,
        })
        .from(accounts)
        .innerJoin(customers, eq(accounts.customerId, customers.id))
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(sql`${accounts.balance}::numeric`))
        .limit(limit);

      const types = await db.selectDistinct({ accountType: accounts.accountType }).from(accounts);
      return Response.json({ rows, facets: types.map((t) => t.accountType) }, { headers: { "Cache-Control": "no-store" } });
    }

    if (resource === "transactions") {
      const conds: SQL[] = [];
      if (q) {
        const match = or(ilike(transactions.description, `%${q}%`), ilike(transactions.category, `%${q}%`));
        if (match) conds.push(match);
      }
      if (status) conds.push(eq(transactions.status, status));

      const rows = await db
        .select({
          id: transactions.id,
          postedDate: transactions.postedDate,
          description: transactions.description,
          category: transactions.category,
          amount: transactions.amount,
          status: transactions.status,
          flagged: transactions.flagged,
          createdAt: transactions.createdAt,
          accountId: transactions.accountId,
          accountName: accounts.name,
          accountMasked: accounts.maskedNumber,
          customerName: customers.fullName,
          customerUsername: customers.username,
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .innerJoin(customers, eq(accounts.customerId, customers.id))
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(transactions.id))
        .limit(limit);

      return Response.json({ rows }, { headers: { "Cache-Control": "no-store" } });
    }

    if (resource === "appointments") {
      const conds: SQL[] = [];
      if (q) {
        const match = or(
          ilike(appointments.fullName, `%${q}%`),
          ilike(appointments.topic, `%${q}%`),
          ilike(appointments.branchName, `%${q}%`),
          ilike(appointments.confirmationCode, `%${q}%`),
        );
        if (match) conds.push(match);
      }
      if (status) conds.push(eq(appointments.status, status));
      const rows = await db
        .select()
        .from(appointments)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(appointments.id))
        .limit(limit);
      return Response.json({ rows }, { headers: { "Cache-Control": "no-store" } });
    }

    if (resource === "fraud") {
      const conds: SQL[] = [];
      if (q) {
        const match = or(
          ilike(fraudReports.contactEmail, `%${q}%`),
          ilike(fraudReports.incidentType, `%${q}%`),
          ilike(fraudReports.summary, `%${q}%`),
          ilike(fraudReports.referenceCode, `%${q}%`),
        );
        if (match) conds.push(match);
      }
      if (status) conds.push(eq(fraudReports.status, status));
      const rows = await db
        .select()
        .from(fraudReports)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(fraudReports.id))
        .limit(limit);
      return Response.json({ rows }, { headers: { "Cache-Control": "no-store" } });
    }

    if (resource === "inquiries") {
      const conds: SQL[] = [];
      if (q) {
        const match = or(
          ilike(productInquiries.applicantName, `%${q}%`),
          ilike(productInquiries.productName, `%${q}%`),
          ilike(productInquiries.email, `%${q}%`),
          ilike(productInquiries.referenceCode, `%${q}%`),
        );
        if (match) conds.push(match);
      }
      if (status) conds.push(eq(productInquiries.status, status));
      const rows = await db
        .select()
        .from(productInquiries)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(productInquiries.id))
        .limit(limit);
      return Response.json({ rows }, { headers: { "Cache-Control": "no-store" } });
    }

    if (resource === "branches") {
      const rows = await db.select().from(branches).orderBy(asc(branches.state), asc(branches.city)).limit(limit);
      return Response.json({ rows }, { headers: { "Cache-Control": "no-store" } });
    }

    if (resource === "searchIndex") {
      const conds: SQL[] = [];
      if (q) {
        const match = or(ilike(siteSearchItems.title, `%${q}%`), ilike(siteSearchItems.url, `%${q}%`), ilike(siteSearchItems.keywords, `%${q}%`));
        if (match) conds.push(match);
      }
      const rows = await db
        .select()
        .from(siteSearchItems)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(asc(siteSearchItems.id))
        .limit(limit);
      return Response.json({ rows }, { headers: { "Cache-Control": "no-store" } });
    }

    if (resource === "settings") {
      const rows = await db.select().from(contentSettings);
      return Response.json({ rows }, { headers: { "Cache-Control": "no-store" } });
    }

    if (resource === "audit") {
      const conds: SQL[] = [];
      if (q) {
        const match = or(ilike(auditLogs.actor, `%${q}%`), ilike(auditLogs.action, `%${q}%`), ilike(auditLogs.resource, `%${q}%`), ilike(auditLogs.detail, `%${q}%`));
        if (match) conds.push(match);
      }
      if (status) conds.push(eq(auditLogs.severity, status));
      const rows = await db
        .select()
        .from(auditLogs)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(auditLogs.id))
        .limit(limit);
      return Response.json({ rows }, { headers: { "Cache-Control": "no-store" } });
    }

    if (resource === "cards") {
      const rows = await db
        .select({
          id: cards.id,
          cardName: cards.cardName,
          network: cards.network,
          last4: cards.last4,
          expires: cards.expires,
          status: cards.status,
          dailySpendLimit: cards.dailySpendLimit,
          rewardsPoints: cards.rewardsPoints,
          contactlessEnabled: cards.contactlessEnabled,
          onlinePurchasesEnabled: cards.onlinePurchasesEnabled,
          internationalEnabled: cards.internationalEnabled,
          digitalWallets: cards.digitalWallets,
          accountName: accounts.name,
          customerName: customers.fullName,
        })
        .from(cards)
        .innerJoin(accounts, eq(cards.accountId, accounts.id))
        .innerJoin(customers, eq(accounts.customerId, customers.id))
        .orderBy(asc(cards.id))
        .limit(limit);
      return Response.json({ rows }, { headers: { "Cache-Control": "no-store" } });
    }

    if (resource === "customerDetail") {
      const customerId = Number(sp.get("id"));
      if (!Number.isInteger(customerId)) return Response.json({ error: "Customer id required." }, { status: 400 });

      const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
      if (!customer) return Response.json({ error: "Customer not found." }, { status: 404 });

      const custAccounts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.customerId, customerId))
        .orderBy(asc(accounts.id));
      const ids = custAccounts.map((a) => a.id);

      const [custCards, custStatements, custTxs, custAlerts, custBills, custRecipients, custAudit] = await Promise.all([
        ids.length ? db.select().from(cards).where(inArray(cards.accountId, ids)).orderBy(asc(cards.id)) : Promise.resolve([]),
        ids.length
          ? db.select().from(statements).where(inArray(statements.accountId, ids)).orderBy(desc(statements.id))
          : Promise.resolve([]),
        ids.length
          ? db.select().from(transactions).where(inArray(transactions.accountId, ids)).orderBy(desc(transactions.id)).limit(40)
          : Promise.resolve([]),
        db.select().from(customerAlerts).where(eq(customerAlerts.customerId, customerId)).orderBy(asc(customerAlerts.id)),
        db.select().from(bills).where(eq(bills.customerId, customerId)).orderBy(asc(bills.id)),
        db.select().from(zelleRecipients).where(eq(zelleRecipients.customerId, customerId)).orderBy(asc(zelleRecipients.id)),
        db
          .select()
          .from(auditLogs)
          .where(or(ilike(auditLogs.actor, customer.username), ilike(auditLogs.resourceLabel, `%${customer.fullName}%`)))
          .orderBy(desc(auditLogs.id))
          .limit(10),
      ]);

      return Response.json(
        {
          customer,
          accounts: custAccounts,
          cards: custCards,
          statements: custStatements,
          transactions: custTxs,
          alerts: custAlerts,
          bills: custBills,
          recipients: custRecipients,
          audit: custAudit,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return Response.json({ error: `Unknown resource "${resource}".` }, { status: 400 });
  } catch (error) {
    console.error("Admin data query failed:", error);
    return Response.json({ rows: [], error: "Unable to load data." }, { status: 500 });
  }
}
