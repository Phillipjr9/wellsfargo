import { db } from "@/db";
import {
  accounts,
  adminUsers,
  appointments,
  auditLogs,
  bills,
  branches,
  cards,
  contentSettings,
  customerAlerts,
  customers,
  fraudReports,
  notifications,
  productInquiries,
  scheduledTransfers,
  searchQueries,
  siteSearchItems,
  supportMessages,
  statements,
  transactions,
  zelleRecipients,
} from "@/db/schema";
import { hashPassword } from "@/lib/admin-auth";
import { getAllSearchableItems } from "@/lib/search-catalog";
import { count, eq, ilike, inArray, isNull, asc } from "drizzle-orm";

/* ------------------------------------------------------------------ *
 * Search catalog + branch network
 * ------------------------------------------------------------------ */

const branchCatalog: (typeof branches.$inferInsert)[] = [
  { code: "SF-MONT", name: "Montgomery Street Main Branch", address: "420 Montgomery St", city: "San Francisco", state: "CA", zip: "94104", phone: "(415) 396-2650", lobbyHours: "Mon–Fri 9:00 AM – 5:00 PM", saturdayHours: "Sat 9:00 AM – 1:00 PM", has24HrAtm: true, hasDriveUp: false, hasNotary: true, hasSafeDeposit: true, hasPremierBanker: true, hasSpanish: true },
  { code: "SF-MKT", name: "Market & Spear Branch", address: "1 Front St", city: "San Francisco", state: "CA", zip: "94111", phone: "(415) 396-4410", lobbyHours: "Mon–Fri 9:00 AM – 5:00 PM", saturdayHours: "Closed Saturday", has24HrAtm: true, hasDriveUp: false, hasNotary: true, hasSafeDeposit: false, hasPremierBanker: true, hasSpanish: true },
  { code: "NY-HUD", name: "Hudson Yards Financial Center", address: "30 Hudson Yards", city: "New York", state: "NY", zip: "10001", phone: "(212) 214-6100", lobbyHours: "Mon–Fri 8:30 AM – 5:00 PM", saturdayHours: "Sat 9:00 AM – 2:00 PM", has24HrAtm: true, hasDriveUp: false, hasNotary: true, hasSafeDeposit: true, hasPremierBanker: true, hasSpanish: true },
  { code: "NY-42ST", name: "Grand Central 42nd Street Branch", address: "150 E 42nd St", city: "New York", state: "NY", zip: "10017", phone: "(212) 557-4290", lobbyHours: "Mon–Fri 8:30 AM – 5:00 PM", saturdayHours: "Sat 9:00 AM – 1:00 PM", has24HrAtm: true, hasDriveUp: false, hasNotary: true, hasSafeDeposit: false, hasPremierBanker: true, hasSpanish: true },
  { code: "CLT-TRY", name: "One Wells Fargo Center Branch", address: "301 S Tryon St", city: "Charlotte", state: "NC", zip: "28202", phone: "(704) 374-6161", lobbyHours: "Mon–Fri 9:00 AM – 5:00 PM", saturdayHours: "Sat 9:00 AM – 1:00 PM", has24HrAtm: true, hasDriveUp: true, hasNotary: true, hasSafeDeposit: true, hasPremierBanker: true, hasSpanish: true },
  { code: "LA-GRND", name: "Downtown Los Angeles Grand Ave", address: "333 S Grand Ave", city: "Los Angeles", state: "CA", zip: "90071", phone: "(213) 253-3200", lobbyHours: "Mon–Fri 9:00 AM – 5:00 PM", saturdayHours: "Sat 9:00 AM – 2:00 PM", has24HrAtm: true, hasDriveUp: false, hasNotary: true, hasSafeDeposit: true, hasPremierBanker: true, hasSpanish: true },
  { code: "DAL-ROSS", name: "Dallas Arts District Branch", address: "1445 Ross Ave", city: "Dallas", state: "TX", zip: "75202", phone: "(214) 740-1520", lobbyHours: "Mon–Fri 9:00 AM – 5:00 PM", saturdayHours: "Sat 9:00 AM – 1:00 PM", has24HrAtm: true, hasDriveUp: true, hasNotary: true, hasSafeDeposit: true, hasPremierBanker: true, hasSpanish: true },
  { code: "HOU-LA", name: "Downtown Houston Louisiana St", address: "1000 Louisiana St", city: "Houston", state: "TX", zip: "77002", phone: "(713) 319-1200", lobbyHours: "Mon–Fri 9:00 AM – 5:00 PM", saturdayHours: "Sat 9:00 AM – 12:00 PM", has24HrAtm: true, hasDriveUp: true, hasNotary: true, hasSafeDeposit: true, hasPremierBanker: false, hasSpanish: true },
  { code: "CHI-WCK", name: "Chicago South Wacker Branch", address: "10 S Wacker Dr", city: "Chicago", state: "IL", zip: "60606", phone: "(312) 845-4500", lobbyHours: "Mon–Fri 8:30 AM – 5:00 PM", saturdayHours: "Sat 9:00 AM – 1:00 PM", has24HrAtm: true, hasDriveUp: false, hasNotary: true, hasSafeDeposit: false, hasPremierBanker: true, hasSpanish: true },
  { code: "PHX-WASH", name: "Phoenix Downtown Washington St", address: "100 W Washington St", city: "Phoenix", state: "AZ", zip: "85003", phone: "(602) 378-4400", lobbyHours: "Mon–Fri 9:00 AM – 5:00 PM", saturdayHours: "Sat 9:00 AM – 1:00 PM", has24HrAtm: true, hasDriveUp: true, hasNotary: true, hasSafeDeposit: true, hasPremierBanker: true, hasSpanish: true },
  { code: "MIA-BISC", name: "Miami Biscayne Financial Center", address: "200 S Biscayne Blvd", city: "Miami", state: "FL", zip: "33131", phone: "(305) 789-4700", lobbyHours: "Mon–Fri 9:00 AM – 5:00 PM", saturdayHours: "Sat 9:00 AM – 2:00 PM", has24HrAtm: true, hasDriveUp: true, hasNotary: true, hasSafeDeposit: true, hasPremierBanker: true, hasSpanish: true },
  { code: "ATL-PCH", name: "Midtown Atlanta Peachtree Branch", address: "171 17th St NW", city: "Atlanta", state: "GA", zip: "30363", phone: "(404) 214-3900", lobbyHours: "Mon–Fri 9:00 AM – 5:00 PM", saturdayHours: "Sat 9:00 AM – 1:00 PM", has24HrAtm: true, hasDriveUp: true, hasNotary: true, hasSafeDeposit: false, hasPremierBanker: true, hasSpanish: true },
  { code: "SEA-3RD", name: "Seattle Third Avenue Center", address: "999 Third Ave", city: "Seattle", state: "WA", zip: "98104", phone: "(206) 292-3400", lobbyHours: "Mon–Fri 9:00 AM – 5:00 PM", saturdayHours: "Sat 9:00 AM – 1:00 PM", has24HrAtm: true, hasDriveUp: false, hasNotary: true, hasSafeDeposit: true, hasPremierBanker: true, hasSpanish: false },
  { code: "DEN-SHRM", name: "Denver Broadway & 17th Center", address: "1700 Lincoln St", city: "Denver", state: "CO", zip: "80203", phone: "(303) 863-5100", lobbyHours: "Mon–Fri 9:00 AM – 5:00 PM", saturdayHours: "Sat 9:00 AM – 12:00 PM", has24HrAtm: true, hasDriveUp: true, hasNotary: true, hasSafeDeposit: true, hasPremierBanker: false, hasSpanish: true },
  { code: "MSP-NIC", name: "Minneapolis Nicollet Mall Center", address: "90 S 7th St", city: "Minneapolis", state: "MN", zip: "55402", phone: "(612) 667-1234", lobbyHours: "Mon–Fri 8:30 AM – 5:00 PM", saturdayHours: "Sat 9:00 AM – 1:00 PM", has24HrAtm: true, hasDriveUp: true, hasNotary: true, hasSafeDeposit: true, hasPremierBanker: true, hasSpanish: false },
  { code: "DC-KST", name: "Washington DC K Street Branch", address: "1750 H St NW", city: "Washington", state: "DC", zip: "20006", phone: "(202) 303-2900", lobbyHours: "Mon–Fri 9:00 AM – 5:00 PM", saturdayHours: "Sat 9:00 AM – 1:00 PM", has24HrAtm: true, hasDriveUp: false, hasNotary: true, hasSafeDeposit: true, hasPremierBanker: true, hasSpanish: true },
];

