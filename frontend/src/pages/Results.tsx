import clsx from "clsx";
import { ArrowLeft, Check, Clock, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { WritingFeedbackView } from "../components/Feedback";
import { BandRing, Card, ErrorBox, PageLoader, Progress, SKILL_HEX, Tabs } from "../components/ui";
import { fmtTime, useApi } from "../lib/hooks";
import type { Question, Section, WritingFeedback } from "../lib/types";

interface Result {
  id: number; test_id: number; title: string; skill: string; mode: string; status: string; band: number | null;
  raw_score: number; max_score: number; time_spent_sec: number; submitted_at: string;
  test: { id: number; title: string; skill: string; content: { sections?: Section[] } };
  items: Question[]; by_type: Record<string, { correct: number; total: number }>;
  writing: { submission_id: number; question_id: number; task_type: string; band: number; word_count: number; feedback: WritingFeedback }[];
}
const QT: Record<string, string> = { mcq: "Multiple choice", tfng: "True/False/Not Given", ynng: "Yes/No/Not Given", matching_headings: "Matching headings", gap_fill: "Gap filling", short_answer: "Short answer" };

export default function Results() {
  const { id } = useParams();
  const { data: r, loading, error, reload } = useApi<Result>(`/api/tests/attempts/${id}`);
  const [filter, setFilter] = useState<"all" | "wrong">("all");
  const [tab, setTab] = useState(0);
  if (loading) return <PageLoader />;
  if (error || !r) return <ErrorBox error={error || "Topilmadi"} onRetry={reload} />;
  if (r.status !== "submitted") return <div className="space-y-3"><ErrorBox error="Bu test hali yakunlanmagan" /><Link className="btn-primary" to={`/tests/${r.test_id}/run?mode=${r.mode}`}>Davom ettirish</Link></div>;
  const pct = r.max_score ? Math.round((100 * r.raw_score) / r.max_score) : 0;
  const objective = r.items.filter((q) => q.qtype in QT);
  const shown = filter === "wrong" ? objective.filter((q) => !q.is_correct) : objective;
  const color = SKILL_HEX[r.skill] || SKILL_HEX.overall;
  return (
    <div className="space-y-5">
      <Link to="/tests" className="btn-ghost -ml-3"><ArrowLeft className="size-4" /> Testlar</Link>
      <Card className="flex flex-wrap items-center gap-6 p-7">
        <BandRing value={r.band} label="Band" size={140} color={color} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold uppercase" style={{ color }}>{r.skill} · {r.mode === "exam" ? "Imtihon rejimi" : "Mashq"}</div>
          <h1 className="mt-1 text-2xl font-extrabold">{r.title}</h1>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-500">
            {r.max_score > 0 && <span className="font-semibold text-ink-900">{r.raw_score} / {r.max_score} to'g'ri ({pct}%)</span>}
            <span className="flex items-center gap-1"><Clock className="size-4" /> {fmtTime(r.time_spent_sec)}</span>
            <span>{new Date(r.submitted_at).toLocaleString("uz-UZ")}</span>
          </div>
          <div className="mt-4 flex gap-2">
            <Link to={`/tests/${r.test_id}`} className="btn-outline"><RotateCcw className="size-4" /> Qayta ishlash</Link>
            <Link to="/statistics" className="btn-soft">Statistika</Link>
          </div>
        </div>
      </Card>

      {Object.keys(r.by_type).length > 0 && (
        <Card>
          <h3 className="mb-3 font-bold">Savol turlari bo'yicha</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(r.by_type).map(([k, v]) => (
              <div key={k}><div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{QT[k] || k}</span><span className="text-ink-500">{v.correct}/{v.total}</span></div>
                <Progress value={(100 * v.correct) / v.total} color={v.correct / v.total >= 0.7 ? "bg-emerald-500" : v.correct / v.total >= 0.5 ? "bg-amber-500" : "bg-red-500"} /></div>
            ))}
          </div>
        </Card>
      )}

      {r.writing.length > 0 && (
        <div className="space-y-4">
          {r.writing.length > 1 && <Tabs value={String(tab)} onChange={(v) => setTab(Number(v))} items={r.writing.map((w, i) => ({ value: String(i), label: `${w.task_type.toUpperCase()} · ${w.band}` }))} />}
          {r.writing[tab] && <WritingFeedbackView fb={{ ...r.writing[tab].feedback, word_count: r.writing[tab].word_count }} essay={r.items.find((q) => q.id === r.writing[tab].question_id)?.response} />}
        </div>
      )}
      {r.skill === "writing" && r.writing.length === 0 && <ErrorBox error="Essay juda qisqa bo'lgani uchun AI baholamadi (kamida 20 so'z kerak)." />}

      {objective.length > 0 && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold">Javoblar tahlili</h3>
            <Tabs value={filter} onChange={setFilter} items={[{ value: "all", label: "Barchasi" }, { value: "wrong", label: `Xatolar (${objective.filter((q) => !q.is_correct).length})` }]} />
          </div>
          <ul className="space-y-2">
            {shown.map((q) => (
              <li key={q.id} className={clsx("flex gap-3 rounded-2xl border p-3", q.is_correct ? "border-emerald-100 bg-emerald-50/40" : "border-red-100 bg-red-50/40")}>
                <span className={clsx("grid size-7 shrink-0 place-items-center rounded-lg text-white", q.is_correct ? "bg-emerald-500" : "bg-red-500")}>{q.is_correct ? <Check className="size-4" /> : <X className="size-4" />}</span>
                <div className="min-w-0 text-sm">
                  <div className="font-medium">{r.items.indexOf(q) + 1}. {q.prompt}</div>
                  <div className="mt-1 text-ink-500">Sizning javobingiz: <b className={q.is_correct ? "text-emerald-700" : "text-red-700"}>{q.response || "—"}</b>{!q.is_correct && <> · To'g'ri javob: <b className="text-emerald-700">{q.answer?.join(" / ")}</b></>}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {r.skill === "listening" && r.test.content.sections?.some((s) => s.audio_script) && (
        <Card>
          <h3 className="mb-3 font-bold">Audio matni (transcript)</h3>
          {r.test.content.sections!.map((s, i) => <details key={i} className="mb-2 rounded-xl bg-surface p-3"><summary className="cursor-pointer font-semibold">{s.title}</summary><p className="mt-2 text-sm leading-6 text-ink-700">{s.audio_script}</p></details>)}
        </Card>
      )}
    </div>
  );
}
