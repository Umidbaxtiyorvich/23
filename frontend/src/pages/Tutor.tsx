import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Bot, Languages, Mic, MicOff, Phone, PhoneOff, Send, Trash2, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { DemoBadge, ErrorBox, Md, Notice, Tabs } from "../components/ui";
import { api, errMsg } from "../lib/api";
import { useAuth } from "../lib/auth";
import { speak, stopSpeaking, sttSupported, ttsSupported, useSpeechToText } from "../lib/speech";

type Mode = "chat" | "speaking" | "grammar" | "vocabulary" | "writing";
type Msg = { role: "user" | "assistant"; content: string; demo?: boolean };

const MODES: { value: Mode; label: string; starter: string }[] = [
  { value: "chat", label: "Suhbat", starter: "Hi Preppy! Let's have a conversation in English." },
  { value: "speaking", label: "IELTS Speaking", starter: "Please start an IELTS Speaking practice. Ask me the first Part 1 question." },
  { value: "grammar", label: "Grammar", starter: "I want to practise grammar. Teach me something useful for IELTS." },
  { value: "vocabulary", label: "Vocabulary", starter: "Teach me some useful IELTS vocabulary for the topic of education." },
  { value: "writing", label: "Writing coach", starter: "Help me plan an IELTS Writing Task 2 essay." },
];
const KEY = "iam.tutor.";

function loadHistory(mode: Mode): Msg[] {
  try { return JSON.parse(localStorage.getItem(KEY + mode) || "[]"); } catch { return []; }
}

