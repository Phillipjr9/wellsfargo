import { db } from "@/db";
import { accounts, customers, statements, transactions } from "@/db/schema";
import { ensureBankingSeeded } from "@/db/seed";
import { getCustomerSession } from "@/lib/customer-auth";
import { eq } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const dynamic = "force-dynamic";

const money = (v: unknown) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v) || 0);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureBankingSeeded();
  const url = new URL(request.url);
  const userParam = (url.searchParams.get("user") ?? "").trim().slice(0, 60);
  const session = await getCustomerSession();
  let customerId = session?.id ?? null;
  if (!customerId && userParam) {
    const [found] = await db.select({ id: customers.id }).from(customers).where(eq(customers.username, userParam)).limit(1);
    customerId = found?.id ?? null;
  }
  if (!customerId) return new Response("Sign on to download statements.", { status: 401 });

  const { id } = await params;
  const statementId = Number(id);
  if (!Number.isInteger(statementId)) return new Response("Invalid statement id.", { status: 400 });

  const [row] = await db
    .select({
      statement: statements,
      account: accounts,
      customerName: customers.fullName,
    })
    .from(statements)
    .innerJoin(accounts, eq(statements.accountId, accounts.id))
    .innerJoin(customers, eq(accounts.customerId, customers.id))
    .where(eq(statements.id, statementId))
    .limit(1);

  if (!row || row.account.customerId !== customerId) {
    return new Response("Statement not found.", { status: 404 });
  }

  await db.update(statements).set({ viewed: true }).where(eq(statements.id, statementId));

  const recent = await db
    .select()
    .from(transactions)
    .where(eq(transactions.accountId, row.account.id))
    .limit(14);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const red = rgb(0.843, 0.118, 0.157);
  const dark = rgb(0.078, 0.078, 0.078);
  const gray = rgb(0.42, 0.4, 0.4);

  let y = 752;
  const line = (text: string, size = 10, font = regular, color = dark, gap = 16) => {
    page.drawText(text.slice(0, 105), { x: 48, y, size, font, color });
    y -= gap;
  };

  page.drawRectangle({ x: 0, y: 762, width: 612, height: 30, color: red });
  page.drawText("WELLS FARGO", { x: 48, y: 772, size: 13, font: bold, color: rgb(1, 1, 1) });
  line(row.statement.documentType, 19, bold, dark, 26);
  line(row.statement.period, 12, regular, gray, 30);

  line(`Account holder: ${row.customerName}`, 11, bold);
  line(`Account: ${row.account.name}  ${row.account.maskedNumber}`, 10);
  line(`Product: ${row.account.productLine}`, 10);
  line(`Issued: ${row.statement.issuedOn}`, 10);
  line(`Rate / pricing: ${row.account.rateOrApr}`, 10, regular, dark, 24);

  page.drawRectangle({ x: 48, y: y - 4, width: 516, height: 2, color: red });
  y -= 22;
  line("ACCOUNT SUMMARY", 11, bold, dark, 20);
  line(`Current balance: ${money(row.account.balance)}`, 10);
  line(`Available balance: ${money(row.account.availableBalance)}`, 10);
  if (row.account.creditLimit) line(`Credit limit: ${money(row.account.creditLimit)}`, 10);
  y -= 16;

  line("RECENT ACTIVITY", 11, bold, dark, 20);
  for (const tx of recent) {
    const amount = Number(tx.amount) >= 0 ? `+${money(tx.amount)}` : money(tx.amount);
    line(`${tx.postedDate.padEnd(12)}  ${tx.description.slice(0, 52).padEnd(52)}  ${amount}`, 8.5, regular, dark, 14);
    if (y < 90) break;
  }

  y = Math.min(y, 76);
  page.drawRectangle({ x: 48, y: y - 14, width: 516, height: 1, color: gray });
  line("This document was generated in the Wells Fargo Online interactive demo environment.", 8, regular, gray, 12);
  line("Member FDIC. Equal Housing Lender. Not a real bank statement.", 8, regular, gray, 12);

  const bytes = await pdf.save();
  const filename = `wellsfargo-${row.statement.period.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${row.account.maskedNumber.replace(/\D/g, "")}.pdf`;

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
