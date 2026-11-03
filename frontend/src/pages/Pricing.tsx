import clsx from "clsx";
import { Check, CreditCard, Crown, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ErrorBox, Modal, Notice, PageHeader, PremiumBadge, Spinner } from "../components/ui";
import { api, errMsg } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useApi } from "../lib/hooks";

const FEATURES: [string, boolean, boolean][] = [
  ["Bepul mock testlar (Listening, Reading, Writing, Speaking)", true, true],
  ["Vocabulary + SRS flashcards, o'yinlar", true, true],
  ["Asosiy statistika", true, true],
  ["Kunlik AI so'rovlar", true, true],
  ["To'liq mock testlar to'plami (Premium testlar)", false, true],
  ["Kengaytirilgan AI Writing feedback (yaxshilangan essay, barcha xatolar)", false, true],
  ["Cheksiz AI Speaking examiner", false, true],
  ["AI tuzgan individual o'quv reja", false, true],
  ["Batafsil statistika: haftalik/oylik, zaif savol turlari, AI tavsiyalar", false, true],
];

export default function Pricing() {
  const { user, setUser, config } = useAuth();
  const { data } = useApi<{ plans: { id: string; name: string; amount: number; currency: string; days: number }[]; test_cards: { number: string; result: string }[] }>("/api/subscriptions/plans");
  const [plan, setPlan] = useState<string | null>(null);
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const pay = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await api("/api/subscriptions/checkout", { body: { plan, card_number: card } });
      setUser(r.user);
      setOk(`${r.message}. Tranzaksiya: ${r.transaction_id}`);
      setPlan(null);
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };
  const cancel = async () => { try { const r = await api("/api/subscriptions/cancel", { method: "POST" }); setUser(r.user); setOk("Obuna bekor qilindi"); } catch (e) { setErr(errMsg(e)); } };
  return (
    <div className="space-y-6">
      <PageHeader title="Tariflar" subtitle="Free yoki Premium — o'zingizga mosini tanlang" actions={user?.is_premium && <PremiumBadge />} />
      <Notice tone="warn"><b>TEST REJIMI:</b> haqiqiy pul yechilmaydi. Haqiqiy to'lovlar uchun Payme / Click / Stripe kabi provayder alohida integratsiya qilinishi kerak.</Notice>
      {ok && <Notice tone="ok">{ok}</Notice>}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-6">
          <h3 className="text-lg font-bold">Free</h3>
          <div className="my-3 text-3xl font-extrabold">0 so'm</div>
          <p className="text-sm text-ink-500">Kuniga {config.free_ai_daily_limit} AI so'rov, {config.free_tests_daily_limit} test</p>
          <ul className="mt-5 space-y-2 text-sm">{FEATURES.map(([f, free]) => <li key={f} className={clsx("flex gap-2", !free && "text-ink-300")}>{free ? <Check className="size-4 shrink-0 text-emerald-500" /> : <X className="size-4 shrink-0" />}{f}</li>)}</ul>
        </div>
        {(data?.plans || []).map((p, i) => (
          <div key={p.id} className={clsx("card relative p-6", i === 1 && "ring-2 ring-brand-500")}>
            {i === 1 && <span className="chip absolute -top-3 right-5 bg-brand-500 text-white">Tejamkor</span>}
            <h3 className="flex items-center gap-2 text-lg font-bold"><Crown className="size-5 text-brand-500" /> {p.name}</h3>
            <div className="my-3 text-3xl font-extrabold">{p.amount.toLocaleString("uz-UZ")} <span className="text-base font-semibold text-ink-500">{p.currency}</span></div>
            <p className="text-sm text-ink-500">{p.days} kun{i === 1 && " · oyiga ~" + Math.round(p.amount / 12).toLocaleString("uz-UZ") + " so'm"}</p>
            <ul className="mt-5 space-y-2 text-sm">{FEATURES.map(([f]) => <li key={f} className="flex gap-2"><Check className="size-4 shrink-0 text-emerald-500" />{f}</li>)}</ul>
            <button className="btn-primary mt-6 w-full py-3" onClick={() => setPlan(p.id)}>{user?.is_premium ? "Muddatni uzaytirish" : "Premiumga o'tish"}</button>
          </div>
        ))}
      </div>
      {user?.is_premium && <button className="btn-ghost text-red-600" onClick={cancel}>Premium obunani bekor qilish (test)</button>}
      <Modal open={!!plan} onClose={() => setPlan(null)} title="Test to'lov">
        <form onSubmit={pay} className="space-y-4">
          <div><label className="label">Karta raqami</label>
            <div className="relative"><CreditCard className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" /><input className="input pl-9 font-mono" value={card} onChange={(e) => setCard(e.target.value)} inputMode="numeric" maxLength={23} /></div></div>
          <div className="rounded-xl bg-surface p-3 text-xs text-ink-500">Test kartalari: {data?.test_cards.map((c) => <div key={c.number}><button type="button" className="font-mono underline" onClick={() => setCard(c.number)}>{c.number}</button> — {c.result}</div>)}</div>
          {err && <ErrorBox error={err} />}
          <button className="btn-primary w-full py-3" disabled={busy}>{busy && <Spinner className="text-white" />} To'lash (test)</button>
        </form>
      </Modal>
    </div>
  );
}
