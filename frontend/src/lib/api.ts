// Backend bilan ishlash: JWT access + refresh tokenlar, avtomatik yangilash, xatolarni bir xil formatda qaytarish.
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "";
const ACCESS = "iam.access";
const REFRESH = "iam.refresh";

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const store = {
  get(k: string) {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k: string, v: string | null) {
    try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ }
  },
};

let accessToken: string | null = store.get(ACCESS);
let refreshing: Promise<boolean> | null = null;
let onLogout: (() => void) | null = null;

export const tokens = {
  set(access: string, refresh: string) {
    accessToken = access;
    store.set(ACCESS, access);
    store.set(REFRESH, refresh);
  },
  clear() {
    accessToken = null;
    store.set(ACCESS, null);
    store.set(REFRESH, null);
  },
  has: () => !!(accessToken || store.get(REFRESH)),
  onLogout(cb: () => void) { onLogout = cb; },
};

async function refresh(): Promise<boolean> {
  const rt = store.get(REFRESH);
  if (!rt) return false;
  refreshing ??= fetch(`${BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: rt }),
  })
    .then(async (r) => {
      if (!r.ok) return false;
      const d = await r.json();
      tokens.set(d.access_token, d.refresh_token);
      return true;
    })
    .catch(() => false)
    .finally(() => { refreshing = null; });
  return refreshing;
}

type Opts = { method?: string; body?: unknown; form?: FormData; auth?: boolean; signal?: AbortSignal };

export async function api<T = any>(path: string, opts: Opts = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken && opts.auth !== false) headers.Authorization = `Bearer ${accessToken}`;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method || (opts.body !== undefined || opts.form ? "POST" : "GET"),
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "Server bilan bog'lanib bo'lmadi. Internet yoki backend ishlayotganini tekshiring.");
  }
  if (res.status === 401 && retry && opts.auth !== false && store.get(REFRESH)) {
    if (await refresh()) return api<T>(path, opts, false);
    tokens.clear();
    onLogout?.();
  }
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = typeof data?.detail === "string" ? data.detail : res.status === 429 ? "Juda ko'p so'rov, birozdan keyin urinib ko'ring" : `Xatolik (${res.status})`;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Noma'lum xatolik");