/* ------------------------------------------------------------------ *
 * Customer relationship seed
 * ------------------------------------------------------------------ */

const customerCatalog: (typeof customers.$inferInsert)[] = [
  { username: "henry_carter", fullName: "Henry Carter", email: "henry.carter@example.com", phone: "(415) 555-0192", tier: "Premier", status: "Active", kycStatus: "Verified", twoFactorEnabled: true, passkeyEnabled: true, homeBranchCode: "SF-MONT", relationshipSince: "Mar 2016", lastSignInAt: new Date() },
  { username: "maria_delgado", fullName: "María Delgado", email: "maria.delgado@example.com", phone: "(305) 555-0148", tier: "Standard", status: "Active", kycStatus: "Verified", twoFactorEnabled: true, passkeyEnabled: false, homeBranchCode: "MIA-BISC", relationshipSince: "Jul 2019" },
  { username: "jordan_taylor", fullName: "Jordan Taylor", email: "jordan.taylor@example.com", phone: "(212) 555-0117", tier: "Standard", status: "Locked", kycStatus: "Needs Review", twoFactorEnabled: false, passkeyEnabled: false, homeBranchCode: "NY-HUD", relationshipSince: "Jan 2022" },
  { username: "priya_shah", fullName: "Priya Shah", email: "priya.shah@example.com", phone: "(704) 555-0163", tier: "Private Client", status: "Active", kycStatus: "Verified", twoFactorEnabled: true, passkeyEnabled: true, homeBranchCode: "CLT-TRY", relationshipSince: "Sep 2011" },
  { username: "devon_brooks", fullName: "Devon Brooks", email: "devon.brooks@example.com", phone: "(312) 555-0139", tier: "Standard", status: "Active", kycStatus: "Verified", twoFactorEnabled: true, passkeyEnabled: false, homeBranchCode: "CHI-WCK", relationshipSince: "Feb 2024" },
  { username: "lin_chen", fullName: "Lin Chen", email: "lin.chen@example.com", phone: "(206) 555-0175", tier: "Business", status: "Active", kycStatus: "Verified", twoFactorEnabled: true, passkeyEnabled: false, homeBranchCode: "SEA-3RD", relationshipSince: "Nov 2018" },
  { username: "robert_okafor", fullName: "Robert Okafor", email: "robert.okafor@example.com", phone: "(713) 555-0121", tier: "Premier", status: "Active", kycStatus: "Verified", twoFactorEnabled: true, passkeyEnabled: true, homeBranchCode: "HOU-LA", relationshipSince: "May 2014" },
  { username: "sara_lindqvist", fullName: "Sara Lindqvist", email: "sara.lindqvist@example.com", phone: "(612) 555-0186", tier: "Standard", status: "Closed", kycStatus: "Verified", twoFactorEnabled: false, passkeyEnabled: false, homeBranchCode: "MSP-NIC", relationshipSince: "Aug 2020" },
];

type AccountSeed = Omit<typeof accounts.$inferInsert, "customerId"> & { customer: number };

