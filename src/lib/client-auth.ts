"use client";

/**
 * Browser-side auth storage.
 *
 * Preview environments are frequently embedded in a cross-origin iframe, where
 * SameSite=Lax cookies are not sent on fetch requests. To keep sessions stable
 * we issue an opaque token, store it in localStorage (with an in-memory
 * fallback for sandboxed frames) and send it as an Authorization header on
 * every authenticated request. Cookies are still set as a best-effort extra.
 */

export const ADMIN_TOKEN_KEY = "wf_admin_token";
export const CUSTOMER_TOKEN_KEY = "wf_customer_token";

const fallbackStore: Record<string, string> = {};

function readHashToken(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    const token = params.get("auth") ?? "";
    if (!token) return "";
    // Cache immediately, then strip it from the visible address bar.
    fallbackStore[key] = token;
    try {
      window.localStorage.setItem(key, token);
    } catch {
      /* in-memory cache above is enough */
    }
    try {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch {
      /* ignore */
    }
    return token;
  } catch {
    return "";
  }
}

function read(key: string): string {
  if (typeof window === "undefined") return fallbackStore[key] ?? "";
  // A fresh hash-fragment token always wins over a possibly stale stored one.
  const fresh = readHashToken(key);
  if (fresh) return fresh;
  try {
    const stored = window.localStorage.getItem(key);
    if (stored) return stored;
  } catch {
    /* storage blocked */
  }
  return fallbackStore[key] ?? "";
}

function write(key: string, value: string) {
  fallbackStore[key] = value;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Sandboxed storage: in-memory fallback keeps this page session alive. */
  }
}

function remove(key: string) {
  delete fallbackStore[key];
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function getAdminToken() {
  return read(ADMIN_TOKEN_KEY);
}
export function setAdminToken(token: string) {
  write(ADMIN_TOKEN_KEY, token);
}
export function clearAdminToken() {
  remove(ADMIN_TOKEN_KEY);
}

export function getCustomerToken() {
  return read(CUSTOMER_TOKEN_KEY);
}
export function setCustomerToken(token: string) {
  write(CUSTOMER_TOKEN_KEY, token);
}
export function clearCustomerToken() {
  remove(CUSTOMER_TOKEN_KEY);
}

function withAuth(init: RequestInit, token: string): RequestInit {
  const headers = new Headers(init.headers ?? undefined);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers, credentials: "same-origin" };
}

export function adminFetch(path: string, init: RequestInit = {}) {
  return fetch(path, withAuth(init, getAdminToken()));
}

export function customerFetch(path: string, init: RequestInit = {}) {
  return fetch(path, withAuth(init, getCustomerToken()));
}

export type SignInResult = {
  ok: boolean;
  status: number;
  data: Record<string, unknown> & { error?: string; token?: string };
};

/** Navigate with a hash-fragment token fallback for sandboxed iframes. */
export function goToWithToken(path: string, token?: string) {
  if (typeof window === "undefined") return;
  window.location.assign(token ? `${path}#auth=${encodeURIComponent(token)}` : path);
}

export async function adminSignIn(username: string, password: string): Promise<SignInResult> {
  const res = await fetch("/api/admin/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ username, password }),
  });
  const data = (await res.json()) as SignInResult["data"];
  if (res.ok && typeof data.token === "string") setAdminToken(data.token);
  return { ok: res.ok, status: res.status, data };
}

export async function customerSignIn(body: Record<string, unknown>): Promise<SignInResult> {
  const res = await fetch("/api/customer/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as SignInResult["data"];
  if (res.ok && typeof data.token === "string") setCustomerToken(data.token);
  return { ok: res.ok, status: res.status, data };
}

export async function adminSignOut() {
  try {
    await adminFetch("/api/admin/session", { method: "DELETE" });
  } finally {
    clearAdminToken();
  }
}

export async function customerSignOut() {
  try {
    await customerFetch("/api/customer/session", { method: "DELETE" });
  } finally {
    clearCustomerToken();
  }
}
