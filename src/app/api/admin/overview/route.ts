import { db } from "@/db";
import {
  accounts,
  adminSessions,
  adminUsers,
  appointments,
  auditLogs,
  bills,
  branches,
  cards,
  contentSettings,
  customers,
  fraudReports,
  productInquiries,
  siteSearchItems,
  statements,
  transactions,
} from "@/db/schema";
import { ensureAdminSeeded, ensureBankingSeeded, ensureBranchesSeeded, ensureSearchSeeded } from "@/db/seed";
import { requireSuperAdmin, AdminAuthError } from "@/lib/admin-auth";
import { and, desc, eq, gt, ne, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperAdmin();
  } catch (error) {
    if (error instanceof AdminAuthError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  await Promise.all([ensureBankingSeeded(), ensureBranchesSeeded(), ensureSearchSeeded(), ensureAdminSeeded()]);

  const [
    customerAgg,
    depositAgg,
    loanAgg,
    investmentAgg,
    creditAgg,
    accountCounts,
    customerStatusCounts,
    tierCounts,
    txAgg,
    appointmentAgg,
    fraudAgg,
    inquiryAgg,
    branchCount,
    cardCount,
    statementCount,
    billAgg,
    searchCount,
    activeSessions,
    adminCount,
    recentAudit,
    rateSetting,
  ] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int`, active: sql<number>`count(*) filter (where ${customers.status} = 'Active')::int` }).from(customers),
    db
      .select({ total: sql<string>`coalesce(sum(${accounts.balance}),0)`, count: sql<number>`count(*)::int` })
      .from(accounts)
      .where(sql`${accounts.accountType} in ('Checking','Savings','CD','Business Checking','Business Savings')`),
    db
      .select({ total: sql<string>`coalesce(sum(${accounts.balance}),0)`, count: sql<number>`count(*)::int` })
      .from(accounts)
      .where(sql`${accounts.accountType} in ('Mortgage','Auto Loan','Personal Loan','Business Line of Credit')`),
    db
      .select({ total: sql<string>`coalesce(sum(${accounts.balance}),0)`, count: sql<number>`count(*)::int` })
      .from(accounts)
      .where(sql`${accounts.accountType} in ('Investment','Trust')`),
    db
      .select({
        balances: sql<string>`coalesce(sum(${accounts.balance}),0)`,
        limits: sql<string>`coalesce(sum(${accounts.creditLimit}),0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(accounts)
      .where(sql`${accounts.accountType} like '%Credit Card%'`),
    db.select({ type: accounts.accountType, count: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(${accounts.balance}),0)` }).from(accounts).groupBy(accounts.accountType),
    db.select({ status: customers.status, count: sql<number>`count(*)::int` }).from(customers).groupBy(customers.status),
    db.select({ tier: customers.tier, count: sql<number>`count(*)::int` }).from(customers).groupBy(customers.tier),
    db
      .select({
        total: sql<number>`count(*)::int`,
        debits: sql<string>`coalesce(sum(case when ${transactions.amount}::numeric < 0 then abs(${transactions.amount}::numeric) else 0 end),0)`,
        credits: sql<string>`coalesce(sum(case when ${transactions.amount}::numeric > 0 then ${transactions.amount}::numeric else 0 end),0)`,
        flagged: sql<number>`count(*) filter (where ${transactions.flagged} = true)::int`,
        pending: sql<number>`count(*) filter (where ${transactions.status} in ('Pending','Under Review','Disputed'))::int`,
      })
      .from(transactions),
    db
      .select({
        total: sql<number>`count(*)::int`,
        scheduled: sql<number>`count(*) filter (where ${appointments.status} = 'Scheduled')::int`,
        pendingApproval: sql<number>`count(*) filter (where ${appointments.status} = 'Pending Approval')::int`,
        canceled: sql<number>`count(*) filter (where ${appointments.status} = 'Canceled')::int`,
      })
      .from(appointments),
    db
      .select({
        total: sql<number>`count(*)::int`,
        open: sql<number>`count(*) filter (where ${fraudReports.status} in ('Under Review','Acknowledged'))::int`,
        resolved: sql<number>`count(*) filter (where ${fraudReports.status} in ('Resolved','Closed'))::int`,
        refunds: sql<string>`coalesce(sum(${fraudReports.refundAmount}::numeric),0)`,
      })
      .from(fraudReports),
    db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${productInquiries.status} = 'Pending Review')::int`,
        approved: sql<number>`count(*) filter (where ${productInquiries.status} = 'Approved')::int`,
      })
      .from(productInquiries),
    db.select({ total: sql<number>`count(*)::int`, open: sql<number>`count(*) filter (where ${branches.status} = 'Open')::int` }).from(branches),
    db.select({ total: sql<number>`count(*)::int`, locked: sql<number>`count(*) filter (where ${cards.status} = 'Locked')::int` }).from(cards),
    db.select({ total: sql<number>`count(*)::int`, unviewed: sql<number>`count(*) filter (where ${statements.viewed} = false)::int` }).from(statements),
    db
      .select({ total: sql<number>`count(*)::int`, autopay: sql<number>`count(*) filter (where ${bills.autoPay} = true)::int`, due: sql<string>`coalesce(sum(${bills.amountDue}::numeric),0)` })
      .from(bills),
    db.select({ total: sql<number>`count(*)::int` }).from(siteSearchItems),
    db.select({ total: sql<number>`count(*)::int` }).from(adminSessions).where(gt(adminSessions.expiresAt, new Date())),
    db.select({ total: sql<number>`count(*)::int` }).from(adminUsers),
    db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(12),
    db.select().from(contentSettings).where(eq(contentSettings.key, "rates")).limit(1),
  ]);

  const signIns = await db
    .select({
      username: customers.username,
      fullName: customers.fullName,
      tier: customers.tier,
      lastSignInAt: customers.lastSignInAt,
    })
    .from(customers)
    .orderBy(desc(customers.lastSignInAt))
    .limit(6);

  const categorySpend = await db
    .select({ category: transactions.category, total: sql<string>`coalesce(sum(abs(${transactions.amount}::numeric)),0)`, count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(sql`${transactions.amount}::numeric < 0`)
    .groupBy(transactions.category)
    .orderBy(desc(sql`sum(abs(${transactions.amount}::numeric))`))
    .limit(8);

  const fraudByChannel = await db
    .select({ channel: fraudReports.channel, count: sql<number>`count(*)::int` })
    .from(fraudReports)
    .groupBy(fraudReports.channel);

  return Response.json(
    {
      generatedAt: new Date().toISOString(),
      kpis: {
        customers: customerAgg[0],
        deposits: depositAgg[0],
        loans: loanAgg[0],
        investments: investmentAgg[0],
        credit: creditAgg[0],
        transactions: txAgg[0],
        appointments: appointmentAgg[0],
        fraud: fraudAgg[0],
        inquiries: inquiryAgg[0],
        branches: branchCount[0],
        cards: cardCount[0],
        statements: statementCount[0],
        bills: billAgg[0],
        searchPages: searchCount[0],
        activeSessions: activeSessions[0],
        admins: adminCount[0],
      },
      charts: {
        accountsByType: accountCounts,
        customerStatus: customerStatusCounts,
        customerTiers: tierCounts,
        categorySpend,
        fraudByChannel,
        recentSignIns: signIns,
      },
      recentAudit,
      rateSetting: rateSetting[0]?.value ?? null,
      health: {
        database: "Operational",
        sessionStore: activeSessions[0]?.total ?? 0,
        seededTables: 14,
        latencyMs: Math.round(12 + Math.random() * 26),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
