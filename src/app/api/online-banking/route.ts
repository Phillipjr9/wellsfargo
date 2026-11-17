import { db } from "@/db";
import {
  accounts,
  auditLogs,
  bills,
  cards,
  customerAlerts,
  customers,
  fraudReports,
  statements,
  transactions,
  zelleRecipients,
} from "@/db/schema";
import { ensureBankingSeeded, ensureCustomerCredentialsSeeded, ensureEngagementSeeded } from "@/db/seed";
import { getCustomerSession } from "@/lib/customer-auth";
import { asc, desc, eq, inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_USER = "henry_carter";

function money(value: number) {
  return value.toFixed(2);
}

function todayShort() {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

async function loadBundle(username: string) {
  const [customer] = await db.select().from(customers).where(eq(customers.username, username)).limit(1);
  if (!customer) return null;

  const customerAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.customerId, customer.id))
    .orderBy(asc(accounts.id));

  const accountIds = customerAccounts.map((a) => a.id);

  const [txs, cardRows, statementRows] = await Promise.all([
    accountIds.length
      ? db.select().from(transactions).where(inArray(transactions.accountId, accountIds)).orderBy(desc(transactions.id))
      : Promise.resolve([]),
    accountIds.length
      ? db.select().from(cards).where(inArray(cards.accountId, accountIds)).orderBy(asc(cards.id))
      : Promise.resolve([]),
    accountIds.length
      ? db.select().from(statements).where(inArray(statements.accountId, accountIds)).orderBy(desc(statements.id))
      : Promise.resolve([]),
  ]);

  const [alertRows, billRows, recipientRows, profileOptions] = await Promise.all([
    db.select().from(customerAlerts).where(eq(customerAlerts.customerId, customer.id)).orderBy(asc(customerAlerts.id)),
    db.select().from(bills).where(eq(bills.customerId, customer.id)).orderBy(asc(bills.id)),
    db.select().from(zelleRecipients).where(eq(zelleRecipients.customerId, customer.id)).orderBy(asc(zelleRecipients.id)),
    db
      .select({
        username: customers.username,
        fullName: customers.fullName,
        tier: customers.tier,
        status: customers.status,
      })
      .from(customers)
      .orderBy(asc(customers.id)),
  ]);

  return {
    customer: {
      id: customer.id,
      username: customer.username,
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      tier: customer.tier,
      status: customer.status,
      kycStatus: customer.kycStatus,
      twoFactorEnabled: customer.twoFactorEnabled,
      passkeyEnabled: customer.passkeyEnabled,
      homeBranchCode: customer.homeBranchCode,
      relationshipSince: customer.relationshipSince,
      lastSignInAt: customer.lastSignInAt,
    },
    accounts: customerAccounts.map((a) => ({
      ...a,
      cards: cardRows.filter((c) => c.accountId === a.id),
      statements: statementRows.filter((s) => s.accountId === a.id),
    })),
    transactions: txs,
    alerts: alertRows,
    bills: billRows,
    recipients: recipientRows,
    profiles: profileOptions,
  };
}

