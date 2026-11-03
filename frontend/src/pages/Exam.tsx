import { CheckCircle2, Maximize, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import TestRunnerCore from "../components/TestRunnerCore";
import { BandBadge, BandRing, Card, ErrorBox, Notice, PageHeader, PageLoader, SKILL_META, SkillIcon } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useApi } from "../lib/hooks";
import type { TestSummary } from "../lib/types";

const ORDER = ["listening", "reading", "writing"] as const;
const roundBand = (x: number) => { const w = Math.floor(x), f = x - w; return f < 0.25 ? w : f < 0.75 ? w + 0.5 : w + 1; };

export default function Exam() {
  return useLocation().pathname.endsWith("/run") ? <ExamRun /> : <ExamSetup />;
}

function ExamSetup() {
  const { user, config } = useAuth();
  const nav = useNavigate();
  const { data, loading, error, reload } = useApi<TestSummary[]>("/api/tests");
  const exam = user?.profile?.exam_type || "academic";
  const [pick, setPick] = useState<Record<string, number>>({});
  const options = useMemo(() => Object.fromEntries(ORDER.map((s) => [s, (data || []).filter((t) => t.skill === s && !t.locked)])), [data]);
  useEffect(() => {
    if (!data) return;
    setPick(Object.fromEntries(ORDER.map((s) => [s, (options[s].find((t) => t.exam_type === exam) || options[s][0])?.id])) as Record<string, number>);
  }, [data, options, exam]);
  if (loading) return <PageLoader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const total = ORDER.reduce((s, k) => s + ((data || []).find((t) => t.id === pick[k])?.duration_min || 0), 0);
  const start = async () => {
    try { await document.documentElement.requestFullscreen?.(); } catch { /* brauzer ruxsat bermasa davom etamiz */ }
    nav(`/exam/run?ids=${ORDER.map((s) => pick[s]).filter(Boolean).join(",")}`);
  };
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Exam mode · To'liq mock imtihon" subtitle="Listening → Reading → Writing ketma-ket, haqiqiy vaqt bilan, to'liq ekranda" />
      <Card className="space-y-4">
        {ORDER.map((s) => (
          <div key={s} className="flex flex-wrap items-center gap-3">
            <SkillIcon skill={s} />
            <div className="w-24 font-bold">{SKILL_META[s].label}</div>
            <select className="input flex-1" value={pick[s] || ""} onChange={(e) => setPick({ ...pick, [s]: Number(e.target.value) })}>
              {options[s].map((t) => <option key={t.id} value={t.id}>{t.title} · {t.duration_min} daq</option>)}
            </select>
          </div>
        ))}
        <Notice>Jami ~{total} daqiqa. Har bo'lim vaqti tugashi bilan avtomatik topshiriladi, javoblar avtomatik saqlanadi. Speaking alohida: <Link to="/speaking" className="font-semibold underline">Speaking mock</Link>.</Notice>
        {!user?.is_premium && <Notice tone="warn">Free tarifda faqat bepul testlar va kuniga {config.free_tests_daily_limit} ta test boshlash mumkin. To'liq mock testlar to'plami — <Link to="/pricing" className="font-semibold underline">Premium</Link>.</Notice>}
        <button className="btn-primary w-full py-3" onClick={start} disabled={!ORDER.every((s) => pick[s])}><Maximize className="size-4" /> Imtihonni boshlash</button>
      </Card>
    </div>
  );
}

function ExamRun() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const ids = (params.get("ids") || "").split(",").map(Number).filter(Boolean);
  const [step, setStep] = useState(0);
  const [attempts, setAttempts] = useState<number[]>([]);
  const [results, setResults] = useState<any[] | null>(null);
  useEffect(() => {
    if (step < ids.length || !attempts.length) return;
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* */ }
    Promise.all(attempts.map((a) => api(`/api/tests/attempts/${a}`))).then(setResults).catch(() => setResults([]));
  }, [step, ids.length, attempts]);
  if (!ids.length) return <div className="p-6"><ErrorBox error="Testlar tanlanmagan" /><Link to="/exam" className="btn-primary mt-3">Orqaga</Link></div>;
  if (step < ids.length) {
    return <TestRunnerCore key={ids[step]} testId={ids[step]} mode="exam" stepLabel={`Bo'lim ${step + 1}/${ids.length}`}
      onDone={(aid) => { setAttempts((a) => [...a, aid]); setStep((s) => s + 1); }}
      onExit={() => { try { document.fullscreenElement && document.exitFullscreen(); } catch { /* */ } nav("/exam"); }} />;
  }
  if (!results) return <PageLoader text="Natijalar hisoblanmoqda…" />;
  const bands = results.map((r) => r.band).filter((b) => b !== null) as number[];
  const overall = bands.length ? roundBand(bands.reduce((a, b) => a + b, 0) / bands.length) : null;
  return (
    <div className="mx-auto max-w-3xl space-y-5 p-5">
      <Card className="flex flex-wrap items-center gap-6 p-7">
        <BandRing value={overall} label="Overall (L/R/W)" size={140} />
        <div className="flex-1">
          <div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="size-5" /> <b>Mock imtihon yakunlandi!</b></div>
          <p className="mt-2 text-ink-500">Overall band uch bo'lim o'rtachasidan hisoblandi (Speaking alohida). Bu taxminiy natija.</p>
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-3">
        {results.map((r) => (
          <Link key={r.id} to={`/results/${r.id}`} className="card p-5 transition hover:shadow-lg">
            <SkillIcon skill={r.skill} />
            <div className="mt-2 font-bold">{SKILL_META[r.skill]?.label}</div>
            <div className="truncate text-xs text-ink-500">{r.title}</div>
            <div className="mt-3"><BandBadge band={r.band} /></div>
          </Link>
        ))}
      </div>
      <div className="flex gap-2"><Link to="/dashboard" className="btn-outline"><Timer className="size-4" /> Dashboard</Link><Link to="/speaking" className="btn-primary">Speaking mockni topshirish</Link></div>
    </div>
  );
}
