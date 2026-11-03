import clsx from "clsx";
import { Activity, AlertTriangle, BookA, Bot, CheckCircle2, ClipboardList, Pencil, Plus, Search, Trash2, Users, XCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card, ErrorBox, Modal, Notice, PageHeader, PageLoader, Spinner, StatCard, Tabs } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useApi } from "../../lib/hooks";

type Tab = "overview" | "users" | "tests" | "vocab" | "ai" | "logs";

export default function Admin() {
  const [tab, setTab] = useState<Tab>("overview");
  return (
    <div className="space-y-5">
      <PageHeader title="Admin panel" subtitle="Platformani boshqarish" />
      <div className="overflow-x-auto"><Tabs value={tab} onChange={setTab} items={[
        { value: "overview", label: "Statistika" }, { value: "users", label: "Foydalanuvchilar" }, { value: "tests", label: "Testlar" },
        { value: "vocab", label: "Vocabulary" }, { value: "ai", label: "AI & sozlamalar" }, { value: "logs", label: "Xatolar logi" }]} /></div>
      {tab === "overview" && <Overview />}
      {tab === "users" && <UsersTab />}
      {tab === "tests" && <TestsTab />}
      {tab === "vocab" && <VocabTab />}
      {tab === "ai" && <AITab />}
      {tab === "logs" && <LogsTab />}
    </div>
  );
}

function Overview() {
  const { data: o, loading, error, reload } = useApi<any>("/api/admin/overview");
  if (loading) return <PageLoader />;
  if (error || !o) return <ErrorBox error={error || ""} onRetry={reload} />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Users className="size-5" />} label="Foydalanuvchilar" value={o.users} hint={`${o.premium_users} premium · ${o.active_7d} faol (7 kun)`} />
        <StatCard icon={<ClipboardList className="size-5" />} label="Testlar / urinishlar" value={`${o.tests} / ${o.attempts}`} color="bg-sky-50 text-sky-600" />
        <StatCard icon={<Bot className="size-5" />} label="AI feedback" value={o.ai_feedback} hint={`${o.ai_feedback_demo} demo · ${o.writing} writing · ${o.speaking} speaking`} color="bg-purple-50 text-purple-600" />
        <StatCard icon={<AlertTriangle className="size-5" />} label="Xatolar (24 soat)" value={o.errors_24h} color="bg-red-50 text-red-600" />
      </div>
      <Card>
        <h3 className="mb-3 font-bold">Faollik (14 kun)</h3>
        <div className="h-56"><ResponsiveContainer width="100%" height="100%">
          <AreaChart data={o.activity}><XAxis dataKey="date" fontSize={11} /><Tooltip />
            <Area dataKey="minutes" name="Daqiqa" stroke="#ff6b4a" fill="#ffe6de" /><Area dataKey="active_users" name="Faol foydalanuvchi" stroke="#4f7cff" fill="#dfe7ff" /></AreaChart>
        </ResponsiveContainer></div>
      </Card>
    </div>
  );
}

