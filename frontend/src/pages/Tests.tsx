import clsx from "clsx";
import { ArrowLeft, Clock, Crown, Lock, Play, Timer, Trophy } from "lucide-react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BandBadge, Card, Empty, ErrorBox, Notice, PageHeader, PageLoader, PremiumLock, SKILL_META, SkillIcon, Tabs } from "../components/ui";
import { useApi } from "../lib/hooks";
import type { TestSummary } from "../lib/types";

type Filter = "all" | "listening" | "reading" | "writing" | "speaking";

export default function Tests() {
  const { id } = useParams();
  return id ? <TestIntro id={Number(id)} /> : <TestList />;
}

function TestList() {
  const [params, setParams] = useSearchParams();
  const skill = (params.get("skill") as Filter) || "all";
  const { data, loading, error, reload } = useApi<TestSummary[]>("/api/tests");
  const list = (data || []).filter((t) => skill === "all" || t.skill === skill);
  return (
    <div>
      <PageHeader title="IELTS Mock testlar" subtitle="Kompyuter imtihoniga o'xshash interfeys, taymer va avtomatik baholash"
        actions={<Link to="/exam" className="btn-primary"><Timer className="size-4" /> To'liq mock (Exam mode)</Link>} />
      <div className="mb-5 overflow-x-auto">
        <Tabs value={skill} onChange={(v) => setParams(v === "all" ? {} : { skill: v })} items={[
          { value: "all", label: "Barchasi" }, { value: "listening", label: "Listening" }, { value: "reading", label: "Reading" },
          { value: "writing", label: "Writing" }, { value: "speaking", label: "Speaking" }]} />
      </div>
      {loading && !data ? <PageLoader /> : error ? <ErrorBox error={error} onRetry={reload} /> : list.length === 0 ? <Empty title="Testlar topilmadi" /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => (
            <Link key={t.id} to={t.skill === "speaking" ? `/speaking?test=${t.id}` : `/tests/${t.id}`} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <SkillIcon skill={t.skill} />
                <div className="flex gap-1.5">
                  {t.is_premium && <span className="chip bg-brand-50 text-brand-700"><Crown className="size-3" /> Premium</span>}
                  {t.locked && <Lock className="size-4 text-ink-300" />}
                </div>
              </div>
              <div className={clsx("mt-3 text-xs font-bold uppercase", SKILL_META[t.skill].color)}>{SKILL_META[t.skill].label} · {t.exam_type === "general" ? "General" : "Academic"}</div>
              <h3 className="mt-1 font-bold leading-snug group-hover:text-brand-600">{t.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-ink-500">{t.description}</p>
              <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-ink-500">
                <span className="flex items-center gap-1"><Clock className="size-3.5" />{t.duration_min} daq</span>
                <span>{t.questions} savol</span>
                {t.attempts > 0 && <span className="ml-auto"><BandBadge band={t.best_band} /></span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function TestIntro({ id }: { id: number }) {
  const nav = useNavigate();
  const { data: t, loading, error, reload } = useApi<TestSummary & { items: unknown[] }>(`/api/tests/${id}`);
  const { data: attempts } = useApi<any[]>("/api/tests/attempts?limit=50");
  if (loading) return <PageLoader />;
  if (error || !t) return <ErrorBox error={error || "Topilmadi"} onRetry={reload} />;
  if (t.skill === "speaking") return <Navigate to={`/speaking?test=${t.id}`} replace />;
  const mine = (attempts || []).filter((a) => a.test_id === t.id);
  const inProgress = mine.find((a) => a.status === "in_progress");
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/tests" className="btn-ghost -ml-3"><ArrowLeft className="size-4" /> Testlar</Link>
      <Card className="p-7">
        <div className="flex items-center gap-3"><SkillIcon skill={t.skill} className="size-12" /><div className={clsx("text-sm font-bold uppercase", SKILL_META[t.skill].color)}>{SKILL_META[t.skill].label}</div></div>
        <h1 className="mt-4 text-2xl font-extrabold">{t.title}</h1>
        <p className="mt-2 text-ink-500">{t.description}</p>
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-surface p-3"><div className="text-xl font-extrabold">{t.duration_min}</div><div className="text-xs text-ink-500">daqiqa</div></div>
          <div className="rounded-2xl bg-surface p-3"><div className="text-xl font-extrabold">{t.items.length}</div><div className="text-xs text-ink-500">savol</div></div>
          <div className="rounded-2xl bg-surface p-3"><div className="text-xl font-extrabold">{t.best_band ?? "—"}</div><div className="text-xs text-ink-500">eng yaxshi band</div></div>
        </div>
        {t.locked ? <div className="mt-6"><PremiumLock title="Premium test" text="Bu mock test faqat Premium foydalanuvchilar uchun." /></div> : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button className="btn-outline py-3" onClick={() => nav(`/tests/${t.id}/run?mode=practice`)}><Play className="size-4" /> {inProgress?.mode === "practice" ? "Davom ettirish" : "Mashq rejimi"}</button>
              <button className="btn-primary py-3" onClick={() => nav(`/tests/${t.id}/run?mode=exam`)}><Timer className="size-4" /> {inProgress?.mode === "exam" ? "Imtihonni davom ettirish" : "Imtihon rejimi"}</button>
            </div>
            <div className="mt-4"><Notice>
              <b>Mashq rejimi</b> — vaqt cheklanmaydi. <b>Imtihon rejimi</b> — taymer tugaganda test avtomatik topshiriladi{t.skill === "listening" && ", audio faqat bir marta eshittiriladi"}. Javoblar avtomatik saqlanadi.
            </Notice></div>
          </>
        )}
      </Card>
      {mine.filter((a) => a.status === "submitted").length > 0 && (
        <Card>
          <h3 className="mb-3 flex items-center gap-2 font-bold"><Trophy className="size-4 text-brand-500" /> Mening natijalarim</h3>
          <ul className="divide-y divide-line">
            {mine.filter((a) => a.status === "submitted").map((a) => (
              <li key={a.id}><Link to={`/results/${a.id}`} className="flex items-center justify-between py-2.5 text-sm">
                <span>{new Date(a.submitted_at).toLocaleString("uz-UZ")} · {a.mode === "exam" ? "Imtihon" : "Mashq"}</span>
                <span className="flex items-center gap-2"><span className="text-ink-500">{a.raw_score}/{a.max_score}</span><BandBadge band={a.band} /></span>
              </Link></li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
