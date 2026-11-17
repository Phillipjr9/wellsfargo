"use client";

import { SignOnCard } from "@/components/sign-on-card";
import { customerFetch, customerSignOut, getCustomerToken } from "@/lib/client-auth";
import { footerLinks, getActiveNavGroupIndex, navGroups, popularFaqs } from "@/lib/navigation";
import { Bell, CalendarDays, ChevronDown, ChevronRight, MapPin, Menu, Phone, Search, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

type SearchResult = { title: string; description: string; category: string; url: string };

function HelpPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [qp, setQp] = useState("");

  return (
    <div className="help-panel" role="dialog" aria-label="Help and customer service">
      <div className="help-panel-top">
        <div className="help-panel-heading">
          <h2>How can we help?</h2>
          <button type="button" aria-label="Close help" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form
          className="location-form"
          action="/locations"
          method="get"
          onSubmit={(event) => {
            event.preventDefault();
            onClose();
            router.push(qp.trim() ? `/locations?qp=${encodeURIComponent(qp.trim())}` : "/locations");
          }}
        >
          <label htmlFor="help-location">
            <MapPin size={20} /> Find a location
          </label>
          <div className="location-input-row">
            <input
              id="help-location"
              name="qp"
              value={qp}
              onChange={(event) => setQp(event.target.value)}
              placeholder="City, State or ZIP"
            />
            <button type="submit">Go</button>
          </div>
        </form>
        <Link href="/appointments" onClick={onClose}>
          <CalendarDays size={20} /> Make an appointment <ChevronRight size={16} />
        </Link>
        <Link href="/help" onClick={onClose}>
          <Phone size={20} /> Contact us <ChevronRight size={16} />
        </Link>
      </div>
      <div className="help-panel-bottom">
        <h3>Popular FAQs</h3>
        {popularFaqs.map((faq) => (
          <Link key={faq.href} href={faq.href} onClick={onClose}>
            {faq.label} <ChevronRight size={16} />
          </Link>
        ))}
      </div>
    </div>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      async () => {
        setLoading(true);
        setError("");
        try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
          if (!response.ok) throw new Error("Search unavailable");
          const data: { results: SearchResult[] } = await response.json();
          setResults(data.results);
        } catch {
          if (!controller.signal.aborted) {
            setError("Search is temporarily unavailable. Please try again later.");
            setResults([]);
          }
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      query ? 180 : 0,
    );
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Search Wells Fargo"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading">
          <h2>How can we help you?</h2>
          <button type="button" aria-label="Close search" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <div className="site-search-field">
          <Search size={23} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Wells Fargo"
            aria-label="Search Wells Fargo"
          />
          <span>Search</span>
        </div>
        {!query && (
          <div className="suggestions">
            <span>Popular searches</span>
            {["Checking", "Credit cards", "Mortgage", "Rates", "Routing number", "Locations", "Appointments"].map(
              (term) => (
                <button type="button" key={term} onClick={() => setQuery(term)}>
                  {term}
                </button>
              ),
            )}
          </div>
        )}
        <div className="search-results" aria-live="polite">
          <h3>{query ? "Search results" : "Popular pages"}</h3>
          {loading ? (
            <p className="search-status">Searching...</p>
          ) : error ? (
            <p className="search-status">{error}</p>
          ) : results.length === 0 ? (
            <p className="search-status">
              No results found. Browse all pages in our <Link href="/sitemap" onClick={onClose}>Sitemap</Link>.
            </p>
          ) : (
            results.map((item) => (
              <Link key={item.url} href={item.url} onClick={onClose} className="search-result">
                <span className="search-result-type">{item.category}</span>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
                <ChevronRight size={19} />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function MobileDrawer({
  initialGroup,
  onClose,
  onSearch,
}: {
  initialGroup: number;
  onClose: () => void;
  onSearch: () => void;
}) {
  const [expanded, setExpanded] = useState(initialGroup);

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="mobile-drawer" aria-label="Mobile navigation" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <span>MENU</span>
          <button type="button" onClick={onClose} aria-label="Close menu">
            <X size={24} />
          </button>
        </div>
        <button
          type="button"
          className="drawer-search"
          onClick={() => {
            onClose();
            onSearch();
          }}
        >
          <Search size={19} /> Search <ChevronRight size={17} />
        </button>
        <nav aria-label="Main mobile navigation">
          {navGroups.map((group, index) => (
            <div className="drawer-group" key={group.label}>
              <button
                type="button"
                className={expanded === index ? "selected" : ""}
                onClick={() => setExpanded(expanded === index ? -1 : index)}
                aria-expanded={expanded === index}
              >
                {group.label}
                <ChevronDown size={18} />
              </button>
              {expanded === index && (
                <div className="drawer-subitems">
                  {group.links.map((link) => (
                    <Link key={link.href} href={link.href} onClick={onClose}>
                      {link.label}
                      <ChevronRight size={16} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="drawer-utilities">
          <Link href="/locations" onClick={onClose}>
            ATMs/Locations
          </Link>
          <Link href="/appointments" onClick={onClose}>
            Make an appointment
          </Link>
          <Link href="/help" onClick={onClose}>
            Customer service and FAQs
          </Link>
          <Link href="/es" onClick={onClose}>
            Español
          </Link>
          <Link href="/sitemap" onClick={onClose}>
            Sitemap
          </Link>
        </div>
      </aside>
    </div>
  );
}

export function SiteShell({
  children,
  isHome = false,
  langToggle = "es",
}: {
  children: ReactNode;
  isHome?: boolean;
  langToggle?: "es" | "en";
}) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const routeNavIndex = getActiveNavGroupIndex(pathname);
  const [helpOpen, setHelpOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [inbox, setInbox] = useState<{ id: number; title: string; body: string; kind: string; href: string | null; isRead: boolean }[]>([]);
  const [unread, setUnread] = useState(0);

  // Browser-only state must never be read during the first render, otherwise
  // SSR and hydration disagree (React error #418).
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !getCustomerToken()) return;
    let active = true;
    const poll = async () => {
      try {
        const res = await customerFetch("/api/notifications");
        if (!res.ok) return;
        const data = (await res.json()) as { notifications: typeof inbox; unread: number };
        if (!active) return;
        setInbox(data.notifications ?? []);
        setUnread(data.unread ?? 0);
      } catch {
        /* ignore */
      }
    };
    void poll();
    const timer = window.setInterval(poll, 20000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [mounted, pathname]);

  async function markNoticeRead(id?: number) {
    await customerFetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : {}),
    });
    setInbox((prev) => prev.map((n) => (!id || n.id === id ? { ...n, isRead: true } : n)));
    setUnread(id ? Math.max(0, unread - 1) : 0);
  }

  useEffect(() => {
    if (searchOpen || mobileOpen || signInOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
  }, [searchOpen, mobileOpen, signInOpen]);

  function handleHeaderSignOn() {
    setHelpOpen(false);
    if (isHome && window.innerWidth >= 1080) {
      const heroInput = document.querySelector<HTMLInputElement>(".hero-signin .signin-field input");
      if (heroInput) {
        heroInput.focus();
        document.querySelector(".hero-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    if (isHome && window.innerWidth < 1080) {
      setSignInOpen(true);
      return;
    }
    router.push("/sign-on");
  }

  const activeGroup = navGroups[routeNavIndex];

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="wordmark" aria-label="Wells Fargo home">
            <img src="/images/wells-fargo-wordmark.png" alt="Wells Fargo" width="220" height="23" />
          </Link>
          <nav className="header-utilities" aria-label="Header navigation">
            <Link href="/locations">ATMs/Locations</Link>
            <button
              type="button"
              className={helpOpen ? "utility-help active" : "utility-help"}
              onClick={() => setHelpOpen(!helpOpen)}
              aria-expanded={helpOpen}
            >
              Help
            </button>
            {langToggle === "en" ? (
              <Link href="/">English</Link>
            ) : (
              <Link href="/es" lang="es">
                Español
              </Link>
            )}
            {mounted && getCustomerToken() && (
              <div className="header-bell-wrap">
                <button
                  type="button"
                  className="utility-bell"
                  aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
                  aria-expanded={bellOpen}
                  onClick={() => { setBellOpen(!bellOpen); setHelpOpen(false); }}
                >
                  <Bell size={20} strokeWidth={2} />
                  {unread > 0 && <span className="bell-count">{unread}</span>}
                </button>
                {bellOpen && (
                  <div className="header-bell-panel" role="dialog" aria-label="Notifications">
                    <div className="header-bell-head">
                      <strong>Notifications {unread > 0 && <span>({unread} new)</span>}</strong>
                      <button type="button" onClick={() => setBellOpen(false)} aria-label="Close notifications"><X size={16} /></button>
                    </div>
                    <div className="header-bell-list">
                      {inbox.slice(0, 6).map((n) => (
                        <div key={n.id} className={n.isRead ? "header-bell-item" : "header-bell-item unread"}>
                          <span className="wf-badge">{n.kind}</span>
                          <strong>{n.title}</strong>
                          <p>{n.body}</p>
                          {n.href && <Link href={n.href} onClick={() => setBellOpen(false)}>Open <ChevronRight size={13} /></Link>}
                          {!n.isRead && <button type="button" onClick={() => void markNoticeRead(n.id)}>Mark read</button>}
                        </div>
                      ))}
                      {inbox.length === 0 && <p className="header-bell-empty">You&apos;re all caught up.</p>}
                    </div>
                    <div className="header-bell-foot">
                      <button type="button" onClick={() => void markNoticeRead()}>Mark all read</button>
                      <Link href="/online-banking/messages" onClick={() => setBellOpen(false)}>Message center <ChevronRight size={13} /></Link>
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              className="utility-search"
              aria-label="Search"
              onClick={() => {
                setHelpOpen(false);
                setBellOpen(false);
                setSearchOpen(true);
              }}
            >
              <Search size={23} strokeWidth={2.1} />
            </button>
          </nav>
          {pathname.startsWith("/online-banking/") ? (
            <button
              type="button"
              className="header-signin"
              onClick={async () => {
                await customerSignOut();
                window.location.assign("/sign-on");
              }}
            >
              Sign Off
            </button>
          ) : (
            <button type="button" className="header-signin" onClick={handleHeaderSignOn}>
              Sign On
            </button>
          )}
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={29} strokeWidth={2.2} />
            <span>MENU</span>
          </button>
          {helpOpen && <HelpPanel onClose={() => setHelpOpen(false)} />}
        </div>
      </header>

      <div className="desktop-navigation">
        <nav className="main-nav" aria-label="Banking categories">
          <div className="main-nav-inner">
            {navGroups.map((group, index) => (
              <Link
                key={group.label}
                href={group.href}
                className={routeNavIndex === index ? "nav-tab active" : "nav-tab"}
                aria-current={routeNavIndex === index ? "page" : undefined}
              >
                {group.label}
              </Link>
            ))}
          </div>
        </nav>
        <nav className="sub-nav" aria-label={`${activeGroup.label} services`}>
          <div className="sub-nav-inner">
            {activeGroup.links.map((link) => {
              const isSubActive =
                pathname === link.href ||
                (link.href !== activeGroup.href && pathname.startsWith(`${link.href}/`));
              return (
                <Link key={link.href} href={link.href} className={isSubActive ? "sub-nav-active" : undefined}>
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="footer-inner content-width">
          <nav aria-label="Footer navigation" className="footer-links">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="footer-legal">
            <p className="footer-fdic-box">
              Investment and Insurance Products are: Not Insured by the FDIC or Any Federal Government Agency • Not a
              Deposit or Other Obligation of, or Guaranteed by, the Bank or Any Bank Affiliate • Subject to Investment
              Risks, Including Possible Loss of the Principal Amount Invested
            </p>
            <p>
              Deposit products offered by Wells Fargo Bank, N.A. Member FDIC. Equal Housing Lender. NMLSR ID 399801.
            </p>
            <p>© {new Date().getFullYear()} Wells Fargo Bank, N.A. All rights reserved.</p>
            <p className="demo-disclaimer">
              <ShieldCheck size={17} /> Interactive Wells Fargo clone environment — all pages and forms operate locally
              with demo data; never enter real banking credentials.
            </p>
          </div>
        </div>
      </footer>

      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
      {mobileOpen && (
        <MobileDrawer
          initialGroup={routeNavIndex}
          onClose={() => setMobileOpen(false)}
          onSearch={() => setSearchOpen(true)}
        />
      )}
      {signInOpen && (
        <div className="modal-backdrop" onMouseDown={() => setSignInOpen(false)}>
          <div
            className="signin-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Sign on"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" type="button" aria-label="Close sign on" onClick={() => setSignInOpen(false)}>
              <X size={22} />
            </button>
            <SignOnCard onAfterSubmit={() => setSignInOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
