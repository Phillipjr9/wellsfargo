import { db } from "@/db";
import { adminSessions, adminUsers, auditLogs, customers } from "@/db/schema";
import { ensureAdminHierarchySeeded } from "@/db/seed";
import { AdminAuthError, hashPassword, isSuperAdmin, requireAdmin, requireSuperAdmin, writeAudit } from "@/lib/admin-auth";
import { asc, eq, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewer = await requireAdmin();
    await ensureAdminHierarchySeeded();
    const rows = await db
      .select({
        id: adminUsers.id,
        username: adminUsers.username,
        fullName: adminUsers.fullName,
        role: adminUsers.role,
        roleType: adminUsers.roleType,
        parentAdminId: adminUsers.parentAdminId,
        status: adminUsers.status,
        email: adminUsers.email,
        lastSignInAt: adminUsers.lastSignInAt,
        createdAt: adminUsers.createdAt,
        customerCount: sql<number>`(select count(*)::int from ${customers} where ${customers.assignedAdminId} = ${adminUsers.id})`,
      })
      .from(adminUsers)
      .orderBy(asc(adminUsers.id));

    const visible = isSuperAdmin(viewer) ? rows : rows.filter((r) => r.id === viewer.id || r.id === viewer.parentAdminId);
    return Response.json({
      admins: visible,
      viewer: { id: viewer.id, roleType: viewer.roleType, username: viewer.username, fullName: viewer.fullName },
      canCreateAdmins: isSuperAdmin(viewer),
    });
  } catch (error) {
    if (error instanceof AdminAuthError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: "Unable to load administrator team." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Hard server-side rule: Limited Admins can never create other admins.
    const superAdmin = await requireSuperAdmin();
    await ensureAdminHierarchySeeded();
    const body = (await request.json()) as Record<string, unknown>;
    const fullName = String(body.fullName ?? "").trim().slice(0, 120);
    const username = String(body.username ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 40);
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
    const password = String(body.password ?? "SupportAgent!2026");
    const roleLabel = String(body.role ?? "Limited Admin — Support Agent").trim().slice(0, 80);

    if (!fullName || username.length < 3 || !email) {
      return Response.json({ error: "Enter a full name, username, and email for the Limited Admin." }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: "Temporary password must be at least 8 characters." }, { status: 400 });
    }
    const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
    if (existing) return Response.json({ error: "That administrator username already exists." }, { status: 409 });

    const salt = randomBytes(16).toString("hex");
    const [created] = await db
      .insert(adminUsers)
      .values({
        username,
        passwordSalt: salt,
        passwordHash: hashPassword(password, salt),
        fullName,
        role: roleLabel,
        roleType: "limited_admin",
        parentAdminId: superAdmin.id,
        status: "Active",
        email,
      })
      .returning();

    await writeAudit({
      actor: superAdmin.username,
      action: "limited_admin_created",
      resource: "admin_users",
      resourceLabel: `${created.fullName} (${created.username})`,
      detail: `Limited Admin created under ${superAdmin.fullName}`,
      severity: "High",
    });

    return Response.json({
      ok: true,
      admin: { id: created.id, username: created.username, fullName: created.fullName, role: created.role, email: created.email },
      temporaryPassword: password,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return Response.json({ error: error.message }, { status: (error as Error).message.includes("Only a Super Admin") ? 403 : 401 });
    }
    return Response.json({ error: "Unable to create administrator." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const superAdmin = await requireSuperAdmin();
    const body = (await request.json()) as Record<string, unknown>;
    const id = Number(body.id);
    const status = String(body.status ?? "") === "Suspended" ? "Suspended" : "Active";
    if (!Number.isInteger(id)) return Response.json({ error: "Invalid administrator." }, { status: 400 });
    if (id === superAdmin.id) return Response.json({ error: "A Super Admin cannot suspend their own account." }, { status: 400 });
    const [target] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
    if (!target) return Response.json({ error: "Administrator not found." }, { status: 404 });
    if (target.roleType === "super_admin") return Response.json({ error: "Super Admin accounts cannot be suspended from this screen." }, { status: 403 });
    await db.update(adminUsers).set({ status }).where(eq(adminUsers.id, id));
    if (status === "Suspended") await db.delete(adminSessions).where(eq(adminSessions.adminUserId, id));
    await writeAudit({
      actor: superAdmin.username,
      action: "admin_status_update",
      resource: "admin_users",
      resourceLabel: `${target.fullName} (${target.username})`,
      detail: `Status changed to ${status}`,
      severity: "High",
    });
    return Response.json({ ok: true, status });
  } catch (error) {
    if (error instanceof AdminAuthError) return Response.json({ error: error.message }, { status: 403 });
    return Response.json({ error: "Unable to update administrator." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const superAdmin = await requireSuperAdmin();
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id)) return Response.json({ error: "Invalid administrator." }, { status: 400 });
    if (id === superAdmin.id) return Response.json({ error: "A Super Admin cannot delete their own account." }, { status: 400 });
    const [target] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
    if (!target) return Response.json({ error: "Administrator not found." }, { status: 404 });
    if (target.roleType === "super_admin") return Response.json({ error: "Super Admin accounts cannot be deleted." }, { status: 403 });
    await db.delete(adminSessions).where(eq(adminSessions.adminUserId, id));
    await db.delete(adminUsers).where(eq(adminUsers.id, id));
    await writeAudit({
      actor: superAdmin.username,
      action: "limited_admin_deleted",
      resource: "admin_users",
      resourceLabel: `${target.fullName} (${target.username})`,
      detail: "Limited Admin removed; their customers were unassigned for reassignment",
      severity: "High",
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) return Response.json({ error: error.message }, { status: 403 });
    return Response.json({ error: "Unable to delete administrator." }, { status: 500 });
  }
}