export default function Tutor() {
  const { user, config } = useAuth();
  const [params, setParams] = useSearchParams();
  const mode = (params.get("mode") as Mode) || "chat";
  const [msgs, setMsgs] = useState<Msg[]>(() => loadHistory(mode));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uz, setUz] = useState(user?.settings?.explain_in_uzbek ?? true);
  const [voice, setVoice] = useState(false);
  const stt = useSpeechToText("en-US");
  const end = useRef<HTMLDivElement>(null);
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  useEffect(() => { setMsgs(loadHistory(mode)); }, [mode]);
  useEffect(() => { try { localStorage.setItem(KEY + mode, JSON.stringify(msgs.slice(-40))); } catch { /* */ } }, [msgs, mode]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => { if (stt.listening) setInput([stt.transcript, stt.interim].filter(Boolean).join(" ")); }, [stt.transcript, stt.interim, stt.listening]);

  const send = async (text: string) => {
    text = text.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const r = await api("/api/ai/chat", { body: { messages: next.slice(-20).map(({ role, content }) => ({ role, content })), mode, explain_in_uzbek: uz } });
      setMsgs([...next, { role: "assistant", content: r.reply, demo: r.is_demo }]);
      if (voiceRef.current && ttsSupported) {
        speak(r.reply, { rate: user?.settings?.tts_rate ?? 1, onEnd: () => { if (voiceRef.current) stt.start(true); } });
      }
    } catch (e) {
      setError(errMsg(e));
      setMsgs(next);
    } finally { setBusy(false); }
  };

  const submit = (e: FormEvent) => { e.preventDefault(); if (stt.listening) stt.stop(); send(input); };
  const toggleMic = () => {
    if (stt.listening) { const t = stt.stop(); if (voice && t) send(t); }
    else { stopSpeaking(); stt.start(true); }
  };
  const toggleVoice = () => {
    if (voice) { setVoice(false); stt.stop(); stopSpeaking(); return; }
    setVoice(true);
    if (!msgs.length) send(MODES.find((m) => m.value === mode)!.starter);
    else stt.start(true);
  };

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col lg:h-[calc(100dvh-4rem)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-rose-500 text-white"><Bot className="size-6" /></span>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold">Preppy AI Tutor {!config.ai_available && <DemoBadge />}</h1>
            <p className="text-sm text-ink-500">Ingliz tilida suhbat · xatolar tahlili · IELTS Speaking</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setUz(!uz)} className={clsx("btn px-3 py-2", uz ? "bg-emerald-50 text-emerald-700" : "bg-ink-900/5 text-ink-500")} title="O'zbekcha tushuntirish">
            <Languages className="size-4" /> {uz ? "UZ izoh: yoqiq" : "UZ izoh: o'chiq"}
          </button>
          <button onClick={() => { setMsgs([]); stopSpeaking(); }} className="btn-ghost px-3 py-2" title="Suhbatni tozalash"><Trash2 className="size-4" /></button>
        </div>
      </div>
      <div className="mb-3 overflow-x-auto"><Tabs value={mode} onChange={(v) => setParams({ mode: v })} items={MODES.map((m) => ({ value: m.value, label: m.label }))} /></div>

      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {msgs.length === 0 && (
            <div className="mx-auto max-w-md py-8 text-center">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-brand-50 text-brand-500"><Bot className="size-8" /></div>
              <h2 className="text-lg font-bold">Salom! Men Preppy 👋</h2>
              <p className="mt-1 text-sm text-ink-500">Ingliz tilida yozing yoki gapiring. Xatolaringizni tuzataman{uz && " va o'zbekcha tushuntiraman"}.</p>
              <div className="mt-5 flex flex-col gap-2">
                <button className="btn-primary" onClick={() => send(MODES.find((m) => m.value === mode)!.starter)}>Mashg'ulotni boshlash</button>
                {sttSupported && <button className="btn-outline" onClick={toggleVoice}><Phone className="size-4" /> Ovozli suhbat</button>}
              </div>
            </div>
          )}
          <AnimatePresence initial={false}>
            {msgs.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={clsx("flex gap-2.5", m.role === "user" && "justify-end")}>
                {m.role === "assistant" && <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-500 text-white"><Bot className="size-4" /></span>}
                <div className={clsx("max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px]", m.role === "user" ? "rounded-br-md bg-ink-900 text-white" : "rounded-tl-md border border-line bg-white")}>
                  {m.role === "assistant" ? <Md text={m.content} /> : m.content}
                  {m.role === "assistant" && (
                    <div className="mt-1.5 flex items-center gap-2">
                      {ttsSupported && <button className="text-ink-300 hover:text-brand-600" onClick={() => speak(m.content, { rate: user?.settings?.tts_rate ?? 1 })} title="Tinglash"><Volume2 className="size-4" /></button>}
                      {m.demo && <DemoBadge />}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {busy && <div className="flex items-center gap-2 text-sm text-ink-500"><span className="grid size-8 place-items-center rounded-xl bg-brand-500 text-white"><Bot className="size-4" /></span><span className="animate-pulse">Preppy yozmoqda…</span></div>}
          <div ref={end} />
        </div>
        {error && <div className="px-4"><ErrorBox error={error} /></div>}
        {stt.error && <div className="px-4"><Notice tone="warn">{stt.error}</Notice></div>}
        {voice && (
          <div className="flex items-center justify-center gap-3 border-t border-line bg-brand-50/60 px-4 py-2 text-sm font-semibold text-brand-700">
            <span className={clsx("size-2.5 rounded-full", stt.listening ? "animate-ping bg-red-500" : "bg-brand-400")} />
            {stt.listening ? "Tinglayapman… gapirib bo'lgach mikrofonni bosing" : busy ? "O'ylayapman…" : "Preppy gapiryapti…"}
          </div>
        )}
        <form onSubmit={submit} className="flex items-end gap-2 border-t border-line p-3">
          {sttSupported && (
            <button type="button" onClick={toggleVoice} className={clsx("btn shrink-0 px-3 py-3", voice ? "bg-red-500 text-white" : "bg-ink-900/5 text-ink-700")} title={voice ? "Ovozli rejimni tugatish" : "Ovozli suhbat rejimi"}>
              {voice ? <PhoneOff className="size-5" /> : <Phone className="size-5" />}
            </button>
          )}
          {sttSupported && (
            <button type="button" onClick={toggleMic} className={clsx("btn shrink-0 px-3 py-3", stt.listening ? "bg-red-500 text-white" : "bg-brand-50 text-brand-700")} title="Mikrofon">
              {stt.listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </button>
          )}
          <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} maxLength={6000}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(e); } }}
            placeholder="Write in English… (Enter — yuborish)" className="input max-h-40 min-h-[46px] resize-none" />
          <button className="btn-primary shrink-0 px-3 py-3" disabled={busy || !input.trim()} aria-label="Yuborish"><Send className="size-5" /></button>
        </form>
      </div>
    </div>
  );
}
