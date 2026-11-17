import { db } from "@/db";
import { adminSessions, adminUsers, auditLogs, customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

export const ADMIN_COOKIE = "wf_admin_session";
export const SESSION_TTL_HOURS = 8;

export type AdminIdentity = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  roleType: "super_admin" | "limited_admin" | "auditor";
  parentAdminId: number | null;
  status: string;
  email: string;
};

export const SUPER_ADMIN = "super_admin";
export const LIMITED_ADMIN = "limited_admin";

export function isSuperAdmin(admin: AdminIdentity | null): boolean {
  return admin?.roleType === SUPER_ADMIN;
}

export function canCreateAdmins(admin: AdminIdentity | null): boolean {
  return isSuperAdmin(admin);
}

/** Returns null for a Super Admin (all customers) or an array of owned customer IDs. */
export async function getAdminCustomerScope(admin: AdminIdentity): Promise<number[] | null> {
  if (isSuperAdmin(admin)) return null;
  const rows = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.assignedAdminId, admin.id));
  return rows.map((r) => r.id);
}

export async function adminCanManageCustomer(admin: AdminIdentity, customerId: number): Promise<boolean> {
  const scope = await getAdminCustomerScope(admin);
  return scope === null || scope.includes(customerId);
}

export function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

export function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = Buffer.from(hashPassword(password, salt), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createToken() {
  return createHash("sha256").update(randomBytes(48).toString("hex")).digest("hex");
}

/** Prefer the explicit Authorization bearer token; also consider the cookie. */
export async function getSessionTokens(): Promise<string[]> {
  const candidates: string[] = [];
  try {
    const headerList = await headers();
    const auth = headerList.get("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
    if (match) candidates.push(match[1].trim());
  } catch {
    /* headers() unavailable in some contexts */
  }
  try {
    const store = await cookies();
    const cookieToken = store.get(ADMIN_COOKIE)?.value;
    if (cookieToken) candidates.push(cookieToken);
  } catch {
    /* ignore */
  }
  return [...new Set(candidates.filter(Boolean))];
}

export async function getSessionToken(): Promise<string> {
  return (await getSessionTokens())[0] ?? "";
}

export async function getAdminSession(): Promise<AdminIdentity | null> {
  try {
    for (const token of await getSessionTokens()) {
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
          expiresAt: adminSessions.expiresAt,
        })
        .from(adminSessions)
        .innerJoin(adminUsers, eq(adminSessions.adminUserId, adminUsers.id))
        .where(eq(adminSessions.token, token))
        .limit(1);

      const row = rows[0];
      // Compare in JS to avoid timestamp-with/without-timezone mismatches.
      if (!row || new Date(row.expiresAt).getTime() <= Date.now()) continue;

      if (row.status !== "Active") continue;
      return {
        id: row.id,
        username: row.username,
        fullName: row.fullName,
        role: row.role,
        roleType: (row.roleType === "super_admin" ? "super_admin" : row.roleType === "auditor" ? "auditor" : "limited_admin"),
        parentAdminId: row.parentAdminId,
        status: row.status,
        email: row.email,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminIdentity> {
  const admin = await getAdminSession();
  if (!admin) {
    throw new AdminAuthError("An active administrator session is required.");
  }
  return admin;
}

/** Super Admin only; used for admin creation, suspension, and global settings. */
export async function requireSuperAdmin(): Promise<AdminIdentity> {
  const admin = await requireAdmin();
  if (!isSuperAdmin(admin)) {
    throw new AdminAuthError("Only a Super Admin may perform this action. Limited Admins cannot manage other administrators.");
  }
  return admin;
}

export class AdminAuthError extends Error {}

export async function writeAudit(entry: {
  actor: string;
  action: string;
  resource: string;
  resourceLabel?: string;
  detail?: string;
  severity?: string;
}) {
  await db.insert(auditLogs).values({
    actor: entry.actor,
    action: entry.action,
    resource: entry.resource,
    resourceLabel: entry.resourceLabel ?? null,
    detail: entry.detail ?? null,
    severity: entry.severity ?? "Info",
  });
}
