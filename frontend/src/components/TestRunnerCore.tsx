import clsx from "clsx";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Flag, Headphones, Pause, Play, Save, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TaskChart from "./Chart";
import { ErrorBox, Modal, Notice, PageLoader, PremiumLock, Spinner } from "./ui";
import { ApiError, api, errMsg } from "../lib/api";
import { fmtTime, useCountdown, wordCount } from "../lib/hooks";
import { speak, stopSpeaking, ttsSupported } from "../lib/speech";
import type { Question, Section } from "../lib/types";

interface TestDetail {
  id: number; title: string; skill: string; duration_min: number; content: { sections?: Section[] }; items: Question[]; locked: boolean;
}
interface Attempt {
  id: number; mode: string; status: string; remaining_sec: number | null; elapsed_sec: number; time_limit_sec: number;
  answers: Record<string, { response: string; flagged: boolean }>;
}

const TFNG = ["TRUE", "FALSE", "NOT GIVEN"];
const YNNG = ["YES", "NO", "NOT GIVEN"];

/** Haqiqiy kompyuter imtihoniga o'xshash interfeys. `onDone(attemptId)` — yakunlangandan keyin chaqiriladi. */
export default function TestRunnerCore({ testId, mode, onDone, onExit, stepLabel }: {
  testId: number; mode: "practice" | "exam"; onDone: (attemptId: number) => void; onExit?: () => void; stepLabel?: string;
}) {
  const [test, setTest] = useState<TestDetail | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<number, { response: string; flagged: boolean }>>({});
  const [error, setError] = useState<{ msg: string; status?: number } | null>(null);
  const [section, setSection] = useState(0);
  const [current, setCurrent] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const dirty = useRef<Set<number>>(new Set());
  const started = useRef(Date.now());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const t = await api<TestDetail>(`/api/tests/${testId}`);
        const a = await api<Attempt>(`/api/tests/${testId}/start`, { body: { mode } });
        if (!alive) return;
        setTest(t);
        setAttempt(a);
        setElapsed(a.elapsed_sec);
        started.current = Date.now() - a.elapsed_sec * 1000;
        setAnswers(Object.fromEntries(Object.entries(a.answers).map(([k, v]) => [Number(k), v])));
      } catch (e) {
        if (alive) setError({ msg: errMsg(e), status: e instanceof ApiError ? e.status : undefined });
      }
    })();
    return () => { alive = false; stopSpeaking(); };
  }, [testId, mode]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const save = useCallback(async () => {
    if (!attempt || dirty.current.size === 0) return;
    const ids = [...dirty.current];
    dirty.current.clear();
    setSaveState("saving");
    try {
      await api(`/api/tests/attempts/${attempt.id}/answers`, { method: "PUT", body: {
        answers: ids.map((id) => ({ question_id: id, response: answers[id]?.response ?? "", flagged: answers[id]?.flagged ?? false })),
        time_spent_sec: elapsed } });
      setSaveState("saved");
    } catch {
      ids.forEach((i) => dirty.current.add(i));
      setSaveState("error");
    }
  }, [attempt, answers, elapsed]);

  useEffect(() => { const t = setTimeout(save, 1200); return () => clearTimeout(t); }, [answers, save]);

  const submit = useCallback(async () => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    stopSpeaking();
    try {
      await api(`/api/tests/attempts/${attempt.id}/submit`, { body: {
        answers: Object.entries(answers).map(([id, v]) => ({ question_id: Number(id), response: v.response, flagged: v.flagged })),
        time_spent_sec: elapsed } });
      onDone(attempt.id);
    } catch (e) {
      setError({ msg: errMsg(e), status: e instanceof ApiError ? e.status : undefined });
      setSubmitting(false);
    }
  }, [attempt, answers, elapsed, onDone, submitting]);

  const remaining = useCountdown(attempt?.mode === "exam" ? attempt.remaining_sec : null, () => submit());

  const sections = test?.content.sections?.length ? test.content.sections : [{ title: test?.title || "" } as Section];
  const items = test?.items || [];
  const sectionItems = useMemo(() => items.filter((q) => q.section === section), [items, section]);
  const numberOf = (q: Question) => items.indexOf(q) + 1;

  const setAns = (id: number, patch: Partial<{ response: string; flagged: boolean }>) => {
    dirty.current.add(id);
    setSaveState("idle");
    setAnswers((a) => ({ ...a, [id]: { response: a[id]?.response ?? "", flagged: a[id]?.flagged ?? false, ...patch } }));
  };

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current.size) { e.preventDefault(); } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  if (error) return (
    <div className="mx-auto max-w-lg p-6">
      {error.status === 402 ? <PremiumLock title="Bu test Premium yoki kunlik limit tugagan" text={error.msg} /> : <ErrorBox error={error.msg} />}
      {onExit && <button className="btn-outline mt-4 w-full" onClick={onExit}>Orqaga</button>}
    </div>
  );
  if (!test || !attempt) return <PageLoader text="Test tayyorlanmoqda…" />;

  const answered = items.filter((q) => (answers[q.id]?.response || "").trim()).length;
  const sec = sections[section];
  const isWriting = test.skill === "writing";
  const lowTime = remaining !== null && remaining < 300;

  return (
    <div className="flex h-dvh flex-col bg-[#f6f6f9]">
      {/* Yuqori panel */}
      <header className="flex items-center gap-3 border-b border-line bg-white px-3 py-2.5 sm:px-5">
        {onExit && <button className="btn-ghost p-2" onClick={() => setConfirm(true)} title="Chiqish"><X className="size-5" /></button>}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold sm:text-base">{test.title}</div>
          <div className="flex items-center gap-2 text-xs text-ink-500">
            {stepLabel && <span className="chip bg-brand-50 text-brand-700">{stepLabel}</span>}
            <span className="capitalize">{test.skill}</span> · {answered}/{items.length} javob
            <span className="hidden items-center gap-1 sm:flex">
              {saveState === "saving" && <><Spinner className="size-3" /> saqlanmoqda</>}
              {saveState === "saved" && <><Save className="size-3 text-emerald-500" /> saqlandi</>}
              {saveState === "error" && <><AlertTriangle className="size-3 text-red-500" /> saqlanmadi</>}
            </span>
          </div>
        </div>
        <div className={clsx("flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-sm font-bold", lowTime ? "animate-pulse bg-red-50 text-red-600" : "bg-ink-900/5")}>
          <Clock className="size-4" /> {remaining !== null ? fmtTime(remaining) : fmtTime(elapsed)}
        </div>
        <button className="btn-primary" onClick={() => setConfirm(true)} disabled={submitting}>{submitting ? <Spinner className="text-white" /> : <CheckCircle2 className="size-4" />}<span className="hidden sm:inline">Yakunlash</span></button>
      </header>

      {sections.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-line bg-white px-3">
          {sections.map((s, i) => (
            <button key={i} onClick={() => { setSection(i); setCurrent(0); stopSpeaking(); }} className={clsx("whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold", i === section ? "border-brand-500 text-brand-700" : "border-transparent text-ink-500")}>
              {s.title.split("—")[0].trim() || `Part ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      <div className="grid min-h-0 flex-1 lg:grid-cols-2">
        {/* Chap: matn / audio / topshiriq */}
        <section className="min-h-0 overflow-y-auto border-b border-line bg-white p-5 lg:border-b-0 lg:border-r sm:p-8">
          <h2 className="text-lg font-bold">{sec.title}</h2>
          {sec.instructions && <p className="mt-1 text-sm italic text-ink-500">{sec.instructions}</p>}
          {test.skill === "listening" && <AudioPanel section={sec} mode={mode} key={section} />}
          {sec.text && <div className="passage mt-5 text-[15px] text-ink-700">{sec.text.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}</div>}
          {isWriting && sectionItems[current] && (
            <div className="mt-4 space-y-4">
              <div className="chip bg-writing/10 text-writing">{sectionItems[current].extra.task_type === "task1" ? "Task 1 · ~20 daqiqa" : "Task 2 · ~40 daqiqa"}</div>
              <p className="whitespace-pre-line text-[15px] leading-7">{sectionItems[current].prompt}</p>
              {sectionItems[current].extra.chart && <TaskChart spec={sectionItems[current].extra.chart} />}
            </div>
          )}
          {test.skill === "reading" && items.some((q) => q.qtype === "matching_headings") && section === 0 && (
            <div className="mt-6 rounded-2xl bg-surface p-4 text-sm">
              <div className="mb-2 font-bold">List of headings</div>
              <ul className="space-y-1">{items.find((q) => q.qtype === "matching_headings")!.options.map((h) => <li key={h}>{h}</li>)}</ul>
            </div>
          )}
        </section>

        {/* O'ng: savollar */}
        <section className="min-h-0 overflow-y-auto p-4 sm:p-6">
          {isWriting ? sectionItems[current] && (
            <WritingEditor q={sectionItems[current]} value={answers[sectionItems[current].id]?.response || ""} onChange={(v) => setAns(sectionItems[current].id, { response: v })} />
          ) : (
            <div className="space-y-3">
              {sectionItems.map((q) => (
                <div key={q.id} id={`q-${q.id}`} className={clsx("card p-4", answers[q.id]?.flagged && "ring-2 ring-amber-300")}>
                  <div className="mb-3 flex items-start gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-ink-900 text-xs font-bold text-white">{numberOf(q)}</span>
                    <p className="flex-1 font-medium">{q.prompt}</p>
                    <button onClick={() => setAns(q.id, { flagged: !answers[q.id]?.flagged })} className={clsx("shrink-0", answers[q.id]?.flagged ? "text-amber-500" : "text-ink-300 hover:text-ink-500")} title="Belgilash (keyin qaytish)"><Flag className="size-4" /></button>
                  </div>
                  <QuestionInput q={q} value={answers[q.id]?.response || ""} onChange={(v) => setAns(q.id, { response: v })} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Pastki navigatsiya */}
      <footer className="flex items-center gap-2 border-t border-line bg-white px-3 py-2">
        <button className="btn-ghost p-2" disabled={isWriting ? current === 0 : section === 0} onClick={() => isWriting ? setCurrent(current - 1) : setSection(section - 1)}><ChevronLeft className="size-5" /></button>
        <div className="flex flex-1 gap-1.5 overflow-x-auto py-1">
          {items.map((q, i) => {
            const done = (answers[q.id]?.response || "").trim();
            return (
              <button key={q.id} onClick={() => { setSection(q.section); if (isWriting) setCurrent(sectionItems.indexOf(q) >= 0 ? sectionItems.indexOf(q) : i); setTimeout(() => document.getElementById(`q-${q.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); }}
                className={clsx("relative grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold transition",
                  done ? "bg-ink-900 text-white" : "border border-line bg-white text-ink-500", isWriting ? current === i && "ring-2 ring-brand-400" : q.section !== section && "opacity-50")}>
                {i + 1}
                {answers[q.id]?.flagged && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-amber-400" />}
              </button>
            );
          })}
        </div>
        <button className="btn-ghost p-2" disabled={isWriting ? current >= sectionItems.length - 1 : section >= sections.length - 1} onClick={() => isWriting ? setCurrent(current + 1) : setSection(section + 1)}><ChevronRight className="size-5" /></button>
      </footer>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Testni yakunlaysizmi?">
        <p className="text-ink-700">{answered} / {items.length} savolga javob berildi.{answered < items.length && " Javobsiz savollar noto'g'ri hisoblanadi."}</p>
        {isWriting && <Notice>Essaylaringiz AI tomonidan tekshiriladi — bu bir necha soniya olishi mumkin.</Notice>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {onExit && <button className="btn-ghost" onClick={() => { save(); onExit(); }}>Saqlab chiqish</button>}
          <button className="btn-outline" onClick={() => setConfirm(false)}>Davom etish</button>
          <button className="btn-primary" onClick={() => { setConfirm(false); submit(); }}>Yakunlash</button>
        </div>
      </Modal>
      {submitting && <div className="fixed inset-0 z-50 grid place-items-center bg-white/80 backdrop-blur"><div className="flex items-center gap-3 font-semibold"><Spinner /> Natijalar hisoblanmoqda{isWriting && " (AI tekshiruv)"}…</div></div>}
    </div>
  );
}

