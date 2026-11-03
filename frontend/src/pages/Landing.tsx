import { motion } from "framer-motion";
import { ArrowRight, Bot, CalendarCheck, ClipboardList, Gamepad2, LineChart, PenLine } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { Logo } from "../components/Layout";
import { PageLoader } from "../components/ui";
import { useAuth } from "../lib/auth";

const FEATURES = [
  { icon: CalendarCheck, title: "AI o'quv reja", text: "Maqsad balingiz, imtihon sanasi va zaif tomonlaringizga qarab kunlik reja." },
  { icon: ClipboardList, title: "Mock testlar", text: "Kompyuter imtihoniga o'xshash interfeys, taymer va avtomatik baholash." },
  { icon: PenLine, title: "AI Writing feedback", text: "4 mezon bo'yicha taxminiy band, xatolar va yaxshilangan essay namunasi." },
  { icon: Bot, title: "Preppy AI Tutor", text: "Ingliz tilida ovozli suhbat, kerak bo'lsa o'zbekcha tushuntirish." },
  { icon: LineChart, title: "Batafsil statistika", text: "Har bir bo'lim bo'yicha progress, zaif savol turlari va tavsiyalar." },
  { icon: Gamepad2, title: "O'yinlar", text: "Vocabulary, grammar va speaking challenge — o'ynab o'rganing." },
];

export default function Landing() {
  const { user, loading, config } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return (
    <div className="min-h-dvh bg-gradient-to-b from-brand-50/70 via-white to-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex gap-2">
          <Link to="/login" className="btn-ghost">Kirish</Link>
          <Link to="/register" className="btn-primary">Boshlash</Link>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 text-center sm:pt-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="chip bg-white text-brand-700 shadow-sm">✨ Sun'iy intellekt bilan IELTS tayyorgarligi</span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
            IELTS balingizni <span className="bg-gradient-to-r from-brand-500 to-rose-500 bg-clip-text text-transparent">aqlli reja</span> bilan oshiring
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-500">{config.app_name} — mock testlar, AI writing va speaking baholash, shaxsiy o'quv reja va ovozli AI tutor bitta platformada.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn-primary px-6 py-3 text-base">Bepul boshlash <ArrowRight className="size-4" /></Link>
            <Link to="/login" className="btn-outline px-6 py-3 text-base">Hisobim bor</Link>
          </div>
        </motion.div>
        <div className="mt-16 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} className="card p-6" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600"><f.icon className="size-5" /></span>
              <h3 className="mt-4 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-ink-500">{f.text}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-12 text-xs text-ink-300">AI ballari taxminiy bo'lib, rasmiy IELTS natijasi hisoblanmaydi. IELTS — British Council, IDP va Cambridge University Press & Assessment savdo belgisi; ushbu platforma ular bilan bog'liq emas.</p>
      </section>
    </div>
  );
}
