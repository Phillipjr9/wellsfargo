import { db } from "@/db";
import {
  accounts,
  appointments,
  auditLogs,
  branches,
  cards,
  contentSettings,
  customers,
  fraudReports,
  productInquiries,
  siteSearchItems,
  transactions,
} from "@/db/schema";
import { ensureAdminSeeded, ensureBankingSeeded, ensureBranchesSeeded, ensureSearchSeeded } from "@/db/seed";
import { AdminAuthError, requireSuperAdmin, writeAudit, type AdminIdentity } from "@/lib/admin-auth";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type Body = {
  resource: string;
  action: string;
  id?: number;
  payload?: Record<string, unknown>;
};

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

function money(value: number) {
  return value.toFixed(2);
}

async function guard(): Promise<{ admin: AdminIdentity } | Response> {
  try {
    const admin = await requireSuperAdmin();
    if (admin.role.includes("Read-Only")) {
      return Response.json({ error: "Read-Only Auditors can view data but cannot make changes." }, { status: 403 });
    }
    return { admin };
  } catch (error) {
    if (error instanceof AdminAuthError) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await guard();
  if (auth instanceof Response) return auth;
  const { admin } = auth;

  await Promise.all([ensureBankingSeeded(), ensureBranchesSeeded(), ensureSearchSeeded(), ensureAdminSeeded()]);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { resource, action, id, payload = {} } = body;
  if (!resource || !action) return Response.json({ error: "Resource and action are required." }, { status: 400 });

  try {
    /* ------------------------------ Customers ------------------------------ */
    if (resource === "customers" && id) {
      const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
      if (!customer) return Response.json({ error: "Customer not found." }, { status: 404 });

      if (action === "setStatus") {
        const status = str(payload.status, 24);
        if (!["Active", "Locked", "Closed", "Restricted"].includes(status)) {
          return Response.json({ error: "Unsupported customer status." }, { status: 400 });
        }
        await db.update(customers).set({ status }).where(eq(customers.id, id));
        await writeAudit({
          actor: admin.username,
          action: "customer_status_update",
          resource: "customers",
          resourceLabel: `${customer.fullName} (${customer.username})`,
          detail: `Status changed from ${customer.status} to ${status}`,
          severity: status === "Active" ? "Medium" : "High",
        });
        return Response.json({ ok: true, status });
      }

      if (action === "setTier") {
        const tier = str(payload.tier, 40);
        if (!["Standard", "Premier", "Private Client", "Business"].includes(tier)) {
          return Response.json({ error: "Unsupported relationship tier." }, { status: 400 });
        }
        await db.update(customers).set({ tier }).where(eq(customers.id, id));
        await writeAudit({
          actor: admin.username,
          action: "customer_tier_update",
          resource: "customers",
          resourceLabel: `${customer.fullName} (${customer.username})`,
          detail: `Relationship tier changed from ${customer.tier} to ${tier}`,
          severity: "Medium",
        });
        return Response.json({ ok: true, tier });
      }

      if (action === "resetSecurity") {
        await db
          .update(customers)
          .set({ twoFactorEnabled: true, passkeyEnabled: false, kycStatus: "Verified" })
          .where(eq(customers.id, id));
        await writeAudit({
          actor: admin.username,
          action: "security_reset",
          resource: "customers",
          resourceLabel: `${customer.fullName} (${customer.username})`,
          detail: "Two-step verification re-enabled, passkeys cleared, KYC marked Verified",
          severity: "High",
        });
        return Response.json({ ok: true });
      }

      if (action === "updateContact") {
        await db
          .update(customers)
          .set({ email: str(payload.email, 160) || customer.email, phone: str(payload.phone, 40) || customer.phone })
          .where(eq(customers.id, id));
        await writeAudit({
          actor: admin.username,
          action: "contact_update",
          resource: "customers",
          resourceLabel: `${customer.fullName} (${customer.username})`,
          detail: `Contact details updated to ${str(payload.email, 160)} / ${str(payload.phone, 40)}`,
        });
        return Response.json({ ok: true });
      }
    }

    /* ------------------------------ Accounts ------------------------------- */
    if (resource === "accounts" && id) {
      const [account] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
      if (!account) return Response.json({ error: "Account not found." }, { status: 404 });

      if (action === "adjustBalance") {
        const delta = num(payload.delta);
        if (delta === 0) return Response.json({ error: "Enter a non-zero adjustment amount." }, { status: 400 });
        const nextBalance = Number(account.balance) + delta;
        const nextAvailable = Number(account.availableBalance) + delta;
        if (nextBalance < 0 || nextAvailable < 0) {
          return Response.json({ error: "Adjustment would produce a negative balance." }, { status: 400 });
        }
        await db
          .update(accounts)
          .set({ balance: money(nextBalance), availableBalance: money(nextAvailable) })
          .where(eq(accounts.id, id));
        await db.insert(transactions).values({
          accountId: id,
          postedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
          description: `Administrative balance adjustment by ${admin.username}`,
          category: "Adjustment",
          amount: money(delta),
          runningBalance: money(nextAvailable),
          status: "Posted",
        });
        await writeAudit({
          actor: admin.username,
          action: "balance_adjustment",
          resource: "accounts",
          resourceLabel: `${account.name} ${account.maskedNumber}`,
          detail: `Balance adjusted by ${delta >= 0 ? "+" : ""}$${delta.toFixed(2)} to $${nextBalance.toFixed(2)}`,
          severity: "High",
        });
        return Response.json({ ok: true, balance: money(nextBalance) });
      }

      if (action === "setStatus") {
        const status = str(payload.status, 24);
        if (!["Open", "Restricted", "Frozen", "Closed", "Dormant"].includes(status)) {
          return Response.json({ error: "Unsupported account status." }, { status: 400 });
        }
        await db.update(accounts).set({ status }).where(eq(accounts.id, id));
        await writeAudit({
          actor: admin.username,
          action: "account_status_update",
          resource: "accounts",
          resourceLabel: `${account.name} ${account.maskedNumber}`,
          detail: `Account status changed from ${account.status} to ${status}`,
          severity: status === "Open" ? "Medium" : "High",
        });
        return Response.json({ ok: true, status });
      }

      if (action === "setRate") {
        const rate = str(payload.rate, 60);
        await db.update(accounts).set({ rateOrApr: rate }).where(eq(accounts.id, id));
        await writeAudit({
          actor: admin.username,
          action: "rate_update",
          resource: "accounts",
          resourceLabel: `${account.name} ${account.maskedNumber}`,
          detail: `Pricing changed from ${account.rateOrApr} to ${rate}`,
          severity: "Medium",
        });
        return Response.json({ ok: true });
      }
    }

    /* ---------------------------- Transactions ----------------------------- */
    if (resource === "transactions" && id) {
      const [tx] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
      if (!tx) return Response.json({ error: "Transaction not found." }, { status: 404 });

      if (action === "flag") {
        await db.update(transactions).set({ flagged: !tx.flagged }).where(eq(transactions.id, id));
        await writeAudit({
          actor: admin.username,
          action: tx.flagged ? "unflag_transaction" : "flag_transaction",
          resource: "transactions",
          resourceLabel: tx.description,
          detail: `Transaction #${tx.id} ${tx.flagged ? "cleared" : "flagged"} for fraud review ($${Number(tx.amount).toFixed(2)})`,
          severity: "High",
        });
        return Response.json({ ok: true, flagged: !tx.flagged });
      }

      if (action === "void") {
        await db.update(transactions).set({ status: "Voided" }).where(eq(transactions.id, id));
        const [account] = await db.select().from(accounts).where(eq(accounts.id, tx.accountId)).limit(1);
        if (account) {
          await db
            .update(accounts)
            .set({
              balance: money(Number(account.balance) - Number(tx.amount)),
              availableBalance: money(Number(account.availableBalance) - Number(tx.amount)),
            })
            .where(eq(accounts.id, account.id));
        }
        await writeAudit({
          actor: admin.username,
          action: "void_transaction",
          resource: "transactions",
          resourceLabel: tx.description,
          detail: `Transaction #${tx.id} voided and funds reversed to account balance`,
          severity: "High",
        });
        return Response.json({ ok: true });
      }

      if (action === "resolveDispute") {
        const status = str(payload.status, 32) || "Posted";
        await db.update(transactions).set({ status, flagged: false }).where(eq(transactions.id, id));
        await writeAudit({
          actor: admin.username,
          action: "dispute_resolved",
          resource: "transactions",
          resourceLabel: tx.description,
          detail: `Dispute status set to ${status}`,
          severity: "Medium",
        });
        return Response.json({ ok: true, status });
      }
    }

    /* ------------------------------ Cards ---------------------------------- */
    if (resource === "cards" && id) {
      const [card] = await db.select().from(cards).where(eq(cards.id, id)).limit(1);
      if (!card) return Response.json({ error: "Card not found." }, { status: 404 });
      if (action === "setStatus") {
        const status = str(payload.status, 24);
        if (!["Active", "Locked", "Replaced", "Canceled"].includes(status)) {
          return Response.json({ error: "Unsupported card status." }, { status: 400 });
        }
        await db.update(cards).set({ status }).where(eq(cards.id, id));
        await writeAudit({
          actor: admin.username,
          action: "card_status_update",
          resource: "cards",
          resourceLabel: `${card.cardName} ····${card.last4}`,
          detail: `Card status changed from ${card.status} to ${status}`,
          severity: status === "Active" ? "Medium" : "High",
        });
        return Response.json({ ok: true, status });
      }
      if (action === "setLimit") {
        await db.update(cards).set({ dailySpendLimit: money(num(payload.limit, 1000)) }).where(eq(cards.id, id));
        await writeAudit({
          actor: admin.username,
          action: "card_limit_update",
          resource: "cards",
          resourceLabel: `${card.cardName} ····${card.last4}`,
          detail: `Daily spend limit set to $${num(payload.limit).toFixed(2)}`,
        });
        return Response.json({ ok: true });
      }
    }

    /* --------------------------- Appointments ------------------------------ */
    if (resource === "appointments" && id) {
      const [appt] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
      if (!appt) return Response.json({ error: "Appointment not found." }, { status: 404 });
      const nextStatus =
        action === "approve"
          ? "Confirmed"
          : action === "deny"
            ? "Declined"
            : action === "cancel"
              ? "Canceled"
              : action === "reschedule"
                ? "Rescheduled"
                : null;
      if (!nextStatus) return Response.json({ error: "Unsupported appointment action." }, { status: 400 });

      await db
        .update(appointments)
        .set({
          status: nextStatus,
          appointmentDate: action === "reschedule" ? str(payload.date, 32) || appt.appointmentDate : appt.appointmentDate,
          appointmentTime: action === "reschedule" ? str(payload.time, 32) || appt.appointmentTime : appt.appointmentTime,
        })
        .where(eq(appointments.id, id));

      await writeAudit({
        actor: admin.username,
        action: `appointment_${action}`,
        resource: "appointments",
        resourceLabel: `${appt.fullName} — ${appt.topic}`,
        detail: `Appointment ${appt.confirmationCode} marked ${nextStatus}`,
        severity: nextStatus === "Confirmed" ? "Info" : "Medium",
      });
      return Response.json({ ok: true, status: nextStatus });
    }

    /* ------------------------------ Fraud ---------------------------------- */
    if (resource === "fraud" && id) {
      const [report] = await db.select().from(fraudReports).where(eq(fraudReports.id, id)).limit(1);
      if (!report) return Response.json({ error: "Fraud report not found." }, { status: 404 });
      const nextStatus =
        action === "acknowledge"
          ? "Acknowledged"
          : action === "investigate"
            ? "Under Investigation"
            : action === "resolve"
              ? "Resolved"
              : action === "close"
                ? "Closed — No Loss"
                : null;
      if (!nextStatus) return Response.json({ error: "Unsupported fraud action." }, { status: 400 });

      const refund = action === "resolve" ? num(payload.refund) : Number(report.refundAmount);
      await db
        .update(fraudReports)
        .set({ status: nextStatus, refundAmount: money(Math.max(0, refund)) })
        .where(eq(fraudReports.id, id));

      await writeAudit({
        actor: admin.username,
        action: `fraud_${action}`,
        resource: "fraud",
        resourceLabel: `${report.referenceCode} — ${report.incidentType}`,
        detail:
          action === "resolve"
            ? `Case resolved with $${Math.max(0, refund).toFixed(2)} customer reimbursement`
            : `Case status set to ${nextStatus}`,
        severity: "High",
      });
      return Response.json({ ok: true, status: nextStatus });
    }

    /* ---------------------------- Inquiries -------------------------------- */
    if (resource === "inquiries" && id) {
      const [inq] = await db.select().from(productInquiries).where(eq(productInquiries.id, id)).limit(1);
      if (!inq) return Response.json({ error: "Application not found." }, { status: 404 });
      const nextStatus =
        action === "approve"
          ? "Approved"
          : action === "deny"
            ? "Declined"
            : action === "requestInfo"
              ? "More Information Requested"
              : null;
      if (!nextStatus) return Response.json({ error: "Unsupported application action." }, { status: 400 });

      await db.update(productInquiries).set({ status: nextStatus }).where(eq(productInquiries.id, id));
      await writeAudit({
        actor: admin.username,
        action: `application_${action}`,
        resource: "inquiries",
        resourceLabel: `${inq.applicantName} — ${inq.productName}`,
        detail: `Application ${inq.referenceCode} set to ${nextStatus}`,
        severity: nextStatus === "Approved" ? "Medium" : "Info",
      });
      return Response.json({ ok: true, status: nextStatus });
    }

    /* ------------------------------ Branches ------------------------------- */
    if (resource === "branches") {
      if (action === "create") {
        const code = str(payload.code, 32).toUpperCase();
        if (!code) return Response.json({ error: "Branch code is required." }, { status: 400 });
        const [created] = await db
          .insert(branches)
          .values({
            code,
            name: str(payload.name, 160),
            address: str(payload.address, 200),
            city: str(payload.city, 100),
            state: str(payload.state, 20).toUpperCase(),
            zip: str(payload.zip, 16),
            phone: str(payload.phone, 32),
            lobbyHours: str(payload.lobbyHours, 160) || "Mon–Fri 9:00 AM – 5:00 PM",
            saturdayHours: str(payload.saturdayHours, 120) || "Closed Saturday",
            has24HrAtm: Boolean(payload.has24HrAtm ?? true),
            hasDriveUp: Boolean(payload.hasDriveUp),
            hasNotary: Boolean(payload.hasNotary ?? true),
            hasSafeDeposit: Boolean(payload.hasSafeDeposit),
            hasPremierBanker: Boolean(payload.hasPremierBanker),
            hasSpanish: Boolean(payload.hasSpanish ?? true),
            status: str(payload.status, 24) || "Open",
          })
          .returning();
        await writeAudit({
          actor: admin.username,
          action: "branch_create",
          resource: "branches",
          resourceLabel: `${created.name} (${created.city}, ${created.state})`,
          detail: `New branch location added with code ${created.code}`,
          severity: "Medium",
        });
        return Response.json({ ok: true, row: created });
      }

      if (id && action === "update") {
        const [branch] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
        if (!branch) return Response.json({ error: "Branch not found." }, { status: 404 });
        await db
          .update(branches)
          .set({
            name: str(payload.name, 160) || branch.name,
            address: str(payload.address, 200) || branch.address,
            city: str(payload.city, 100) || branch.city,
            state: (str(payload.state, 20) || branch.state).toUpperCase(),
            zip: str(payload.zip, 16) || branch.zip,
            phone: str(payload.phone, 32) || branch.phone,
            lobbyHours: str(payload.lobbyHours, 160) || branch.lobbyHours,
            saturdayHours: str(payload.saturdayHours, 120) || branch.saturdayHours,
            status: str(payload.status, 24) || branch.status,
            has24HrAtm: payload.has24HrAtm === undefined ? branch.has24HrAtm : Boolean(payload.has24HrAtm),
            hasDriveUp: payload.hasDriveUp === undefined ? branch.hasDriveUp : Boolean(payload.hasDriveUp),
            hasNotary: payload.hasNotary === undefined ? branch.hasNotary : Boolean(payload.hasNotary),
            hasSafeDeposit: payload.hasSafeDeposit === undefined ? branch.hasSafeDeposit : Boolean(payload.hasSafeDeposit),
            hasPremierBanker: payload.hasPremierBanker === undefined ? branch.hasPremierBanker : Boolean(payload.hasPremierBanker),
            hasSpanish: payload.hasSpanish === undefined ? branch.hasSpanish : Boolean(payload.hasSpanish),
          })
          .where(eq(branches.id, id));
        await writeAudit({
          actor: admin.username,
          action: "branch_update",
          resource: "branches",
          resourceLabel: branch.name,
          detail: "Branch profile and service flags updated",
        });
        return Response.json({ ok: true });
      }

      if (id && action === "delete") {
        const [branch] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
        if (!branch) return Response.json({ error: "Branch not found." }, { status: 404 });
        await db.delete(branches).where(eq(branches.id, id));
        await writeAudit({
          actor: admin.username,
          action: "branch_delete",
          resource: "branches",
          resourceLabel: `${branch.name} (${branch.city}, ${branch.state})`,
          detail: `Branch ${branch.code} removed from the locator network`,
          severity: "High",
        });
        return Response.json({ ok: true });
      }
    }

    /* ---------------------------- Search index ----------------------------- */
    if (resource === "searchIndex") {
      if (action === "create") {
        const url = str(payload.url, 400);
        if (!url.startsWith("/")) return Response.json({ error: "Internal URLs must start with /." }, { status: 400 });
        const [created] = await db
          .insert(siteSearchItems)
          .values({
            title: str(payload.title, 160),
            description: str(payload.description, 1000),
            category: str(payload.category, 80),
            keywords: str(payload.keywords, 600),
            url,
          })
          .onConflictDoNothing()
          .returning();
        await writeAudit({
          actor: admin.username,
          action: "search_index_create",
          resource: "searchIndex",
          resourceLabel: str(payload.title, 160),
          detail: `Search entry published at ${url}`,
        });
        return Response.json({ ok: true, row: created ?? null });
      }

      if (id && action === "update") {
        await db
          .update(siteSearchItems)
          .set({
            title: str(payload.title, 160),
            description: str(payload.description, 1000),
            category: str(payload.category, 80),
            keywords: str(payload.keywords, 600),
            url: str(payload.url, 400),
          })
          .where(eq(siteSearchItems.id, id));
        await writeAudit({
          actor: admin.username,
          action: "search_index_update",
          resource: "searchIndex",
          resourceLabel: str(payload.title, 160),
          detail: "Search catalog entry edited",
        });
        return Response.json({ ok: true });
      }

      if (id && action === "delete") {
        const [row] = await db.select().from(siteSearchItems).where(eq(siteSearchItems.id, id)).limit(1);
        await db.delete(siteSearchItems).where(eq(siteSearchItems.id, id));
        await writeAudit({
          actor: admin.username,
          action: "search_index_delete",
          resource: "searchIndex",
          resourceLabel: row?.title ?? `Entry #${id}`,
          detail: `Search entry removed from catalog (${row?.url ?? "unknown url"})`,
          severity: "Medium",
        });
        return Response.json({ ok: true });
      }
    }

    /* ------------------------------ Settings ------------------------------- */
    if (resource === "settings" && action === "update") {
      const key = str(payload.key, 60) || "rates";
      const value = typeof payload.value === "string" ? payload.value : JSON.stringify(payload.value ?? {});
      const [existing] = await db.select().from(contentSettings).where(eq(contentSettings.key, key)).limit(1);
      if (existing) {
        await db.update(contentSettings).set({ value, updatedAt: new Date() }).where(eq(contentSettings.key, key));
      } else {
        await db.insert(contentSettings).values({ key, value });
      }
      await writeAudit({
        actor: admin.username,
        action: "content_update",
        resource: "settings",
        resourceLabel: key,
        detail: `Published new ${key} configuration (${value.length} characters)`,
        severity: "Medium",
      });
      return Response.json({ ok: true });
    }

    /* -------------------------------- Audit -------------------------------- */
    if (resource === "audit" && action === "clear") {
      if (!admin.role.includes("Super Admin")) {
        return Response.json({ error: "Only a Super Admin may purge the audit trail." }, { status: 403 });
      }
      const [countRow] = await db.select({ n: auditLogs.id }).from(auditLogs).limit(1);
      await db.delete(auditLogs);
      await writeAudit({
        actor: admin.username,
        action: "audit_purge",
        resource: "audit",
        resourceLabel: "Audit trail",
        detail: `Audit history purged${countRow ? ` starting from entry #${countRow.n}` : ""}`,
        severity: "High",
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: `Unsupported operation: ${resource}.${action}` }, { status: 400 });
  } catch (error) {
    console.error("Admin mutation failed:", error);
    await writeAudit({
      actor: admin.username,
      action: "mutation_error",
      resource,
      resourceLabel: action,
      detail: error instanceof Error ? error.message : "Unknown error",
      severity: "High",
    }).catch(() => {});
    return Response.json({ error: "Unable to complete that operation." }, { status: 500 });
  }
}
