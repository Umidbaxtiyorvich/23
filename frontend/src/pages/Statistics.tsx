import { BookOpen, Clock, Gamepad2, ListChecks, Sparkles } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { BandBadge, BandRing, Card, Empty, ErrorBox, PageHeader, PageLoader, PremiumLock, Progress, SKILL_HEX, SKILL_META, SkillIcon, StatCard, Tabs } from "../components/ui";
import { useApi } from "../lib/hooks";
import { useState } from "react";
import { fmtDate } from "../lib/format";

interface Stats {
  premium: boolean; overall_band: number; estimated_from_level: boolean; target_band: number; bands: Record<string, number | null>;
  totals: { study_minutes: number; tests_completed: number; words_reviewed: number; games_played: number; ai_requests: number };
  daily_minutes: { date: string; minutes: number }[]; band_history: Record<string, any>[];
  skill_history: Record<string, { date: string; band: number }[]>;
  tests_history: { id: number; title: string; skill: string; band: number | null; mode: string; score: string; date: string; time_spent_sec: number }[];
  weekly: { week: string; minutes: number; tests: number; band: number | null }[] | null;
  monthly: { month: string; minutes: number; tests: number; words: number }[] | null;
  weak_areas: { label: string; accuracy: number; correct: number; total: number; skill: string }[] | null;
  games?: { game: string; played: number; best: number }[];
  recommendations: string[]; recommendations_ai: boolean; detailed_locked: boolean;
}
const SKILLS = ["listening", "reading", "writing", "speaking"] as const;
const BAR: Record<string, string> = { listening: "bg-listening", reading: "bg-reading", writing: "bg-writing", speaking: "bg-speaking" };
const short = (d: string) => fmtDate(d, "short");

