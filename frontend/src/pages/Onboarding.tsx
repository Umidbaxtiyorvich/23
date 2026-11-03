import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, Check, GraduationCap, Briefcase } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "../components/Layout";
import { ErrorBox, SKILL_META, Spinner } from "../components/ui";
import { api, errMsg } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Skill } from "../lib/types";

const LEVELS = [
  ["A1", "Boshlang'ich", "Oddiy so'z va iboralar"], ["A2", "Elementar", "Kundalik mavzularda gaplashaman"],
  ["B1", "O'rta", "Tanish mavzularda erkin gapiraman"], ["B2", "O'rtadan yuqori", "Murakkab matnlarni tushunaman"],
  ["C1", "Yuqori", "Akademik va professional ingliz tili"], ["C2", "Mukammal", "Ona tilidek"],
];
const MINUTES = [[20, "20 daqiqa", "Yengil"], [45, "45 daqiqa", "O'rtacha"], [60, "1 soat", "Jiddiy"], [120, "2 soat+", "Intensiv"]];

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const p = user?.profile;
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    exam_type: p?.exam_type || "academic", current_level: p?.current_level || "B1", target_band: p?.target_band || 6.5,
    exam_date: p?.exam_date || "", daily_minutes: p?.daily_minutes || 60, weak_skills: (p?.weak_skills || []) as Skill[],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const steps = [
    { title: "Qaysi IELTS turiga tayyorlanyapsiz?", body: (
      <div className="grid gap-3 sm:grid-cols-2">
        {[["academic", "Academic", "Universitetga kirish, magistratura", GraduationCap], ["general", "General Training", "Ish, migratsiya, immigratsiya", Briefcase]].map(([v, t, d, I]: any) => (
          <Choice key={v} active={f.exam_type === v} onClick={() => setF({ ...f, exam_type: v })}><I className="mb-2 size-6 text-brand-500" /><b>{t}</b><span className="text-sm text-ink-500">{d}</span></Choice>
        ))}
      </div>) },
    { title: "Hozirgi ingliz tili darajangiz?", body: (
      <div className="grid gap-3 sm:grid-cols-2">
        {LEVELS.map(([v, t, d]) => <Choice key={v} active={f.current_level === v} onClick={() => setF({ ...f, current_level: v })}><b>{v} · {t}</b><span className="text-sm text-ink-500">{d}</span></Choice>)}
      </div>) },
    { title: "Maqsadli IELTS balingiz?", body: (
      <div>
        <div className="text-center text-6xl font-extrabold text-brand-500">{f.target_band.toFixed(1)}</div>
        <input type="range" min={4} max={9} step={0.5} value={f.target_band} onChange={(e) => setF({ ...f, target_band: +e.target.value })} className="mt-6 w-full accent-[#ff6b4a]" />
        <div className="mt-1 flex justify-between text-xs text-ink-500"><span>4.0</span><span>6.5</span><span>9.0</span></div>
      </div>) },
    { title: "Imtihon qachon?", body: (
      <div className="space-y-3">
        <input type="date" className="input text-lg" min={today} value={f.exam_date} onChange={(e) => setF({ ...f, exam_date: e.target.value })} />
        <button className="btn-ghost" onClick={() => setF({ ...f, exam_date: "" })}>Hali aniq emas</button>
      </div>) },
    { title: "Kuniga qancha vaqt ajrata olasiz?", body: (
      <div className="grid gap-3 sm:grid-cols-2">
        {MINUTES.map(([v, t, d]) => <Choice key={v} active={f.daily_minutes === v} onClick={() => setF({ ...f, daily_minutes: v as number })}><b>{t}</b><span className="text-sm text-ink-500">{d}</span></Choice>)}
      </div>) },
    { title: "Qaysi bo'limlar siz uchun qiyin?", body: (
      <div className="grid gap-3 sm:grid-cols-2">
        {(["listening", "reading", "writing", "speaking"] as Skill[]).map((s) => {
          const M = SKILL_META[s];
          const on = f.weak_skills.includes(s);
          return <Choice key={s} active={on} onClick={() => setF({ ...f, weak_skills: on ? f.weak_skills.filter((x) => x !== s) : [...f.weak_skills, s] })}>
            <M.icon className={clsx("mb-2 size-6", M.color)} /><b>{M.label}</b></Choice>;
        })}
      </div>) },
  ];

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api("/api/profile/onboarding", { body: { ...f, exam_date: f.exam_date || null } });
      setUser(r.user);
      nav("/dashboard", { replace: true });
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-brand-50/60 to-white">
      <div className="mx-auto max-w-2xl px-5 py-8">
        <div className="mb-8 flex items-center justify-between"><Logo /><span className="text-sm font-semibold text-ink-500">{step + 1} / {steps.length}</span></div>
        <div className="mb-8 flex gap-1.5">{steps.map((_, i) => <div key={i} className={clsx("h-1.5 flex-1 rounded-full transition", i <= step ? "bg-brand-500" : "bg-ink-900/10")} />)}</div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
            <h1 className="mb-6 text-2xl font-extrabold sm:text-3xl">{steps[step].title}</h1>
            {steps[step].body}
          </motion.div>
        </AnimatePresence>
        {error && <div className="mt-6"><ErrorBox error={error} /></div>}
        <div className="mt-10 flex justify-between">
          <button className="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft className="size-4" /> Orqaga</button>
          {step < steps.length - 1
            ? <button className="btn-primary" onClick={() => setStep(step + 1)}>Keyingi <ArrowRight className="size-4" /></button>
            : <button className="btn-primary" onClick={finish} disabled={busy}>{busy ? <Spinner className="text-white" /> : <Check className="size-4" />} Rejamni yaratish</button>}
        </div>
      </div>
    </div>
  );
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={clsx("relative flex flex-col items-start rounded-2xl border-2 bg-white p-4 text-left transition hover:border-brand-300",
      active ? "border-brand-500 shadow-lg shadow-brand-500/10" : "border-line")}>
      {active && <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-brand-500 text-white"><Check className="size-3" /></span>}
      {children}
    </button>
  );
}