const accountCatalog: AccountSeed[] = [
  // Henry Carter (idx 0) — Premier relationship
  { customer: 0, accountKey: "chk-0987", name: "Premier Checking", nickname: "Everyday Checking", maskedNumber: "····0987", accountType: "Checking", productLine: "Premier Checking", balance: "24318.93", availableBalance: "24318.93", rateOrApr: "0.01% APY", status: "Open", openedOn: "Mar 14, 2016" },
  { customer: 0, accountKey: "sav-5543", name: "Way2Save® Savings", nickname: "Emergency Fund", maskedNumber: "····5543", accountType: "Savings", productLine: "Way2Save Savings", balance: "13370.37", availableBalance: "13370.37", rateOrApr: "0.15% APY", status: "Open", openedOn: "Mar 14, 2016" },
  { customer: 0, accountKey: "cd-7190", name: "11-Month Special CD", nickname: "Vacation CD", maskedNumber: "····7190", accountType: "CD", productLine: "Special Fixed Rate CD", balance: "25000.00", availableBalance: "25000.00", rateOrApr: "3.75% APY", status: "Open", openedOn: "Oct 02, 2025" },
  { customer: 0, accountKey: "cc-4821", name: "Autograph® Visa®", nickname: "Autograph Visa", maskedNumber: "····4821", accountType: "Credit Card", productLine: "Wells Fargo Autograph", balance: "1642.18", availableBalance: "13357.82", creditLimit: "15000.00", rateOrApr: "24.24% Variable APR", monthlyPayment: "41.00", nextPaymentDate: "May 02, 2026", status: "Open", openedOn: "Jun 08, 2021" },
  { customer: 0, accountKey: "mtg-3312", name: "Home Mortgage", nickname: "Primary Residence", maskedNumber: "····3312", accountType: "Mortgage", productLine: "30-Year Fixed Conventional", balance: "318420.55", availableBalance: "318420.55", rateOrApr: "4.875% Fixed", monthlyPayment: "2184.32", nextPaymentDate: "May 01, 2026", status: "Open", openedOn: "Aug 22, 2019" },
  { customer: 0, accountKey: "inv-9904", name: "WellsTrade® Brokerage", nickname: "Retirement Portfolio", maskedNumber: "····9904", accountType: "Investment", productLine: "WellsTrade Individual", balance: "146820.11", availableBalance: "8420.60", rateOrApr: "YTD +7.42%", status: "Open", openedOn: "Feb 11, 2018" },
  // María Delgado (idx 1)
  { customer: 1, accountKey: "chk-2210", name: "Everyday Checking", nickname: "Main Checking", maskedNumber: "····2210", accountType: "Checking", productLine: "Everyday Checking", balance: "1842.16", availableBalance: "1842.16", rateOrApr: "0.01% APY", status: "Open", openedOn: "Jul 09, 2019" },
  { customer: 1, accountKey: "sav-4408", name: "Platinum Savings", nickname: "House Fund", maskedNumber: "····4408", accountType: "Savings", productLine: "Platinum Savings", balance: "8650.00", availableBalance: "8650.00", rateOrApr: "2.50% APY", status: "Open", openedOn: "Sep 30, 2020" },
  { customer: 1, accountKey: "cc-7734", name: "Active Cash® Card", nickname: "Cash Back Card", maskedNumber: "····7734", accountType: "Credit Card", productLine: "Wells Fargo Active Cash", balance: "412.90", availableBalance: "4587.10", creditLimit: "5000.00", rateOrApr: "22.99% Variable APR", monthlyPayment: "25.00", nextPaymentDate: "May 09, 2026", status: "Open", openedOn: "Mar 18, 2021" },
  { customer: 1, accountKey: "auto-5519", name: "Wells Fargo Auto", nickname: "2022 Honda Civic", maskedNumber: "····5519", accountType: "Auto Loan", productLine: "60-Month Auto Loan", balance: "12480.44", availableBalance: "12480.44", rateOrApr: "5.74% Fixed", monthlyPayment: "386.20", nextPaymentDate: "Apr 18, 2026", status: "Open", openedOn: "Apr 18, 2022" },
  // Jordan Taylor (idx 2) — locked profile
  { customer: 2, accountKey: "chk-8842", name: "Clear Access Banking", nickname: "Checkless Checking", maskedNumber: "····8842", accountType: "Checking", productLine: "Clear Access Banking", balance: "318.44", availableBalance: "318.44", rateOrApr: "Non-interest bearing", status: "Restricted", openedOn: "Jan 22, 2022" },
  { customer: 2, accountKey: "cc-1190", name: "Reflect® Card", nickname: "Balance Transfer Card", maskedNumber: "····1190", accountType: "Credit Card", productLine: "Wells Fargo Reflect", balance: "3840.00", availableBalance: "2160.00", creditLimit: "6000.00", rateOrApr: "0% Intro APR (14 mo left)", status: "Open", openedOn: "Feb 04, 2025" },
  // Priya Shah (idx 3) — Private Client
  { customer: 3, accountKey: "chk-6620", name: "Private Client Checking", nickname: "Operating Checking", maskedNumber: "····6620", accountType: "Checking", productLine: "Private Client Checking", balance: "184320.75", availableBalance: "184320.75", rateOrApr: "0.05% APY", status: "Open", openedOn: "Sep 12, 2011" },
  { customer: 3, accountKey: "sav-9015", name: "Platinum Savings", nickname: "Liquidity Reserve", maskedNumber: "····9015", accountType: "Savings", productLine: "Platinum Savings", balance: "612400.00", availableBalance: "612400.00", rateOrApr: "2.51% APY", status: "Open", openedOn: "Sep 12, 2011" },
  { customer: 3, accountKey: "inv-2277", name: "Advisory Portfolio", nickname: "Family Legacy Portfolio", maskedNumber: "····2277", accountType: "Investment", productLine: "Wells Fargo Advisors", balance: "2418900.40", availableBalance: "42180.00", rateOrApr: "YTD +11.08%", status: "Open", openedOn: "Nov 03, 2012" },
  { customer: 3, accountKey: "trust-4401", name: "Shah Family Trust", nickname: "Revocable Living Trust", maskedNumber: "····4401", accountType: "Trust", productLine: "Wells Fargo Trust Services", balance: "1250000.00", availableBalance: "1250000.00", rateOrApr: "Fiduciary managed", status: "Open", openedOn: "Jun 19, 2015" },
  // Devon Brooks (idx 4)
  { customer: 4, accountKey: "chk-3378", name: "Everyday Checking", maskedNumber: "····3378", accountType: "Checking", productLine: "Everyday Checking", balance: "962.18", availableBalance: "962.18", rateOrApr: "0.01% APY", status: "Open", openedOn: "Feb 06, 2024" },
  { customer: 4, accountKey: "sav-6690", name: "Way2Save® Savings", maskedNumber: "····6690", accountType: "Savings", productLine: "Way2Save Savings", balance: "1284.55", availableBalance: "1284.55", rateOrApr: "0.15% APY", status: "Open", openedOn: "Feb 06, 2024" },
  { customer: 4, accountKey: "pl-7723", name: "Personal Loan", nickname: "Kitchen Remodel", maskedNumber: "····7723", accountType: "Personal Loan", productLine: "48-Month Personal Loan", balance: "9240.10", availableBalance: "9240.10", rateOrApr: "9.24% Fixed", monthlyPayment: "268.40", nextPaymentDate: "Apr 25, 2026", status: "Open", openedOn: "May 12, 2025" },
  // Lin Chen (idx 5) — Business
  { customer: 5, accountKey: "biz-4471", name: "Navigate Business Checking", nickname: "Bakery Operations", maskedNumber: "····4471", accountType: "Business Checking", productLine: "Navigate Business Checking", balance: "48210.62", availableBalance: "48210.62", rateOrApr: "0.02% APY", status: "Open", openedOn: "Nov 20, 2018" },
  { customer: 5, accountKey: "biz-8803", name: "Business Market Rate Savings", maskedNumber: "····8803", accountType: "Business Savings", productLine: "Business Market Rate Savings", balance: "96400.00", availableBalance: "96400.00", rateOrApr: "1.85% APY", status: "Open", openedOn: "Nov 20, 2018" },
  { customer: 5, accountKey: "biz-cc-2214", name: "Signify Business Cash®", maskedNumber: "····2214", accountType: "Business Credit Card", productLine: "Signify Business Cash", balance: "2180.44", availableBalance: "17819.56", creditLimit: "20000.00", rateOrApr: "21.74% Variable APR", status: "Open", openedOn: "Jan 15, 2020" },
  { customer: 5, accountKey: "biz-loc-9902", name: "BusinessLine® Credit", maskedNumber: "····9902", accountType: "Business Line of Credit", productLine: "BusinessLine Revolving", balance: "15000.00", availableBalance: "35000.00", creditLimit: "50000.00", rateOrApr: "9.75% Variable", status: "Open", openedOn: "Mar 02, 2023" },
  // Robert Okafor (idx 6) — Premier
  { customer: 6, accountKey: "chk-5502", name: "Premier Checking", maskedNumber: "····5502", accountType: "Checking", productLine: "Premier Checking", balance: "62480.19", availableBalance: "62480.19", rateOrApr: "0.03% APY", status: "Open", openedOn: "May 30, 2014" },
  { customer: 6, accountKey: "mtg-7788", name: "Home Mortgage", nickname: "Rental Property", maskedNumber: "····7788", accountType: "Mortgage", productLine: "30-Year Fixed Jumbo", balance: "482100.00", availableBalance: "482100.00", rateOrApr: "5.625% Fixed", monthlyPayment: "3120.85", nextPaymentDate: "May 01, 2026", status: "Open", openedOn: "Oct 14, 2021" },
  { customer: 6, accountKey: "cc-3391", name: "Autograph Journey℠", maskedNumber: "····3391", accountType: "Credit Card", productLine: "Autograph Journey", balance: "5240.11", availableBalance: "19759.89", creditLimit: "25000.00", rateOrApr: "25.24% Variable APR", status: "Open", openedOn: "Aug 01, 2023" },
  // Sara Lindqvist (idx 7) — Closed
  { customer: 7, accountKey: "chk-1104", name: "Everyday Checking", maskedNumber: "····1104", accountType: "Checking", productLine: "Everyday Checking", balance: "0.00", availableBalance: "0.00", rateOrApr: "0.01% APY", status: "Closed", openedOn: "Aug 03, 2020" },
];

