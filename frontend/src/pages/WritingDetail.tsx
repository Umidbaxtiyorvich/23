import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { WritingFeedbackView } from "../components/Feedback";
import { Card, ErrorBox, PageHeader, PageLoader } from "../components/ui";
import { useApi } from "../lib/hooks";
import type { WritingFeedback } from "../lib/types";

export default function WritingDetail() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi<{ task_type: string; prompt: string; essay: string; word_count: number; created_at: string; feedback: WritingFeedback }>(`/api/writing/submissions/${id}`);
  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorBox error={error || "Topilmadi"} onRetry={reload} />;
  return (
    <div className="space-y-4">
      <Link to="/writing" className="btn-ghost -ml-3"><ArrowLeft className="size-4" /> Writing</Link>
      <PageHeader title={`Writing ${data.task_type.toUpperCase()}`} subtitle={new Date(data.created_at).toLocaleString("uz-UZ")} />
      <Card><p className="whitespace-pre-line text-sm leading-6 text-ink-700">{data.prompt}</p></Card>
      <WritingFeedbackView fb={{ ...data.feedback, word_count: data.word_count }} essay={data.essay} />
    </div>
  );
}
