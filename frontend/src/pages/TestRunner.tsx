import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import TestRunnerCore from "../components/TestRunnerCore";

export default function TestRunner() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const mode = params.get("mode") === "exam" ? "exam" : "practice";
  return <TestRunnerCore testId={Number(id)} mode={mode} onDone={(aid) => nav(`/results/${aid}`, { replace: true })} onExit={() => nav(`/tests/${id}`)} />;
}
