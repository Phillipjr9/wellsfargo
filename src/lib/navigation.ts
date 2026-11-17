export type LinkItem = { label: string; href: string };

export type NavGroup = {
  label: string;
  href: string;
  prefixes: string[];
  links: LinkItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Personal",
    href: "/",
    prefixes: [
      "/checking",
      "/savings-cds",
      "/credit-cards",
      "/mortgage",
      "/personal-loans",
      "/auto-loans",
      "/premier",
      "/financial-guidance",
      "/financial-goals",
      "/online-banking",
      "/mobile-app",
      "/sign-on",
      "/enroll",
      "/locations",
      "/appointments",
      "/help",
      "/privacy-security",
      "/sitemap",
      "/es",
    ],
    links: [
      { label: "Checking", href: "/checking" },
      { label: "Savings & CDs", href: "/savings-cds" },
      { label: "Credit Cards", href: "/credit-cards" },
      { label: "Home Loans", href: "/mortgage" },
      { label: "Personal Loans", href: "/personal-loans" },
      { label: "Auto Loans", href: "/auto-loans" },
      { label: "Premier", href: "/premier" },
      { label: "Financial Guidance", href: "/financial-guidance" },
    ],
  },
  {
    label: "Investing & Wealth Management",
    href: "/investing-wealth",
    prefixes: ["/investing-wealth"],
    links: [
      { label: "Investing Overview", href: "/investing-wealth" },
      { label: "Investment Services", href: "/investing-wealth/investment-services" },
      { label: "Retirement", href: "/investing-wealth/retirement" },
      { label: "Wealth Management", href: "/investing-wealth/wealth-management" },
    ],
  },
  {
    label: "Business Banking",
    href: "/biz",
    prefixes: ["/biz"],
    links: [
      { label: "Business Overview", href: "/biz" },
      { label: "Business Checking", href: "/biz/checking" },
      { label: "Business Savings", href: "/biz/savings" },
      { label: "Business Credit", href: "/biz/business-credit" },
      { label: "Merchant Services", href: "/biz/merchant" },
    ],
  },
  {
    label: "Commercial Banking",
    href: "/com",
    prefixes: ["/com"],
    links: [
      { label: "Commercial Banking", href: "/com" },
      { label: "Financing", href: "/com/financing" },
      { label: "Treasury Management", href: "/com/treasury-management" },
    ],
  },
  {
    label: "Corporate & Investment Banking",
    href: "/cib",
    prefixes: ["/cib"],
    links: [
      { label: "Corporate & Investment Banking", href: "/cib" },
      { label: "Capital Markets", href: "/cib/capital-markets" },
      { label: "Global Markets", href: "/cib/global-markets" },
    ],
  },
  {
    label: "About Wells Fargo",
    href: "/about",
    prefixes: ["/about"],
    links: [
      { label: "Who We Are", href: "/about" },
      { label: "Wells Fargo Stories", href: "/about/stories" },
      { label: "Careers", href: "/about/careers" },
      { label: "Investor Relations", href: "/about/investor-relations" },
      { label: "Diversity & Accessibility", href: "/about/diversity" },
    ],
  },
];

export const popularFaqs: LinkItem[] = [
  { label: "How do I find my routing and account numbers?", href: "/help/routing-number" },
  { label: "How do I sign on to Wells Fargo Online?", href: "/help/online-banking/sign-on-faqs" },
  { label: "How do I report fraud or suspicious activity?", href: "/privacy-security/fraud/report" },
];

export const footerLinks: LinkItem[] = [
  { label: "Privacy, Cookies, Security & Legal", href: "/privacy-security" },
  { label: "Do Not Sell or Share My Personal Information", href: "/privacy-security/opt-out-notice" },
  { label: "Notice of Data Collection", href: "/privacy-security/notice-of-data-collection" },
  { label: "General Terms of Use", href: "/privacy-security/terms" },
  { label: "Online Access Agreement", href: "/online-banking/online-access-agreement" },
  { label: "Report Fraud", href: "/privacy-security/fraud/report" },
  { label: "Ad Choices", href: "/privacy-security/ad-choices" },
  { label: "About Wells Fargo", href: "/about" },
  { label: "Careers", href: "/about/careers" },
  { label: "Diversity and Accessibility", href: "/about/diversity" },
  { label: "Super Admin Console", href: "/admin/login" },
  { label: "Sitemap", href: "/sitemap" },
];