function UsersTab() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, loading, error, reload } = useApi<{ total: number; items: any[] }>(`/api/admin/users?search=${encodeURIComponent(search)}`);
  const [msg, setMsg] = useState<string | null>(null);
  const patch = async (id: number, body: object) => { try { await api(`/api/admin/users/${id}`, { method: "PATCH", body }); reload(); } catch (e) { setMsg(errMsg(e)); } };
  return (
    <Card>
      <form onSubmit={(e) => { e.preventDefault(); setSearch(q); }} className="mb-4 flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" /><input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email yoki ism" /></div><button className="btn-outline">Qidirish</button></form>
      {msg && <ErrorBox error={msg} />}
      {loading ? <PageLoader /> : error ? <ErrorBox error={error} /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="text-left text-xs uppercase text-ink-500"><th className="pb-2">Foydalanuvchi</th><th>Tarif</th><th>Holat</th><th>Testlar</th><th>Oxirgi kirish</th><th className="text-right">Amallar</th></tr></thead>
            <tbody className="divide-y divide-line">{data!.items.map((u) => (
              <tr key={u.id}>
                <td className="py-2.5"><div className="font-semibold">{u.full_name} {u.is_admin && <span className="chip bg-ink-900 text-white">admin</span>}</div><div className="text-xs text-ink-500">{u.email}</div></td>
                <td>{u.is_premium ? <span className="chip bg-brand-50 text-brand-700">Premium</span> : "Free"}</td>
                <td>{u.is_active ? <span className="text-emerald-600">Faol</span> : <span className="text-red-600">Bloklangan</span>}{!u.is_verified && <div className="text-xs text-amber-600">tasdiqlanmagan</div>}</td>
                <td>{u.attempts}</td>
                <td className="text-xs text-ink-500">{u.last_login_at ? new Date(u.last_login_at).toLocaleString("uz-UZ") : "—"}</td>
                <td className="space-x-1 text-right whitespace-nowrap">
                  <button className="btn-soft px-2 py-1 text-xs" onClick={() => patch(u.id, { premium_days: u.is_premium ? 0 : 30 })}>{u.is_premium ? "Premium −" : "Premium +30"}</button>
                  <button className="btn-outline px-2 py-1 text-xs" onClick={() => patch(u.id, { is_active: !u.is_active })}>{u.is_active ? "Bloklash" : "Faollashtirish"}</button>
                  <button className="btn-outline px-2 py-1 text-xs" onClick={() => patch(u.id, { is_admin: !u.is_admin })}>{u.is_admin ? "Admin −" : "Admin +"}</button>
                </td>
              </tr>))}</tbody>
          </table>
          <p className="mt-2 text-xs text-ink-500">Jami: {data!.total}</p>
        </div>
      )}
    </Card>
  );
}

const QTYPES = ["mcq", "tfng", "ynng", "matching_headings", "gap_fill", "short_answer", "writing_task", "speaking_prompt"];
const EMPTY_TEST = { title: "", skill: "reading", exam_type: "academic", description: "", duration_min: 20, difficulty: "medium", is_premium: false, is_published: true, content: { sections: [{ title: "Passage 1", text: "" }] } };

