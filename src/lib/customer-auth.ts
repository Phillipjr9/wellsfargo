import { db } from "@/db";
import { customerSessions, customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

export const CUSTOMER_COOKIE = "wf_customer_session";
export const CUSTOMER_SESSION_TTL_HOURS = 8;

export const DEMO_PASSWORD = "demo1234";
export const DEMO_USERNAME = "henry_carter";

export type CustomerIdentity = {
  id: number;
  username: string;
  fullName: string;
  email: string;
  tier: string;
  status: string;
};

export function hashCustomerPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
}

export function verifyCustomerPassword(password: string, salt: string, expectedHash: string) {
  if (!salt || !expectedHash) return false;
  try {
    const actual = Buffer.from(hashCustomerPassword(password, salt), "hex");
    const expected = Buffer.from(expectedHash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function createSessionToken() {
  return createHash("sha256").update(randomBytes(48).toString("hex")).digest("hex");
}

export async function getCustomerSessionTokens(): Promise<string[]> {
  const candidates: string[] = [];
  try {
    const headerList = await headers();
    const auth = headerList.get("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
    if (match) candidates.push(match[1].trim());
  } catch {
    /* ignore */
  }
  try {
    const store = await cookies();
    const cookieToken = store.get(CUSTOMER_COOKIE)?.value;
    if (cookieToken) candidates.push(cookieToken);
  } catch {
    /* ignore */
  }
  return [...new Set(candidates.filter(Boolean))];
}

export async function getCustomerSessionToken(): Promise<string> {
  return (await getCustomerSessionTokens())[0] ?? "";
}

export async function getCustomerSession(): Promise<CustomerIdentity | null> {
  try {
    for (const token of await getCustomerSessionTokens()) {
      const rows = await db
        .select({
          id: customers.id,
          username: customers.username,
          fullName: customers.fullName,
          email: customers.email,
          tier: customers.tier,
          status: customers.status,
          expiresAt: customerSessions.expiresAt,
        })
        .from(customerSessions)
        .innerJoin(customers, eq(customerSessions.customerId, customers.id))
        .where(eq(customerSessions.token, token))
        .limit(1);

      const row = rows[0];
      if (!row || new Date(row.expiresAt).getTime() <= Date.now()) continue;
      if (row.status !== "Active") continue;

      return {
        id: row.id,
        username: row.username,
        fullName: row.fullName,
        email: row.email,
        tier: row.tier,
        status: row.status,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function createCustomerSession(customerId: number) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_TTL_HOURS * 3600 * 1000);
  await db.insert(customerSessions).values({ token, customerId, expiresAt });
  await db.update(customers).set({ lastSignInAt: new Date() }).where(eq(customers.id, customerId));

  // Best-effort cookie for top-level browsing; the bearer token is authoritative.
  try {
    const store = await cookies();
    store.set(CUSTOMER_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
  } catch {
    /* ignore */
  }
  return { token, expiresAt };
}

export async function revokeCustomerSession() {
  for (const token of await getCustomerSessionTokens()) {
    await db.delete(customerSessions).where(eq(customerSessions.token, token));
  }
  try {
    const store = await cookies();
    store.delete(CUSTOMER_COOKIE);
  } catch {
    /* ignore */
  }
}