const txMerchants = [
  { desc: "Trader Joe's #142", cat: "Groceries", min: 28, max: 168 },
  { desc: "Whole Foods Market", cat: "Groceries", min: 42, max: 196 },
  { desc: "Pacific Gas & Electric", cat: "Utilities", min: 96, max: 214 },
  { desc: "Comcast Xfinity Internet", cat: "Utilities", min: 79, max: 89 },
  { desc: "Blue Bottle Coffee", cat: "Food & Drink", min: 6, max: 28 },
  { desc: "Chipotle Mexican Grill", cat: "Food & Drink", min: 12, max: 42 },
  { desc: "Delta Air Lines", cat: "Travel", min: 218, max: 742 },
  { desc: "Uber Trip", cat: "Travel", min: 9, max: 58 },
  { desc: "Shell Gas Station", cat: "Gas & Transit", min: 32, max: 74 },
  { desc: "Netflix.com", cat: "Streaming", min: 15, max: 23 },
  { desc: "Spotify USA", cat: "Streaming", min: 11, max: 17 },
  { desc: "Amazon Marketplace", cat: "Shopping", min: 18, max: 340 },
  { desc: "Target Store 0421", cat: "Shopping", min: 24, max: 186 },
  { desc: "CVS Pharmacy", cat: "Health", min: 8, max: 96 },
  { desc: "Kaiser Permanente Copay", cat: "Health", min: 25, max: 120 },
  { desc: "Equinox Fitness Dues", cat: "Health", min: 189, max: 245 },
];

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

function buildTransactionCatalog() {
  const rand = seededRandom(20260401);
  const rows: { accountKey: string; postedDate: string; description: string; category: string; amount: string; status: string; flagged?: boolean }[] = [];
  const depositAccounts = ["chk-0987", "chk-2210", "chk-8842", "chk-6620", "chk-3378", "biz-4471", "chk-5502"];
  const cardAccounts = ["cc-4821", "cc-7734", "cc-1190", "biz-cc-2214", "cc-3391"];
  const dayLabels = ["Today", "Yesterday", "Mar 30", "Mar 29", "Mar 28", "Mar 27", "Mar 26", "Mar 25", "Mar 22", "Mar 21", "Mar 20", "Mar 18", "Mar 15", "Mar 12", "Mar 10", "Mar 06"];

  for (const key of depositAccounts) {
    rows.push({ accountKey: key, postedDate: "Today", description: "Direct Deposit — Employer Payroll ACH", category: "Income", amount: (1840 + Math.round(rand() * 2400)).toFixed(2), status: "Posted" });
    rows.push({ accountKey: key, postedDate: "Yesterday", description: "Way2Save® Automatic Transfer", category: "Transfer", amount: "-" + (25 + Math.round(rand() * 150)).toFixed(2), status: "Completed" });
    for (let i = 2; i < 8; i++) {
      const m = txMerchants[Math.floor(rand() * txMerchants.length)];
      rows.push({
        accountKey: key,
        postedDate: dayLabels[i],
        description: `${m.desc} — Debit Card Purchase`,
        category: m.cat,
        amount: "-" + (m.min + Math.round(rand() * (m.max - m.min))).toFixed(2),
        status: "Posted",
      });
    }
    rows.push({ accountKey: key, postedDate: "Mar 03", description: "Online Transfer from External Bank (ACH)", category: "Transfer", amount: (400 + Math.round(rand() * 1600)).toFixed(2), status: "Completed" });
  }

  for (const key of cardAccounts) {
    for (let i = 0; i < 7; i++) {
      const m = txMerchants[Math.floor(rand() * txMerchants.length)];
      rows.push({
        accountKey: key,
        postedDate: dayLabels[i + 1],
        description: `${m.desc}${m.cat === "Travel" ? " (3X Points)" : ""}`,
        category: m.cat,
        amount: "-" + (m.min + Math.round(rand() * (m.max - m.min))).toFixed(2),
        status: i === 0 ? "Pending" : "Posted",
      });
    }
    rows.push({ accountKey: key, postedDate: "Mar 05", description: "Payment Received — Thank You", category: "Payment", amount: "-" + (120 + Math.round(rand() * 640)).toFixed(2), status: "Completed" });
  }

  for (const key of ["mtg-3312", "auto-5519", "pl-7723", "mtg-7788", "biz-loc-9902"]) {
    rows.push({ accountKey: key, postedDate: "Mar 01", description: "Scheduled Monthly Payment — Autopay", category: "Loan Payment", amount: "-" + (268 + Math.round(rand() * 2900)).toFixed(2), status: "Completed" });
    rows.push({ accountKey: key, postedDate: "Feb 01", description: "Scheduled Monthly Payment — Autopay", category: "Loan Payment", amount: "-" + (268 + Math.round(rand() * 2900)).toFixed(2), status: "Completed" });
  }

  for (const key of ["inv-9904", "inv-2277"]) {
    rows.push({ accountKey: key, postedDate: "Mar 28", description: "Dividend Reinvestment — Vanguard Total Market ETF", category: "Investment", amount: (120 + Math.round(rand() * 2400)).toFixed(2), status: "Settled" });
    rows.push({ accountKey: key, postedDate: "Mar 14", description: "Advisory Fee — Quarterly", category: "Investment", amount: "-" + (85 + Math.round(rand() * 1400)).toFixed(2), status: "Settled" });
  }

  rows.push({ accountKey: "chk-8842", postedDate: "Mar 24", description: "Unauthorized online purchase — reported by customer", category: "Shopping", amount: "-418.92", status: "Disputed", flagged: true });
  rows.push({ accountKey: "cc-1190", postedDate: "Mar 23", description: "Foreign currency conversion — unrecognized merchant", category: "Shopping", amount: "-96.40", status: "Under Review", flagged: true });

  return rows;
}

const cardCatalog: { accountKey: string; cardName: string; network: string; last4: string; expires: string; status: string; dailySpendLimit: string; rewardsPoints: number; contactlessEnabled: boolean; onlinePurchasesEnabled: boolean; internationalEnabled: boolean; digitalWallets: string }[] = [
  { accountKey: "chk-0987", cardName: "Premier Checking Debit Card", network: "Visa Debit", last4: "7741", expires: "08/29", status: "Active", dailySpendLimit: "5000", rewardsPoints: 0, contactlessEnabled: true, onlinePurchasesEnabled: true, internationalEnabled: true, digitalWallets: "Apple Pay, Google Pay" },
  { accountKey: "cc-4821", cardName: "Wells Fargo Autograph® Visa®", network: "Visa Signature", last4: "4821", expires: "11/28", status: "Active", dailySpendLimit: "8000", rewardsPoints: 38420, contactlessEnabled: true, onlinePurchasesEnabled: true, internationalEnabled: true, digitalWallets: "Apple Pay, Google Pay, Samsung Pay" },
  { accountKey: "chk-2210", cardName: "Everyday Checking Debit Card", network: "Visa Debit", last4: "2210", expires: "04/28", status: "Active", dailySpendLimit: "2500", rewardsPoints: 0, contactlessEnabled: true, onlinePurchasesEnabled: true, internationalEnabled: false, digitalWallets: "Apple Pay" },
  { accountKey: "cc-7734", cardName: "Wells Fargo Active Cash® Card", network: "Visa", last4: "7734", expires: "02/29", status: "Active", dailySpendLimit: "4000", rewardsPoints: 12840, contactlessEnabled: true, onlinePurchasesEnabled: true, internationalEnabled: false, digitalWallets: "Google Pay" },
  { accountKey: "chk-8842", cardName: "Clear Access Debit Card", network: "Visa Debit", last4: "8842", expires: "09/27", status: "Locked", dailySpendLimit: "1000", rewardsPoints: 0, contactlessEnabled: false, onlinePurchasesEnabled: false, internationalEnabled: false, digitalWallets: "None added" },
  { accountKey: "cc-1190", cardName: "Wells Fargo Reflect® Card", network: "Visa", last4: "1190", expires: "06/29", status: "Active", dailySpendLimit: "3000", rewardsPoints: 0, contactlessEnabled: true, onlinePurchasesEnabled: true, internationalEnabled: false, digitalWallets: "Apple Pay" },
  { accountKey: "chk-6620", cardName: "Private Client Debit Card", network: "Visa Debit", last4: "6620", expires: "12/30", status: "Active", dailySpendLimit: "25000", rewardsPoints: 0, contactlessEnabled: true, onlinePurchasesEnabled: true, internationalEnabled: true, digitalWallets: "Apple Pay, Google Pay" },
  { accountKey: "biz-cc-2214", cardName: "Signify Business Cash® Card", network: "Mastercard World Elite", last4: "2214", expires: "07/28", status: "Active", dailySpendLimit: "15000", rewardsPoints: 64210, contactlessEnabled: true, onlinePurchasesEnabled: true, internationalEnabled: true, digitalWallets: "Apple Pay" },
  { accountKey: "cc-3391", cardName: "Autograph Journey℠ Card", network: "Visa Infinite", last4: "3391", expires: "10/29", status: "Active", dailySpendLimit: "12000", rewardsPoints: 96480, contactlessEnabled: true, onlinePurchasesEnabled: true, internationalEnabled: true, digitalWallets: "Apple Pay, Google Pay" },
  { accountKey: "chk-5502", cardName: "Premier Checking Debit Card", network: "Visa Debit", last4: "5502", expires: "03/28", status: "Replaced", dailySpendLimit: "5000", rewardsPoints: 0, contactlessEnabled: true, onlinePurchasesEnabled: true, internationalEnabled: true, digitalWallets: "Apple Pay" },
];

