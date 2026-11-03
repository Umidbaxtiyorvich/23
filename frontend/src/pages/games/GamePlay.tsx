import clsx from "clsx";
import { ArrowLeft, ArrowRight, Heart, Mic, MicOff, Trophy, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, ErrorBox, Notice, PageLoader, Progress } from "../../components/ui";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";
import { speak, useSpeechToText } from "../../lib/speech";
import { Quiz } from "../Vocabulary";
import { GAMES } from "./Games";

function save(game: string, score: number, max_score: number, duration_sec: number) {
  return api("/api/games/results", { body: { game, score, max_score, duration_sec } }).catch(() => {});
}

function Finish({ score, max, onAgain, text }: { score: number; max?: number; onAgain: () => void; text?: string }) {
  return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <Trophy className="mx-auto size-12 text-amber-500" />
      <div className="mt-3 text-4xl font-extrabold">{score}{max ? ` / ${max}` : ""}</div>
      <p className="mt-1 text-ink-500">{text || "Natija saqlandi"}</p>
      <div className="mt-5 flex justify-center gap-2"><button className="btn-primary" onClick={onAgain}>Yana o'ynash</button><Link to="/games" className="btn-outline">O'yinlar</Link></div>
    </Card>
  );
}

export default function GamePlay() {
  const { game = "" } = useParams();
  const meta = GAMES.find((g) => g.id === game);
  const [round, setRound] = useState(0);
  if (!meta) return <ErrorBox error="O'yin topilmadi" />;
  const again = () => setRound((r) => r + 1);
  return (
    <div className="space-y-5">
      <Link to="/games" className="btn-ghost -ml-3"><ArrowLeft className="size-4" /> O'yinlar</Link>
      <h1 className="text-2xl font-extrabold">{meta.title}</h1>
      <div key={round}>
        {game === "vocab_quiz" && <QuizGame />}
        {game === "word_matching" && <Matching onAgain={again} />}
        {game === "sentence_completion" && <Sentences onAgain={again} />}
        {game === "word_dash" && <WordDash onAgain={again} />}
        {game === "speaking_challenge" && <SpeakingChallenge onAgain={again} />}
        {game === "grammar_challenge" && <Grammar onAgain={again} />}
      </div>
    </div>
  );
}

function QuizGame() {
  return <Quiz onFinish={(s, t, d) => save("vocab_quiz", s, t, d)} />;
}

// ------------------------------------------------------------ Word matching
function Matching({ onAgain }: { onAgain: () => void }) {
  const { data, loading, error } = useApi<{ id: number; word: string; translation_uz: string }[]>("/api/games/matching?n=6");
  const [left, setLeft] = useState<number | null>(null);
  const [done, setDone] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [right] = useState(() => Math.random());
  const t0 = useRef(Date.now());
  const finished = data && done.length === data.length;
  useEffect(() => { if (finished) save("word_matching", Math.max(0, data!.length * 10 - mistakes * 3), data!.length * 10, Math.round((Date.now() - t0.current) / 1000)); }, [finished]); // eslint-disable-line
  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorBox error={error || "Xatolik"} />;
  if (finished) return <Finish score={Math.max(0, data.length * 10 - mistakes * 3)} max={data.length * 10} onAgain={onAgain} text={`${mistakes} ta xato · ${Math.round((Date.now() - t0.current) / 1000)} soniya`} />;
  const shuffled = [...data].sort((a, b) => ((a.id * 7919 + right * 1000) % 97) - ((b.id * 7919 + right * 1000) % 97));
  const pick = (id: number) => {
    if (left === null) return;
    if (id === left) { setDone([...done, id]); setLeft(null); }
    else { setWrong(id); setMistakes(mistakes + 1); setTimeout(() => setWrong(null), 500); }
  };
  return (
    <Card className="mx-auto max-w-2xl">
      <p className="mb-4 text-sm text-ink-500">Chapdan inglizcha so'zni, o'ngdan tarjimasini tanlang. Xatolar: {mistakes}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">{data.map((w) => (
          <button key={w.id} disabled={done.includes(w.id)} onClick={() => { setLeft(w.id); speak(w.word); }}
            className={clsx("w-full rounded-xl border-2 p-3 font-semibold transition", done.includes(w.id) ? "border-emerald-200 bg-emerald-50 text-emerald-700 opacity-60" : left === w.id ? "border-brand-500 bg-brand-50" : "border-line hover:border-brand-200")}>{w.word}</button>))}</div>
        <div className="space-y-2">{shuffled.map((w) => (
          <button key={w.id} disabled={done.includes(w.id)} onClick={() => pick(w.id)}
            className={clsx("w-full rounded-xl border-2 p-3 text-sm font-semibold transition", done.includes(w.id) ? "border-emerald-200 bg-emerald-50 text-emerald-700 opacity-60" : wrong === w.id ? "animate-pulse border-red-400 bg-red-50" : "border-line hover:border-brand-200")}>{w.translation_uz}</button>))}</div>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------ Sentence completion
