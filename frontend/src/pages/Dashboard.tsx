import clsx from "clsx";
import { ArrowRight, CalendarClock, CheckCircle2, Circle, Clock, Flame, Lock, Sparkles, Target } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Link } from "react-router-dom";
import { BandBadge, BandRing, Card, DemoBadge, ErrorBox, Notice, Progress, SKILL_HEX, SKILL_META, Skeleton, SkillIcon, StatCard } from "../components/ui";
import { api } from "../lib/api";
import { useApi } from "../lib/hooks";
import type { Task, User } from "../lib/types";
import { fmtDate } from "../lib/format";

interface Dash {
  user: User; target_band: number; estimated_band: number; estimated_from_level: boolean;
  bands: Record<string, number | null>; days_left: number | null; exam_date: string | null; today_tasks: Task[];
  plan_progress: number; streak: number; minutes_today: number; minutes_week: number; minutes_total: number;
  week: { date: string; minutes: number }[]; overall_progress: number;
  recent: { kind: string; id: number; title: string; skill: string; band: number | null; score: string | null; date: string; link: string }[];
  recommended: { skill: string; title: string; description: string; link: string; locked: boolean }[];
  words_due: number; ai_available: boolean;
}

const WEEKDAY = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];

export default function Dashboard() {
  const { data: d, loading, error, reload, setData } = useApi<Dash>("/api/dashboard");
  if (loading && !d) return <div className="grid gap-4 md:grid-cols-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36" />)}</div>;
  if (error || !d) return <ErrorBox error={error || "Xatolik"} onRetry={reload} />;

  const toggle = async (t: Task) => {
    const upd = await api<Task>(`/api/study-plan/tasks/${t.id}`, { method: "PATCH", body: { completed: !t.completed } });
    setData({ ...d, today_tasks: d.today_tasks.map((x) => (x.id === t.id ? upd : x)) });
  };
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Xayrli tong" : hour < 18 ? "Xayrli kun" : "Xayrli kech";
  const doneToday = d.today_tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{greet}, {d.user.full_name.split(" ")[0]}! 👋</h1>
          <p className="mt-1 text-ink-500">IELTS {d.user.profile?.exam_type === "general" ? "General Training" : "Academic"} · maqsad {d.target_band.toFixed(1)} band</p>
        </div>
        {!d.ai_available && <DemoBadge title="AI kaliti sozlanmagan: AI baholashlar demo rejimda ishlaydi" />}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex items-center gap-6 lg:col-span-2">
          <BandRing value={d.estimated_band} label="Taxminiy" size={132} />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink-500">Maqsadgacha progress</span>
              <span className="chip bg-brand-50 text-brand-700"><Target className="size-3" /> {d.target_band.toFixed(1)}</span>
              {d.estimated_from_level && <span className="chip bg-ink-900/5 text-ink-500">daraja asosida</span>}
            </div>
            <Progress value={d.overall_progress} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["listening", "reading", "writing", "speaking"] as const).map((s) => (
                <Link to={s === "writing" ? "/writing" : s === "speaking" ? "/speaking" : `/tests?skill=${s}`} key={s} className="rounded-xl bg-surface p-2.5 transition hover:bg-brand-50/60">
                  <div className={clsx("flex items-center gap-1.5 text-xs font-semibold", SKILL_META[s].color)}>{(() => { const I = SKILL_META[s].icon; return <I className="size-3.5" />; })()}{SKILL_META[s].label}</div>
                  <div className="mt-1 text-lg font-extrabold">{d.bands[s] ?? "—"}</div>
                </Link>
              ))}
            </div>
          </div>
        </Card>
        <Card className="flex flex-col justify-between bg-gradient-to-br from-brand-500 to-rose-500 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/85"><CalendarClock className="size-4" /> Imtihongacha</div>
          <div className="my-3 text-5xl font-extrabold">{d.days_left ?? "—"}<span className="ml-2 text-lg font-bold text-white/80">{d.days_left !== null ? "kun" : ""}</span></div>
          <div className="text-sm text-white/85">{d.exam_date ? fmtDate(d.exam_date) : <Link className="underline" to="/profile">Imtihon sanasini kiriting</Link>}</div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Flame className="size-5" />} label="Streak" value={`${d.streak} kun`} color="bg-orange-50 text-orange-600" />
        <StatCard icon={<Clock className="size-5" />} label="Bugun" value={`${d.minutes_today} daq`} hint={`Haftada ${d.minutes_week} daq`} color="bg-sky-50 text-sky-600" />
        <StatCard icon={<CheckCircle2 className="size-5" />} label="Reja bajarildi" value={`${d.plan_progress}%`} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={<Sparkles className="size-5" />} label="Takrorlash" value={`${d.words_due} so'z`} hint={<Link to="/vocabulary" className="text-brand-600">Boshlash →</Link>} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="text-lg font-bold">Bugungi o'quv reja</h2><p className="text-sm text-ink-500">{doneToday}/{d.today_tasks.length} bajarildi</p></div>
            <Link to="/plan" className="btn-soft">To'liq reja <ArrowRight className="size-4" /></Link>
          </div>
          {d.today_tasks.length === 0 ? <Notice>Bugun uchun vazifa yo'q. <Link className="font-semibold underline" to="/plan">Rejani yangilang</Link>.</Notice> : (
            <ul className="space-y-2">
              {d.today_tasks.map((t) => (
                <li key={t.id} className={clsx("flex items-center gap-3 rounded-2xl border border-line p-3 transition", t.completed && "bg-surface opacity-70")}>
                  <button onClick={() => toggle(t)} aria-label="Bajarildi" className="shrink-0">{t.completed ? <CheckCircle2 className="size-6 text-emerald-500" /> : <Circle className="size-6 text-ink-300" />}</button>
                  <SkillIcon skill={t.skill} />
                  <div className="min-w-0 flex-1">
                    <div className={clsx("truncate font-semibold", t.completed && "line-through")}>{t.title}</div>
                    <div className="truncate text-xs text-ink-500">{t.duration_min} daq · {t.description}</div>
                  </div>
                  {t.link && <Link to={t.link} className="btn-outline px-3 py-1.5 text-xs">Boshlash</Link>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-bold">O'rganish davomiyligi</h2>
          <p className="text-sm text-ink-500">Oxirgi 7 kun · jami {Math.round(d.minutes_total / 60)} soat</p>
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.week.map((w) => ({ ...w, day: WEEKDAY[new Date(w.date).getDay()] }))}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip cursor={{ fill: "#fff4f1" }} formatter={(v) => [`${v} daq`, "Vaqt"]} />
                <Bar dataKey="minutes" radius={[8, 8, 8, 8]} fill={SKILL_HEX.overall} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-bold">Tavsiya etilgan mashg'ulotlar</h2>
          <div className="space-y-2">
            {d.recommended.map((r, i) => (
              <Link key={i} to={r.locked ? "/pricing" : r.link} className="flex items-center gap-3 rounded-2xl border border-line p-3 transition hover:border-brand-300">
                <SkillIcon skill={r.skill} />
                <div className="min-w-0 flex-1"><div className="truncate font-semibold">{r.title}</div><div className="truncate text-xs text-ink-500">{r.description}</div></div>
                {r.locked ? <Lock className="size-4 text-ink-300" /> : <ArrowRight className="size-4 text-ink-300" />}
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Oxirgi testlar</h2><Link to="/statistics" className="text-sm font-semibold text-brand-600">Statistika →</Link></div>
          {d.recent.length === 0 ? <p className="text-sm text-ink-500">Hali test ishlamagansiz. <Link className="font-semibold text-brand-600" to="/tests">Birinchi testni boshlang</Link>.</p> : (
            <ul className="divide-y divide-line">
              {d.recent.map((r) => (
                <li key={`${r.kind}${r.id}`}><Link to={r.link} className="flex items-center gap-3 py-2.5">
                  <SkillIcon skill={r.skill} className="size-8" />
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{r.title}</div><div className="text-xs text-ink-500">{fmtDate(r.date)} {r.score && `· ${r.score}`}</div></div>
                  <BandBadge band={r.band} />
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
