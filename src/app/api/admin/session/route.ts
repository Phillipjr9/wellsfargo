import { db } from "@/db";
import { adminSessions, adminUsers, auditLogs } from "@/db/schema";
import { ensureAdminHierarchySeeded, ensureAdminSeeded } from "@/db/seed";
import { ADMIN_COOKIE, SESSION_TTL_HOURS, createToken, getAdminSession, getSessionToken, getSessionTokens, verifyPassword, writeAudit } from "@/lib/admin-auth";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureAdminHierarchySeeded();
  // Read-only session probe: no active session is a normal state (HTTP 200),
  // so browser consoles stay clean. Protected APIs still return 401.
  const admin = await getAdminSession();
  if (!admin) {
    return Response.json({ authenticated: false, admin: null, token: "" }, { status: 200 });
  }
  const token = await getSessionToken();
  return Response.json({ authenticated: true, admin, token });
}

export async function POST(request: NextRequest) {
  try {
    await ensureAdminSeeded();
    await ensureAdminHierarchySeeded();
    const body = (await request.json()) as Record<string, unknown>;
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!username || !password) {
      return Response.json({ error: "Enter your administrator username and password." }, { status: 400 });
    }

    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
    if (admin && admin.status !== "Active") {
      return Response.json({ error: "This administrator account is suspended. Contact your Super Admin." }, { status: 403 });
    }

    if (!admin || !verifyPassword(password, admin.passwordSalt, admin.passwordHash)) {
      await db.insert(auditLogs).values({
        actor: username || "unknown",
        action: "login_failed",
        resource: "admin_session",
        resourceLabel: "Super Admin Console",
        detail: "Invalid administrator credentials supplied",
        severity: "High",
      });
      return Response.json({ error: "Invalid credentials. Access attempt has been logged." }, { status: 401 });
    }

    const token = createToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000);
    await db.insert(adminSessions).values({
      token,
      adminUserId: admin.id,
      userAgent: (request.headers.get("user-agent") ?? "").slice(0, 240),
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 60) ?? "local",
      expiresAt,
    });
    await db.update(adminUsers).set({ lastSignInAt: new Date() }).where(eq(adminUsers.id, admin.id));
    await writeAudit({
      actor: admin.username,
      action: "login",
      resource: "admin_session",
      resourceLabel: "Super Admin Console",
      detail: `Authenticated session created, expires in ${SESSION_TTL_HOURS} hours`,
      severity: "Medium",
    });

    const store = await cookies();
    // Deliberately omit `secure`: preview environments are frequently embedded
    // over plain HTTP, where a Secure cookie is discarded and login loops.
    store.set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "lax", expires: expiresAt, path: "/" });

    return Response.json({
      authenticated: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        fullName: admin.fullName,
        role: admin.role,
        roleType: admin.roleType,
        parentAdminId: admin.parentAdminId,
        status: admin.status,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Admin sign-in failed:", error);
    return Response.json({ error: "Unable to sign in right now." }, { status: 500 });
  }
}

export async function DELETE() {
  const admin = await getAdminSession();
  const tokens = await getSessionTokens();
  for (const token of tokens) {
    await db.delete(adminSessions).where(eq(adminSessions.token, token));
  }
  if (admin) {
    await writeAudit({
      actor: admin.username,
      action: "logout",
      resource: "admin_session",
      resourceLabel: "Super Admin Console",
      detail: "Administrator signed out and session tokens revoked",
    });
  }
  try {
    const store = await cookies();
    store.delete(ADMIN_COOKIE);
  } catch {
    /* ignore */
  }
  return Response.json({ ok: true });
}