export async function GET(request: NextRequest) {
  try {
    await ensureBankingSeeded();
    await ensureCustomerCredentialsSeeded();
    await ensureEngagementSeeded();

    const requested = (request.nextUrl.searchParams.get("user") ?? "").trim().slice(0, 60);
    const session = await getCustomerSession();
    const username = requested || session?.username || DEFAULT_USER;

    const bundle = (await loadBundle(username)) ?? (await loadBundle(DEFAULT_USER));
    return Response.json(
      { profile: bundle, sessionUser: session?.username ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Online banking load failed:", error);
    return Response.json({ profile: null, error: "Unable to load account summary." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureBankingSeeded();
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const session = await getCustomerSession();
    const username = String(body.user ?? session?.username ?? DEFAULT_USER).trim().slice(0, 60) || DEFAULT_USER;

    const [customer] = await db.select().from(customers).where(eq(customers.username, username)).limit(1);
    if (!customer) return Response.json({ error: "Profile not found." }, { status: 404 });

    if (customer.status === "Locked" || customer.status === "Closed") {
      return Response.json(
        { error: `This profile is ${customer.status.toLowerCase()} by an administrator. Contact support or unlock it in the Super Admin Console.` },
        { status: 403 },
      );
    }

    const amount = Number(body.amount);
    const memo = String(body.memo ?? "").trim().slice(0, 80);

    if (action === "transfer" || action === "billpay" || action === "zelle" || action === "loanpay") {
      if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
        return Response.json({ error: "Enter an amount between $0.01 and $100,000." }, { status: 400 });
      }
      const [source] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.accountKey, String(body.fromAccount ?? "")))
        .limit(1);
      if (!source || source.customerId !== customer.id) {
        return Response.json({ error: "Select a valid source account." }, { status: 400 });
      }
      if (source.status !== "Open") {
        return Response.json({ error: `${source.name} is currently ${source.status.toLowerCase()}.` }, { status: 400 });
      }
      if (Number(source.availableBalance) < amount) {
        return Response.json({ error: `Insufficient available balance in ${source.name}.` }, { status: 400 });
      }

      const newSourceAvailable = money(Number(source.availableBalance) - amount);
      const newSourceBalance = money(Number(source.balance) - amount);
      await db
        .update(accounts)
        .set({ availableBalance: newSourceAvailable, balance: newSourceBalance })
        .where(eq(accounts.id, source.id));

      let description = "";
      let category = "Transfer";
      let destAccount: typeof source | undefined;
      let destTxAmount = money(amount);
      let destTxDesc = "";

      if (action === "transfer") {
        const [dest] = await db
          .select()
          .from(accounts)
          .where(eq(accounts.accountKey, String(body.toAccount ?? "")))
          .limit(1);
        if (!dest || dest.id === source.id || dest.customerId !== customer.id) {
          return Response.json({ error: "Choose two different accounts." }, { status: 400 });
        }
        const isCredit = dest.accountType.includes("Credit Card");
        const isLoan = ["Mortgage", "Auto Loan", "Personal Loan", "Business Line of Credit"].includes(dest.accountType);
        const nextBal = isCredit || isLoan ? money(Math.max(0, Number(dest.balance) - amount)) : money(Number(dest.balance) + amount);
        const nextAvail = isLoan ? nextBal : money(Number(dest.availableBalance) + amount);
        await db.update(accounts).set({ balance: nextBal, availableBalance: nextAvail }).where(eq(accounts.id, dest.id));

        description = `${isCredit ? "Online Card Payment to" : "Online Transfer to"} ${dest.name} ${dest.maskedNumber}${memo ? ` — ${memo}` : ""}`;
        category = isCredit ? "Payment" : isLoan ? "Loan Payment" : "Transfer";
        destAccount = dest;
        destTxAmount = isCredit || isLoan ? money(-amount) : money(amount);
        destTxDesc = isCredit || isLoan ? `Online Payment from ${source.name} ${source.maskedNumber}` : `Online Transfer from ${source.name} ${source.maskedNumber}`;
      } else if (action === "billpay") {
        const payee = String(body.payee ?? "").trim().slice(0, 120);
        if (!payee) return Response.json({ error: "Enter a payee name." }, { status: 400 });
        description = `Bill Pay — ${payee}${memo ? ` (${memo})` : ""}`;
        category = "Bill Pay";
        const customerBills = await db.select().from(bills).where(eq(bills.customerId, customer.id));
        const match = customerBills.find((b) => b.payeeName === payee);
        if (match) {
          const remaining = Math.max(0, Number(match.amountDue) - amount);
          await db.update(bills).set({ amountDue: money(remaining) }).where(eq(bills.id, match.id));
        }
      } else if (action === "zelle") {
        const recipient = String(body.recipient ?? "").trim().slice(0, 120);
        if (!recipient) return Response.json({ error: "Choose a Zelle® recipient." }, { status: 400 });
        description = `Zelle® to ${recipient}${memo ? ` — ${memo}` : ""}`;
        category = "Zelle";
        const customerRecs = await db.select().from(zelleRecipients).where(eq(zelleRecipients.customerId, customer.id));
        const rec = customerRecs.find((r) => r.recipientName === recipient);
        if (rec) {
          await db.update(zelleRecipients).set({ lastSentOn: todayShort() }).where(eq(zelleRecipients.id, rec.id));
        }
      } else {
        const [loan] = await db
          .select()
          .from(accounts)
          .where(eq(accounts.accountKey, String(body.toAccount ?? "")))
          .limit(1);
        if (!loan || loan.customerId !== customer.id) {
          return Response.json({ error: "Select a valid loan or credit account." }, { status: 400 });
        }
        const isCredit = loan.accountType.includes("Credit Card");
        const nextBal = money(Math.max(0, Number(loan.balance) - amount));
        const nextAvail = isCredit ? money(Number(loan.availableBalance) + amount) : nextBal;
        await db.update(accounts).set({ balance: nextBal, availableBalance: nextAvail }).where(eq(accounts.id, loan.id));
        description = `${isCredit ? "Credit Card Payment" : "Loan Payment"} — ${loan.name} ${loan.maskedNumber}`;
        category = isCredit ? "Payment" : "Loan Payment";
        destAccount = loan;
        destTxAmount = money(-amount);
        destTxDesc = `Payment Received — Thank You (from ${source.maskedNumber})`;
      }

      await db.insert(transactions).values({
        accountId: source.id,
        postedDate: "Today",
        description,
        category,
        amount: money(-amount),
        runningBalance: newSourceAvailable,
        status: action === "billpay" ? "Scheduled" : "Completed",
      });

      if (destAccount) {
        await db.insert(transactions).values({
          accountId: destAccount.id,
          postedDate: "Today",
          description: destTxDesc,
          category,
          amount: destTxAmount,
          runningBalance: destAccount.availableBalance,
          status: "Completed",
        });
      }

      await db.insert(auditLogs).values({
        actor: customer.username,
        action,
        resource: "account",
        resourceLabel: `${source.name} ${source.maskedNumber}`,
        detail: `${description} for $${amount.toFixed(2)}`,
        severity: "Info",
      });
    } else if (action === "depositCheck") {
      if (!Number.isFinite(amount) || amount <= 0 || amount > 25000) {
        return Response.json({ error: "Mobile check deposit limit is $0.01 to $25,000.00." }, { status: 400 });
      }
      const [dest] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.accountKey, String(body.toAccount ?? "")))
        .limit(1);
      if (!dest || dest.customerId !== customer.id) {
        return Response.json({ error: "Choose an eligible checking or savings account." }, { status: 400 });
      }
      const checkNo = String(body.checkNumber ?? "").replace(/\D/g, "").slice(0, 10);
      const nextBal = money(Number(dest.balance) + amount);
      const nextAvail = money(Number(dest.availableBalance) + amount);
      await db.update(accounts).set({ balance: nextBal, availableBalance: nextAvail }).where(eq(accounts.id, dest.id));
      await db.insert(transactions).values({
        accountId: dest.id,
        postedDate: "Today",
        description: `Mobile Check Deposit${checkNo ? ` #${checkNo}` : ""}${memo ? ` — ${memo}` : ""}`,
        category: "Income",
        amount: money(amount),
        runningBalance: nextAvail,
        status: "Posted",
      });
      await db.insert(auditLogs).values({
        actor: customer.username,
        action: "mobile_check_deposit",
        resource: "account",
        resourceLabel: `${dest.name} ${dest.maskedNumber}`,
        detail: `Deposited check${checkNo ? ` #${checkNo}` : ""} for $${amount.toFixed(2)}`,
        severity: "Info",
      });
    } else if (action === "redeemRewards") {
      const cardId = Number(body.cardId);
      const points = Math.floor(Number(body.points));
      const destKey = String(body.toAccount ?? "");
      if (!Number.isInteger(points) || points < 1000) {
        return Response.json({ error: "Redeem at least 1,000 points ($10.00 value)." }, { status: 400 });
      }
      const [card] = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
      if (!card || card.rewardsPoints < points) {
        return Response.json({ error: "Not enough available Wells Fargo Rewards® points." }, { status: 400 });
      }
      const [dest] = await db.select().from(accounts).where(eq(accounts.accountKey, destKey)).limit(1);
      if (!dest || dest.customerId !== customer.id) {
        return Response.json({ error: "Choose a valid destination account." }, { status: 400 });
      }
      const cashValue = points / 100;
      await db.update(cards).set({ rewardsPoints: card.rewardsPoints - points }).where(eq(cards.id, card.id));

      const isCredit = dest.accountType.includes("Credit Card");
      const nextBal = isCredit ? money(Math.max(0, Number(dest.balance) - cashValue)) : money(Number(dest.balance) + cashValue);
      const nextAvail = money(Number(dest.availableBalance) + cashValue);
      await db.update(accounts).set({ balance: nextBal, availableBalance: nextAvail }).where(eq(accounts.id, dest.id));
      await db.insert(transactions).values({
        accountId: dest.id,
        postedDate: "Today",
        description: `Wells Fargo Rewards® Redemption (${points.toLocaleString()} pts)`,
        category: "Rewards",
        amount: isCredit ? money(-cashValue) : money(cashValue),
        runningBalance: nextAvail,
        status: "Completed",
      });
      await db.insert(auditLogs).values({
        actor: customer.username,
        action: "rewards_redemption",
        resource: "card",
        resourceLabel: `${card.cardName} ····${card.last4}`,
        detail: `Redeemed ${points.toLocaleString()} pts ($${cashValue.toFixed(2)}) to ${dest.name} ${dest.maskedNumber}`,
      });
    } else if (action === "addRecipient") {
      const recipientName = String(body.recipientName ?? "").trim().slice(0, 100);
      const handle = String(body.handle ?? "").trim().slice(0, 120);
      const handleType = String(body.handleType ?? "Mobile") === "Email" ? "Email" : "Mobile";
      if (!recipientName || !handle) {
        return Response.json({ error: "Enter recipient name and U.S. mobile number or email." }, { status: 400 });
      }
      await db.insert(zelleRecipients).values({
        customerId: customer.id,
        recipientName,
        handle,
        handleType,
        favorite: Boolean(body.favorite),
      });
    } else if (action === "addPayee") {
      const payeeName = String(body.payeeName ?? "").trim().slice(0, 120);
      const acctLast4 = String(body.accountLast4 ?? "1001").replace(/\D/g, "").slice(-4) || "1001";
      const due = Math.max(0, Number(body.amountDue) || 0);
      const dueDate = String(body.dueDate ?? "May 15, 2026").trim().slice(0, 32);
      const category = String(body.category ?? "Utilities").trim().slice(0, 50);
      if (!payeeName) return Response.json({ error: "Enter a payee name." }, { status: 400 });
      await db.insert(bills).values({
        customerId: customer.id,
        payeeName,
        payeeAccountMasked: `····${acctLast4}`,
        amountDue: money(due),
        dueDate,
        autoPay: Boolean(body.autoPay),
        category,
      });
    } else if (action === "toggleAutoPay") {
      const billId = Number(body.billId);
      const [bill] = await db.select().from(bills).where(eq(bills.id, billId)).limit(1);
      if (!bill || bill.customerId !== customer.id) return Response.json({ error: "Bill not found." }, { status: 404 });
      await db.update(bills).set({ autoPay: Boolean(body.autoPay) }).where(eq(bills.id, bill.id));
    } else if (action === "disputeTx") {
      const txId = Number(body.txId);
      const reason = String(body.reason ?? "Unrecognized merchant or amount").trim().slice(0, 400);
      const [tx] = await db.select().from(transactions).where(eq(transactions.id, txId)).limit(1);
      if (!tx) return Response.json({ error: "Transaction not found." }, { status: 404 });
      await db.update(transactions).set({ flagged: true, status: "Disputed" }).where(eq(transactions.id, tx.id));
      const referenceCode = `FRD-${Math.floor(100000 + Math.random() * 900000)}`;
      await db.insert(fraudReports).values({
        referenceCode,
        incidentType: "Disputed Account Transaction",
        channel: "Wells Fargo Online® Activity",
        incidentDate: new Date().toISOString().slice(0, 10),
        contactEmail: customer.email,
        summary: `${tx.description} ($${Math.abs(Number(tx.amount)).toFixed(2)}): ${reason}`,
        relatedTransactionId: tx.id,
        status: "Under Review",
      });
      await db.insert(auditLogs).values({
        actor: customer.username,
        action: "dispute_filed",
        resource: "transactions",
        resourceLabel: `${referenceCode} — ${tx.description}`,
        detail: reason,
        severity: "High",
      });
    } else if (action === "cardControl") {
      const cardId = Number(body.cardId);
      const field = String(body.field ?? "");
      const allowed = ["status", "contactlessEnabled", "onlinePurchasesEnabled", "internationalEnabled", "dailySpendLimit"];
      if (!allowed.includes(field)) return Response.json({ error: "Unsupported card control." }, { status: 400 });
      const [card] = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
      if (!card) return Response.json({ error: "Card not found." }, { status: 404 });
      const value = body.value;
      await db
        .update(cards)
        .set(
          field === "dailySpendLimit"
            ? { dailySpendLimit: money(Number(value)) }
            : field === "status"
              ? { status: String(value) }
              : { [field]: Boolean(value) },
        )
        .where(eq(cards.id, cardId));
      await db.insert(auditLogs).values({
        actor: customer.username,
        action: "cardControl",
        resource: "card",
        resourceLabel: `${card.cardName} ····${card.last4}`,
        detail: `${field} set to ${String(value)}`,
        severity: field === "status" ? "Medium" : "Info",
      });
    } else if (action === "alertToggle") {
      const alertId = Number(body.alertId);
      const [alert] = await db.select().from(customerAlerts).where(eq(customerAlerts.id, alertId)).limit(1);
      if (!alert || alert.customerId !== customer.id) return Response.json({ error: "Alert not found." }, { status: 404 });
      await db
        .update(customerAlerts)
        .set({ enabled: Boolean(body.enabled), channel: String(body.channel ?? alert.channel) })
        .where(eq(customerAlerts.id, alertId));
    } else if (action === "statementView") {
      const statementId = Number(body.statementId);
      await db.update(statements).set({ viewed: true }).where(eq(statements.id, statementId));
    } else if (action === "profileUpdate") {
      await db
        .update(customers)
        .set({
          email: String(body.email ?? customer.email).slice(0, 160),
          phone: String(body.phone ?? customer.phone).slice(0, 40),
          twoFactorEnabled: body.twoFactorEnabled === undefined ? customer.twoFactorEnabled : Boolean(body.twoFactorEnabled),
          passkeyEnabled: body.passkeyEnabled === undefined ? customer.passkeyEnabled : Boolean(body.passkeyEnabled),
        })
        .where(eq(customers.id, customer.id));
    } else if (action === "nickname") {
      const accountId = Number(body.accountId);
      await db
        .update(accounts)
        .set({ nickname: String(body.nickname ?? "").trim().slice(0, 80) || null })
        .where(eq(accounts.id, accountId));
    } else {
      return Response.json({ error: "Unknown action." }, { status: 400 });
    }

    const profile = await loadBundle(customer.username);
    return Response.json({ profile, ok: true });
  } catch (error) {
    console.error("Online banking action failed:", error);
    return Response.json({ error: "Unable to process that request right now." }, { status: 500 });
  }
}