function Sentences({ onAgain }: { onAgain: () => void }) {
  const { data, loading, error } = useApi<{ id: number; sentence: string; answer: string; options: string[]; translation_uz: string }[]>("/api/games/sentences?n=8");
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const t0 = useRef(Date.now());
  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorBox error={error || "Xatolik"} />;
  if (i >= data.length) return <Finish score={score} max={data.length} onAgain={onAgain} />;
  const q = data[i];
  const choose = (o: string) => {
    if (picked) return;
    setPicked(o);
    const ns = score + (o === q.answer ? 1 : 0);
    setScore(ns);
    setTimeout(() => { setPicked(null); if (i + 1 >= data.length) save("sentence_completion", ns, data.length, Math.round((Date.now() - t0.current) / 1000)); setI(i + 1); }, 1100);
  };
  return (
    <Card className="mx-auto max-w-xl p-6">
      <Progress value={(i / data.length) * 100} className="mb-4" />
      <p className="text-lg font-semibold leading-relaxed">{q.sentence.split("_____").map((p, k, arr) => <span key={k}>{p}{k < arr.length - 1 && <span className={clsx("mx-1 inline-block min-w-20 border-b-2 text-center", picked ? (picked === q.answer ? "border-emerald-500 text-emerald-600" : "border-red-400 text-red-600") : "border-brand-400")}>{picked || " "}</span>}</span>)}</p>
      {picked && picked !== q.answer && <p className="mt-2 text-sm text-ink-500">To'g'ri javob: <b>{q.answer}</b> ({q.translation_uz})</p>}
      <div className="mt-5 grid grid-cols-2 gap-2">{q.options.map((o) => <button key={o} onClick={() => choose(o)} className={clsx("rounded-xl border-2 p-3 font-semibold", picked && o === q.answer ? "border-emerald-500 bg-emerald-50" : "border-line hover:border-brand-300")}>{o}</button>)}</div>
    </Card>
  );
}

// ------------------------------------------------------------ Grammar challenge
function Grammar({ onAgain }: { onAgain: () => void }) {
  const { data, loading, error } = useApi<{ sentence: string; options: string[]; answer: string; explanation: string }[]>("/api/games/grammar?n=10");
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(20);
  const t0 = useRef(Date.now());
  const next = useCallback((ns: number) => {
    setPicked(null); setLeft(20);
    if (data && i + 1 >= data.length) save("grammar_challenge", ns, data.length, Math.round((Date.now() - t0.current) / 1000));
    setI((x) => x + 1);
  }, [data, i]);
  useEffect(() => {
    if (!data || i >= data.length || picked) return;
    if (left <= 0) { setPicked("__timeout"); return; }
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left, picked, data, i]);
  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorBox error={error || "Xatolik"} />;
  if (i >= data.length) return <Finish score={score} max={data.length} onAgain={onAgain} />;
  const q = data[i];
  return (
    <Card className="mx-auto max-w-xl p-6">
      <div className="mb-4 flex items-center gap-3 text-sm"><Progress value={(left / 20) * 100} className="flex-1" color={left < 6 ? "bg-red-500" : "bg-brand-500"} /> <b>{left}s</b> · {i + 1}/{data.length}</div>
      <p className="text-lg font-semibold">{q.sentence}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">{q.options.map((o) => (
        <button key={o} disabled={!!picked} onClick={() => { setPicked(o); if (o === q.answer) setScore(score + 1); }}
          className={clsx("rounded-xl border-2 p-3 font-semibold", picked ? (o === q.answer ? "border-emerald-500 bg-emerald-50" : o === picked ? "border-red-400 bg-red-50" : "border-line opacity-60") : "border-line hover:border-brand-300")}>{o}</button>))}</div>
      {picked && <div className="mt-4 space-y-3"><Notice tone={picked === q.answer ? "ok" : "warn"}>{picked === "__timeout" ? "Vaqt tugadi! " : ""}{q.explanation}</Notice>
        <button className="btn-primary w-full" onClick={() => next(score)}>Keyingi <ArrowRight className="size-4" /></button></div>}
    </Card>
  );
}