function QuestionInput({ q, value, onChange }: { q: Question; value: string; onChange: (v: string) => void }) {
  if (q.qtype === "gap_fill" || q.qtype === "short_answer") {
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;
    const over = q.word_limit && words > q.word_limit;
    return (
      <div>
        <input className={clsx("input", over && "border-red-300")} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Javobingiz" maxLength={200} autoComplete="off" spellCheck={false} />
        {q.word_limit && <p className={clsx("mt-1 text-xs", over ? "text-red-600" : "text-ink-500")}>Ko'pi bilan {q.word_limit} so'z {over && `(siz: ${words})`}</p>}
      </div>
    );
  }
  const opts = q.qtype === "tfng" ? TFNG : q.qtype === "ynng" ? YNNG : q.options;
  if (q.qtype === "matching_headings") {
    return (
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Sarlavhani tanlang —</option>
        {opts.map((o) => <option key={o} value={o.split(".")[0].trim()}>{o}</option>)}
      </select>
    );
  }
  return (
    <div className="grid gap-2">
      {opts.map((o) => {
        const v = q.qtype === "mcq" ? o.split(".")[0].trim() : o;
        return (
          <label key={o} className={clsx("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition", value === v ? "border-brand-400 bg-brand-50" : "border-line hover:border-brand-200")}>
            <input type="radio" className="accent-[#ff6b4a]" checked={value === v} onChange={() => onChange(v)} /> {o}
          </label>
        );
      })}
    </div>
  );
}

