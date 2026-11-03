import clsx from "clsx";
import { CheckCircle2, Info, Lightbulb, Lock, Sparkles, ThumbsUp } from "lucide-react";
import { Link } from "react-router-dom";
import { BandRing, Card, DemoBadge } from "./ui";
import type { SpeakingFeedback, WritingFeedback } from "../lib/types";

const W_CRIT: Record<string, string> = { task: "Task Achievement / Response", coherence: "Coherence & Cohesion", lexical: "Lexical Resource", grammar: "Grammatical Range & Accuracy" };
const S_CRIT: Record<string, string> = { fluency: "Fluency & Coherence", lexical: "Lexical Resource", grammar: "Grammatical Range & Accuracy", pronunciation: "Pronunciation" };

function Disclaimer({ text, demo, model }: { text?: string; demo: boolean; model?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl bg-ink-900/[.04] p-3 text-xs text-ink-500">
      <Info className="mt-0.5 size-4 shrink-0" />
      <span>{text || "Bu taxminiy AI baholash, rasmiy IELTS natijasi emas."} {demo ? "Demo rejim: AI ulanmagan, oddiy matn tahlili ishlatildi." : model ? `Model: ${model}.` : ""}</span>
    </div>
  );
}

function Criteria({ items, labels }: { items: Record<string, { band: number; comment: string }>; labels: Record<string, string> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Object.entries(labels).map(([k, label]) => items[k] && (
        <div key={k} className="rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between gap-2"><span className="text-sm font-bold">{label}</span><span className="chip bg-brand-50 text-brand-700">{items[k].band.toFixed(1)}</span></div>
          <p className="mt-2 text-sm text-ink-500">{items[k].comment}</p>
        </div>
      ))}
    </div>
  );
}