// ------------------------------------------------------------ Speaking challenge
function similarity(a: string, b: string) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean);
  const A = norm(a), B = norm(b);
  if (!A.length) return 0;
  const bag = [...B];
  let hit = 0;
  for (const w of A) { const k = bag.indexOf(w); if (k >= 0) { hit++; bag.splice(k, 1); } }
  return Math.round((100 * hit) / Math.max(A.length, B.length));
}

function SpeakingChallenge({ onAgain }: { onAgain: () => void }) {
  const { data, loading, error } = useApi<{ text: string; uz: string }[]>("/api/games/speaking?n=5");
  const stt = useSpeechToText("en-US");
  const [i, setI] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [result, setResult] = useState<number | null>(null);
  const t0 = useRef(Date.now());
  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorBox error={error || "Xatolik"} />;
  const total = scores.reduce((a, b) => a + b, 0);
  if (i >= data.length) return <Finish score={Math.round(total / data.length)} max={100} onAgain={onAgain} text="O'rtacha talaffuz aniqligi (%)" />;
  const s = data[i];
  const stop = () => { const t = stt.stop(); setResult(similarity(s.text, t || stt.transcript)); };
  const next = () => {
    const ns = [...scores, result ?? 0];
    setScores(ns);
    setResult(null);
    if (i + 1 >= data.length) save("speaking_challenge", Math.round(ns.reduce((a, b) => a + b, 0) / ns.length), 100, Math.round((Date.now() - t0.current) / 1000));
    setI(i + 1);
  };
  return (
    <Card className="mx-auto max-w-xl p-6 text-center">
      {!stt.supported && <Notice tone="warn">Brauzeringiz nutqni tanimaydi — Chrome yoki Edge'dan foydalaning.</Notice>}
      <Progress value={(i / data.length) * 100} className="mb-5" />
      <p className="text-xl font-bold leading-relaxed">{s.text}</p>
      <p className="mt-1 text-sm text-ink-500">{s.uz}</p>
      <button className="btn-ghost mt-2" onClick={() => speak(s.text, { rate: 0.9 })}><Volume2 className="size-4" /> Namunani tinglash</button>
      <div className="mt-5">
        {stt.listening ? <button className="btn mx-auto size-20 rounded-full bg-red-500 text-white" onClick={stop}><MicOff className="size-8" /></button>
          : <button className="btn mx-auto size-20 rounded-full bg-brand-500 text-white" disabled={!stt.supported || result !== null} onClick={() => stt.start(true)}><Mic className="size-8" /></button>}
        <p className="mt-2 min-h-6 text-sm text-ink-500">{stt.transcript || stt.interim || (stt.listening ? "Gapiring…" : "Mikrofonni bosib gapni o'qing")}</p>
      </div>
      {result !== null && <div className="mt-3 space-y-3"><div className={clsx("text-4xl font-extrabold", result >= 80 ? "text-emerald-600" : result >= 50 ? "text-amber-500" : "text-red-500")}>{result}%</div>
        <button className="btn-primary" onClick={next}>Keyingi <ArrowRight className="size-4" /></button></div>}
    </Card>
  );
}

// ------------------------------------------------------------ Word Dash (yuguruvchi o'yin)
interface Item { lane: number; y: number; text: string; correct: boolean; id: number }

function WordDash({ onAgain }: { onAgain: () => void }) {
  const { data, loading, error } = useApi<{ id: number; word: string; translation_uz: string }[]>("/api/games/matching?n=20");
  const [lane, setLane] = useState(1);
  const [items, setItems] = useState<Item[]>([]);
  const [target, setTarget] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const laneRef = useRef(1);
  laneRef.current = lane;
  const speed = useRef(0.35);
  const t0 = useRef(Date.now());
  const uid = useRef(0);

  const spawn = useCallback((tIdx: number) => {
    if (!data) return;
    const correctLane = Math.floor(Math.random() * 3);
    const wrong = data.filter((_, k) => k !== tIdx).sort(() => Math.random() - 0.5).slice(0, 2);
    let w = 0;
    itemsRef.current = [0, 1, 2].map((l) => ({ lane: l, y: -12, id: uid.current++, correct: l === correctLane,
      text: l === correctLane ? data[tIdx].translation_uz : wrong[w++].translation_uz }));
    setItems([...itemsRef.current]);
  }, [data]);

  const itemsRef = useRef<Item[]>([]);
  const targetRef = useRef(0);
  useEffect(() => {
    if (!running) return;
    let raf = 0, last = performance.now(), pending = false;
    const loop = (now: number) => {
      const dt = Math.min(50, now - last); last = now;
      const its = itemsRef.current;
      if (its.length) {
        its.forEach((it) => { it.y += speed.current * dt * 0.06; });
        if (its[0].y >= 78 && !pending) {
          const hit = its.find((it) => it.lane === laneRef.current);
          if (hit?.correct) { setScore((sc) => sc + 10); speed.current = Math.min(1.2, speed.current + 0.03); }
          else setLives((l) => l - 1);
          itemsRef.current = [];
          pending = true;
          const n = (targetRef.current + 1) % (data?.length || 1);
          targetRef.current = n;
          setTarget(n);
          setTimeout(() => { spawn(n); pending = false; }, 250);
        }
        setItems([...itemsRef.current]);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, spawn, data]);

  useEffect(() => {
    if (lives <= 0 && running) { setRunning(false); setOver(true); save("word_dash", score, 0, Math.round((Date.now() - t0.current) / 1000)); }
  }, [lives, running, score]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") setLane((l) => Math.max(0, l - 1));
      if (e.key === "ArrowRight" || e.key === "d") setLane((l) => Math.min(2, l + 1));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorBox error={error || "Xatolik"} />;
  if (over) return <Finish score={score} onAgain={onAgain} text="Word Dash ochkolari" />;
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-3 flex items-center justify-between font-bold">
        <span>Ochko: {score}</span>
        <span className="flex gap-1">{[0, 1, 2].map((k) => <Heart key={k} className={clsx("size-5", k < lives ? "fill-red-500 text-red-500" : "text-ink-300")} />)}</span>
      </div>
      <div className="relative h-[460px] select-none overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-950 to-purple-900 text-white"
        onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); setLane(Math.min(2, Math.floor(((e.clientX - r.left) / r.width) * 3))); }}>
        <div className="absolute inset-x-0 top-0 z-10 bg-black/30 p-3 text-center"><div className="text-xs uppercase tracking-wider text-white/60">Tarjimasini tuting</div><div className="text-2xl font-extrabold">{data[target].word}</div></div>
        {[1, 2].map((k) => <div key={k} className="absolute inset-y-0 border-l border-dashed border-white/15" style={{ left: `${(k * 100) / 3}%` }} />)}
        {items.map((it) => (
          <div key={it.id} className="absolute w-1/3 px-1.5 text-center" style={{ left: `${(it.lane * 100) / 3}%`, top: `${it.y}%` }}>
            <div className="rounded-xl bg-white/90 px-2 py-2 text-xs font-bold text-indigo-950 shadow-lg">{it.text}</div>
          </div>
        ))}
        <div className="absolute bottom-4 w-1/3 transition-all duration-150" style={{ left: `${(lane * 100) / 3}%` }}>
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-rose-500 text-2xl shadow-xl shadow-brand-500/40">🏃</div>
        </div>
        {!running && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/50">
            <div className="text-center"><p className="mb-3 px-6 text-sm text-white/80">← → tugmalari yoki ekranni bosib yo'lak tanlang. To'g'ri tarjimani tuting!</p>
              <button className="btn-primary px-6 py-3" onClick={() => { t0.current = Date.now(); setRunning(true); spawn(0); }}>Boshlash</button></div>
          </div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
        <button className="btn-outline py-3" onClick={() => setLane(Math.max(0, lane - 1))}>←</button>
        <button className="btn-outline py-3" onClick={() => setLane(Math.min(2, lane + 1))}>→</button>
      </div>
    </div>
  );
}
