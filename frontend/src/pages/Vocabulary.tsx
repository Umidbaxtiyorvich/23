import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { BookCheck, Brain, CheckCircle2, Layers, ListChecks, RotateCw, Search, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, Empty, ErrorBox, PageHeader, PageLoader, Progress, StatCard, Tabs } from "../components/ui";
import { api, errMsg } from "../lib/api";
import { useApi } from "../lib/hooks";
import { speak } from "../lib/speech";

interface Word {
  id: number; word: string; translation_uz: string; definition: string; example: string; part_of_speech: string; ipa: string; topic: string; level: string;
  progress: { due_date: string; interval_days: number; learned: boolean; repetitions: number } | null; is_new?: boolean;
}
type Tab = "cards" | "list" | "quiz";

export default function Vocabulary() {
  const [tab, setTab] = useState<Tab>("cards");
  const { data: stats, reload: reloadStats } = useApi<{ total: number; learned: number; learning: number; due: number; new: number }>("/api/vocabulary/stats");
  return (
    <div className="space-y-5">
      <PageHeader title="IELTS Vocabulary" subtitle="Spaced Repetition (SRS) — har bir so'z kerakli vaqtda takrorlanadi" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Layers className="size-5" />} label="Jami so'zlar" value={stats?.total ?? "—"} />
        <StatCard icon={<RotateCw className="size-5" />} label="Bugun takrorlash" value={stats?.due ?? "—"} color="bg-sky-50 text-sky-600" />
        <StatCard icon={<Brain className="size-5" />} label="O'rganilmoqda" value={stats?.learning ?? "—"} color="bg-amber-50 text-amber-600" />
        <StatCard icon={<BookCheck className="size-5" />} label="O'rganilgan" value={stats?.learned ?? "—"} color="bg-emerald-50 text-emerald-600" />
      </div>
      <Tabs value={tab} onChange={setTab} items={[{ value: "cards", label: "Flashcards" }, { value: "list", label: "So'zlar ro'yxati" }, { value: "quiz", label: "Quiz" }]} />
      {tab === "cards" && <Flashcards onChange={reloadStats} />}
      {tab === "list" && <WordList onChange={reloadStats} />}
      {tab === "quiz" && <Quiz />}
    </div>
  );
}