function WritingEditor({ q, value, onChange }: { q: Question; value: string; onChange: (v: string) => void }) {
  const wc = wordCount(value);
  const min = q.extra.min_words || 250;
  return (
    <div className="flex h-full flex-col">
      <textarea value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} maxLength={20000}
        placeholder="Javobingizni shu yerga yozing…" className="input min-h-[50vh] flex-1 resize-none font-serif text-[16px] leading-7" />
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className={clsx("font-semibold", wc >= min ? "text-emerald-600" : "text-ink-500")}>So'zlar: {wc} / {min}+</span>
        <span className="text-xs text-ink-500">Imlo tekshiruvi o'chirilgan (haqiqiy imtihondagidek)</span>
      </div>
    </div>
  );
}

function AudioPanel({ section, mode }: { section: Section; mode: string }) {
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  if (section.audio_url) return <audio className="mt-5 w-full" controls src={section.audio_url} controlsList="nodownload" />;
  if (!section.audio_script) return null;
  const play = () => {
    if (playing) { stopSpeaking(); setPlaying(false); return; }
    setPlaying(true);
    speak(section.audio_script!, { rate: 0.95, onEnd: () => { setPlaying(false); setPlayed(true); } });
  };
  return (
    <div className="mt-5 rounded-2xl border border-listening/30 bg-listening/5 p-5">
      <div className="flex items-center gap-3">
        <button onClick={play} disabled={(mode === "exam" && played) || !ttsSupported} className="grid size-14 place-items-center rounded-full bg-listening text-white shadow-lg shadow-listening/30 disabled:opacity-40">
          {playing ? <Pause className="size-6" /> : <Play className="ml-1 size-6" />}
        </button>
        <div>
          <div className="flex items-center gap-2 font-bold"><Headphones className="size-4" /> Audio</div>
          <div className="text-sm text-ink-500">{playing ? "Tinglang…" : played && mode === "exam" ? "Audio faqat bir marta eshittiriladi" : "Boshlash uchun bosing"}</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-500">Demo: audio brauzer TTS ovozi bilan o'qiladi. Admin panelda haqiqiy audio fayl (audio_url) qo'shish mumkin.</p>
      {!ttsSupported && <p className="mt-2 text-xs text-red-600">Brauzeringiz TTS ni qo'llamaydi.</p>}
    </div>
  );
}