const alertKinds = [
  { kind: "Low balance below threshold", threshold: "$500.00" },
  { kind: "Large debit card purchase", threshold: "$1,000.00" },
  { kind: "Direct deposit received", threshold: "Any amount" },
  { kind: "Zelle® money sent or received", threshold: "Any amount" },
  { kind: "Online banking sign-on from new device", threshold: "Always" },
  { kind: "Credit card near limit", threshold: "80% of limit" },
  { kind: "Loan payment due reminder", threshold: "5 days before" },
  { kind: "Suspicious activity & fraud alerts", threshold: "Always" },
];

const billCatalog: { customer: number; payeeName: string; payeeAccountMasked: string; amountDue: string; dueDate: string; autoPay: boolean; category: string }[] = [
  { customer: 0, payeeName: "Pacific Gas & Electric", payeeAccountMasked: "····4471882", amountDue: "164.28", dueDate: "Apr 14, 2026", autoPay: true, category: "Utilities" },
  { customer: 0, payeeName: "Comcast Xfinity Internet", payeeAccountMasked: "····9920417", amountDue: "84.99", dueDate: "Apr 09, 2026", autoPay: true, category: "Utilities" },
  { customer: 0, payeeName: "SF Water & Sewer", payeeAccountMasked: "····3318204", amountDue: "72.40", dueDate: "Apr 22, 2026", autoPay: false, category: "Utilities" },
  { customer: 0, payeeName: "State Farm Auto Insurance", payeeAccountMasked: "····7741209", amountDue: "198.00", dueDate: "May 02, 2026", autoPay: true, category: "Insurance" },
  { customer: 0, payeeName: "Golden Gate Property Mgmt (HOA)", payeeAccountMasked: "····1180344", amountDue: "425.00", dueDate: "Apr 05, 2026", autoPay: true, category: "Housing" },
  { customer: 1, payeeName: "Florida Power & Light", payeeAccountMasked: "····6620918", amountDue: "142.10", dueDate: "Apr 11, 2026", autoPay: true, category: "Utilities" },
  { customer: 1, payeeName: "Sunrise Auto Insurance", payeeAccountMasked: "····4408172", amountDue: "126.50", dueDate: "Apr 19, 2026", autoPay: false, category: "Insurance" },
  { customer: 3, payeeName: "Charlotte Country Club Dues", payeeAccountMasked: "····2290841", amountDue: "1250.00", dueDate: "Apr 01, 2026", autoPay: true, category: "Lifestyle" },
  { customer: 3, payeeName: "Private School Tuition — Charlotte Day", payeeAccountMasked: "····8817204", amountDue: "3480.00", dueDate: "Apr 15, 2026", autoPay: true, category: "Education" },
  { customer: 4, payeeName: "Illinois Rent — Lakeshore Apartments", payeeAccountMasked: "····5590127", amountDue: "1985.00", dueDate: "Apr 01, 2026", autoPay: true, category: "Housing" },
  { customer: 5, payeeName: "Seattle Commercial Lease — Pike Partners", payeeAccountMasked: "····3318840", amountDue: "4820.00", dueDate: "Apr 01, 2026", autoPay: true, category: "Business Rent" },
  { customer: 5, payeeName: "Gusto Payroll Services", payeeAccountMasked: "····7741006", amountDue: "6240.88", dueDate: "Apr 15, 2026", autoPay: true, category: "Payroll" },
  { customer: 6, payeeName: "Houston Property Tax — Harris County", payeeAccountMasked: "····2204817", amountDue: "3184.22", dueDate: "Apr 30, 2026", autoPay: false, category: "Taxes" },
];

const recipientCatalog: { customer: number; recipientName: string; handle: string; handleType: string; lastSentOn: string; favorite: boolean }[] = [
  { customer: 0, recipientName: "Maya Lin", handle: "(415) 555-0143", handleType: "Mobile", lastSentOn: "Mar 26, 2026", favorite: true },
  { customer: 0, recipientName: "Daniel Carter (Dad)", handle: "(415) 555-0188", handleType: "Mobile", lastSentOn: "Mar 12, 2026", favorite: true },
  { customer: 0, recipientName: "Sofia Reyes", handle: "sofia.reyes@example.com", handleType: "Email", lastSentOn: "Feb 28, 2026", favorite: false },
  { customer: 1, recipientName: "Carlos Delgado", handle: "(305) 555-0166", handleType: "Mobile", lastSentOn: "Mar 30, 2026", favorite: true },
  { customer: 3, recipientName: "Aarav Shah", handle: "(704) 555-0129", handleType: "Mobile", lastSentOn: "Mar 18, 2026", favorite: true },
  { customer: 4, recipientName: "Roommate — Alex Kim", handle: "(312) 555-0194", handleType: "Mobile", lastSentOn: "Mar 29, 2026", favorite: true },
  { customer: 5, recipientName: "Bakery Supplier — Flour Co.", handle: "billing@flourco.example.com", handleType: "Email", lastSentOn: "Mar 21, 2026", favorite: false },
  { customer: 6, recipientName: "Grace Okafor", handle: "(713) 555-0157", handleType: "Mobile", lastSentOn: "Mar 27, 2026", favorite: true },
];

