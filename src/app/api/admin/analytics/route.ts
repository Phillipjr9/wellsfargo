import { db } from "@/db";
import { accounts, auditLogs, customers, searchQueries, transactions } from "@/db/schema";
import { ensureEngagementSeeded } from "@/db/seed";
import { getAdminSession, isSuperAdmin } from "@/lib/admin-auth";
import { desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return Response.json({ error: "Super Admin session required." }, { status: 401 });
  if (!isSuperAdmin(admin)) return Response.json({ error: "Only a Super Admin may access global operations." }, { status: 403 });

  await ensureEngagementSeeded();

  const [popular, volume, spend, statusMix, auditMix, recent] = await Promise.all([
    db
      .select({ query: searchQueries.query, count: sql<number>`count(*)::int`, avgResults: sql<string>`coalesce(round(avg(${searchQueries.resultCount}),1),0)` })
      .from(searchQueries)
      .groupBy(searchQueries.query)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
    db
      .select({ day: sql<string>`to_char(${searchQueries.createdAt}, 'YYYY-MM-DD')`, count: sql<number>`count(*)::int` })
      .from(searchQueries)
      .groupBy(sql`to_char(${searchQueries.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${searchQueries.createdAt}, 'YYYY-MM-DD')`),
    db
      .select({ category: transactions.category, total: sql<string>`coalesce(sum(abs(${transactions.amount}::numeric)),0)`, count: sql<number>`count(*)::int` })
      .from(transactions)
      .groupBy(transactions.category)
      .orderBy(desc(sql`sum(abs(${transactions.amount}::numeric))`))
      .limit(10),
    db.select({ status: customers.status, count: sql<number>`count(*)::int` }).from(customers).groupBy(customers.status),
    db.select({ severity: auditLogs.severity, count: sql<number>`count(*)::int` }).from(auditLogs).groupBy(auditLogs.severity),
    db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(8),
  ]);

  const [totals] = await db
    .select({
      customerCount: sql<number>`count(*)::int`,
      totalBalance: sql<string>`(select coalesce(sum(${accounts.balance}::numeric),0) from ${accounts})`,
      txCount: sql<number>`(select count(*)::int from ${transactions})`,
    })
    .from(customers);

  return Response.json(
    { generatedAt: new Date().toISOString(), popular, volume, spend, statusMix, auditMix, recent, totals },
    { headers: { "Cache-Control": "no-store" } },
  );
}
