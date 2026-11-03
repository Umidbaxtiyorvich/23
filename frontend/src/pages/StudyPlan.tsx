import clsx from "clsx";
import { CheckCircle2, Circle, Crown, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, Empty, ErrorBox, Notice, PageHeader, PageLoader, Progress, SKILL_META, SkillIcon, Spinner } from "../components/ui";
import { api, errMsg } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useApi } from "../lib/hooks";
import type { Task } from "../lib/types";
import { fmtDate } from "../lib/format";

interface Plan {
  id: number; title: string; summary: string; source: string; phases: { title: string; weeks: string; focus: string }[];
  weak_skills: string[]; start_date: string; end_date: string; today: Task[]; week: Record<string, Task[]>; overdue: Task[];
  progress: { total: number; done: number; percent: number; due_percent: number; by_skill: Record<string, { total: number; done: number; minutes: number }> };
}

const dayName = (d: string) => fmtDate(d, "weekday");

export default function StudyPlan() {
  const { user } = useAuth();
  const { data, loading, error, reload, setData } = useApi<{ plan: Plan | null }>("/api/study-plan");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const plan = data?.plan;
  if (!plan) return <Empty title="Reja hali yo'q" text="Onboarding savollariga javob bering" action={<Link to="/onboarding" className="btn-primary">Boshlash</Link>} />;

  const regenerate = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api("/api/study-plan/generate", { body: { use_ai: true } });
      setData({ plan: r.plan });
      setMsg(r.ai_used ? "AI yangi reja tuzdi ✨" : user?.is_premium ? "Reja yangilandi (AI mavjud emas — qoidalar asosida)" : "Reja natijalaringiz asosida yangilandi. AI reja — Premiumda.");
    } catch (e) { setMsg(errMsg(e)); } finally { setBusy(false); }
  };
  const toggle = async (t: Task) => {
    const upd = await api<Task>(`/api/study-plan/tasks/${t.id}`, { method: "PATCH", body: { completed: !t.completed } });
    const fix = (arr: Task[]) => arr.map((x) => (x.id === t.id ? upd : x));
    const week = Object.fromEntries(Object.entries(plan.week).map(([k, v]) => [k, fix(v)]));
    const delta = upd.completed ? 1 : -1;
    setData({ plan: { ...plan, week, today: fix(plan.today), overdue: plan.overdue.filter((x) => x.id !== t.id || !upd.completed),
      progress: { ...plan.progress, done: plan.progress.done + delta, percent: Math.round((100 * (plan.progress.done + delta)) / plan.progress.total) } } });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="AI o'quv reja" subtitle={`${plan.title} · ${fmtDate(plan.end_date)} gacha`}
        actions={<button className="btn-primary" onClick={regenerate} disabled={busy}>{busy ? <Spinner className="text-white" /> : <RefreshCw className="size-4" />} Rejani yangilash</button>} />
      {msg && <Notice tone="ok">{msg}</Notice>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="size-4 text-brand-500" />
            <span className="text-sm font-bold">{plan.source === "ai" ? "AI tahlili" : "Shaxsiy tahlil"}</span>
            {plan.source !== "ai" && !user?.is_premium && <Link to="/pricing" className="chip bg-brand-50 text-brand-700"><Crown className="size-3" /> AI reja — Premium</Link>}
          </div>
          <p className="text-ink-700">{plan.summary}</p>
          {plan.weak_skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-sm text-ink-500">Zaif tomonlar:</span>
              {plan.weak_skills.map((s) => <span key={s} className={clsx("chip", SKILL_META[s]?.bg, SKILL_META[s]?.color)}>{SKILL_META[s]?.label || s}</span>)}
            </div>
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {plan.phases.map((p, i) => (
              <div key={i} className="rounded-2xl border border-line bg-surface p-4">
                <div className="text-xs font-bold uppercase text-brand-600">{p.weeks}</div>
                <div className="mt-1 font-bold">{p.title}</div>
                <div className="mt-1 text-sm text-ink-500">{p.focus}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-bold">Umumiy progress</h3>
          <div className="my-2 text-4xl font-extrabold">{plan.progress.percent}%</div>
          <Progress value={plan.progress.percent} />
          <p className="mt-2 text-sm text-ink-500">{plan.progress.done} / {plan.progress.total} vazifa · bugungacha rejadagilarning {plan.progress.due_percent}% bajarilgan</p>
          <div className="mt-4 space-y-2.5">
            {Object.entries(plan.progress.by_skill).map(([s, v]) => (
              <div key={s}>
                <div className="mb-1 flex justify-between text-xs font-semibold"><span>{SKILL_META[s]?.label || s}</span><span className="text-ink-500">{v.done}/{v.total}</span></div>
                <Progress value={(100 * v.done) / Math.max(1, v.total)} color="bg-ink-700" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {plan.overdue.length > 0 && (
        <Card>
          <h3 className="mb-3 font-bold text-amber-700">Bajarilmagan vazifalar ({plan.overdue.length})</h3>
          <TaskList tasks={plan.overdue} onToggle={toggle} />
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-lg font-bold">Haftalik reja</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(plan.week).map(([day, tasks]) => {
            const isToday = day === new Date().toISOString().slice(0, 10);
            return (
              <Card key={day} className={clsx(isToday && "ring-2 ring-brand-400")}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-bold capitalize">{dayName(day)}</div>
                  {isToday && <span className="chip bg-brand-500 text-white">Bugun</span>}
                </div>
                <TaskList tasks={tasks} onToggle={toggle} compact />
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TaskList({ tasks, onToggle, compact }: { tasks: Task[]; onToggle: (t: Task) => void; compact?: boolean }) {
  return (
    <ul className="space-y-2">
      {tasks.map((t) => (
        <li key={t.id} className={clsx("flex items-center gap-2.5 rounded-xl border border-line p-2.5", t.completed && "opacity-60")}>
          <button onClick={() => onToggle(t)} className="shrink-0" aria-label="Bajarildi">{t.completed ? <CheckCircle2 className="size-5 text-emerald-500" /> : <Circle className="size-5 text-ink-300" />}</button>
          {!compact && <SkillIcon skill={t.skill} className="size-8" />}
          <Link to={t.link || "#"} className="min-w-0 flex-1">
            <div className={clsx("truncate text-sm font-semibold", t.completed && "line-through")}>{t.title}</div>
            <div className="text-xs text-ink-500">{SKILL_META[t.skill]?.label || t.skill} · {t.duration_min} daq{!compact && ` · ${fmtDate(t.date)}`}</div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