const statementCatalog: { accountKey: string; period: string; documentType: string; issuedOn: string; sizeKb: number }[] = [
  { accountKey: "chk-0987", period: "March 2026", documentType: "Checking Statement", issuedOn: "Mar 31, 2026", sizeKb: 312 },
  { accountKey: "chk-0987", period: "February 2026", documentType: "Checking Statement", issuedOn: "Feb 28, 2026", sizeKb: 298 },
  { accountKey: "sav-5543", period: "March 2026", documentType: "Savings Statement", issuedOn: "Mar 31, 2026", sizeKb: 244 },
  { accountKey: "cd-7190", period: "Q1 2026", documentType: "CD Interest Summary", issuedOn: "Mar 31, 2026", sizeKb: 186 },
  { accountKey: "cc-4821", period: "March 2026", documentType: "Credit Card Statement", issuedOn: "Mar 28, 2026", sizeKb: 402 },
  { accountKey: "mtg-3312", period: "March 2026", documentType: "Mortgage Statement", issuedOn: "Mar 20, 2026", sizeKb: 368 },
  { accountKey: "mtg-3312", period: "Tax Year 2025", documentType: "Form 1098 — Mortgage Interest", issuedOn: "Jan 24, 2026", sizeKb: 154 },
  { accountKey: "sav-5543", period: "Tax Year 2025", documentType: "Form 1099-INT — Interest Income", issuedOn: "Jan 24, 2026", sizeKb: 132 },
  { accountKey: "inv-9904", period: "Tax Year 2025", documentType: "Consolidated 1099 (DIV/B/INT)", issuedOn: "Feb 14, 2026", sizeKb: 528 },
  { accountKey: "chk-2210", period: "March 2026", documentType: "Checking Statement", issuedOn: "Mar 31, 2026", sizeKb: 276 },
  { accountKey: "cc-7734", period: "March 2026", documentType: "Credit Card Statement", issuedOn: "Mar 27, 2026", sizeKb: 358 },
  { accountKey: "biz-4471", period: "March 2026", documentType: "Business Checking Statement", issuedOn: "Mar 31, 2026", sizeKb: 421 },
  { accountKey: "chk-6620", period: "March 2026", documentType: "Private Client Statement", issuedOn: "Mar 31, 2026", sizeKb: 488 },
  { accountKey: "inv-2277", period: "Q1 2026", documentType: "Advisory Performance Report", issuedOn: "Mar 31, 2026", sizeKb: 612 },
];

const defaultRatesContent = {
  mortgage: [
    { product: "30-Year Fixed-Rate Conforming", purpose: "Purchase", rate: "6.375%", apr: "6.512% APR", points: "0.875" },
    { product: "15-Year Fixed-Rate Conforming", purpose: "Purchase", rate: "5.625%", apr: "5.845% APR", points: "0.750" },
    { product: "30-Year Fixed-Rate FHA", purpose: "Purchase", rate: "6.000%", apr: "6.790% APR", points: "0.875" },
    { product: "30-Year Fixed-Rate VA", purpose: "Purchase", rate: "5.875%", apr: "6.165% APR", points: "0.750" },
    { product: "30-Year Fixed-Rate Jumbo", purpose: "Purchase", rate: "6.500%", apr: "6.604% APR", points: "0.625" },
    { product: "30-Year Fixed-Rate Conforming", purpose: "Refinance", rate: "6.500%", apr: "6.630% APR", points: "0.875" },
  ],
  savings: [
    { product: "4-Month Special Fixed Rate CD", standard: "3.75% APY", relationship: "4.00% APY", minimum: "$5,000" },
    { product: "7-Month Special Fixed Rate CD", standard: "3.65% APY", relationship: "3.90% APY", minimum: "$5,000" },
    { product: "11-Month Special Fixed Rate CD", standard: "3.50% APY", relationship: "3.75% APY", minimum: "$5,000" },
    { product: "1-Year Standard Fixed Rate CD", standard: "1.50% APY", relationship: "1.75% APY", minimum: "$2,500" },
    { product: "Platinum Savings ($100,000+)", standard: "0.25% APY", relationship: "2.50% APY", minimum: "$25" },
    { product: "Way2Save® Savings", standard: "0.01% APY", relationship: "0.15% APY", minimum: "$25" },
  ],
  loans: [
    { product: "Personal Loan ($3,000–$9,999)", intro: "Fixed Rate", range: "7.49%–23.99% APR", terms: "12–60 months" },
    { product: "Personal Loan ($10,000–$100,000)", intro: "Fixed Rate", range: "6.74%–21.99% APR", terms: "12–84 months" },
    { product: "Wells Fargo Reflect® Card", intro: "0% intro APR 21 months", range: "17.24%–28.99% Variable", terms: "$0 annual fee" },
    { product: "Wells Fargo Active Cash® Card", intro: "0% intro APR 12 months", range: "19.24%–29.24% Variable", terms: "Unlimited 2% cash rewards" },
    { product: "Wells Fargo Autograph® Card", intro: "0% intro APR 12 months", range: "19.24%–29.24% Variable", terms: "3X everyday points" },
  ],
};

/* ------------------------------------------------------------------ *
 * Seeding orchestration
 * ------------------------------------------------------------------ */

let searchReady = false;
let branchesReady = false;
let adminReady = false;
let bankingReady = false;
let credentialsReady = false;
let engagementReady = false;

/** Seed secure-message threads, notifications and search analytics. */
export async function ensureEngagementSeeded() {
  if (engagementReady) return;
  await ensureBankingSeeded();

  const allCustomers = await db.select({ id: customers.id, username: customers.username }).from(customers);
  const idOf = (u: string) => allCustomers.find((c) => c.username === u)?.id;
  const henry = idOf("henry_carter");
  const maria = idOf("maria_delgado");
  const lin = idOf("lin_chen");

  const [[msgCount], [noteCount], [queryCount]] = await Promise.all([
    db.select({ value: count() }).from(supportMessages),
    db.select({ value: count() }).from(notifications),
    db.select({ value: count() }).from(searchQueries),
  ]);

  if (msgCount.value === 0 && henry && maria && lin) {
    await db.insert(supportMessages).values([
      { threadCode: "MSG-10428", customerId: henry, subject: "Question about my Autograph rewards redemption", senderRole: "customer", senderName: "Henry Carter", body: "Hello, I have 38,420 points and would like to redeem them toward a statement credit on my Autograph card. Can you confirm the redemption value and how long it takes to post?", status: "Awaiting Reply", isReadByAdmin: false },
      { threadCode: "MSG-10428", customerId: henry, subject: "Question about my Autograph rewards redemption", senderRole: "admin", senderName: "Wells Fargo Support", body: "Hi Henry! Your 38,420 points are worth $384.20 as a statement credit. Credits typically post within 2 business days. You can also redeem in the Rewards portal at any time.", status: "Answered", isReadByCustomer: false },
      { threadCode: "MSG-10441", customerId: maria, subject: "Setting up autopay for my auto loan", senderRole: "customer", senderName: "María Delgado", body: "I would like to enroll my Honda Civic auto loan in Autopay from my Everyday Checking account. Could you help me confirm the draft date?", status: "Open", isReadByAdmin: false },
      { threadCode: "MSG-10455", customerId: lin, subject: "BusinessLine credit limit review", senderRole: "customer", senderName: "Lin Chen", body: "Our bakery is expanding to a second location. What documentation is needed to review an increase on our $50,000 BusinessLine?", status: "Open", isReadByAdmin: false },
    ]);
  }

  if (noteCount.value === 0 && henry) {
    await db.insert(notifications).values([
      { customerId: henry, title: "Your March statement is ready", body: "Your Premier Checking March 2026 statement is available in Statements & Tax Documents.", kind: "Statement", href: "/online-banking/dashboard", isRead: false },
      { customerId: henry, title: "New reply from Wells Fargo Support", body: "We answered your question about Autograph rewards redemption.", kind: "Message", href: "/online-banking/messages", isRead: false },
      { customerId: henry, title: "Rate update: 11-Month Special CD", body: "The 11-Month Special Fixed Rate CD now earns up to 3.75% APY with a qualifying relationship.", kind: "Offer", href: "/savings-cds/rates", isRead: false },
      { customerId: null, title: "Scheduled maintenance notice", body: "Wells Fargo Online will undergo brief maintenance Sunday 2:00–3:00 AM ET. Transfers may be delayed.", kind: "Notice", href: "/help", isRead: false },
    ]);
  }

  const [scheduleCount] = await db.select({ value: count() }).from(scheduledTransfers);
  if (scheduleCount.value === 0 && henry) {
    await db.insert(scheduledTransfers).values([
      { customerId: henry, label: "Monthly emergency fund contribution", transferType: "transfer", fromAccountKey: "chk-0987", toAccountKey: "sav-5543", amount: "350.00", frequency: "Monthly", nextRunDate: "2026-05-01", status: "Active" },
      { customerId: henry, label: "Quarterly extra mortgage principal", transferType: "transfer", fromAccountKey: "chk-0987", toAccountKey: "mtg-3312", amount: "200.00", frequency: "Quarterly", nextRunDate: "2026-06-01", status: "Active" },
      { customerId: henry, label: "Weekly coffee-budget top-up", transferType: "transfer", fromAccountKey: "chk-0987", toAccountKey: "sav-5543", amount: "25.00", frequency: "Weekly", nextRunDate: "2026-05-04", status: "Paused" },
    ]);
  }

  if (queryCount.value === 0) {
    await db.insert(searchQueries).values([
      { query: "checking", resultCount: 4 }, { query: "checking", resultCount: 4 },
      { query: "mortgage rates", resultCount: 6 }, { query: "credit cards", resultCount: 5 },
      { query: "routing number", resultCount: 3 }, { query: "cd rates", resultCount: 4 },
      { query: "zelle", resultCount: 4 }, { query: "branch near me", resultCount: 2 },
      { query: "credit cards", resultCount: 5 }, { query: "mortgage rates", resultCount: 6 },
      { query: "checking", resultCount: 4 }, { query: "passkey", resultCount: 3 },
    ]);
  }

  engagementReady = true;
}

