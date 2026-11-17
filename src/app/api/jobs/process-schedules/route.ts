import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { ensureEngagementSeeded } from "@/db/seed";
import { getAdminSession, isSuperAdmin } from "@/lib/admin-auth";
import { processDueSchedules } from "@/lib/scheduled-transfers";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureEngagementSeeded();
  const admin = await getAdminSession();
  if (!admin) return Response.json({ error: "Admin session required." }, { status: 401 });
  if (!isSuperAdmin(admin)) return Response.json({ error: "Only a Super Admin may access global operations." }, { status: 403 });
  return Response.json({ hint: "POST to this endpoint to run the recurring transfer job." });
}

export async function POST() {
  await ensureEngagementSeeded();
  const admin = await getAdminSession();
  if (!admin) return Response.json({ error: "Admin session required." }, { status: 401 });
  if (!isSuperAdmin(admin)) return Response.json({ error: "Only a Super Admin may access global operations." }, { status: 403 });
  if (admin.role.includes("Read-Only")) {
    return Response.json({ error: "Read-only auditors cannot run operational jobs." }, { status: 403 });
  }

  const result = await processDueSchedules();
  await db.insert(auditLogs).values({
    actor: admin.username,
    action: "run_scheduled_transfers",
    resource: "scheduled_transfers",
    resourceLabel: "Recurring transfer job",
    detail: `${result.processed} transfers processed, ${result.skipped} skipped`,
    severity: "Medium",
  });

  return Response.json({ ok: true, ...result, ranBy: admin.username, ranAt: new Date().toISOString() });
}
