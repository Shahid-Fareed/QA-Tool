import CodeEvaluationClient from "./CodeEvaluationClient";

export default async function CodeEvaluationPage({
  params,
}: {
  params: { projectId: string } | Promise<{ projectId: string }>;
}) {
  const resolvedParams = await params;
  return <CodeEvaluationClient projectId={resolvedParams.projectId} />;
}