/** Demo sign-on credentials for every seeded Wells Fargo Online® profile. */
export const DEMO_CUSTOMER_PASSWORD = "demo1234";

export async function ensureCustomerCredentialsSeeded() {
  if (credentialsReady) return;
  const salt = "wf-customer-demo-salt-2026";
  const hash = hashPassword(DEMO_CUSTOMER_PASSWORD, salt);
  await db
    .update(customers)
    .set({ passwordSalt: salt, passwordHash: hash })
    .where(eq(customers.passwordHash, ""));
  credentialsReady = true;
}

export async function ensureSearchSeeded() {
  if (searchReady) return;
  const items = getAllSearchableItems();
  await db.delete(siteSearchItems).where(ilike(siteSearchItems.url, "http%"));
  const [{ value }] = await db.select({ value: count() }).from(siteSearchItems);
  if (value < items.length) {
    await db.insert(siteSearchItems).values(items).onConflictDoNothing();
  }
  searchReady = true;
}

export async function ensureBranchesSeeded() {
  if (branchesReady) return;
  const [{ value }] = await db.select({ value: count() }).from(branches);
  if (value < branchCatalog.length) {
    await db.insert(branches).values(branchCatalog).onConflictDoNothing();
  }
  branchesReady = true;
}

export async function ensureAdminSeeded() {
  if (adminReady) return;
  const salt = "wf-super-admin-salt-2026";
  const hash = hashPassword("wellsfargo2026", salt);

  // Two-tier hierarchy: one Super Admin and several Limited Admins beneath.
  await db
    .insert(adminUsers)
    .values([
      { username: "admin", passwordSalt: salt, passwordHash: hash, fullName: "Alexandra Reyes", role: "Super Admin — Enterprise Operations", roleType: "super_admin", status: "Active", email: "alexandra.reyes@wellsfargo.internal" },
      { username: "operator", passwordSalt: salt, passwordHash: hash, fullName: "Marcus Bell", role: "Limited Admin — Operations Manager", roleType: "limited_admin", status: "Active", email: "marcus.bell@wellsfargo.internal" },
      { username: "support1", passwordSalt: salt, passwordHash: hash, fullName: "Sofia Hernandez", role: "Limited Admin — Support Agent", roleType: "limited_admin", status: "Active", email: "sofia.hernandez@wellsfargo.internal" },
      { username: "support2", passwordSalt: salt, passwordHash: hash, fullName: "Ethan Brooks", role: "Limited Admin — Support Agent", roleType: "limited_admin", status: "Active", email: "ethan.brooks@wellsfargo.internal" },
      { username: "auditor", passwordSalt: salt, passwordHash: hash, fullName: "Dana Whitfield", role: "Read-Only Auditor", roleType: "auditor", status: "Active", email: "dana.whitfield@wellsfargo.internal" },
    ])
    .onConflictDoNothing();

  await db.insert(contentSettings).values({ key: "rates", value: JSON.stringify(defaultRatesContent) }).onConflictDoNothing();
  adminReady = true;
}

let hierarchyReady = false;

/** Apply role hierarchy and assign demo customers to their managing Limited Admins. */
export async function ensureAdminHierarchySeeded() {
  if (hierarchyReady) return;
  await ensureBankingSeeded();
  await ensureAdminSeeded();
  await ensureEngagementSeeded();

  const [superAdmin] = await db.select().from(adminUsers).where(eq(adminUsers.username, "admin")).limit(1);
  if (!superAdmin) {
    hierarchyReady = true;
    return;
  }

  await db.update(adminUsers).set({ roleType: "super_admin", parentAdminId: null, status: "Active" }).where(eq(adminUsers.username, "admin"));
  await db
    .update(adminUsers)
    .set({ roleType: "limited_admin", parentAdminId: superAdmin.id, status: "Active" })
    .where(inArray(adminUsers.username, ["operator", "support1", "support2"]));
  await db.update(adminUsers).set({ roleType: "auditor", parentAdminId: superAdmin.id, status: "Active" }).where(eq(adminUsers.username, "auditor"));

  const limitedAdmins = await db.select({ id: adminUsers.id }).from(adminUsers).where(inArray(adminUsers.username, ["operator", "support1", "support2"])).orderBy(asc(adminUsers.id));
  const unassigned = await db.select({ id: customers.id }).from(customers).where(isNull(customers.assignedAdminId)).orderBy(asc(customers.id));
  for (let i = 0; i < unassigned.length && limitedAdmins.length > 0; i++) {
    const owner = limitedAdmins[i % limitedAdmins.length];
    await db.update(customers).set({ assignedAdminId: owner.id }).where(eq(customers.id, unassigned[i].id));
  }

  const messageOwners = await db
    .select({ id: supportMessages.id, ownerId: customers.assignedAdminId })
    .from(supportMessages)
    .innerJoin(customers, eq(supportMessages.customerId, customers.id));
  for (const message of messageOwners) {
    if (message.ownerId) {
      await db.update(supportMessages).set({ assignedAdminId: message.ownerId }).where(eq(supportMessages.id, message.id));
    }
  }
  hierarchyReady = true;
}

const appointmentCatalog: (typeof appointments.$inferInsert)[] = [
  { confirmationCode: "WFA-418206", topic: "Home Mortgage or 3% Down Prequalification", meetingType: "In Branch", branchName: "Montgomery Street Main Branch (San Francisco, CA)", appointmentDate: "2026-04-08", appointmentTime: "10:30 AM", fullName: "Henry Carter", email: "henry.carter@example.com", phone: "(415) 555-0192", notes: "Interested in Dream. Plan. Home. 3% down options and relationship pricing.", status: "Pending Approval" },
  { confirmationCode: "WFA-418233", topic: "Wells Fargo Premier & Wealth Planning", meetingType: "In Branch", branchName: "One Wells Fargo Center Branch (Charlotte, NC)", appointmentDate: "2026-04-09", appointmentTime: "2:30 PM", fullName: "Priya Shah", email: "priya.shah@example.com", phone: "(704) 555-0163", notes: "Review trust funding and advisory fee discount with Premier banker.", status: "Confirmed" },
  { confirmationCode: "WFA-418290", topic: "Small Business Banking & SBA Loans", meetingType: "By Phone", branchName: "Phone Consultation with U.S. Banker", appointmentDate: "2026-04-10", appointmentTime: "11:30 AM", fullName: "Lin Chen", email: "lin.chen@example.com", phone: "(206) 555-0175", notes: "Bakery expansion — comparing BusinessLine credit vs SBA 7(a).", status: "Scheduled" },
  { confirmationCode: "WFA-418311", topic: "Open a Checking or Savings Account", meetingType: "In Branch", branchName: "Grand Central 42nd Street Branch (New York, NY)", appointmentDate: "2026-04-11", appointmentTime: "9:30 AM", fullName: "Jordan Taylor", email: "jordan.taylor@example.com", phone: "(212) 555-0117", notes: "Profile currently locked; customer requests reinstatement review.", status: "Pending Approval" },
];

