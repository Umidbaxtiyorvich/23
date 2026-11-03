import { motion } from "framer-motion";
import { Blocks, BookA, Footprints, Mic, Puzzle, SpellCheck, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, PageHeader } from "../../components/ui";
import { useApi } from "../../lib/hooks";
import { fmtDate } from "../../lib/format";

export const GAMES = [
  { id: "vocab_quiz", title: "Vocabulary Quiz", text: "So'z ma'nosini toping — 10 ta savol", icon: BookA, color: "from-orange-400 to-rose-500" },
  { id: "word_matching", title: "Word Matching", text: "Inglizcha so'zni tarjimasi bilan juftlang", icon: Puzzle, color: "from-sky-400 to-indigo-500" },
  { id: "sentence_completion", title: "Sentence Completion", text: "Gapdagi bo'sh joyga mos so'zni qo'ying", icon: Blocks, color: "from-emerald-400 to-teal-500" },
  { id: "word_dash", title: "Word Dash", text: "Yuguruvchi o'yin: to'g'ri tarjima yo'lagiga o'ting!", icon: Footprints, color: "from-fuchsia-500 to-purple-600" },
  { id: "speaking_challenge", title: "Speaking Challenge", text: "Gapni ovoz chiqarib o'qing — aniqlik foizi", icon: Mic, color: "from-amber-400 to-orange-500" },
  { id: "grammar_challenge", title: "Grammar Challenge", text: "Vaqtga qarshi grammatika savollari", icon: SpellCheck, color: "from-rose-400 to-red-500" },
];

export default function Games() {
  const { data } = useApi<{ best: Record<string, { best: number; played: number }>; recent: any[] }>("/api/games/results");
  return (
    <div className="space-y-6">
      <PageHeader title="O'yinlar" subtitle="O'ynab o'rganing — natijalar profil va statistikada saqlanadi" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {GAMES.map((g, i) => (
          <motion.div key={g.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={`/games/${g.id}`} className="card group block overflow-hidden transition hover:-translate-y-1 hover:shadow-xl">
              <div className={`flex h-28 items-center justify-center bg-gradient-to-br ${g.color}`}><g.icon className="size-12 text-white transition group-hover:scale-110" /></div>
              <div className="p-5">
                <h3 className="font-bold">{g.title}</h3>
                <p className="mt-1 text-sm text-ink-500">{g.text}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-ink-500">
                  <span className="flex items-center gap-1"><Trophy className="size-3.5 text-amber-500" /> Rekord: {data?.best[g.id]?.best ?? "—"}</span>
                  <span>O'ynalgan: {data?.best[g.id]?.played ?? 0}</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
      {!!data?.recent.length && (
        <Card>
          <h3 className="mb-2 font-bold">Oxirgi natijalar</h3>
          <ul className="divide-y divide-line text-sm">{data.recent.map((r, i) => (
            <li key={i} className="flex justify-between py-2"><span>{GAMES.find((g) => g.id === r.game)?.title || r.game}</span><span className="font-semibold">{r.score}{r.max_score ? ` / ${r.max_score}` : ""} · <span className="font-normal text-ink-500">{fmtDate(r.created_at)}</span></span></li>))}</ul>
        </Card>
      )}
    </div>
  );
}