function ErrorList({ title, items }: { title: string; items: { original: string; correction?: string; suggestion?: string; explanation?: string }[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className="mb-2 font-bold">{title}</h4>
      <ul className="space-y-2">
        {items.map((e, i) => (
          <li key={i} className="rounded-xl bg-surface p-3 text-sm">
            <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700 line-through">{e.original}</span> →{" "}
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">{e.correction || e.suggestion}</span>
            {e.explanation && <div className="mt-1 text-ink-500">{e.explanation}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WritingFeedbackView({ fb, essay }: { fb: WritingFeedback; essay?: string }) {
  const locked = fb.locked || [];
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-6">
        <BandRing value={fb.band} label="Taxminiy band" size={130} color="#a855f7" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><Sparkles className="size-4 text-brand-500" /><span className="font-bold">AI xulosasi</span><DemoBadge show={fb.is_demo} /></div>
          <p className="mt-2 text-ink-700">{fb.summary}</p>
          {fb.word_count !== undefined && <p className="mt-2 text-sm text-ink-500">So'zlar soni: {fb.word_count}</p>}
        </div>
      </Card>
      <Criteria items={fb.criteria} labels={W_CRIT} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <ErrorList title="Grammatik xatolar" items={fb.grammar_errors} />
          {locked.includes("grammar_errors_full") && <LockedRow text="Barcha grammatik xatolar ro'yxati — Premium" />}
          <ErrorList title="So'z boyligi (vocabulary)" items={fb.vocabulary_issues} />
          {!fb.grammar_errors?.length && !fb.vocabulary_issues?.length && <p className="text-sm text-ink-500">Jiddiy xato topilmadi 👏</p>}
        </Card>
        <Card className="space-y-4">
          {fb.structure && Object.keys(fb.structure).length > 0 && (
            <div>
              <h4 className="mb-2 font-bold">Essay tuzilmasi</h4>
              <dl className="space-y-2 text-sm">
                {Object.entries(fb.structure).map(([k, v]) => <div key={k}><dt className="font-semibold capitalize">{({ introduction: "Kirish", body: "Asosiy qism", conclusion: "Xulosa", overall: "Umumiy" } as Record<string, string>)[k] || k}</dt><dd className="text-ink-500">{v}</dd></div>)}
              </dl>
            </div>
          )}
          {fb.strengths?.length > 0 && <div><h4 className="mb-2 flex items-center gap-1.5 font-bold"><ThumbsUp className="size-4 text-emerald-500" /> Kuchli tomonlar</h4><ul className="space-y-1 text-sm">{fb.strengths.map((s, i) => <li key={i} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />{s}</li>)}</ul></div>}
          {fb.improvements?.length > 0 && <div><h4 className="mb-2 flex items-center gap-1.5 font-bold"><Lightbulb className="size-4 text-amber-500" /> Tavsiyalar</h4><ul className="space-y-1 text-sm">{fb.improvements.map((s, i) => <li key={i} className="flex gap-2"><span className="text-amber-500">•</span>{s}</li>)}</ul></div>}
        </Card>
      </div>
      {(fb.improved_essay || locked.includes("improved_essay")) && (
        <Card>
          <h4 className="mb-2 font-bold">Yaxshilangan essay namunasi (≈ Band 8)</h4>
          {locked.includes("improved_essay") ? <LockedRow text="Yaxshilangan essay namunasi — Premium foydalanuvchilar uchun" /> :
            <p className="whitespace-pre-line font-serif leading-7 text-ink-700">{fb.improved_essay}</p>}
        </Card>
      )}
      {essay && <Card><h4 className="mb-2 font-bold">Sizning javobingiz</h4><p className="whitespace-pre-line font-serif leading-7 text-ink-700">{essay}</p></Card>}
      <Disclaimer text={fb.disclaimer} demo={fb.is_demo} model={fb.model} />
    </div>
  );
}

function LockedRow({ text }: { text: string }) {
  return <Link to="/pricing" className="flex items-center gap-2 rounded-xl border border-dashed border-brand-200 bg-brand-50/50 p-3 text-sm font-semibold text-brand-700"><Lock className="size-4" /> {text}</Link>;
}

export function SpeakingFeedbackView({ fb }: { fb: SpeakingFeedback }) {
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-6">
        <BandRing value={fb.band} label="Speaking band" size={130} color="#f59e0b" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><Sparkles className="size-4 text-brand-500" /><span className="font-bold">AI examiner xulosasi</span><DemoBadge show={fb.is_demo} /></div>
          <p className="mt-2 text-ink-700">{fb.summary}</p>
        </div>
      </Card>
      <Criteria items={fb.criteria} labels={S_CRIT} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <ErrorList title="Grammatik xatolar" items={fb.grammar_errors} />
          {fb.vocabulary?.suggestions?.length > 0 && <ErrorList title="Vocabulary tavsiyalari" items={fb.vocabulary.suggestions} />}
          {fb.vocabulary?.good?.length > 0 && <div><h4 className="mb-2 font-bold">Yaxshi ishlatilgan so'zlar</h4><div className="flex flex-wrap gap-1.5">{fb.vocabulary.good.map((w) => <span key={w} className="chip bg-emerald-50 text-emerald-700">{w}</span>)}</div></div>}
        </Card>
        <Card className="space-y-3">
          <h4 className="flex items-center gap-1.5 font-bold"><Lightbulb className="size-4 text-amber-500" /> Tavsiyalar</h4>
          <ul className="space-y-1 text-sm">{fb.tips?.map((t, i) => <li key={i} className="flex gap-2"><span className="text-amber-500">•</span>{t}</li>)}</ul>
        </Card>
      </div>
      {fb.improved_answers?.length > 0 && (
        <Card>
          <h4 className="mb-3 font-bold">Namuna javoblar</h4>
          <div className="space-y-3">{fb.improved_answers.map((a, i) => <div key={i} className={clsx("rounded-2xl bg-surface p-4")}><div className="text-sm font-semibold">{a.question}</div><p className="mt-1 text-sm text-ink-700">{a.sample}</p></div>)}</div>
        </Card>
      )}
      <Disclaimer text={fb.disclaimer} demo={fb.is_demo} />
    </div>
  );
}
