import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokens } from "./api";
import type { User } from "./types";

interface AppConfig {
  app_name: string;
  ai_available: boolean;
  free_ai_daily_limit: number;
  free_tests_daily_limit: number;
  demo_accounts: boolean;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  config: AppConfig;
  login: (email: string, password: string) => Promise<User>;
  register: (full_name: string, email: string, password: string) => Promise<{ user: User; dev_link?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: User) => void;
}

const defaultConfig: AppConfig = {
  app_name: (import.meta.env.VITE_APP_NAME as string) || "IELTS AI MASTER",
  ai_available: false,
  free_ai_daily_limit: 15,
  free_tests_daily_limit: 3,
  demo_accounts: false,
};

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AppConfig>(defaultConfig);

  const refreshUser = useCallback(async () => {
    if (!tokens.has()) { setUser(null); return; }
    try { setUser(await api<User>("/api/auth/me")); } catch { setUser(null); }
  }, []);

  useEffect(() => {
    tokens.onLogout(() => setUser(null));
    api<AppConfig>("/api/config", { auth: false }).then((c) => setConfig({ ...defaultConfig, ...c })).catch(() => {});
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  useEffect(() => { document.title = config.app_name; }, [config.app_name]);

  const login = async (email: string, password: string) => {
    const d = await api("/api/auth/login", { body: { email, password }, auth: false });
    tokens.set(d.access_token, d.refresh_token);
    setUser(d.user);
    return d.user as User;
  };
  const register = async (full_name: string, email: string, password: string) => {
    const d = await api("/api/auth/register", { body: { full_name, email, password }, auth: false });
    tokens.set(d.access_token, d.refresh_token);
    setUser(d.user);
    return { user: d.user as User, dev_link: d.dev_link as string | undefined };
  };
  const logout = async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch { /* token allaqachon yaroqsiz */ }
    tokens.clear();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, config, login, register, logout, refreshUser, setUser }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