function TestsTab() {
  const { data, loading, error, reload } = useApi<any[]>("/api/admin/tests");
  const [edit, setEdit] = useState<any | null>(null);
  const [json, setJson] = useState("");
  const [qEdit, setQEdit] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const open = async (id?: number) => {
    setErr(null);
    if (!id) { setEdit({ ...EMPTY_TEST, questions: [] }); setJson(JSON.stringify(EMPTY_TEST.content, null, 2)); return; }
    const t = await api(`/api/admin/tests/${id}`);
    setEdit(t);
    setJson(JSON.stringify(t.content, null, 2));
  };
  const saveTest = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const content = JSON.parse(json || "{}");
      const body = { title: edit.title, skill: edit.skill, exam_type: edit.exam_type, description: edit.description, duration_min: +edit.duration_min,
        difficulty: edit.difficulty, is_premium: edit.is_premium, is_published: edit.is_published, content };
      const t = edit.id ? await api(`/api/admin/tests/${edit.id}`, { method: "PUT", body }) : await api("/api/admin/tests", { body });
      setEdit(t);
      reload();
    } catch (e) { setErr(e instanceof SyntaxError ? "Kontent JSON noto'g'ri" : errMsg(e)); } finally { setBusy(false); }
  };
  const del = async (id: number) => { if (!confirm("Testni o'chirasizmi? Barcha urinishlar ham o'chadi.")) return; await api(`/api/admin/tests/${id}`, { method: "DELETE" }); setEdit(null); reload(); };
  const saveQ = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const body = { ...qEdit, options: String(qEdit.optionsText || "").split("\n").map((s: string) => s.trim()).filter(Boolean),
        answer: String(qEdit.answerText || "").split("|").map((s: string) => s.trim()).filter(Boolean),
        word_limit: qEdit.word_limit ? +qEdit.word_limit : null, section: +qEdit.section || 0, order: +qEdit.order || 0, extra: JSON.parse(qEdit.extraText || "{}") };
      delete body.optionsText; delete body.answerText; delete body.extraText; delete body.id;
      if (qEdit.id) await api(`/api/admin/questions/${qEdit.id}`, { method: "PUT", body });
      else await api(`/api/admin/tests/${edit.id}/questions`, { body });
      setQEdit(null);
      open(edit.id);
    } catch (e) { setErr(e instanceof SyntaxError ? "Extra JSON noto'g'ri" : errMsg(e)); }
  };
  const delQ = async (id: number) => { if (!confirm("Savolni o'chirasizmi?")) return; await api(`/api/admin/questions/${id}`, { method: "DELETE" }); open(edit.id); };
  if (loading) return <PageLoader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button className="btn-primary" onClick={() => open()}><Plus className="size-4" /> Yangi test</button></div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="text-left text-xs uppercase text-ink-500"><th className="p-3">Test</th><th>Bo'lim</th><th>Savollar</th><th>Holat</th><th></th></tr></thead>
          <tbody className="divide-y divide-line">{data!.map((t) => (
            <tr key={t.id}><td className="p-3 font-semibold">{t.title}<div className="text-xs font-normal text-ink-500">{t.exam_type} · {t.duration_min} daq</div></td>
              <td className="capitalize">{t.skill}</td><td>{t.questions}</td>
              <td>{t.is_published ? "E'lon qilingan" : "Qoralama"}{t.is_premium && <span className="chip ml-1 bg-brand-50 text-brand-700">Premium</span>}</td>
              <td className="pr-3 text-right"><button className="btn-ghost p-1.5" onClick={() => open(t.id)}><Pencil className="size-4" /></button></td></tr>))}</tbody>
        </table>
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Testni tahrirlash" : "Yangi test"} wide>
        {edit && (
          <div className="space-y-5">
            <form onSubmit={saveTest} className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="label">Nomi</label><input className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} required minLength={3} /></div>
              <div><label className="label">Bo'lim</label><select className="input" value={edit.skill} onChange={(e) => setEdit({ ...edit, skill: e.target.value })}>{["listening", "reading", "writing", "speaking"].map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className="label">Turi</label><select className="input" value={edit.exam_type} onChange={(e) => setEdit({ ...edit, exam_type: e.target.value })}><option value="academic">academic</option><option value="general">general</option></select></div>
              <div><label className="label">Davomiyligi (daq)</label><input type="number" className="input" value={edit.duration_min} min={1} max={240} onChange={(e) => setEdit({ ...edit, duration_min: e.target.value })} /></div>
              <div><label className="label">Qiyinlik</label><select className="input" value={edit.difficulty} onChange={(e) => setEdit({ ...edit, difficulty: e.target.value })}>{["easy", "medium", "hard"].map((s) => <option key={s}>{s}</option>)}</select></div>
              <div className="sm:col-span-2"><label className="label">Tavsif</label><input className="input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.is_premium} onChange={(e) => setEdit({ ...edit, is_premium: e.target.checked })} /> Premium</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.is_published} onChange={(e) => setEdit({ ...edit, is_published: e.target.checked })} /> E'lon qilingan</label>
              <div className="sm:col-span-2"><label className="label">Kontent (JSON): sections → title, text / audio_script / audio_url, instructions</label>
                <textarea className="input min-h-40 font-mono text-xs" value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} /></div>
              {err && <div className="sm:col-span-2"><ErrorBox error={err} /></div>}
              <div className="flex gap-2 sm:col-span-2"><button className="btn-primary" disabled={busy}>{busy && <Spinner className="text-white" />} Saqlash</button>
                {edit.id && <button type="button" className="btn-ghost text-red-600" onClick={() => del(edit.id)}><Trash2 className="size-4" /> O'chirish</button>}</div>
            </form>
            {edit.id && (
              <div>
                <div className="mb-2 flex items-center justify-between"><h4 className="font-bold">Savollar ({edit.questions.length})</h4>
                  <button className="btn-soft" onClick={() => setQEdit({ qtype: "mcq", prompt: "", optionsText: "", answerText: "", section: 0, order: 0, points: 1, word_limit: "", extraText: "{}" })}><Plus className="size-4" /> Savol qo'shish</button></div>
                <ul className="max-h-72 space-y-1.5 overflow-y-auto">{edit.questions.map((q: any) => (
                  <li key={q.id} className="flex items-center gap-2 rounded-xl border border-line p-2 text-sm">
                    <span className="chip bg-ink-900/5">{q.qtype}</span><span className="min-w-0 flex-1 truncate">{q.prompt}</span><span className="text-xs text-emerald-700">{q.answer?.join(" | ")}</span>
                    <button className="btn-ghost p-1" onClick={() => setQEdit({ ...q, optionsText: q.options.join("\n"), answerText: q.answer.join(" | "), word_limit: q.word_limit ?? "", extraText: JSON.stringify(q.extra || {}) })}><Pencil className="size-3.5" /></button>
                    <button className="btn-ghost p-1 text-red-600" onClick={() => delQ(q.id)}><Trash2 className="size-3.5" /></button>
                  </li>))}</ul>
              </div>
            )}
          </div>
        )}
      </Modal>
      <Modal open={!!qEdit} onClose={() => setQEdit(null)} title={qEdit?.id ? "Savolni tahrirlash" : "Yangi savol"} wide>
        {qEdit && (
          <form onSubmit={saveQ} className="grid gap-3 sm:grid-cols-3">
            <div><label className="label">Turi</label><select className="input" value={qEdit.qtype} onChange={(e) => setQEdit({ ...qEdit, qtype: e.target.value })}>{QTYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label className="label">Bo'lim (section)</label><input type="number" className="input" value={qEdit.section} onChange={(e) => setQEdit({ ...qEdit, section: e.target.value })} /></div>
            <div><label className="label">So'z limiti</label><input type="number" className="input" value={qEdit.word_limit} onChange={(e) => setQEdit({ ...qEdit, word_limit: e.target.value })} /></div>
            <div className="sm:col-span-3"><label className="label">Savol matni</label><textarea className="input min-h-20" value={qEdit.prompt} onChange={(e) => setQEdit({ ...qEdit, prompt: e.target.value })} required /></div>
            <div className="sm:col-span-2"><label className="label">Variantlar (har biri yangi qatorda, masalan "A. ...")</label><textarea className="input min-h-24" value={qEdit.optionsText} onChange={(e) => setQEdit({ ...qEdit, optionsText: e.target.value })} /></div>
            <div><label className="label">To'g'ri javob(lar) — | bilan</label><input className="input" value={qEdit.answerText} onChange={(e) => setQEdit({ ...qEdit, answerText: e.target.value })} placeholder="B yoki TRUE yoki 32 | thirty two" /></div>
            <div className="sm:col-span-3"><label className="label">Extra (JSON) — writing: {"{"}"task_type":"task2","min_words":250{"}"}, speaking: {"{"}"part":1{"}"}</label><input className="input font-mono text-xs" value={qEdit.extraText} onChange={(e) => setQEdit({ ...qEdit, extraText: e.target.value })} /></div>
            {err && <div className="sm:col-span-3"><ErrorBox error={err} /></div>}
            <div className="sm:col-span-3"><button className="btn-primary">Saqlash</button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}

const EMPTY_WORD = { word: "", translation_uz: "", definition: "", example: "", part_of_speech: "", ipa: "", topic: "general", level: "B2" };

function VocabTab() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, loading, error, reload } = useApi<{ total: number; items: any[] }>(`/api/admin/vocabulary?search=${encodeURIComponent(search)}`);
  const [edit, setEdit] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const { id, ...body } = edit;
      if (id) await api(`/api/admin/vocabulary/${id}`, { method: "PUT", body });
      else await api("/api/admin/vocabulary", { body });
      setEdit(null);
      reload();
    } catch (e) { setErr(errMsg(e)); }
  };
  const del = async (id: number) => { if (!confirm("So'zni o'chirasizmi?")) return; await api(`/api/admin/vocabulary/${id}`, { method: "DELETE" }); reload(); };
  return (
    <Card>
      <div className="mb-4 flex flex-wrap gap-2">
        <form onSubmit={(e) => { e.preventDefault(); setSearch(q); }} className="flex flex-1 gap-2"><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="So'z qidirish" /><button className="btn-outline">Qidirish</button></form>
        <button className="btn-primary" onClick={() => setEdit({ ...EMPTY_WORD })}><Plus className="size-4" /> So'z qo'shish</button>
      </div>
      {loading ? <PageLoader /> : error ? <ErrorBox error={error} /> : (
        <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-sm">
          <thead><tr className="text-left text-xs uppercase text-ink-500"><th className="pb-2">So'z</th><th>Tarjima</th><th>Mavzu</th><th>Daraja</th><th></th></tr></thead>
          <tbody className="divide-y divide-line">{data!.items.map((v) => (
            <tr key={v.id}><td className="py-2 font-semibold">{v.word}</td><td>{v.translation_uz}</td><td>{v.topic}</td><td>{v.level}</td>
              <td className="text-right whitespace-nowrap"><button className="btn-ghost p-1.5" onClick={() => setEdit(v)}><Pencil className="size-4" /></button><button className="btn-ghost p-1.5 text-red-600" onClick={() => del(v.id)}><Trash2 className="size-4" /></button></td></tr>))}</tbody>
        </table><p className="mt-2 text-xs text-ink-500">Jami: {data!.total}</p></div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "So'zni tahrirlash" : "Yangi so'z"} wide>
        {edit && (
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            {(["word", "translation_uz", "part_of_speech", "ipa", "topic"] as const).map((k) => <div key={k}><label className="label">{k}</label><input className="input" value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} required={k === "word" || k === "translation_uz"} /></div>)}
            <div><label className="label">level</label><select className="input" value={edit.level} onChange={(e) => setEdit({ ...edit, level: e.target.value })}>{["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => <option key={l}>{l}</option>)}</select></div>
            <div className="sm:col-span-2"><label className="label">definition</label><input className="input" value={edit.definition} onChange={(e) => setEdit({ ...edit, definition: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="label">example</label><input className="input" value={edit.example} onChange={(e) => setEdit({ ...edit, example: e.target.value })} /></div>
            {err && <div className="sm:col-span-2"><ErrorBox error={err} /></div>}
            <div><button className="btn-primary">Saqlash</button></div>
          </form>
        )}
      </Modal>
    </Card>
  );
}

function AITab() {
  const { config } = useAuth();
  const { data, loading, error, reload } = useApi<any>("/api/admin/ai");
  const [provider, setProvider] = useState("groq");
  const [models, setModels] = useState<Record<string, string>>({});
  const [tests, setTests] = useState<Record<string, any>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState(config.app_name);
  useEffect(() => { if (data) { setProvider(data.provider); setModels(Object.fromEntries(data.providers.map((p: any) => [p.name, p.model]))); } }, [data]);
  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorBox error={error || ""} onRetry={reload} />;
  const save = async () => { try { await api("/api/admin/ai", { method: "PUT", body: { provider, models } }); setMsg("AI sozlamalari saqlandi"); reload(); } catch (e) { setMsg(errMsg(e)); } };
  const test = async (p: string) => { setTests({ ...tests, [p]: "loading" }); const r = await api("/api/admin/ai/test", { body: { provider: p } }).catch((e) => ({ ok: false, error: errMsg(e) })); setTests((t) => ({ ...t, [p]: r })); };
  const saveName = async () => { try { await api("/api/admin/branding", { method: "PUT", body: { app_name: name } }); setMsg("Sayt nomi o'zgartirildi — sahifani yangilang"); } catch (e) { setMsg(errMsg(e)); } };
  return (
    <div className="space-y-4">
      {msg && <Notice tone="ok">{msg}</Notice>}
      <Card className="space-y-4">
        <h3 className="flex items-center gap-2 font-bold"><Bot className="size-4" /> AI provayder</h3>
        <Notice>{data.note}</Notice>
        <div className="grid gap-3 md:grid-cols-3">
          {data.providers.map((p: any) => (
            <div key={p.name} className={clsx("rounded-2xl border-2 p-4", provider === p.name ? "border-brand-500" : "border-line")}>
              <label className="flex items-center gap-2 font-bold"><input type="radio" checked={provider === p.name} onChange={() => setProvider(p.name)} className="accent-[#ff6b4a]" /> {p.label}</label>
              <div className="mt-1 text-xs">{p.configured ? <span className="text-emerald-600">API kalit sozlangan</span> : <span className="text-red-600">API kalit yo'q (.env)</span>}{p.supports_stt && " · Whisper STT"}</div>
              <label className="label mt-3 text-xs">Model</label>
              <input className="input text-xs" value={models[p.name] || ""} onChange={(e) => setModels({ ...models, [p.name]: e.target.value })} />
              <button className="btn-outline mt-3 w-full text-xs" onClick={() => test(p.name)} disabled={tests[p.name] === "loading"}>{tests[p.name] === "loading" ? <Spinner /> : <Activity className="size-3.5" />} API holatini tekshirish</button>
              {tests[p.name] && tests[p.name] !== "loading" && (
                <div className={clsx("mt-2 flex items-start gap-1.5 text-xs", tests[p.name].ok ? "text-emerald-700" : "text-red-600")}>
                  {tests[p.name].ok ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}
                  {tests[p.name].ok ? `Ishlayapti · ${tests[p.name].latency_ms} ms` : tests[p.name].error}
                </div>
              )}
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="radio" checked={provider === "none"} onChange={() => setProvider("none")} /> AI o'chirilgan (faqat demo rejim)</label>
        <button className="btn-primary" onClick={save}>Saqlash</button>
      </Card>
      <Card className="space-y-3">
        <h3 className="flex items-center gap-2 font-bold"><BookA className="size-4" /> Sayt nomi (brending)</h3>
        <div className="flex gap-2"><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /><button className="btn-outline" onClick={saveName}>Saqlash</button></div>
      </Card>
    </div>
  );
}

function LogsTab() {
  const { data, loading, error, reload } = useApi<any[]>("/api/admin/logs");
  const [open, setOpen] = useState<number | null>(null);
  if (loading) return <PageLoader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  return (
    <Card>
      <div className="mb-3 flex justify-between"><h3 className="font-bold">Server xatolari</h3><div className="flex gap-2"><button className="btn-outline" onClick={reload}>Yangilash</button>{!!data?.length && <button className="btn-ghost text-red-600" onClick={async () => { if (confirm("Barcha loglarni o'chirasizmi?")) { await api("/api/admin/logs", { method: "DELETE" }); reload(); } }}>Tozalash</button>}</div></div>
      {!data?.length ? <p className="py-6 text-center text-sm text-ink-500">Xatolar yo'q 🎉</p> : (
        <ul className="divide-y divide-line text-sm">{data.map((e) => (
          <li key={e.id} className="py-2">
            <button className="w-full text-left" onClick={() => setOpen(open === e.id ? null : e.id)}>
              <span className="chip mr-2 bg-red-50 text-red-700">{e.level}</span><span className="font-mono text-xs">{e.method} {e.path}</span>
              <div className="mt-0.5 text-ink-700">{e.message}</div><div className="text-xs text-ink-500">{new Date(e.created_at).toLocaleString("uz-UZ")}</div>
            </button>
            {open === e.id && e.details && <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-ink-900 p-3 text-xs text-white">{e.details}</pre>}
          </li>))}</ul>
      )}
    </Card>
  );
}
