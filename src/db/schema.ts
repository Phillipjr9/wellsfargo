import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ *
 * Public site infrastructure
 * ------------------------------------------------------------------ */

export const siteSearchItems = pgTable("site_search_items", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  keywords: text("keywords").notNull(),
  url: text("url").notNull().unique(),
});

export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  address: varchar("address", { length: 200 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 20 }).notNull(),
  zip: varchar("zip", { length: 16 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  lobbyHours: varchar("lobbyHours", { length: 160 }).notNull(),
  saturdayHours: varchar("saturdayHours", { length: 120 }).notNull(),
  has24HrAtm: boolean("has24HrAtm").notNull().default(true),
  hasDriveUp: boolean("hasDriveUp").notNull().default(false),
  hasNotary: boolean("hasNotary").notNull().default(true),
  hasSafeDeposit: boolean("hasSafeDeposit").notNull().default(false),
  hasPremierBanker: boolean("hasPremierBanker").notNull().default(false),
  hasSpanish: boolean("hasSpanish").notNull().default(true),
  status: varchar("status", { length: 24 }).notNull().default("Open"),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  confirmationCode: varchar("confirmationCode", { length: 24 }).notNull().unique(),
  topic: varchar("topic", { length: 140 }).notNull(),
  meetingType: varchar("meetingType", { length: 40 }).notNull(),
  branchName: varchar("branchName", { length: 160 }).notNull(),
  appointmentDate: varchar("appointmentDate", { length: 32 }).notNull(),
  appointmentTime: varchar("appointmentTime", { length: 32 }).notNull(),
  fullName: varchar("fullName", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  notes: text("notes"),
  status: varchar("status", { length: 24 }).notNull().default("Scheduled"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const fraudReports = pgTable("fraud_reports", {
  id: serial("id").primaryKey(),
  referenceCode: varchar("referenceCode", { length: 24 }).notNull().unique(),
  incidentType: varchar("incidentType", { length: 100 }).notNull(),
  channel: varchar("channel", { length: 80 }).notNull(),
  incidentDate: varchar("incidentDate", { length: 32 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 160 }).notNull(),
  summary: text("summary").notNull(),
  relatedTransactionId: integer("relatedTransactionId"),
  refundAmount: numeric("refundAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 32 }).notNull().default("Under Review"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const productInquiries = pgTable("product_inquiries", {
  id: serial("id").primaryKey(),
  referenceCode: varchar("referenceCode", { length: 24 }).notNull().unique(),
  productName: varchar("productName", { length: 160 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  applicantName: varchar("applicantName", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull(),
  zipCode: varchar("zipCode", { length: 16 }).notNull(),
  notes: text("notes"),
  status: varchar("status", { length: 32 }).notNull().default("Pending Review"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ *
 * Customer relationship core
 * ------------------------------------------------------------------ */

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 60 }).notNull().unique(),
  passwordSalt: varchar("passwordSalt", { length: 64 }).notNull().default(""),
  passwordHash: varchar("passwordHash", { length: 200 }).notNull().default(""),
  fullName: varchar("fullName", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  tier: varchar("tier", { length: 40 }).notNull().default("Standard"),
  status: varchar("status", { length: 24 }).notNull().default("Active"),
  kycStatus: varchar("kycStatus", { length: 24 }).notNull().default("Verified"),
  twoFactorEnabled: boolean("twoFactorEnabled").notNull().default(true),
  passkeyEnabled: boolean("passkeyEnabled").notNull().default(false),
  homeBranchCode: varchar("homeBranchCode", { length: 32 }),
  assignedAdminId: integer("assignedAdminId"),
  relationshipSince: varchar("relationshipSince", { length: 32 }).notNull(),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  accountKey: varchar("accountKey", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 140 }).notNull(),
  nickname: varchar("nickname", { length: 80 }),
  maskedNumber: varchar("maskedNumber", { length: 24 }).notNull(),
  accountType: varchar("accountType", { length: 40 }).notNull(),
  productLine: varchar("productLine", { length: 60 }).notNull(),
  balance: numeric("balance", { precision: 14, scale: 2 }).notNull(),
  availableBalance: numeric("availableBalance", { precision: 14, scale: 2 }).notNull(),
  creditLimit: numeric("creditLimit", { precision: 14, scale: 2 }),
  rateOrApr: varchar("rateOrApr", { length: 60 }).notNull().default("—"),
  monthlyPayment: numeric("monthlyPayment", { precision: 12, scale: 2 }),
  nextPaymentDate: varchar("nextPaymentDate", { length: 32 }),
  status: varchar("status", { length: 24 }).notNull().default("Open"),
  openedOn: varchar("openedOn", { length: 32 }).notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  accountId: integer("accountId")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  postedDate: varchar("postedDate", { length: 32 }).notNull(),
  description: varchar("description", { length: 180 }).notNull(),
  category: varchar("category", { length: 60 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  runningBalance: numeric("runningBalance", { precision: 14, scale: 2 }),
  status: varchar("status", { length: 32 }).notNull().default("Posted"),
  flagged: boolean("flagged").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  accountId: integer("accountId")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  cardName: varchar("cardName", { length: 120 }).notNull(),
  network: varchar("network", { length: 30 }).notNull(),
  last4: varchar("last4", { length: 8 }).notNull(),
  expires: varchar("expires", { length: 10 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("Active"),
  dailySpendLimit: numeric("dailySpendLimit", { precision: 10, scale: 2 }).notNull().default("3000"),
  rewardsPoints: integer("rewardsPoints").notNull().default(0),
  contactlessEnabled: boolean("contactlessEnabled").notNull().default(true),
  onlinePurchasesEnabled: boolean("onlinePurchasesEnabled").notNull().default(true),
  internationalEnabled: boolean("internationalEnabled").notNull().default(false),
  digitalWallets: varchar("digitalWallets", { length: 80 }).notNull().default("None added"),
});

export const customerAlerts = pgTable("customer_alerts", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 80 }).notNull(),
  channel: varchar("channel", { length: 60 }).notNull().default("Push, SMS & Email"),
  threshold: varchar("threshold", { length: 40 }),
  enabled: boolean("enabled").notNull().default(true),
});

export const statements = pgTable("statements", {
  id: serial("id").primaryKey(),
  accountId: integer("accountId")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  period: varchar("period", { length: 40 }).notNull(),
  documentType: varchar("documentType", { length: 60 }).notNull(),
  issuedOn: varchar("issuedOn", { length: 32 }).notNull(),
  sizeKb: integer("sizeKb").notNull().default(240),
  viewed: boolean("viewed").notNull().default(false),
});

export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  payeeName: varchar("payeeName", { length: 140 }).notNull(),
  payeeAccountMasked: varchar("payeeAccountMasked", { length: 30 }).notNull(),
  amountDue: numeric("amountDue", { precision: 12, scale: 2 }).notNull(),
  dueDate: varchar("dueDate", { length: 32 }).notNull(),
  autoPay: boolean("autoPay").notNull().default(false),
  category: varchar("category", { length: 60 }).notNull(),
});

export const zelleRecipients = pgTable("zelle_recipients", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  recipientName: varchar("recipientName", { length: 120 }).notNull(),
  handle: varchar("handle", { length: 140 }).notNull(),
  handleType: varchar("handleType", { length: 20 }).notNull().default("Mobile"),
  lastSentOn: varchar("lastSentOn", { length: 32 }),
  favorite: boolean("favorite").notNull().default(false),
});

/* ------------------------------------------------------------------ *
 * Super admin console
 * ------------------------------------------------------------------ */

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 60 }).notNull().unique(),
  passwordSalt: varchar("passwordSalt", { length: 64 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 200 }).notNull(),
  fullName: varchar("fullName", { length: 120 }).notNull(),
  role: varchar("role", { length: 60 }).notNull().default("Super Admin"),
  roleType: varchar("roleType", { length: 24 }).notNull().default("limited_admin"),
  parentAdminId: integer("parentAdminId"),
  status: varchar("status", { length: 24 }).notNull().default("Active"),
  email: varchar("email", { length: 160 }).notNull(),
  lastSignInAt: timestamp("lastSignInAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const customerSessions = pgTable("customer_sessions", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 120 }).notNull().unique(),
  customerId: integer("customerId")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export const adminSessions = pgTable("admin_sessions", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 120 }).notNull().unique(),
  adminUserId: integer("adminUserId")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  userAgent: varchar("userAgent", { length: 240 }),
  ipAddress: varchar("ipAddress", { length: 60 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actor: varchar("actor", { length: 80 }).notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  resource: varchar("resource", { length: 60 }).notNull(),
  resourceLabel: varchar("resourceLabel", { length: 160 }),
  detail: text("detail"),
  severity: varchar("severity", { length: 24 }).notNull().default("Info"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  threadCode: varchar("threadCode", { length: 24 }).notNull(),
  customerId: integer("customerId")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  subject: varchar("subject", { length: 160 }).notNull(),
  senderRole: varchar("senderRole", { length: 24 }).notNull(),
  senderName: varchar("senderName", { length: 120 }).notNull(),
  body: text("body").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("Open"),
  isReadByCustomer: boolean("isReadByCustomer").notNull().default(false),
  isReadByAdmin: boolean("isReadByAdmin").notNull().default(false),
  assignedAdminId: integer("assignedAdminId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId").references(() => customers.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  kind: varchar("kind", { length: 40 }).notNull().default("Info"),
  href: varchar("href", { length: 200 }),
  isRead: boolean("isRead").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const scheduledTransfers = pgTable("scheduled_transfers", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 140 }).notNull(),
  transferType: varchar("transferType", { length: 24 }).notNull().default("transfer"),
  fromAccountKey: varchar("fromAccountKey", { length: 40 }).notNull(),
  toAccountKey: varchar("toAccountKey", { length: 40 }),
  payee: varchar("payee", { length: 140 }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  frequency: varchar("frequency", { length: 24 }).notNull().default("Monthly"),
  nextRunDate: varchar("nextRunDate", { length: 20 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("Active"),
  lastRunAt: timestamp("lastRunAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const searchQueries = pgTable("search_queries", {
  id: serial("id").primaryKey(),
  query: varchar("query", { length: 120 }).notNull(),
  resultCount: integer("resultCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const contentSettings = pgTable("content_settings", {
  key: varchar("key", { length: 60 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
