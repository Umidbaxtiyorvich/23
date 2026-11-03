import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import {
  BarChart3, BookA, Bot, CalendarCheck, ClipboardList, Crown, Gamepad2, LayoutDashboard, LogOut, Menu, Mic, PenLine,
  Shield, Timer, UserRound, X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useStudyHeartbeat } from "../lib/hooks";
import { Notice } from "./ui";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/plan", label: "AI o'quv reja", icon: CalendarCheck },
  { to: "/tutor", label: "Preppy AI Tutor", icon: Bot },
  { to: "/tests", label: "Mock testlar", icon: ClipboardList },
  { to: "/writing", label: "Writing", icon: PenLine },
  { to: "/speaking", label: "Speaking", icon: Mic },
  { to: "/exam", label: "Exam mode", icon: Timer },
  { to: "/vocabulary", label: "Vocabulary", icon: BookA },
  { to: "/games", label: "O'yinlar", icon: Gamepad2 },
  { to: "/statistics", label: "Statistika", icon: BarChart3 },
];

export function Logo({ compact = false }: { compact?: boolean }) {
  const { config } = useAuth();
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img src="/logo.svg" alt="" className="size-9" />
      {!compact && <span className="text-[15px] font-extrabold leading-tight tracking-tight">{config.app_name}</span>}
    </Link>
  );
}

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const items = [...NAV, ...(user?.is_admin ? [{ to: "/admin", label: "Admin panel", icon: Shield }] : [])];
  return (
    <div className="flex h-full flex-col gap-1 p-4">
      <div className="mb-5 px-2 pt-1"><Logo /></div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto scrollbar-thin">
        {items.map(({ to, label, icon: I }) => (
          <NavLink key={to} to={to} onClick={onNavigate}
            className={({ isActive }) => clsx("group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              isActive ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-ink-900/[.04] hover:text-ink-900")}>
            {({ isActive }) => (<>
              {isActive && <motion.span layoutId="nav-dot" className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-brand-500" />}
              <I className="size-[18px]" /> {label}
            </>)}
          </NavLink>
        ))}
      </nav>
      {!user?.is_premium && !user?.is_admin && (
        <Link to="/pricing" onClick={onNavigate} className="mt-3 rounded-2xl bg-gradient-to-br from-brand-500 to-rose-500 p-4 text-white shadow-lg shadow-brand-500/25">
          <Crown className="mb-2 size-5" />
          <div className="font-bold">Premiumga o'ting</div>
          <div className="text-xs text-white/85">To'liq mock testlar, AI Speaking va batafsil statistika</div>
        </Link>
      )}
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-line p-2.5">
        <Link to="/profile" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink-900 text-sm font-bold text-white">{user?.full_name?.[0]?.toUpperCase() || <UserRound className="size-4" />}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{user?.full_name}</span>
            <span className="block truncate text-xs text-ink-500">{user?.is_admin ? "Administrator" : user?.is_premium ? "Premium" : "Free tarif"}</span>
          </span>
        </Link>
        <button className="btn-ghost p-2" title="Chiqish" onClick={async () => { await logout(); nav("/login"); }}><LogOut className="size-4" /></button>
      </div>
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, refreshUser } = useAuth();
  const loc = useLocation();
  const [sent, setSent] = useState<string | null>(null);
  useStudyHeartbeat(!!user);
  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-white lg:block"><SideNav /></aside>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-white/85 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <button className="btn-ghost p-2" onClick={() => setOpen(true)} aria-label="Menyu"><Menu className="size-5" /></button>
      </header>
      <AnimatePresence>
        {open && (<>
          <motion.div className="fixed inset-0 z-40 bg-ink-900/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl lg:hidden" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "spring", damping: 28, stiffness: 300 }}>
            <button className="btn-ghost absolute right-3 top-3 p-2" onClick={() => setOpen(false)} aria-label="Yopish"><X className="size-5" /></button>
            <SideNav onNavigate={() => setOpen(false)} />
          </motion.aside>
        </>)}
      </AnimatePresence>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {user && !user.is_verified && (
          <div className="mb-5">
            <Notice tone="warn">
              Emailingiz tasdiqlanmagan.{" "}
              {sent ? <span>{sent}</span> : (
                <button className="font-semibold underline" onClick={async () => {
                  try {
                    const r = await api("/api/auth/resend-verification", { method: "POST" });
                    setSent(r.dev_link ? "Dev rejim: havola konsol/logga yozildi." : "Tasdiqlash xati yuborildi.");
                    if (r.dev_link) console.info("Tasdiqlash havolasi:", r.dev_link);
                    refreshUser();
                  } catch (e) { setSent((e as Error).message); }
                }}>Tasdiqlash xatini qayta yuborish</button>
              )}
            </Notice>
          </div>
        )}
        <motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}

export function AuthShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8"><Logo /></div>
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-ink-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-500 via-brand-500 to-rose-500 lg:block">
        <div className="absolute -left-20 -top-20 size-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 right-0 size-[28rem] rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex h-full flex-col justify-center p-14 text-white">
          <div className="max-w-md">
            <div className="chip mb-5 bg-white/20 text-white">AI + IELTS</div>
            <h2 className="text-4xl font-extrabold leading-tight">Maqsadli balingizga aqlli reja bilan erishing.</h2>
            <p className="mt-4 text-white/85">Mock testlar, AI writing va speaking tahlili, shaxsiy o'quv reja — barchasi bitta joyda.</p>
            <div className="mt-10 grid grid-cols-2 gap-3">
              {[["4 bo'lim", "Listening · Reading · Writing · Speaking"], ["AI feedback", "Band score taxmini va tavsiyalar"], ["Preppy", "Ovozli AI tutor"], ["SRS", "Aqlli lug'at takrorlash"]].map(([a, b]) => (
                <div key={a} className="rounded-2xl bg-white/15 p-4 backdrop-blur"><div className="font-bold">{a}</div><div className="text-sm text-white/80">{b}</div></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