export default function Statistics() {
  const { data: s, loading, error, reload } = useApi<Stats>("/api/statistics?days=90");
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  if (loading) return <PageLoader />;
  if (error || !s) return <ErrorBox error={error || "Xatolik"} onRetry={reload} />;
  const hasHistory = s.band_history.length > 0;
  return (
    <div className="space-y-6">
      <PageHeader title="Statistika" subtitle="Barcha natijalaringiz real ma'lumotlar asosida" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex items-center gap-5">
          <BandRing value={s.overall_band} label="Overall" size={128} />
          <div className="flex-1 space-y-2">
            <div className="text-sm text-ink-500">Maqsad: <b className="text-ink-900">{s.target_band}</b>{s.estimated_from_level && " · daraja asosida taxmin"}</div>
            <Progress value={(s.overall_band / s.target_band) * 100} />
            <div className="text-xs text-ink-500">Maqsadgacha {Math.max(0, s.target_band - s.overall_band).toFixed(1)} band qoldi</div>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          {SKILLS.map((k) => (
            <Card key={k} className="flex items-center gap-3 p-4">
              <SkillIcon skill={k} />
              <div className="flex-1"><div className="text-xs font-semibold text-ink-500">{SKILL_META[k].label}</div><div className="text-2xl font-extrabold">{s.bands[k] ?? "—"}</div></div>
              <Progress value={((s.bands[k] || 0) / 9) * 100} className="w-16" color={BAR[k]} />
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Clock className="size-5" />} label="O'rganish vaqti" value={`${Math.round(s.totals.study_minutes / 60)} soat`} hint={`${s.totals.study_minutes} daqiqa`} color="bg-sky-50 text-sky-600" />
        <StatCard icon={<ListChecks className="size-5" />} label="Testlar" value={s.totals.tests_completed} />
        <StatCard icon={<BookOpen className="size-5" />} label="So'z takrorlandi" value={s.totals.words_reviewed} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={<Gamepad2 className="size-5" />} label="O'yinlar" value={s.totals.games_played} color="bg-purple-50 text-purple-600" />
      </div>

      <Card>
        <h3 className="mb-1 font-bold">IELTS band score o'zgarishi</h3>
        <p className="mb-4 text-sm text-ink-500">Oxirgi 90 kun · har bir bo'lim va overall</p>
        {!hasHistory ? <Empty title="Hali natija yo'q" text="Test ishlang yoki essay yozing — grafik shu yerda paydo bo'ladi" action={<Link to="/tests" className="btn-primary">Test boshlash</Link>} /> : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={s.band_history.map((h) => ({ ...h, d: short(h.date) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" />
                <XAxis dataKey="d" fontSize={12} /><YAxis domain={[0, 9]} ticks={[0, 3, 5, 6, 7, 8, 9]} fontSize={12} />
                <Tooltip /><Legend />
                {[...SKILLS, "overall" as const].map((k) => <Line key={k} type="monotone" dataKey={k} name={k === "overall" ? "Overall" : SKILL_META[k].label} stroke={SKILL_HEX[k]} strokeWidth={k === "overall" ? 3 : 2} connectNulls dot={{ r: 3 }} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {SKILLS.map((k) => (
          <Card key={k}>
            <div className="mb-3 flex items-center gap-2"><SkillIcon skill={k} className="size-8" /><h3 className="font-bold">{SKILL_META[k].label} grafikasi</h3></div>
            {s.skill_history[k]?.length ? (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={s.skill_history[k].map((h) => ({ ...h, d: short(h.date) }))}>
                    <defs><linearGradient id={`g-${k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={SKILL_HEX[k]} stopOpacity={0.35} /><stop offset="1" stopColor={SKILL_HEX[k]} stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="d" fontSize={11} /><YAxis domain={[0, 9]} fontSize={11} width={24} /><Tooltip />
                    <Area type="monotone" dataKey="band" stroke={SKILL_HEX[k]} strokeWidth={2.5} fill={`url(#g-${k})`} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="py-10 text-center text-sm text-ink-500">Ma'lumot yo'q</p>}
          </Card>
        ))}
      </div>

      <Card>
        <h3 className="mb-4 font-bold">O'rganish vaqti (kunlik, daqiqa)</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={s.daily_minutes.slice(-30).map((d) => ({ ...d, d: short(d.date) }))}>
              <XAxis dataKey="d" fontSize={11} interval="preserveStartEnd" /><YAxis fontSize={11} width={30} /><Tooltip cursor={{ fill: "#fff4f1" }} />
              <Bar dataKey="minutes" name="daqiqa" fill={SKILL_HEX.overall} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {s.detailed_locked ? (
        <PremiumLock title="Batafsil statistika — Premium" text="Haftalik va oylik natijalar, zaif savol turlari tahlili, AI tavsiyalari va to'liq testlar tarixi." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="mb-4 flex items-center justify-between"><h3 className="font-bold">{period === "weekly" ? "Haftalik" : "Oylik"} natijalar</h3>
              <Tabs value={period} onChange={setPeriod} items={[{ value: "weekly", label: "Hafta" }, { value: "monthly", label: "Oy" }]} /></div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(period === "weekly" ? (s.weekly || []).map((w) => ({ ...w, label: short(w.week) })) : (s.monthly || []).map((m) => ({ ...m, label: m.month }))) as { label: string; minutes: number; tests: number }[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" /><XAxis dataKey="label" fontSize={11} /><YAxis fontSize={11} width={30} /><Tooltip /><Legend />
                  <Bar dataKey="minutes" name="Daqiqa" fill="#ff6b4a" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="tests" name="Testlar" fill="#4f7cff" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <h3 className="mb-3 font-bold">Zaif tomonlar (savol turlari)</h3>
            {!s.weak_areas?.length ? <p className="text-sm text-ink-500">Listening/Reading testlarini ishlang</p> : (
              <div className="space-y-3">{s.weak_areas.map((w) => (
                <div key={w.label}><div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{w.label}</span><span className="text-ink-500">{w.accuracy}% ({w.correct}/{w.total})</span></div>
                  <Progress value={w.accuracy} color={w.accuracy >= 70 ? "bg-emerald-500" : w.accuracy >= 50 ? "bg-amber-500" : "bg-red-500"} /></div>))}</div>
            )}
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 font-bold"><Sparkles className="size-4 text-brand-500" /> {s.recommendations_ai ? "AI tavsiyalari" : "Tavsiyalar"}</h3>
          <ul className="space-y-2">{s.recommendations.map((r, i) => <li key={i} className="flex gap-2 rounded-xl bg-surface p-3 text-sm"><span className="font-bold text-brand-500">{i + 1}.</span>{r}</li>)}</ul>
        </Card>
        <Card className="lg:col-span-3">
          <h3 className="mb-3 font-bold">Testlar tarixi</h3>
          {!s.tests_history.length ? <p className="text-sm text-ink-500">Hali test ishlanmagan</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase text-ink-500"><th className="pb-2">Test</th><th className="pb-2">Sana</th><th className="pb-2">Ball</th><th className="pb-2 text-right">Band</th></tr></thead>
                <tbody className="divide-y divide-line">{s.tests_history.map((t) => (
                  <tr key={t.id}><td className="py-2 pr-2"><Link className="font-semibold hover:text-brand-600" to={`/results/${t.id}`}>{t.title}</Link><div className="text-xs text-ink-500">{SKILL_META[t.skill]?.label} · {t.mode === "exam" ? "imtihon" : "mashq"}</div></td>
                    <td className="py-2 text-ink-500">{short(t.date)}</td><td className="py-2">{t.score}</td><td className="py-2 text-right"><BandBadge band={t.band} /></td></tr>))}</tbody>
              </table>
              {!s.premium && <p className="mt-2 text-xs text-ink-500">Free tarifda oxirgi 5 ta test ko'rsatiladi.</p>}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
