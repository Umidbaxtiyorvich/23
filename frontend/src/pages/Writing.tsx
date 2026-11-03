import clsx from "clsx";
import { Clock, Lock, PenLine, RotateCcw, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import TaskChart from "../components/Chart";
import { WritingFeedbackView } from "../components/Feedback";
import { BandBadge, Card, DemoBadge, ErrorBox, Notice, PageHeader, PageLoader, PremiumLock, Spinner, Tabs } from "../components/ui";
import { ApiError, api, errMsg } from "../lib/api";
import { useAuth } from "../lib/auth";
import { fmtTime, useApi, wordCount } from "../lib/hooks";
import type { WritingFeedback } from "../lib/types";
import { fmtDate } from "../lib/format";

interface WTask { id: number; test_id: number; task_type: "task1" | "task2"; prompt: string; extra: any; exam_type: string; locked: boolean }

export default function Writing() {
  const { config } = useAuth();
  const [params, setParams] = useSearchParams();
  const taskType = (params.get("task") as "task1" | "task2") || "task2";
  const { data: tasks, loading, error, reload } = useApi<WTask[]>("/api/writing/tasks");
  const { data: history, reload: reloadHistory } = useApi<any[]>("/api/writing/submissions");
  const list = useMemo(() => (tasks || []).filter((t) => t.task_type === taskType), [tasks, taskType]);
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [essay, setEssay] = useState("");
  const [start, setStart] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ msg: string; status?: number } | null>(null);
  const [fb, setFb] = useState<WritingFeedback | null>(null);

  const task = list.find((t) => t.id === selected) || list.find((t) => !t.locked) || null;
  useEffect(() => { setSelected(null); setFb(null); }, [taskType]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const draftKey = `iam.draft.${task?.id ?? "custom"}`;
  useEffect(() => { try { setEssay(localStorage.getItem(draftKey) || ""); } catch { /* */ } setStart(null); setFb(null); }, [draftKey]);
  useEffect(() => { try { localStorage.setItem(draftKey, essay); } catch { /* */ } }, [essay, draftKey]);

  const prompt = custom.trim() || task?.prompt || "";
  const wc = wordCount(essay);
  const min = taskType === "task1" ? 150 : 250;
  const limit = (taskType === "task1" ? 20 : 40) * 60;
  const elapsed = start ? Math.max(0, Math.floor((now - start) / 1000)) : 0;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api("/api/writing/evaluate", { body: { task_type: taskType, prompt, essay, question_id: custom.trim() ? null : task?.id, time_spent_sec: elapsed } });
      setFb({ ...r.feedback, word_count: wc });
      reloadHistory();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setErr({ msg: errMsg(e), status: e instanceof ApiError ? e.status : undefined }); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Writing + AI feedback" subtitle="Essay yozing va 4 mezon bo'yicha taxminiy band oling" actions={!config.ai_available && <DemoBadge />} />
      <Tabs value={taskType} onChange={(v) => setParams({ task: v })} items={[{ value: "task1", label: "Task 1 (150+ so'z)" }, { value: "task2", label: "Task 2 (250+ so'z)" }]} />

      {fb ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2"><button className="btn-outline" onClick={() => setFb(null)}><PenLine className="size-4" /> Tahrirlashga qaytish</button>
            <button className="btn-soft" onClick={() => { setFb(null); setEssay(""); setStart(null); }}><RotateCcw className="size-4" /> Yangi essay</button></div>
          <WritingFeedbackView fb={fb} essay={essay} />
        </div>
      ) : loading ? <PageLoader /> : error ? <ErrorBox error={error} onRetry={reload} /> : (
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <h3 className="mb-3 font-bold">Topshiriqni tanlang</h3>
              <div className="space-y-2">
                {list.map((t, i) => (
                  <button key={t.id} disabled={t.locked} onClick={() => { setSelected(t.id); setCustom(""); }}
                    className={clsx("w-full rounded-xl border p-3 text-left text-sm transition disabled:opacity-60", task?.id === t.id && !custom ? "border-brand-400 bg-brand-50" : "border-line hover:border-brand-200")}>
                    <div className="flex items-center justify-between font-semibold">#{i + 1} · {t.exam_type === "general" ? "General" : "Academic"} {t.locked && <Lock className="size-3.5" />}</div>
                    <div className="mt-1 line-clamp-2 text-ink-500">{t.prompt}</div>
                  </button>
                ))}
              </div>
              <label className="label mt-4">Yoki o'z mavzuingizni kiriting</label>
              <textarea className="input min-h-20" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={4000} placeholder="Masalan: Some people think that…" />
            </Card>
            {task?.locked && !custom && <PremiumLock text="Bu topshiriq Premium to'plamga kiradi" />}
            <Card>
              <h3 className="mb-2 font-bold">Oldingi essaylar</h3>
              {!history?.length ? <p className="text-sm text-ink-500">Hali yo'q</p> : (
                <ul className="divide-y divide-line">{history.slice(0, 8).map((h) => (
                  <li key={h.id}><Link to={`/writing/${h.id}`} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span className="min-w-0 truncate">{h.task_type.toUpperCase()} · {fmtDate(h.created_at)} · {h.word_count} so'z</span><BandBadge band={h.band} />
                  </Link></li>))}</ul>
              )}
            </Card>
          </div>
          <div className="space-y-4 lg:col-span-3">
            <Card>
              <p className="whitespace-pre-line text-[15px] leading-7">{prompt || "Chapdan topshiriq tanlang"}</p>
              {!custom && task?.extra?.chart && <div className="mt-4"><TaskChart spec={task.extra.chart} /></div>}
            </Card>
            <Card className="p-0">
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-sm">
                <span className={clsx("font-semibold", wc >= min ? "text-emerald-600" : "text-ink-500")}>{wc} / {min}+ so'z</span>
                <span className={clsx("flex items-center gap-1 font-mono font-semibold", start && elapsed > limit && "text-red-600")}><Clock className="size-4" />{start ? `${fmtTime(elapsed)} / ${fmtTime(limit)}` : "Yozishni boshlang"}</span>
              </div>
              <textarea value={essay} onChange={(e) => { setEssay(e.target.value); if (!start) setStart(Date.now()); }} spellCheck={false} maxLength={20000}
                className="min-h-[50vh] w-full resize-y rounded-b-[var(--radius-card)] p-4 font-serif text-[16px] leading-7 outline-none" placeholder="Essayingizni shu yerga yozing…" />
            </Card>
            {err && (err.status === 402 ? <PremiumLock title="Kunlik AI limit tugadi" text={err.msg} /> : <ErrorBox error={err.msg} />)}
            {wc > 0 && wc < min && <Notice tone="warn">Haqiqiy imtihonda {min} so'zdan kam javob uchun ball pasaytiriladi.</Notice>}
            <button className="btn-primary w-full py-3" disabled={busy || wc < 20 || !prompt || (!!task?.locked && !custom)} onClick={submit}>
              {busy ? <><Spinner className="text-white" /> AI tekshirmoqda…</> : <><Send className="size-4" /> AI feedback olish</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
