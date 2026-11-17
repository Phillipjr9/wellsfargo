export type CardRow = {
  id: number;
  cardName: string;
  network: string;
  last4: string;
  expires: string;
  status: string;
  dailySpendLimit: string;
  rewardsPoints: number;
  contactlessEnabled: boolean;
  onlinePurchasesEnabled: boolean;
  internationalEnabled: boolean;
  digitalWallets: string;
};

export type StatementRow = {
  id: number;
  accountId: number;
  period: string;
  documentType: string;
  issuedOn: string;
  sizeKb: number;
  viewed: boolean;
};

export type AccountRow = {
  id: number;
  accountKey: string;
  name: string;
  nickname: string | null;
  maskedNumber: string;
  accountType: string;
  productLine: string;
  balance: string;
  availableBalance: string;
  creditLimit: string | null;
  rateOrApr: string;
  monthlyPayment: string | null;
  nextPaymentDate: string | null;
  status: string;
  openedOn: string;
  cards: CardRow[];
  statements: StatementRow[];
};

export type TxRow = {
  id: number;
  accountId: number;
  postedDate: string;
  description: string;
  category: string;
  amount: string;
  runningBalance: string | null;
  status: string;
  flagged: boolean;
};

export type AlertRow = {
  id: number;
  kind: string;
  channel: string;
  threshold: string | null;
  enabled: boolean;
};

export type BillRow = {
  id: number;
  payeeName: string;
  payeeAccountMasked: string;
  amountDue: string;
  dueDate: string;
  autoPay: boolean;
  category: string;
};

export type RecipientRow = {
  id: number;
  recipientName: string;
  handle: string;
  handleType: string;
  lastSentOn: string | null;
  favorite: boolean;
};

export type Profile = {
  customer: {
    id: number;
    username: string;
    fullName: string;
    email: string;
    phone: string;
    tier: string;
    status: string;
    kycStatus: string;
    twoFactorEnabled: boolean;
    passkeyEnabled: boolean;
    homeBranchCode?: string | null;
    relationshipSince: string;
    lastSignInAt: string;
  };
  accounts: AccountRow[];
  transactions: TxRow[];
  alerts: AlertRow[];
  bills: BillRow[];
  recipients: RecipientRow[];
  profiles: { username: string; fullName: string; tier: string; status?: string }[];
};

export type PortalView =
  | "summary"
  | "activity"
  | "statements"
  | "brokerage"
  | "transfer"
  | "zelle"
  | "bills"
  | "deposit"
  | "scheduled"
  | "plan"
  | "cards"
  | "security";

export const CASH_TYPES = ["Checking", "Savings", "CD", "Business Checking", "Business Savings"];
export const CREDIT_TYPES = ["Credit Card", "Business Credit Card"];
export const LOAN_TYPES = ["Mortgage", "Auto Loan", "Personal Loan", "Business Line of Credit", "Loan", "Home Equity"];
export const INVEST_TYPES = ["Investment", "Trust"];

export function fmtMoney(value: string | number, masked = false): string {
  if (masked) return "••••••";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);
}

export function fullAccountNumber(acct: AccountRow): string {
  const digits = acct.maskedNumber.replace(/\D/g, "").padStart(4, "0");
  const prefix = String(481020 + acct.id * 73).slice(0, 6);
  return `${prefix}${digits}`;
}

export function routingForBranch(code?: string | null): string {
  const map: Record<string, string> = {
    "SF-MONT": "121042882",
    "SF-MKT": "121042882",
    "LA-GRND": "122000247",
    "NY-HUD": "026012881",
    "NY-42ST": "026012881",
    "CLT-TRY": "053000219",
    "MIA-BISC": "063107513",
    "CHI-WCK": "071101307",
    "DAL-ROSS": "111900659",
    "HOU-LA": "111900659",
    "SEA-3RD": "125008547",
    "MSP-NIC": "091000019",
  };
  return (code && map[code]) || "121042882";
}

export const WF_DEALS = [
  { id: "sbux", merchant: "Starbucks", offer: "10% cash back", detail: "Earn up to $8 back • Expires in 18 days", badge: "Dining", color: "#006241", logo: "/images/merchants/starbucks.png" },
  { id: "wfm", merchant: "Whole Foods Market", offer: "5% cash back", detail: "Earn up to $15 back on $75+ • Expires in 24 days", badge: "Grocery", color: "#1b5e20", logo: "/images/merchants/wholefoods.png" },
  { id: "dal", merchant: "Delta Air Lines", offer: "$25 cash back", detail: "When you spend $250+ on flights • Expires in 31 days", badge: "Travel", color: "#003366", logo: "/images/merchants/delta.png" },
  { id: "hd", merchant: "The Home Depot", offer: "10% cash back", detail: "Earn up to $30 back online or in store • Expires in 14 days", badge: "Home", color: "#d84315", logo: "/images/merchants/homedepot.png" },
  { id: "shl", merchant: "Shell Fuel Rewards", offer: "5% cash back", detail: "Earn up to $10 back at the pump • Expires in 21 days", badge: "Fuel", color: "#b71c1c", logo: "/images/merchants/shell.png" },
  { id: "ap", merchant: "Apple Services", offer: "15% cash back", detail: "Up to $9 back on iCloud+ or Apple TV+ • Expires in 27 days", badge: "Digital", color: "#263238", logo: "/images/merchants/apple.png" },
];

export type PostAction = (body: Record<string, unknown>, successMsg: string) => Promise<boolean>;
