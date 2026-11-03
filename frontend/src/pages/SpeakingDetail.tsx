import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { SpeakingFeedbackView } from "../components/Feedback";
import { Card, ErrorBox, PageHeader, PageLoader } from "../components/ui";
import { useApi } from "../lib/hooks";
import type { SpeakingFeedback } from "../lib/types";

export default function SpeakingDetail() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi<{ part: string; created_at: string; transcript: { question: string; answer: string }[]; feedback: SpeakingFeedback }>(`/api/speaking/sessions/${id}`);
  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorBox error={error || "Topilmadi"} onRetry={reload} />;
  return (
    <div className="space-y-4">
      <Link to="/speaking" className="btn-ghost -ml-3"><ArrowLeft className="size-4" /> Speaking</Link>
      <PageHeader title={`Speaking sessiya · Part ${data.part}`} subtitle={new Date(data.created_at).toLocaleString("uz-UZ")} />
      {data.feedback?.criteria && <SpeakingFeedbackView fb={data.feedback} />}
      <Card><h3 className="mb-2 font-bold">Transkript</h3><ul className="space-y-3 text-sm">{data.transcript.map((t, i) => <li key={i}><b>{t.question}</b><p className="text-ink-700">{t.answer}</p></li>)}</ul></Card>
    </div>
  );
}