const fraudCatalog: (typeof fraudReports.$inferInsert)[] = [
  { referenceCode: "FRD-330184", incidentType: "Unauthorized Debit or Credit Card Charge", channel: "Online Merchant / Card Charge", incidentDate: "2026-03-24", contactEmail: "jordan.taylor@example.com", summary: "Unrecognized $418.92 charge from an online electronics retailer. Card has been locked in the mobile app and a replacement requested.", refundAmount: "0", status: "Under Investigation" },
  { referenceCode: "FRD-330207", incidentType: "Phishing Email, Text, or Spoofed Phone Call", channel: "Suspicious Text Message (Smishing)", incidentDate: "2026-03-29", contactEmail: "maria.delgado@example.com", summary: "Received a text claiming to be Wells Fargo security asking for a one-time passcode to 'reverse a transfer'. Did not reply; forwarding for review.", refundAmount: "0", status: "Under Review" },
  { referenceCode: "FRD-330241", incidentType: "Unauthorized Zelle, Wire, or ACH Transfer", channel: "Phone Impersonation Call", incidentDate: "2026-03-18", contactEmail: "devon.brooks@example.com", summary: "Caller spoofed the Wells Fargo fraud line and persuaded a $640 Zelle transfer to an unknown recipient before the customer hung up.", refundAmount: "640.00", status: "Resolved" },
];

const inquiryCatalog: (typeof productInquiries.$inferInsert)[] = [
  { referenceCode: "WF-4471902", productName: "Everyday Checking", category: "Checking Account Application", applicantName: "Devon Brooks", email: "devon.brooks@example.com", zipCode: "60614", notes: "Wants to add a joint owner and link Way2Save Savings.", status: "Pending Review" },
  { referenceCode: "WF-4471955", productName: "Wells Fargo Autograph Visa Card", category: "Credit Cards", applicantName: "María Delgado", email: "maria.delgado@example.com", zipCode: "33131", notes: "Interested in the 20,000 bonus point offer and 3X travel categories.", status: "Pending Review" },
  { referenceCode: "WF-4472018", productName: "Dream. Plan. Home. 3% Down Mortgage", category: "Home Loans", applicantName: "Robert Okafor", email: "robert.okafor@example.com", zipCode: "77002", notes: "Purchasing a rental property; asked about relationship pricing tiers.", status: "Approved" },
  { referenceCode: "WF-4472064", productName: "Senior Software Engineer — Digital Banking (R-48201)", category: "Wells Fargo Careers", applicantName: "Sara Lindqvist", email: "sara.lindqvist@example.com", zipCode: "55402", notes: "Former customer applying to the technology organization.", status: "More Information Requested" },
];

export async function ensureServiceQueueSeeded() {
  const [[apptCount], [fraudCount], [inqCount]] = await Promise.all([
    db.select({ value: count() }).from(appointments),
    db.select({ value: count() }).from(fraudReports),
    db.select({ value: count() }).from(productInquiries),
  ]);
  if (apptCount.value === 0) await db.insert(appointments).values(appointmentCatalog).onConflictDoNothing();
  if (fraudCount.value === 0) await db.insert(fraudReports).values(fraudCatalog).onConflictDoNothing();
  if (inqCount.value === 0) await db.insert(productInquiries).values(inquiryCatalog).onConflictDoNothing();
}

export async function ensureBankingSeeded() {
  if (bankingReady) return;

  await ensureServiceQueueSeeded();

  const [{ value: customerCount }] = await db.select({ value: count() }).from(customers);
  if (customerCount >= customerCatalog.length) {
    bankingReady = true;
    return;
  }

  await db.delete(transactions);
  await db.delete(cards);
  await db.delete(statements);
  await db.delete(bills);
  await db.delete(zelleRecipients);
  await db.delete(customerAlerts);
  await db.delete(accounts);
  await db.delete(customers);

  const createdCustomers = await db.insert(customers).values(customerCatalog).returning();
  const customerIds = createdCustomers.map((c) => c.id);

  const createdAccounts = await db
    .insert(accounts)
    .values(
      accountCatalog.map((a) => {
        const { customer, ...rest } = a;
        return { ...rest, customerId: customerIds[customer] };
      }),
    )
    .returning();

  const accountByKey = new Map(createdAccounts.map((a) => [a.accountKey, a]));

  const txRows = buildTransactionCatalog();
  await db.insert(transactions).values(
    txRows
      .filter((t) => accountByKey.has(t.accountKey))
      .map((t) => {
        const acct = accountByKey.get(t.accountKey)!;
        return {
          accountId: acct.id,
          postedDate: t.postedDate,
          description: t.description,
          category: t.category,
          amount: t.amount,
          runningBalance: acct.availableBalance,
          status: t.status,
          flagged: t.flagged ?? false,
        };
      }),
  );

  await db.insert(cards).values(
    cardCatalog
      .filter((c) => accountByKey.has(c.accountKey))
      .map((c) => {
        const { accountKey, ...rest } = c;
        return { ...rest, accountId: accountByKey.get(accountKey)!.id };
      }),
  );

  await db.insert(statements).values(
    statementCatalog
      .filter((s) => accountByKey.has(s.accountKey))
      .map((s) => {
        const { accountKey, ...rest } = s;
        return { ...rest, accountId: accountByKey.get(accountKey)!.id };
      }),
  );

  const alertRows = createdCustomers.flatMap((customer) =>
    alertKinds.map((a, idx) => ({
      customerId: customer.id,
      kind: a.kind,
      channel: idx % 3 === 0 ? "Push notification" : idx % 3 === 1 ? "Push, SMS & Email" : "Email",
      threshold: a.threshold,
      enabled: idx !== 6,
    })),
  );
  await db.insert(customerAlerts).values(alertRows);

  await db.insert(bills).values(
    billCatalog.map((b) => {
      const { customer, ...rest } = b;
      return { ...rest, customerId: customerIds[customer] };
    }),
  );

  await db.insert(zelleRecipients).values(
    recipientCatalog.map((r) => {
      const { customer, ...rest } = r;
      return { ...rest, customerId: customerIds[customer] };
    }),
  );

  await db.insert(auditLogs).values([
    { actor: "system", action: "seed", resource: "customers", resourceLabel: "8 demo customer profiles", detail: "Initial relationship dataset created", severity: "Info" },
    { actor: "system", action: "seed", resource: "accounts", resourceLabel: `${createdAccounts.length} accounts`, detail: "Deposit, credit, lending, investment & trust accounts", severity: "Info" },
    { actor: "system", action: "seed", resource: "content", resourceLabel: "Interest rate sheet", detail: "Mortgage, savings/CD and loan rate tables published", severity: "Info" },
  ]);

  bankingReady = true;
}