export const sitemapSections: { heading: string; description: string; links: LinkItem[] }[] = [
  {
    heading: "Personal Banking & Deposits",
    description: "Everyday checking, high-tier relationship accounts, savings, CDs, and live rate sheets.",
    links: [
      { label: "Personal Banking Home", href: "/" },
      { label: "Checking Accounts", href: "/checking" },
      { label: "Compare Checking Accounts", href: "/checking/compare" },
      { label: "Savings Accounts & CDs", href: "/savings-cds" },
      { label: "Savings & CD Interest Rates", href: "/savings-cds/rates" },
      { label: "Wells Fargo Premier", href: "/premier" },
      { label: "Interest Rates Today", href: "/help/rates" },
      { label: "Wells Fargo en Español", href: "/es" },
    ],
  },
  {
    heading: "Credit Cards, Home Loans & Borrowing",
    description: "Rewards credit cards, home purchase and refinance mortgages, personal loans, and auto financing.",
    links: [
      { label: "Credit Cards", href: "/credit-cards" },
      { label: "Wells Fargo Autograph Visa Card", href: "/credit-cards/autograph" },
      { label: "Home Loans & Mortgages", href: "/mortgage" },
      { label: "Buying a House (3% Down Options)", href: "/mortgage/buying-a-house" },
      { label: "Today's Mortgage & Refinance Rates", href: "/mortgage/rates" },
      { label: "Personal Loans", href: "/personal-loans" },
      { label: "Auto Loans", href: "/auto-loans" },
      { label: "Borrowing That Fits Your Life", href: "/financial-goals/borrow" },
    ],
  },
  {
    heading: "Online & Mobile Banking",
    description: "Sign on, passkeys, enrollment, Wells Fargo Mobile, Fargo virtual assistant, and the demo account portal.",
    links: [
      { label: "Wells Fargo Online Banking", href: "/online-banking" },
      { label: "Account Summary Dashboard (Demo)", href: "/online-banking/dashboard" },
      { label: "Control Tower® — Manage Cards", href: "/online-banking/cards" },
      { label: "Wells Fargo Online® Security Center", href: "/online-banking/security" },
      { label: "Digital Wallets & Contactless Payments", href: "/mobile/payments" },
      { label: "Wells Fargo Rewards®", href: "/rewards" },
      { label: "Wells Fargo Tax Center", href: "/tax-center" },
      { label: "Manage Your Mortgage Account", href: "/mortgage/manage-account" },
      { label: "Zelle® Frequently Asked Questions", href: "/help/online-banking/zelle-faqs" },
      { label: "Sign On", href: "/sign-on" },
      { label: "Sign On with a Passkey", href: "/sign-on/passkey" },
      { label: "Enroll in Wells Fargo Online", href: "/enroll" },
      { label: "Forgot Username or Password?", href: "/help/password-help" },
      { label: "Wells Fargo Mobile App & Fargo", href: "/mobile-app" },
      { label: "Wells Fargo Mobile for iOS (App Store)", href: "/mobile-app/ios" },
      { label: "Wells Fargo Mobile for Android (Google Play)", href: "/mobile-app/android" },
    ],
  },
  {
    heading: "Financial Guidance, Investing & Wealth",
    description: "Financial planning tools, self-directed trading, automated investing, retirement IRAs, and wealth advisory.",
    links: [
      { label: "Financial Guidance", href: "/financial-guidance" },
      { label: "Financial Goals — See Your Path Forward", href: "/financial-goals" },
      { label: "Investing & Wealth Management", href: "/investing-wealth" },
      { label: "Investment Services", href: "/investing-wealth/investment-services" },
      { label: "Retirement Planning & IRAs", href: "/investing-wealth/retirement" },
      { label: "Wealth Management & The Private Bank", href: "/investing-wealth/wealth-management" },
    ],
  },
  {
    heading: "Business, Commercial & Corporate Banking",
    description: "Dedicated banking, lending, treasury, payments, and global markets solutions for organizations of every scale.",
    links: [
      { label: "Business Banking", href: "/biz" },
      { label: "Business Checking", href: "/biz/checking" },
      { label: "Business Savings & CDs", href: "/biz/savings" },
      { label: "Business Credit & Financing", href: "/biz/business-credit" },
      { label: "Merchant Services", href: "/biz/merchant" },
      { label: "Commercial Banking", href: "/com" },
      { label: "Commercial Financing", href: "/com/financing" },
      { label: "Treasury Management", href: "/com/treasury-management" },
      { label: "Corporate & Investment Banking", href: "/cib" },
      { label: "Capital Markets & Advisory", href: "/cib/capital-markets" },
      { label: "Global Markets", href: "/cib/global-markets" },
    ],
  },
  {
    heading: "Customer Service, Locations & Appointments",
    description: "Find branches and 24-hour ATMs, schedule time with a banker, look up routing numbers, and browse FAQs.",
    links: [
      { label: "ATMs & Branch Locations", href: "/locations" },
      { label: "Make an Appointment", href: "/appointments" },
      { label: "Customer Service & FAQs", href: "/help" },
      { label: "Routing & Account Numbers", href: "/help/routing-number" },
      { label: "Online Banking Sign-On FAQs", href: "/help/online-banking/sign-on-faqs" },
    ],
  },
  {
    heading: "About Wells Fargo & Community Impact",
    description: "Leadership, corporate citizenship, community stories, open career opportunities, and investor materials.",
    links: [
      { label: "Who We Are — About Wells Fargo", href: "/about" },
      { label: "Wells Fargo Stories", href: "/about/stories" },
      { label: "Careers at Wells Fargo", href: "/about/careers" },
      { label: "Investor Relations", href: "/about/investor-relations" },
      { label: "Diversity, Inclusion & Accessibility", href: "/about/diversity" },
    ],
  },
  {
    heading: "Dashboards & Internal Systems",
    description: "Customer online banking workspace and the restricted Super Admin operations console.",
    links: [
      { label: "Wells Fargo Online® Sign On", href: "/sign-on" },
      { label: "Customer Account Summary Dashboard", href: "/online-banking/dashboard" },
      { label: "Super Admin Console — Sign In", href: "/admin/login" },
      { label: "Super Admin Console — Operations", href: "/admin" },
      { label: "Administrator Team", href: "/admin/team" },
      { label: "Admin User Management", href: "/admin/users" },
      { label: "Support Agent Inbox", href: "/admin/support" },
      { label: "Customer Secure Messages & Notifications", href: "/online-banking/messages" },
      { label: "Admin Secure Message Center", href: "/admin/messages" },
      { label: "Admin Reports & Data Exports", href: "/admin/reports" },
      { label: "Site Analytics & Search Trends", href: "/admin/reports" },
      { label: "Site Search & Help Center", href: "/help" },
    ],
  },
  {
    heading: "Privacy, Security & Legal",
    description: "Fraud prevention, scam alerts, incident reporting, consumer privacy rights, cookie controls, and agreements.",
    links: [
      { label: "Security Center", href: "/privacy-security/fraud" },
      { label: "Stay Up to Date on Security", href: "/privacy-security/security-tips" },
      { label: "Report Fraud & Suspicious Activity", href: "/privacy-security/fraud/report" },
      { label: "Privacy, Cookies, Security & Legal", href: "/privacy-security" },
      { label: "Do Not Sell or Share My Personal Information", href: "/privacy-security/opt-out-notice" },
      { label: "Notice of Data Collection", href: "/privacy-security/notice-of-data-collection" },
      { label: "General Terms of Use", href: "/privacy-security/terms" },
      { label: "Ad Choices", href: "/privacy-security/ad-choices" },
      { label: "Online Access Agreement", href: "/online-banking/online-access-agreement" },
      { label: "Sitemap", href: "/sitemap" },
    ],
  },
];

export function getActiveNavGroupIndex(pathname: string): number {
  for (let i = navGroups.length - 1; i >= 1; i--) {
    if (navGroups[i].prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return i;
    }
  }
  return 0;
}
