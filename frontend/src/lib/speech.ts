// Brauzer nutq API'lari: Speech-to-Text (SpeechRecognition), Text-to-Speech (speechSynthesis) va audio yozish.
import { useCallback, useEffect, useRef, useState } from "react";

type SR = any;
const SRClass: SR = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
export const sttSupported = !!SRClass;
export const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

let speakId = 0;
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

/** Matnni o'qib beradi. onEnd faqat shu chaqiruv oxirigacha o'qilganda bir marta chaqiriladi
 *  (stopSpeaking yoki yangi speak() uni bekor qiladi). Ovozi yo'q brauzerlarda zaxira taymer ishlaydi. */
export function speak(text: string, opts: { lang?: string; rate?: number; onEnd?: () => void } = {}) {
  const id = ++speakId;
  if (fallbackTimer) clearTimeout(fallbackTimer);
  let fired = false;
  const done = () => {
    if (fired || id !== speakId) return;
    fired = true;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    opts.onEnd?.();
  };
  if (!ttsSupported) { done(); return; }
  window.speechSynthesis.cancel();
  // o'zbekcha izoh qatorlarini (🇺🇿 ...) inglizcha ovoz bilan o'qimaymiz
  const clean = text.replace(/[*_#`>]/g, "").replace(/🇺🇿[^\n]*/g, "").trim();
  const parts = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (!parts.length) { done(); return; }
  const voices = window.speechSynthesis.getVoices();
  const lang = opts.lang || "en-GB";
  const voice = voices.find((v) => v.lang === lang) || voices.find((v) => v.lang.startsWith(lang.slice(0, 2)));
  const rate = opts.rate ?? 1;
  parts.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p);
    u.lang = voice?.lang || lang;
    if (voice) u.voice = voice;
    u.rate = rate;
    if (i === parts.length - 1) u.onend = done;
    u.onerror = (e) => { if (e.error !== "interrupted" && e.error !== "canceled") done(); };
    window.speechSynthesis.speak(u);
  });
  const words = clean.split(/\s+/).length;
  fallbackTimer = setTimeout(done, (words * 520) / rate + 2500);
}

export function stopSpeaking(): void {
  speakId++;
  if (fallbackTimer) clearTimeout(fallbackTimer);
  if (ttsSupported) window.speechSynthesis.cancel();
}

/** Uzluksiz nutqni matnga aylantirish (brauzer). */
export function useSpeechToText(lang = "en-US") {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<any>(null);
  const finalRef = useRef("");
  const wanted = useRef(false);

  const start = useCallback((reset = true) => {
    if (!SRClass) { setError("Brauzeringiz nutqni tanimaydi. Chrome yoki Edge'dan foydalaning yoki matn yozing."); return; }
    if (reset) { finalRef.current = ""; setTranscript(""); }
    setInterim("");
    setError(null);
    const r = new SRClass();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e: any) => {
      let fin = "", int = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript + " ";
        else int += e.results[i][0].transcript;
      }
      if (fin) { finalRef.current += fin; setTranscript(finalRef.current.trim()); }
      setInterim(int);
    };
    r.onerror = (e: any) => {
      if (e.error === "not-allowed") { setError("Mikrofonga ruxsat berilmadi"); wanted.current = false; }
      else if (e.error !== "no-speech" && e.error !== "aborted") setError(`Nutqni tanishda xato: ${e.error}`);
    };
    r.onend = () => {
      // Chrome ba'zan o'zi to'xtaydi — foydalanuvchi to'xtatmagan bo'lsa davom etamiz
      if (wanted.current) { try { r.start(); } catch { setListening(false); } }
      else setListening(false);
    };
    rec.current = r;
    wanted.current = true;
    try { r.start(); setListening(true); } catch { /* allaqachon ishlayapti */ }
  }, [lang]);

  const stop = useCallback(() => {
    wanted.current = false;
    try { rec.current?.stop(); } catch { /* */ }
    setListening(false);
    setInterim("");
    return finalRef.current.trim();
  }, []);

  useEffect(() => () => { wanted.current = false; try { rec.current?.abort(); } catch { /* */ } }, []);
  return { listening, transcript, interim, error, start, stop, setTranscript, supported: sttSupported };
}

/** Mikrofon ovozini yozish (server Whisper STT ga yuborish uchun). */
export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const start = useCallback(async () => {
    setBlob(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const m = new MediaRecorder(stream);
    chunks.current = [];
    m.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    m.onstop = () => {
      setBlob(new Blob(chunks.current, { type: m.mimeType || "audio/webm" }));
      stream.getTracks().forEach((t) => t.stop());
    };
    m.start();
    mr.current = m;
    setRecording(true);
  }, []);
  const stop = useCallback(() => { mr.current?.state === "recording" && mr.current.stop(); setRecording(false); }, []);
  return { recording, blob, start, stop, supported: typeof MediaRecorder !== "undefined" };
}
