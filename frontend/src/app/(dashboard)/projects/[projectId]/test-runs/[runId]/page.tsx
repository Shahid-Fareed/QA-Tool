import React from "react";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/app/login/actions";
import { hasPermission } from "@/lib/rbac";
import ExecutionStepperClient from "./ExecutionStepperClient";

function isValidObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export default async function ExecutionPage({
  params,
}: {
  params: Promise<{ projectId: string; runId: string }>;
}) {
  const { projectId, runId } = await params;
  if (!isValidObjectId(projectId) || !isValidObjectId(runId)) notFound();

  const session = await getSession();
  if (!session) redirect("/login");

  if (
    !hasPermission(session.role, "read:test_runs", session.customPermissions)
  ) {
    notFound();
  }

  const canEdit = hasPermission(
    session.role,
    "edit:test_runs",
    session.customPermissions,
  );

  return (
    <ExecutionStepperClient
      runId={runId}
      projectId={projectId}
      canEdit={canEdit}
    />
  );
}
