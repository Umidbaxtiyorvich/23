import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import { PageLoader } from "./components/ui";
import { useAuth } from "./lib/auth";
import { ForgotPassword, Login, Register, ResetPassword, VerifyEmail } from "./pages/Auth";
import Landing from "./pages/Landing";

const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const StudyPlan = lazy(() => import("./pages/StudyPlan"));
const Tutor = lazy(() => import("./pages/Tutor"));
const Tests = lazy(() => import("./pages/Tests"));
const TestRunner = lazy(() => import("./pages/TestRunner"));
const Results = lazy(() => import("./pages/Results"));
const Writing = lazy(() => import("./pages/Writing"));
const WritingDetail = lazy(() => import("./pages/WritingDetail"));
const Speaking = lazy(() => import("./pages/Speaking"));
const SpeakingDetail = lazy(() => import("./pages/SpeakingDetail"));
const Exam = lazy(() => import("./pages/Exam"));
const Vocabulary = lazy(() => import("./pages/Vocabulary"));
const Games = lazy(() => import("./pages/games/Games"));
const GamePlay = lazy(() => import("./pages/games/GamePlay"));
const Statistics = lazy(() => import("./pages/Statistics"));
const Profile = lazy(() => import("./pages/Profile"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Admin = lazy(() => import("./pages/admin/Admin"));

function Protected({ children, admin, allowNotOnboarded }: { children: ReactNode; admin?: boolean; allowNotOnboarded?: boolean }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (!allowNotOnboarded && !user.profile?.onboarded && !user.is_admin) return <Navigate to="/onboarding" replace />;
  if (admin && !user.is_admin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/onboarding" element={<Protected allowNotOnboarded><Onboarding /></Protected>} />
        {/* To'liq ekranli imtihon sahifalari (layoutsiz) */}
        <Route path="/tests/:id/run" element={<Protected><TestRunner /></Protected>} />
        <Route path="/exam/run" element={<Protected><Exam /></Protected>} />
        <Route element={<Protected><Layout /></Protected>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/plan" element={<StudyPlan />} />
          <Route path="/tutor" element={<Tutor />} />
          <Route path="/tests" element={<Tests />} />
          <Route path="/tests/:id" element={<Tests />} />
          <Route path="/results/:id" element={<Results />} />
          <Route path="/writing" element={<Writing />} />
          <Route path="/writing/:id" element={<WritingDetail />} />
          <Route path="/speaking" element={<Speaking />} />
          <Route path="/speaking/:id" element={<SpeakingDetail />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/vocabulary" element={<Vocabulary />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/:game" element={<GamePlay />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/admin" element={<Protected admin><Admin /></Protected>} />
        </Route>
        <Route path="*" element={<div className="grid min-h-dvh place-items-center text-center"><div><div className="text-6xl font-extrabold text-brand-500">404</div><p className="mt-2 text-ink-500">Sahifa topilmadi</p><a href="/" className="btn-primary mt-4">Bosh sahifa</a></div></div>} />
      </Routes>
    </Suspense>
  );
}
