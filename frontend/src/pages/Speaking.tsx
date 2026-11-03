import clsx from "clsx";
import { ArrowRight, Crown, Keyboard, Lock, Mic, Square, UploadCloud, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SpeakingFeedbackView } from "../components/Feedback";
import { BandBadge, Card, DemoBadge, ErrorBox, Notice, PageHeader, PageLoader, PremiumLock, Progress, Spinner } from "../components/ui";
import { ApiError, api, errMsg } from "../lib/api";
import { useAuth } from "../lib/auth";
import { fmtTime, useApi } from "../lib/hooks";
import { speak, stopSpeaking, sttSupported, useRecorder, useSpeechToText } from "../lib/speech";
import type { SpeakingFeedback } from "../lib/types";
import { fmtDate } from "../lib/format";

interface SPart { id: number; part: number; prompt: string; options: string[]; extra: any }
interface STest { id: number; title: string; description: string; is_premium: boolean; locked: boolean; parts: SPart[] }
interface Step { part: number; question: string; cue?: string[]; prep?: number; speak: number }

function buildSteps(t: STest): Step[] {
  const steps: Step[] = [];
  for (const p of t.parts) {
    if (p.part === 2) steps.push({ part: 2, question: p.prompt, cue: p.options, prep: p.extra.prep_seconds ?? 60, speak: p.extra.speak_seconds ?? 120 });
    else p.options.forEach((q) => steps.push({ part: p.part, question: q, speak: p.extra.seconds_per_answer ?? 40 }));
  }
  return steps;
}

export default function Speaking() {
  const [params, setParams] = useSearchParams();
  const testId = Number(params.get("test")) || null;
  const { data: tests, loading, error, reload } = useApi<STest[]>("/api/speaking/tests");
  const { data: sessions } = useApi<any[]>("/api/speaking/sessions");
  const { config } = useAuth();
  if (loading) return <PageLoader />;
  if (error || !tests) return <ErrorBox error={error || "Xatolik"} onRetry={reload} />;
  const test = tests.find((t) => t.id === testId);
  if (test && !test.locked) return <SpeakingRunner test={test} onExit={() => setParams({})} />;
  return (
    <div className="space-y-5">
      <PageHeader title="Speaking · AI examiner" subtitle="Part 1, 2, 3 — savollar ovozda beriladi, javobingiz tahlil qilinadi" actions={!config.ai_available && <DemoBadge />} />
      {!sttSupported && <Notice tone="warn">Brauzeringiz nutqni tanimaydi (Chrome/Edge tavsiya etiladi). Javoblarni yozib kiritishingiz yoki audio yozib serverga yuborishingiz mumkin.</Notice>}
      <div className="grid gap-4 md:grid-cols-2">
        {tests.map((t) => (
          <Card key={t.id} className="flex flex-col">
            <div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-speaking/10 text-speaking"><Mic className="size-5" /></span>{t.is_premium && <span className="chip bg-brand-50 text-brand-700"><Crown className="size-3" /> Premium</span>}</div>
            <h3 className="mt-3 font-bold">{t.title}</h3>
            <p className="mt-1 text-sm text-ink-500">{t.description}</p>
            <p className="mt-2 text-xs text-ink-500">{buildSteps(t).length} ta savol · ~{Math.round(buildSteps(t).reduce((s, x) => s + x.speak + (x.prep || 0), 0) / 60)} daqiqa</p>
            <button className="btn-primary mt-4" onClick={() => t.locked ? undefined : setParams({ test: String(t.id) })} disabled={t.locked}>{t.locked ? <><Lock className="size-4" /> Premium</> : <>Boshlash <ArrowRight className="size-4" /></>}</button>
          </Card>
        ))}
      </div>
      <Card>
        <div className="flex items-center justify-between"><h3 className="font-bold">Erkin Speaking mashqi</h3><Link to="/tutor?mode=speaking" className="btn-soft">Preppy bilan <ArrowRight className="size-4" /></Link></div>
        <p className="mt-1 text-sm text-ink-500">Preppy AI tutor bilan ovozli rejimda cheksiz savol-javob.</p>
      </Card>
      {!!sessions?.length && (
        <Card>
          <h3 className="mb-2 font-bold">Oldingi sessiyalar</h3>
          <ul className="divide-y divide-line">{sessions.slice(0, 10).map((s) => (
            <li key={s.id}><Link to={`/speaking/${s.id}`} className="flex items-center justify-between py-2 text-sm"><span>Part {s.part} · {s.questions} savol · {fmtDate(s.created_at)}</span><BandBadge band={s.band} /></Link></li>))}</ul>
        </Card>
      )}
    </div>
  );
}

