import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { AlertTriangle, BookOpen, Crown, Headphones, Info, Loader2, Lock, Mic, PenLine, Sparkles, X } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export const SKILL_META: Record<string, { label: string; color: string; bg: string; icon: typeof Headphones }> = {
  listening: { label: "Listening", color: "text-listening", bg: "bg-listening/10", icon: Headphones },
  reading: { label: "Reading", color: "text-reading", bg: "bg-reading/10", icon: BookOpen },
  writing: { label: "Writing", color: "text-writing", bg: "bg-writing/10", icon: PenLine },
  speaking: { label: "Speaking", color: "text-speaking", bg: "bg-speaking/10", icon: Mic },
  vocabulary: { label: "Vocabulary", color: "text-brand-600", bg: "bg-brand-50", icon: Sparkles },
  grammar: { label: "Grammar", color: "text-ink-700", bg: "bg-ink-900/5", icon: Sparkles },
  mock: { label: "Mock exam", color: "text-brand-700", bg: "bg-brand-100", icon: Crown },
};
export const SKILL_HEX: Record<string, string> = { listening: "#4f7cff", reading: "#10b981", writing: "#a855f7", speaking: "#f59e0b", overall: "#ff6b4a" };

export function SkillIcon({ skill, className = "" }: { skill: string; className?: string }) {
  const m = SKILL_META[skill] || SKILL_META.grammar;
  const I = m.icon;
  return <span className={clsx("grid size-9 shrink-0 place-items-center rounded-xl", m.bg, m.color, className)}><I className="size-[18px]" /></span>;
}

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={clsx("size-5 animate-spin text-brand-500", className)} />;
}

export function PageLoader({ text = "Yuklanmoqda…" }: { text?: string }) {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <div className="flex items-center gap-3 text-ink-500"><Spinner /> {text}</div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-xl bg-ink-900/5", className)} />;
}

export function ErrorBox({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertTriangle className="mt-0.5 size-5 shrink-0" />
      <div className="flex-1">{error}</div>
      {onRetry && <button className="font-semibold underline" onClick={onRetry}>Qayta urinish</button>}
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" | "ok" }) {
  const cls = { info: "border-sky-200 bg-sky-50 text-sky-900", warn: "border-amber-200 bg-amber-50 text-amber-900", ok: "border-emerald-200 bg-emerald-50 text-emerald-900" }[tone];
  return <div className={clsx("flex items-start gap-2.5 rounded-2xl border p-3.5 text-sm", cls)}><Info className="mt-0.5 size-4 shrink-0" /><div className="flex-1">{children}</div></div>;
}

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line p-8 text-center">
      <div className="text-brand-400">{icon || <Sparkles className="size-8" />}</div>
      <div className="font-bold">{title}</div>
      {text && <p className="max-w-sm text-sm text-ink-500">{text}</p>}
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "", ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("card p-5", className)} {...rest}>{children}</div>;
}

export function Progress({ value, className = "", color = "bg-brand-500" }: { value: number; className?: string; color?: string }) {
  return (
    <div className={clsx("h-2 overflow-hidden rounded-full bg-ink-900/5", className)}>
      <motion.div className={clsx("h-full rounded-full", color)} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value))}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
    </div>
  );
}

export function BandRing({ value, max = 9, size = 120, label, color = "#ff6b4a" }: { value: number | null; max?: number; size?: number; label?: string; color?: string }) {
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  const pct = value ? value / max : 0;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#f0f0f5" strokeWidth={9} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={9} fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ duration: 1, ease: "easeOut" }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-extrabold leading-none" style={{ fontSize: size / 4.2 }}>{value ?? "—"}</div>
        {label && <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</div>}
      </div>
    </div>
  );
}

export function BandBadge({ band }: { band: number | null | undefined }) {
  if (band === null || band === undefined) return <span className="chip bg-ink-900/5 text-ink-500">—</span>;
  const cls = band >= 7 ? "bg-emerald-50 text-emerald-700" : band >= 5.5 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";
  return <span className={clsx("chip", cls)}>Band {band.toFixed(1)}</span>;
}

export function DemoBadge({ show = true, title }: { show?: boolean; title?: string }) {
  if (!show) return null;
  return <span title={title || "AI kaliti sozlanmagan — oddiy qoidalarga asoslangan demo natija"} className="chip bg-amber-100 text-amber-800">DEMO</span>;
}

export function PremiumBadge() {
  return <span className="chip bg-gradient-to-r from-brand-500 to-rose-500 text-white"><Crown className="size-3" /> Premium</span>;
}

export function PremiumLock({ title = "Premium imkoniyat", text }: { title?: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand-200 bg-gradient-to-b from-brand-50 to-white p-6 text-center">
      <span className="grid size-11 place-items-center rounded-2xl bg-brand-500 text-white"><Lock className="size-5" /></span>
      <div className="font-bold">{title}</div>
      {text && <p className="max-w-sm text-sm text-ink-500">{text}</p>}
      <Link to="/pricing" className="btn-primary"><Crown className="size-4" /> Premiumga o'tish</Link>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div className={clsx("card max-h-[90vh] w-full overflow-y-auto p-6", wide ? "max-w-3xl" : "max-w-md")} initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, opacity: 0 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-lg font-bold">{title}</h3>
              <button className="btn-ghost p-1.5" onClick={onClose} aria-label="Yopish"><X className="size-5" /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[] }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-ink-900/5 p-1">
      {items.map((it) => (
        <button key={it.value} onClick={() => onChange(it.value)}
          className={clsx("relative rounded-xl px-3.5 py-1.5 text-sm font-semibold transition", value === it.value ? "text-ink-900" : "text-ink-500 hover:text-ink-900")}>
          {value === it.value && <motion.span layoutId={`tab-${items.map((i) => i.value).join()}`} className="absolute inset-0 rounded-xl bg-white shadow-sm" />}
          <span className="relative">{it.label}</span>
        </button>
      ))}
    </div>
  );
}

export function StatCard({ icon, label, value, hint, color = "text-brand-600 bg-brand-50" }: { icon: ReactNode; label: string; value: ReactNode; hint?: ReactNode; color?: string }) {
  return (
    <Card className="flex items-center gap-4">
      <span className={clsx("grid size-11 shrink-0 place-items-center rounded-2xl", color)}>{icon}</span>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</div>
        <div className="text-xl font-extrabold">{value}</div>
        {hint && <div className="truncate text-xs text-ink-500">{hint}</div>}
      </div>
    </Card>
  );
}

/** Juda sodda va xavfsiz markdown: **qalin**, *kursiv*, ro'yxatlar, satrlar. HTML ishlatilmaydi. */
export function Md({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let list: ReactNode[] = [];
  const flush = () => { if (list.length) { out.push(<ul key={out.length} className="mb-2 list-disc space-y-1 pl-5">{list}</ul>); list = []; } };
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g).map((p, i) =>
    p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : (p.startsWith("*") || p.startsWith("_")) && p.length > 2 ? <em key={i}>{p.slice(1, -1)}</em> : p);
  lines.forEach((l, i) => {
    const m = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/);
    if (m) { list.push(<li key={i}>{inline(m[1])}</li>); return; }
    flush();
    if (l.trim()) out.push(<p key={i} className="mb-2 last:mb-0">{inline(l.replace(/^#+\s*/, ""))}</p>);
  });
  flush();
  return <div className="prose-feedback">{out}</div>;
}
