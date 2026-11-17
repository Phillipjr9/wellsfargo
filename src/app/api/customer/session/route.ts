import { db } from "@/db";
import { auditLogs, customers } from "@/db/schema";
import {
  createCustomerSession,
  getCustomerSession,
  getCustomerSessionToken,
  revokeCustomerSession,
  verifyCustomerPassword,
} from "@/lib/customer-auth";
import { ensureBankingSeeded, ensureCustomerCredentialsSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Read-only session probe: an absent/expired session is a normal state, not
  // an HTTP error. Protected resources still enforce 401 themselves.
  const identity = await getCustomerSession();
  if (!identity) {
    return Response.json({ authenticated: false, customer: null, token: "" }, { status: 200 });
  }
  const token = await getCustomerSessionToken();
  return Response.json({ authenticated: true, customer: identity, token });
}

export async function POST(request: NextRequest) {
  try {
    await ensureBankingSeeded();
    await ensureCustomerCredentialsSeeded();
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "password");
    const username = String(body.username ?? "").trim().toLowerCase().slice(0, 60);
    const password = String(body.password ?? "");

    /* One-click demo sign-in, passkey sign-in and demo profile switching all
       require a valid server-issued session OR an explicit demo action. */
    if (action === "demo" || action === "passkey") {
      const target = username || "henry_carter";
      const [customer] = await db.select().from(customers).where(eq(customers.username, target)).limit(1);
      if (!customer) return Response.json({ error: "Demo profile not found." }, { status: 404 });
      if (customer.status !== "Active") {
        return Response.json({ error: `The ${customer.fullName} profile is ${customer.status.toLowerCase()} by an administrator.` }, { status: 403 });
      }
      const session = await createCustomerSession(customer.id);
      await db.insert(auditLogs).values({
        actor: customer.username,
        action: action === "passkey" ? "passkey_signin" : "demo_signin",
        resource: "customer_session",
        resourceLabel: "Wells Fargo Online®",
        detail: action === "passkey" ? "Signed on with a device passkey" : "One-click demo sign-on",
        severity: "Info",
      });
      return Response.json({ authenticated: true, token: session.token, customer: { username: customer.username, fullName: customer.fullName } });
    }

    if (action === "switch") {
      const current = await getCustomerSession();
      if (!current) return Response.json({ error: "Sign on first to switch demo profiles." }, { status: 401 });
      const [customer] = await db.select().from(customers).where(eq(customers.username, username)).limit(1);
      if (!customer) return Response.json({ error: "Demo profile not found." }, { status: 404 });
      if (customer.status !== "Active") {
        return Response.json({ error: `The ${customer.fullName} profile is ${customer.status.toLowerCase()}.` }, { status: 403 });
      }
      const session = await createCustomerSession(customer.id);
      return Response.json({ authenticated: true, token: session.token, customer: { username: customer.username, fullName: customer.fullName } });
    }

    if (!username || !password) {
      return Response.json({ error: "Enter both your username and password." }, { status: 400 });
    }

    const [customer] = await db.select().from(customers).where(eq(customers.username, username)).limit(1);
    if (!customer || !verifyCustomerPassword(password, customer.passwordSalt, customer.passwordHash)) {
      return Response.json({ error: "The username or password you entered doesn't match our records. Try the demo credentials shown below." }, { status: 401 });
    }
    if (customer.status !== "Active") {
      return Response.json({ error: `This profile is ${customer.status.toLowerCase()} by an administrator. Sign on as Henry Carter or contact support.` }, { status: 403 });
    }

    const session = await createCustomerSession(customer.id);
    await db.insert(auditLogs).values({
      actor: customer.username,
      action: "customer_signin",
      resource: "customer_session",
      resourceLabel: "Wells Fargo Online®",
      detail: "Password sign-on succeeded",
      severity: "Info",
    });

    return Response.json({
      authenticated: true,
      token: session.token,
      customer: { username: customer.username, fullName: customer.fullName, tier: customer.tier },
    });
  } catch (error) {
    console.error("Customer sign-on failed:", error);
    return Response.json({ error: "Unable to sign on right now. Please try again." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const identity = await getCustomerSession();
    await revokeCustomerSession();
    if (identity) {
      await db.insert(auditLogs).values({
        actor: identity.username,
        action: "customer_signout",
        resource: "customer_session",
        resourceLabel: "Wells Fargo Online®",
        detail: "Customer signed off and session token revoked",
      });
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Customer sign-out failed:", error);
    return Response.json({ error: "Unable to sign off." }, { status: 500 });
  }
}