function SpeakingRunner({ test, onExit }: { test: STest; onExit: () => void }) {
  const { user } = useAuth();
  const steps = useMemo(() => buildSteps(test), [test]);
  const [i, setI] = useState(-1);
  const [phase, setPhase] = useState<"question" | "prep" | "answer">("question");
  const [left, setLeft] = useState(0);
  const [answers, setAnswers] = useState<{ question: string; answer: string; duration_sec: number }[]>([]);
  const [typed, setTyped] = useState("");
  const [typing, setTyping] = useState(!sttSupported);
  const [fb, setFb] = useState<SpeakingFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ msg: string; status?: number } | null>(null);
  const [serverStt, setServerStt] = useState(false);
  const stt = useSpeechToText("en-US");
  const rec = useRecorder();
  const answerStart = useRef(0);
  const step = steps[i];

  useEffect(() => { api("/api/ai/status").then((s) => setServerStt(!!s.server_stt)).catch(() => {}); return () => stopSpeaking(); }, []);
  useEffect(() => {
    if (i < 0 || phase === "question") return;
    if (left <= 0) { if (phase === "prep") beginAnswer(); else if (phase === "answer") next(); return; }
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase, i]);

  const ask = (idx: number) => {
    const s = steps[idx];
    setI(idx);
    setTyped("");
    setPhase("question");
    const text = s.part === 2 ? `Part two. ${s.question} You should say: ${s.cue?.join(", ")}. You have one minute to prepare.` : s.question;
    speak(text, { rate: user?.settings?.tts_rate ?? 0.95, onEnd: () => {
      if (s.part === 2) { setPhase("prep"); setLeft(s.prep || 60); } else beginAnswer(s);
    } });
  };
  const beginAnswer = (s: Step = step) => {
    setPhase("answer");
    setLeft(s.speak);
    answerStart.current = Date.now();
    if (!typing) stt.start(true);
  };
  const next = () => {
    const text = typing ? typed : (stt.stop() || stt.transcript);
    const rec_ = { question: step.question, answer: text.trim(), duration_sec: Math.round((Date.now() - answerStart.current) / 1000) };
    const all = [...answers, rec_];
    setAnswers(all);
    if (rec.recording) rec.stop();
    if (i + 1 < steps.length) ask(i + 1);
    else finish(all);
  };
  const finish = async (all: typeof answers) => {
    stopSpeaking();
    setI(steps.length);
    setBusy(true);
    try {
      const r = await api("/api/speaking/evaluate", { body: { test_id: test.id, part: "full", transcript: all.map((a) => ({ ...a, answer: a.answer || "(no answer)" })) } });
      setFb(r.feedback);
    } catch (e) { setErr({ msg: errMsg(e), status: e instanceof ApiError ? e.status : undefined }); } finally { setBusy(false); }
  };
  const transcribeRecording = async () => {
    if (!rec.blob) return;
    const form = new FormData();
    form.append("audio", rec.blob, "answer.webm");
    try {
      const r = await api("/api/speaking/transcribe", { form });
      setTyped((t) => (t ? t + " " : "") + r.text);
      setTyping(true);
    } catch (e) { setErr({ msg: errMsg(e) }); }
  };

  if (fb) return <div className="space-y-4"><button className="btn-outline" onClick={onExit}>← Speaking testlar</button><SpeakingFeedbackView fb={fb} />
    <Card><h3 className="mb-2 font-bold">Sizning javoblaringiz (transkript)</h3><ul className="space-y-3 text-sm">{answers.map((a, k) => <li key={k}><b>{a.question}</b><p className="text-ink-700">{a.answer || "—"}</p></li>)}</ul></Card></div>;
  if (i >= steps.length) return busy ? <PageLoader text="AI examiner javoblaringizni tahlil qilmoqda…" /> : (
    <div className="space-y-3">{err && (err.status === 402 ? <PremiumLock title="AI Speaking limiti" text={err.msg} /> : <ErrorBox error={err.msg} />)}
      <button className="btn-primary" onClick={() => finish(answers)}>Qayta urinish</button> <button className="btn-ghost" onClick={onExit}>Chiqish</button></div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between"><button className="btn-ghost -ml-3" onClick={() => { stopSpeaking(); stt.stop(); onExit(); }}>← Chiqish</button><span className="text-sm font-semibold text-ink-500">{Math.max(0, i + 1)} / {steps.length}</span></div>
      <Progress value={((i + 1) / steps.length) * 100} color="bg-speaking" />
      {i < 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-speaking/10 text-speaking"><Mic className="size-8" /></div>
          <h2 className="mt-4 text-xl font-extrabold">{test.title}</h2>
          <p className="mx-auto mt-2 max-w-md text-ink-500">Examiner savolni ovoz bilan beradi, keyin javob berish vaqti boshlanadi. Mikrofonga ruxsat bering. Javoblar matnga aylantiriladi va AI tahlil qiladi.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button className="btn-primary px-6 py-3" onClick={() => ask(0)}>Testni boshlash</button>
            <button className={clsx("btn-outline", typing && "border-brand-400")} onClick={() => setTyping(!typing)}><Keyboard className="size-4" /> {typing ? "Yozma javob: yoqiq" : "Yozma javob rejimi"}</button>
          </div>
          {!sttSupported && <p className="mt-3 text-xs text-ink-500">Brauzer STT yo'q — javoblarni yozing yoki audio yozib yuboring.</p>}
        </Card>
      ) : (
        <Card className="p-7">
          <div className="mb-2 flex items-center justify-between"><span className="chip bg-speaking/10 text-speaking">Part {step.part}</span>
            <button className="text-ink-300 hover:text-brand-600" onClick={() => speak(step.question)} title="Qayta eshitish"><Volume2 className="size-5" /></button></div>
          <h2 className="text-xl font-bold leading-snug">{step.question}</h2>
          {step.cue && <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-700"><li className="list-none -ml-5 font-semibold">You should say:</li>{step.cue.map((c) => <li key={c}>{c}</li>)}</ul>}
          <div className="mt-6 flex items-center gap-4">
            <div className={clsx("grid size-16 place-items-center rounded-full text-white", phase === "answer" ? "animate-pulse bg-red-500" : phase === "prep" ? "bg-amber-500" : "bg-ink-300")}>
              {phase === "question" ? <Volume2 className="size-7" /> : <Mic className="size-7" />}
            </div>
            <div>
              <div className="font-bold">{phase === "question" ? "Examiner gapirmoqda…" : phase === "prep" ? "Tayyorlanish vaqti" : "Javob bering"}</div>
              {phase !== "question" && <div className="font-mono text-2xl font-extrabold">{fmtTime(left)}</div>}
            </div>
          </div>
          {phase === "prep" && <textarea className="input mt-4 min-h-24" placeholder="Qaydlar (ixtiyoriy)…" />}
          {phase === "answer" && (
            <div className="mt-4 space-y-3">
              {typing ? <textarea className="input min-h-28" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Javobingizni yozing yoki audio yozib matnga aylantiring…" autoFocus />
                : <div className="min-h-24 rounded-2xl bg-surface p-4 text-ink-700">{stt.transcript} <span className="text-ink-300">{stt.interim}</span>{!stt.transcript && !stt.interim && <span className="text-ink-300">Gapiring — so'zlaringiz shu yerda paydo bo'ladi…</span>}</div>}
              {stt.error && <Notice tone="warn">{stt.error}</Notice>}
              {serverStt && rec.supported && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {!rec.recording ? <button className="btn-outline" onClick={() => { stt.stop(); rec.start().catch((e) => setErr({ msg: errMsg(e) })); }}><Mic className="size-4" /> Audio yozish (Whisper STT)</button>
                    : <button className="btn bg-red-500 text-white" onClick={rec.stop}><Square className="size-4" /> To'xtatish</button>}
                  {rec.blob && !rec.recording && <button className="btn-soft" onClick={transcribeRecording}><UploadCloud className="size-4" /> Matnga aylantirish</button>}
                </div>
              )}
              {err && <ErrorBox error={err.msg} />}
              <button className="btn-primary w-full" onClick={next}>{i + 1 < steps.length ? "Keyingi savol" : "Yakunlash va baholash"} <ArrowRight className="size-4" /></button>
            </div>
          )}
          {phase === "prep" && <button className="btn-primary mt-3 w-full" onClick={() => beginAnswer()}>Gapirishni boshlash</button>}
          {busy && <Spinner />}
        </Card>
      )}
    </div>
  );
}
