import { db } from "@/db";
import { accounts, adminUsers, auditLogs, notifications, supportMessages, transactions, customers } from "@/db/schema";
import { ensureAdminHierarchySeeded } from "@/db/seed";
import {
  AdminAuthError,
  getAdminCustomerScope,
  hashPassword,
  isSuperAdmin,
  requireAdmin,
  writeAudit,
  type AdminIdentity,
} from "@/lib/admin-auth";
import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

async function loadCustomers(admin: AdminIdentity) {
  const scope = await getAdminCustomerScope(admin);
  const conds: SQL[] = [];
  if (scope && scope.length === 0) return [];
  if (scope) conds.push(inArray(customers.id, scope));
  return db
    .select({
      id: customers.id,
      username: customers.username,
      fullName: customers.fullName,
      email: customers.email,
      phone: customers.phone,
      tier: customers.tier,
      status: customers.status,
      assignedAdminId: customers.assignedAdminId,
      relationshipSince: customers.relationshipSince,
      createdAt: customers.createdAt,
      accountCount: sql<number>`(select count(*)::int from ${accounts} where ${accounts.customerId} = ${customers.id})`,
      deposits: sql<string>`(select coalesce(sum(${accounts.balance}::numeric),0) from ${accounts} where ${accounts.customerId} = ${customers.id} and ${accounts.accountType} in ('Checking','Savings','CD'))`,
      adminName: sql<string | null>`(select ${adminUsers.fullName} from ${adminUsers} where ${adminUsers.id} = ${customers.assignedAdminId})`,
    })
    .from(customers)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(customers.id));
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    await ensureAdminHierarchySeeded();
    const rows = await loadCustomers(admin);
    const admins = isSuperAdmin(admin)
      ? await db.select({ id: adminUsers.id, fullName: adminUsers.fullName, role: adminUsers.role }).from(adminUsers).orderBy(asc(adminUsers.id))
      : [];
    return Response.json({
      customers: rows,
      admins,
      viewer: { id: admin.id, fullName: admin.fullName, roleType: admin.roleType, username: admin.username },
      canCreateUsers: admin.roleType !== "auditor",
      canReassign: isSuperAdmin(admin),
    });
  } catch (error) {
    if (error instanceof AdminAuthError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: "Unable to load users." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (admin.roleType === "auditor") {
      return Response.json({ error: "Read-Only Auditors cannot create users." }, { status: 403 });
    }
    await ensureAdminHierarchySeeded();
    const body = (await request.json()) as Record<string, unknown>;
    const fullName = String(body.fullName ?? "").trim().slice(0, 120);
    const username = String(body.username ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 40);
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
    const phone = String(body.phone ?? "").trim().slice(0, 40);
    const tier = String(body.tier ?? "Standard").trim().slice(0, 40);
    const password = String(body.password ?? "WelcomeBank!2026");
    const opening = Math.max(0, Math.min(100000, Number(body.openingDeposit) || 500));

    if (!fullName || username.length < 3 || !email || !phone) {
      return Response.json({ error: "Enter the user's full name, username (3+ chars), email, and phone." }, { status: 400 });
    }
    if (!["Standard", "Premier", "Private Client", "Business"].includes(tier)) {
      return Response.json({ error: "Choose a valid relationship tier." }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: "Temporary password must be at least 8 characters." }, { status: 400 });
    }
    const [existing] = await db.select({ id: customers.id }).from(customers).where(eq(customers.username, username)).limit(1);
    if (existing) return Response.json({ error: "That username is already in use." }, { status: 409 });

    // Super Admin may choose the owning admin; a Limited Admin always owns their own users.
    const requestedOwner = Number(body.assignedAdminId);
    const ownerId = isSuperAdmin(admin) && Number.isInteger(requestedOwner) && requestedOwner > 0 ? requestedOwner : admin.id;
    const [owner] = await db.select().from(adminUsers).where(eq(adminUsers.id, ownerId)).limit(1);
    if (!owner) return Response.json({ error: "Selected managing admin was not found." }, { status: 400 });

    const salt = randomBytes(16).toString("hex");
    const [created] = await db
      .insert(customers)
      .values({
        username,
        passwordSalt: salt,
        passwordHash: hashPassword(password, salt),
        fullName,
        email,
        phone,
        tier,
        status: "Active",
        kycStatus: "Verified",
        twoFactorEnabled: true,
        passkeyEnabled: false,
        homeBranchCode: "SF-MONT",
        assignedAdminId: owner.id,
        relationshipSince: "Nov 2026",
        lastSignInAt: new Date(),
      })
      .returning();

    const suffix = String(1000 + ((created.id * 137) % 9000));
    const [checking, savings] = await db.insert(accounts).values([
      {
        customerId: created.id,
        accountKey: `user-${created.id}-checking-${Date.now()}`,
        name: "EVERYDAY CHECKING",
        maskedNumber: `....${suffix}`,
        accountType: "Checking",
        productLine: "Personal Checking",
        balance: opening.toFixed(2),
        availableBalance: opening.toFixed(2),
        rateOrApr: "0.01% APY",
        status: "Open",
        openedOn: "Nov 17, 2026",
      },
      {
        customerId: created.id,
        accountKey: `user-${created.id}-savings-${Date.now()}`,
        name: "WAY2SAVE SAVINGS",
        maskedNumber: `....${String(Number(suffix) + 1)}`,
        accountType: "Savings",
        productLine: "Way2Save Savings",
        balance: "100.00",
        availableBalance: "100.00",
        rateOrApr: "0.15% APY",
        status: "Open",
        openedOn: "Nov 17, 2026",
      },
    ]).returning();

    await db.insert(transactions).values([
      { accountId: checking.id, postedDate: "Today", description: "Opening Deposit — New Relationship", category: "Income", amount: opening.toFixed(2), status: "Posted", runningBalance: opening.toFixed(2) },
      { accountId: savings.id, postedDate: "Today", description: "Opening Deposit — Way2Save Savings", category: "Income", amount: "100.00", status: "Posted", runningBalance: "100.00" },
    ]);
    await db.insert(notifications).values({
      customerId: created.id,
      title: `Welcome to Wells Fargo Online®, ${fullName.split(" ")[0]}`,
      body: `Your new relationship is managed by ${owner.fullName}. Sign on to review your accounts or message your support agent.`,
      kind: "Message",
      href: "/online-banking/messages",
    });
    await db.insert(supportMessages).values({
      threadCode: `MSG-${Math.floor(10000 + Math.random() * 89999)}`,
      customerId: created.id,
      subject: `Welcome — your support agent ${owner.fullName}`,
      senderRole: "admin",
      senderName: owner.fullName,
      body: `Hello ${fullName.split(" ")[0]}, I'm ${owner.fullName}, your dedicated support agent. Reply here any time with questions about your accounts, cards, or online banking.`,
      status: "Answered",
      isReadByAdmin: true,
      assignedAdminId: owner.id,
    });

    await writeAudit({
      actor: admin.username,
      action: "user_created_by_admin",
      resource: "customers",
      resourceLabel: `${created.fullName} (${created.username})`,
      detail: `Created by ${admin.fullName}; assigned to ${owner.fullName}; $${opening.toFixed(2)} opening deposit`,
      severity: "High",
    });

    return Response.json({
      ok: true,
      customer: { id: created.id, username, fullName, email, tier, ownerName: owner.fullName },
      temporaryPassword: password,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAuthError) return Response.json({ error: error.message }, { status: 401 });
    console.error("Admin user creation failed:", error);
    return Response.json({ error: "Unable to create user right now." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!isSuperAdmin(admin)) {
      return Response.json({ error: "Only a Super Admin may reassign users or change ownership." }, { status: 403 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const id = Number(body.id);
    if (!Number.isInteger(id)) return Response.json({ error: "Invalid user." }, { status: 400 });
    const [target] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!target) return Response.json({ error: "User not found." }, { status: 404 });

    const newStatus = String(body.status ?? "").trim();
    const newOwner = Number(body.assignedAdminId);
    const updates: Record<string, unknown> = {};
    if (["Active", "Locked", "Closed", "Restricted"].includes(newStatus)) updates.status = newStatus;
    if (Number.isInteger(newOwner) && newOwner > 0) {
      const [owner] = await db.select().from(adminUsers).where(eq(adminUsers.id, newOwner)).limit(1);
      if (!owner) return Response.json({ error: "Selected admin not found." }, { status: 400 });
      updates.assignedAdminId = newOwner;
    }
    if (Object.keys(updates).length === 0) return Response.json({ error: "No valid changes supplied." }, { status: 400 });
    await db.update(customers).set(updates).where(eq(customers.id, id));
    await writeAudit({
      actor: admin.username,
      action: "user_admin_update",
      resource: "customers",
      resourceLabel: `${target.fullName} (${target.username})`,
      detail: JSON.stringify(updates),
      severity: "Medium",
    });
    return Response.json({ ok: true, updates });
  } catch (error) {
    if (error instanceof AdminAuthError) return Response.json({ error: error.message }, { status: 403 });
    return Response.json({ error: "Unable to update user." }, { status: 500 });
  }
}