function Flashcards({ onChange }: { onChange: () => void }) {
  const { data, loading, error, reload } = useApi<Word[]>("/api/vocabulary/due?limit=20");
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setI(0); setFlip(false); }, [data]);
  if (loading) return <PageLoader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!data?.length) return <Empty icon={<CheckCircle2 className="size-8" />} title="Bugungi takrorlash tugadi! 🎉" text="Ertaga yangi kartalar tayyor bo'ladi." />;
  if (i >= data.length) return <Empty icon={<CheckCircle2 className="size-8" />} title={`${data.length} ta karta takrorlandi!`} action={<button className="btn-primary" onClick={() => { reload(); onChange(); }}>Yana</button>} />;
  const w = data[i];
  const grade = async (g: number) => {
    setBusy(true);
    try { await api(`/api/vocabulary/${w.id}/review`, { body: { grade: g } }); } catch { /* keyingisiga o'tamiz */ }
    setBusy(false);
    setFlip(false);
    setI(i + 1);
    if (i + 1 >= data.length) onChange();
  };
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex items-center gap-3 text-sm text-ink-500"><Progress value={(i / data.length) * 100} className="flex-1" /> {i + 1}/{data.length}</div>
      <div className="[perspective:1200px]">
        <motion.div key={w.id} onClick={() => setFlip(!flip)} animate={{ rotateY: flip ? 180 : 0 }} transition={{ duration: 0.45 }}
          className="relative h-72 cursor-pointer [transform-style:preserve-3d]">
          <div className="card absolute inset-0 flex flex-col items-center justify-center p-6 text-center [backface-visibility:hidden]">
            {w.is_new && <span className="chip absolute left-4 top-4 bg-brand-50 text-brand-700">Yangi</span>}
            <span className="chip absolute right-4 top-4 bg-ink-900/5 text-ink-500">{w.level} · {w.topic}</span>
            <div className="text-4xl font-extrabold">{w.word}</div>
            <div className="mt-2 text-ink-500">{w.ipa} · <i>{w.part_of_speech}</i></div>
            <button className="btn-soft mt-4" onClick={(e) => { e.stopPropagation(); speak(w.word); }}><Volume2 className="size-4" /> Talaffuz</button>
            <div className="mt-4 text-xs text-ink-300">Ma'nosini ko'rish uchun bosing</div>
          </div>
          <div className="card absolute inset-0 flex flex-col items-center justify-center p-6 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="text-2xl font-extrabold text-brand-600">{w.translation_uz}</div>
            <p className="mt-3 text-ink-700">{w.definition}</p>
            <p className="mt-3 italic text-ink-500">“{w.example}”</p>
          </div>
        </motion.div>
      </div>
      <AnimatePresence>
        {flip && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 grid grid-cols-4 gap-2">
            {[["Bilmadim", "bg-red-500", 0], ["Qiyin", "bg-amber-500", 1], ["Yaxshi", "bg-emerald-500", 2], ["Oson", "bg-sky-500", 3]].map(([l, c, g]) => (
              <button key={l as string} disabled={busy} className={clsx("btn py-3 text-white", c as string)} onClick={() => grade(g as number)}>{l}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {!flip && <button className="btn-primary mt-4 w-full py-3" onClick={() => setFlip(true)}>Javobni ko'rish</button>}
    </div>
  );
}

function WordList({ onChange }: { onChange: () => void }) {
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  useEffect(() => { const t = setTimeout(() => { setQ(search); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);
  const { data: topics } = useApi<{ topic: string; count: number }[]>("/api/vocabulary/topics");
  const { data, loading, error, reload, setData } = useApi<{ total: number; items: Word[] }>(`/api/vocabulary?search=${encodeURIComponent(q)}&topic=${topic}&status=${status}&page=${page}&size=24`);
  const toggleLearned = async (w: Word) => {
    try {
      const upd = await api<Word>(`/api/vocabulary/${w.id}/learned`, { body: { learned: !w.progress?.learned } });
      setData(data && { ...data, items: data.items.map((x) => (x.id === w.id ? upd : x)) });
      onChange();
    } catch (e) { alert(errMsg(e)); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" /><input className="input pl-9" placeholder="So'z yoki tarjima…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="input w-auto" value={topic} onChange={(e) => { setTopic(e.target.value); setPage(1); }}><option value="">Barcha mavzular</option>{topics?.map((t) => <option key={t.topic} value={t.topic}>{t.topic} ({t.count})</option>)}</select>
        <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="all">Hammasi</option><option value="new">Yangi</option><option value="learning">O'rganilmoqda</option><option value="learned">O'rganilgan</option>
        </select>
      </div>
      {loading && !data ? <PageLoader /> : error ? <ErrorBox error={error} onRetry={reload} /> : !data?.items.length ? <Empty title="So'z topilmadi" /> : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((w) => (
              <Card key={w.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><div className="flex items-center gap-2 text-lg font-extrabold">{w.word}<button onClick={() => speak(w.word)} className="text-ink-300 hover:text-brand-600" aria-label="Talaffuz"><Volume2 className="size-4" /></button></div>
                    <div className="text-xs text-ink-500">{w.ipa} · {w.part_of_speech} · {w.level}</div></div>
                  <button onClick={() => toggleLearned(w)} className={clsx("chip", w.progress?.learned ? "bg-emerald-50 text-emerald-700" : "bg-ink-900/5 text-ink-500")}>{w.progress?.learned ? "✓ O'rganilgan" : w.progress ? "O'rganilmoqda" : "Yangi"}</button>
                </div>
                <div className="mt-2 font-semibold text-brand-600">{w.translation_uz}</div>
                <p className="mt-1 text-sm text-ink-700">{w.definition}</p>
                <p className="mt-1 text-sm italic text-ink-500">“{w.example}”</p>
              </Card>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2">
            <button className="btn-outline" disabled={page === 1} onClick={() => setPage(page - 1)}>←</button>
            <span className="text-sm text-ink-500">{page} / {Math.max(1, Math.ceil(data.total / 24))}</span>
            <button className="btn-outline" disabled={page * 24 >= data.total} onClick={() => setPage(page + 1)}>→</button>
          </div>
        </>
      )}
    </div>
  );
}

export function Quiz({ onFinish }: { onFinish?: (score: number, total: number, secs: number) => void }) {
  const { data, loading, error, reload } = useApi<{ vocab_id: number; prompt: string; options: string[]; answer: string; word: string }[]>("/api/vocabulary/quiz?n=10");
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [t0] = useState(Date.now());
  useEffect(() => { setI(0); setScore(0); setPicked(null); }, [data]);
  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorBox error={error || "Xatolik"} onRetry={reload} />;
  if (i >= data.length) return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <ListChecks className="mx-auto size-10 text-brand-500" />
      <div className="mt-3 text-3xl font-extrabold">{score} / {data.length}</div>
      <p className="mt-1 text-ink-500">{score >= 8 ? "Ajoyib natija! 🎉" : score >= 5 ? "Yaxshi, davom eting!" : "Takrorlash kerak 💪"}</p>
      <button className="btn-primary mt-5" onClick={reload}>Yana o'ynash</button>
    </Card>
  );
  const q = data[i];
  const choose = (o: string) => {
    if (picked) return;
    setPicked(o);
    const ok = o === q.answer;
    const ns = score + (ok ? 1 : 0);
    if (ok) setScore(ns);
    setTimeout(() => {
      setPicked(null);
      if (i + 1 >= data.length) onFinish?.(ns, data.length, Math.round((Date.now() - t0) / 1000));
      setI(i + 1);
    }, 900);
  };
  return (
    <Card className="mx-auto max-w-xl p-6">
      <div className="mb-4 flex items-center gap-3 text-sm text-ink-500"><Progress value={(i / data.length) * 100} className="flex-1" /> {i + 1}/{data.length} · ✓ {score}</div>
      <h3 className="text-lg font-bold">{q.prompt}</h3>
      <div className="mt-4 grid gap-2">
        {q.options.map((o) => (
          <button key={o} onClick={() => choose(o)} className={clsx("rounded-xl border-2 p-3 text-left font-semibold transition",
            picked ? (o === q.answer ? "border-emerald-500 bg-emerald-50" : o === picked ? "border-red-400 bg-red-50" : "border-line opacity-60") : "border-line hover:border-brand-300")}>{o}</button>
        ))}
      </div>
    </Card>
  );
}
