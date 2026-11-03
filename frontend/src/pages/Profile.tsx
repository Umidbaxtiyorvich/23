import { Crown, KeyRound, Save, Settings2, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Card, ErrorBox, Notice, PageHeader, PremiumBadge, Spinner } from "../components/ui";
import { api, errMsg, tokens } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Skill } from "../lib/types";
import { fmtDate } from "../lib/format";

export default function Profile() {
  const { user, setUser } = useAuth();
  const p = user!.profile!;
  const st = user!.settings!;
  const [f, setF] = useState({ full_name: user!.full_name, exam_type: p.exam_type, current_level: p.current_level, target_band: p.target_band,
    exam_date: p.exam_date || "", daily_minutes: p.daily_minutes, weak_skills: p.weak_skills, country: p.country, bio: p.bio });
  const [s, setS] = useState(st);
  const [pw, setPw] = useState({ current_password: "", new_password: "" });
  const [msg, setMsg] = useState<{ ok?: string; err?: string; which: string } | null>(null);
  const [busy, setBusy] = useState("");

  const run = async (which: string, fn: () => Promise<void>) => {
    setBusy(which);
    setMsg(null);
    try { await fn(); setMsg({ ok: "Saqlandi ✓", which }); } catch (e) { setMsg({ err: errMsg(e), which }); } finally { setBusy(""); }
  };
  const saveProfile = (e: FormEvent) => { e.preventDefault(); run("profile", async () => {
    setUser(await api("/api/profile", { method: "PUT", body: { ...f, exam_date: f.exam_date || null, clear_exam_date: !f.exam_date } }));
  }); };
  const saveSettings = (e: FormEvent) => { e.preventDefault(); run("settings", async () => { setUser(await api("/api/profile/settings", { method: "PUT", body: s })); }); };
  const changePw = (e: FormEvent) => { e.preventDefault(); run("pw", async () => {
    const r = await api("/api/auth/change-password", { body: pw });
    tokens.set(r.access_token, r.refresh_token);
    setPw({ current_password: "", new_password: "" });
  }); };
  const Msg = ({ which }: { which: string }) => msg?.which === which ? (msg.err ? <ErrorBox error={msg.err} /> : <Notice tone="ok">{msg.ok}</Notice>) : null;
  const skill = (k: Skill) => setF({ ...f, weak_skills: f.weak_skills.includes(k) ? f.weak_skills.filter((x) => x !== k) : [...f.weak_skills, k] });

  return (
    <div className="space-y-6">
      <PageHeader title="Profil" subtitle={user!.email} actions={user!.is_premium ? <PremiumBadge /> : <Link to="/pricing" className="btn-primary"><Crown className="size-4" /> Premium</Link>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <form onSubmit={saveProfile} className="card space-y-4 p-6 lg:col-span-2">
          <h3 className="flex items-center gap-2 font-bold"><UserRound className="size-4" /> Shaxsiy ma'lumotlar va IELTS maqsadi</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Ism familiya</label><input className="input" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} minLength={2} maxLength={120} required /></div>
            <div><label className="label">Mamlakat</label><input className="input" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} maxLength={60} /></div>
            <div><label className="label">IELTS turi</label><select className="input" value={f.exam_type} onChange={(e) => setF({ ...f, exam_type: e.target.value as "academic" | "general" })}><option value="academic">Academic</option><option value="general">General Training</option></select></div>
            <div><label className="label">Hozirgi daraja</label><select className="input" value={f.current_level} onChange={(e) => setF({ ...f, current_level: e.target.value })}>{["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => <option key={l}>{l}</option>)}</select></div>
            <div><label className="label">Maqsadli band: {f.target_band.toFixed(1)}</label><input type="range" min={4} max={9} step={0.5} value={f.target_band} onChange={(e) => setF({ ...f, target_band: +e.target.value })} className="w-full accent-[#ff6b4a]" /></div>
            <div><label className="label">Imtihon sanasi</label><input type="date" className="input" min={new Date().toISOString().slice(0, 10)} value={f.exam_date} onChange={(e) => setF({ ...f, exam_date: e.target.value })} /></div>
            <div><label className="label">Kunlik vaqt (daqiqa)</label><input type="number" className="input" min={10} max={480} value={f.daily_minutes} onChange={(e) => setF({ ...f, daily_minutes: +e.target.value })} /></div>
            <div><label className="label">Qiyin bo'limlar</label><div className="flex flex-wrap gap-1.5">{(["listening", "reading", "writing", "speaking"] as Skill[]).map((k) => (
              <button type="button" key={k} onClick={() => skill(k)} className={`chip capitalize ${f.weak_skills.includes(k) ? "bg-brand-500 text-white" : "bg-ink-900/5 text-ink-500"}`}>{k}</button>))}</div></div>
          </div>
          <div><label className="label">O'zim haqimda</label><textarea className="input min-h-20" value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} maxLength={1000} /></div>
          <Msg which="profile" />
          <div className="flex flex-wrap items-center gap-3"><button className="btn-primary" disabled={busy === "profile"}>{busy === "profile" ? <Spinner className="text-white" /> : <Save className="size-4" />} Saqlash</button>
            <span className="text-xs text-ink-500">Maqsad o'zgarsa, <Link to="/plan" className="underline">reja sahifasida</Link> "Rejani yangilash"ni bosing.</span></div>
        </form>
        <div className="space-y-5">
          <form onSubmit={saveSettings} className="card space-y-3 p-6">
            <h3 className="flex items-center gap-2 font-bold"><Settings2 className="size-4" /> Sozlamalar</h3>
            {([["explain_in_uzbek", "AI tushuntirishlari o'zbek tilida ham"], ["tts_enabled", "Ovozli javoblar (TTS)"], ["email_notifications", "Email xabarnomalar"]] as const).map(([k, l]) => (
              <label key={k} className="flex items-center justify-between gap-3 text-sm"><span>{l}</span><input type="checkbox" className="size-5 accent-[#ff6b4a]" checked={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.checked })} /></label>
            ))}
            <label className="block text-sm">Ovoz tezligi: {s.tts_rate.toFixed(1)}x<input type="range" min={0.5} max={1.5} step={0.1} value={s.tts_rate} onChange={(e) => setS({ ...s, tts_rate: +e.target.value })} className="w-full accent-[#ff6b4a]" /></label>
            <Msg which="settings" />
            <button className="btn-outline w-full" disabled={busy === "settings"}>Saqlash</button>
          </form>
          <form onSubmit={changePw} className="card space-y-3 p-6">
            <h3 className="flex items-center gap-2 font-bold"><KeyRound className="size-4" /> Parolni o'zgartirish</h3>
            <input className="input" type="password" placeholder="Joriy parol" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} required autoComplete="current-password" />
            <input className="input" type="password" placeholder="Yangi parol (8+, harf va raqam)" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} required minLength={8} autoComplete="new-password" />
            <Msg which="pw" />
            <button className="btn-outline w-full" disabled={busy === "pw"}>O'zgartirish</button>
            <p className="text-xs text-ink-500">Parol o'zgargach boshqa qurilmalardagi sessiyalar yopiladi.</p>
          </form>
          <Card>
            <h3 className="font-bold">Tarif</h3>
            <p className="mt-1 text-sm text-ink-500">{user!.is_premium ? `Premium · ${user!.subscription?.expires_at ? fmtDate(user!.subscription.expires_at) + " gacha" : ""}` : "Free tarif"}</p>
            <Link to="/pricing" className="btn-soft mt-3 w-full">Tariflarni ko'rish</Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
