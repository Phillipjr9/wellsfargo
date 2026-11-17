import { db } from "@/db";
import { accounts, scheduledTransfers, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";

function addInterval(dateStr: string, frequency: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) d.setTime(Date.now());
  switch (frequency) {
    case "Weekly":
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case "Biweekly":
      d.setUTCDate(d.getUTCDate() + 14);
      break;
    case "Quarterly":
      d.setUTCMonth(d.getUTCMonth() + 3);
      break;
    case "Monthly":
    default:
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
  }
  return d.toISOString().slice(0, 10);
}

export type ProcessResult = { processed: number; skipped: number; details: string[] };

/** Idempotent job: executes every active schedule whose nextRunDate has arrived. */
export async function processDueSchedules(customerId?: number): Promise<ProcessResult> {
  const all = await db.select().from(scheduledTransfers).where(eq(scheduledTransfers.status, "Active"));
  const today = new Date().toISOString().slice(0, 10);
  const result: ProcessResult = { processed: 0, skipped: 0, details: [] };

  for (const schedule of all) {
    if (customerId !== undefined && schedule.customerId !== customerId) continue;
    if (schedule.nextRunDate > today) continue;

    const [source] = await db.select().from(accounts).where(eq(accounts.accountKey, schedule.fromAccountKey)).limit(1);
    const targetKey = schedule.toAccountKey ?? "";
    const [dest] = targetKey
      ? await db.select().from(accounts).where(eq(accounts.accountKey, targetKey)).limit(1)
      : [undefined];

    const amount = Number(schedule.amount);
    if (!source || Number(source.availableBalance) < amount || amount <= 0) {
      result.skipped += 1;
      result.details.push(`Skipped “${schedule.label}” — insufficient available balance.`);
      continue;
    }

    const newSourceBalance = (Number(source.balance) - amount).toFixed(2);
    const newSourceAvailable = (Number(source.availableBalance) - amount).toFixed(2);
    await db
      .update(accounts)
      .set({ balance: newSourceBalance, availableBalance: newSourceAvailable })
      .where(eq(accounts.id, source.id));

    if (dest) {
      const isCredit = dest.accountType.includes("Credit Card");
      await db
        .update(accounts)
        .set({
          balance: isCredit
            ? Math.max(0, Number(dest.balance) - amount).toFixed(2)
            : (Number(dest.balance) + amount).toFixed(2),
          availableBalance: isCredit
            ? (Number(dest.availableBalance) + amount).toFixed(2)
            : (Number(dest.availableBalance) + amount).toFixed(2),
        })
        .where(eq(accounts.id, dest.id));
    }

    await db.insert(transactions).values([
      {
        accountId: source.id,
        postedDate: today,
        description: `Scheduled: ${schedule.label}`,
        category: "Scheduled Transfer",
        amount: (-amount).toFixed(2),
        runningBalance: newSourceAvailable,
        status: "Completed",
      },
      ...(dest
        ? [
            {
              accountId: dest.id,
              postedDate: today,
              description: `Scheduled deposit: ${schedule.label}`,
              category: "Scheduled Transfer",
              amount: amount.toFixed(2),
              status: "Completed",
              runningBalance: null as string | null,
            },
          ]
        : []),
    ]);

    await db
      .update(scheduledTransfers)
      .set({ nextRunDate: addInterval(schedule.nextRunDate, schedule.frequency), lastRunAt: new Date() })
      .where(eq(scheduledTransfers.id, schedule.id));

    result.processed += 1;
    result.details.push(`Processed “${schedule.label}” for $${amount.toFixed(2)}.`);
  }

  return result;
}
