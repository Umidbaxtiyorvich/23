import { CheckCircle2, Eye, EyeOff, Mail } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell } from "../components/Layout";
import { ErrorBox, Notice, Spinner } from "../components/ui";
import { api, errMsg } from "../lib/api";
import { useAuth } from "../lib/auth";

function PasswordInput({ value, onChange, placeholder = "••••••••", autoComplete }: { value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input className="input pr-10" type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required autoComplete={autoComplete} minLength={8} maxLength={128} />
      <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-700" onClick={() => setShow(!show)} aria-label="Parolni ko'rsatish">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function Login() {
  const { login, config } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await login(email, password);
      nav(u.profile?.onboarded || u.is_admin ? params.get("next") || "/dashboard" : "/onboarding", { replace: true });
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Xush kelibsiz!" subtitle="Hisobingizga kiring va mashg'ulotni davom ettiring">
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBox error={error} />}
        <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="siz@email.uz" required autoComplete="email" /></div>
        <div>
          <div className="flex items-center justify-between"><label className="label">Parol</label><Link to="/forgot-password" className="mb-1.5 text-sm font-semibold text-brand-600">Parolni unutdingizmi?</Link></div>
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        <button className="btn-primary w-full py-3" disabled={busy}>{busy && <Spinner className="text-white" />} Kirish</button>
        <p className="text-center text-sm text-ink-500">Hisobingiz yo'qmi? <Link to="/register" className="font-semibold text-brand-600">Ro'yxatdan o'ting</Link></p>
        {config.demo_accounts && (
          <Notice>
            <b>Demo hisoblar:</b>
            <div className="mt-1 grid gap-1">
              {[["demo@ielts-ai-master.example.com", "Free"], ["premium@ielts-ai-master.example.com", "Premium"], ["admin@ielts-ai-master.example.com", "Admin"]].map(([e, l]) => (
                <button type="button" key={e} className="text-left underline-offset-2 hover:underline" onClick={() => { setEmail(e); setPassword(l === "Admin" ? "Admin12345!" : "Demo12345!"); }}>
                  {l}: {e}
                </button>
              ))}
            </div>
          </Notice>
        )}
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ full_name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const strong = f.password.length >= 8 && /\d/.test(f.password) && /[A-Za-z]/.test(f.password);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!strong) { setError("Parol kamida 8 belgi, harf va raqamdan iborat bo'lsin"); return; }
    setBusy(true);
    setError(null);
    try {
      const r = await register(f.full_name, f.email, f.password);
      if (r.dev_link) console.info("[DEV] Emailni tasdiqlash havolasi:", r.dev_link);
      nav("/onboarding", { replace: true });
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Ro'yxatdan o'tish" subtitle="2 daqiqada shaxsiy IELTS rejangizni oling">
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBox error={error} />}
        <div><label className="label">Ism familiya</label><input className="input" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required minLength={2} maxLength={120} placeholder="Ismingiz" autoComplete="name" /></div>
        <div><label className="label">Email</label><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required placeholder="siz@email.uz" autoComplete="email" /></div>
        <div>
          <label className="label">Parol</label>
          <PasswordInput value={f.password} onChange={(v) => setF({ ...f, password: v })} autoComplete="new-password" />
          <p className={`mt-1.5 text-xs ${strong ? "text-emerald-600" : "text-ink-500"}`}>Kamida 8 belgi, harf va raqam {strong && "✓"}</p>
        </div>
        <button className="btn-primary w-full py-3" disabled={busy}>{busy && <Spinner className="text-white" />} Hisob yaratish</button>
        <p className="text-center text-sm text-ink-500">Hisobingiz bormi? <Link to="/login" className="font-semibold text-brand-600">Kirish</Link></p>
      </form>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<{ message: string; dev_link?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try { setDone(await api("/api/auth/forgot-password", { body: { email }, auth: false })); } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Parolni tiklash" subtitle="Emailingizga tiklash havolasini yuboramiz">
      {done ? (
        <div className="space-y-4">
          <Notice tone="ok"><Mail className="mr-1 inline size-4" /> {done.message}</Notice>
          {done.dev_link && <Notice tone="warn">Dev rejim (SMTP sozlanmagan): <a className="font-semibold underline" href={done.dev_link.replace(/^https?:\/\/[^/]+/, "")}>tiklash havolasini ochish</a></Notice>}
          <Link to="/login" className="btn-outline w-full">Kirish sahifasiga qaytish</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <ErrorBox error={error} />}
          <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <button className="btn-primary w-full py-3" disabled={busy}>{busy && <Spinner className="text-white" />} Havola yuborish</button>
          <Link to="/login" className="block text-center text-sm font-semibold text-brand-600">Orqaga</Link>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const token = params.get("token") || "";
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/reset-password", { body: { token, password }, auth: false });
      setOk(true);
      setTimeout(() => nav("/login"), 1500);
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Yangi parol" subtitle="Yangi parolingizni kiriting">
      {!token ? <ErrorBox error="Havolada token yo'q" /> : ok ? <Notice tone="ok">Parol yangilandi! Kirish sahifasiga o'tilmoqda…</Notice> : (
        <form onSubmit={submit} className="space-y-4">
          {error && <ErrorBox error={error} />}
          <div><label className="label">Yangi parol</label><PasswordInput value={password} onChange={setPassword} autoComplete="new-password" /></div>
          <button className="btn-primary w-full py-3" disabled={busy}>{busy && <Spinner className="text-white" />} Saqlash</button>
        </form>
      )}
    </AuthShell>
  );
}

export function VerifyEmail() {
  const [params] = useSearchParams();
  const { refreshUser } = useAuth();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api("/api/auth/verify-email", { body: { token: params.get("token") || "" }, auth: false })
      .then(() => { setState("ok"); refreshUser(); })
      .catch((e) => { setState("error"); setMsg(errMsg(e)); });
  }, [params, refreshUser]);
  return (
    <AuthShell title="Emailni tasdiqlash">
      {state === "loading" && <div className="flex items-center gap-2 text-ink-500"><Spinner /> Tekshirilmoqda…</div>}
      {state === "ok" && <div className="space-y-4"><Notice tone="ok"><CheckCircle2 className="mr-1 inline size-4" /> Email muvaffaqiyatli tasdiqlandi!</Notice><Link to="/dashboard" className="btn-primary w-full">Dashboardga o'tish</Link></div>}
      {state === "error" && <div className="space-y-4"><ErrorBox error={msg} /><Link to="/login" className="btn-outline w-full">Kirish</Link></div>}
    </AuthShell>
  );
}
