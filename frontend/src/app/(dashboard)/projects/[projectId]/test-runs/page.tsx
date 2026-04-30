import React from "react";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/app/login/actions";
import { hasPermission } from "@/lib/rbac";
import TestRunsClient from "./TestRunsClient";

function isValidObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export default async function TestRunsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!isValidObjectId(projectId)) notFound();

  const session = await getSession();
  if (!session) redirect("/login");

  if (
    !hasPermission(session.role, "read:test_runs", session.customPermissions)
  ) {
    notFound();
  }

  const canWrite = hasPermission(
    session.role,
    "write:test_runs",
    session.customPermissions,
  );
  const canEdit = hasPermission(
    session.role,
    "edit:test_runs",
    session.customPermissions,
  );
  const canDelete = hasPermission(
    session.role,
    "delete:test_runs",
    session.customPermissions,
  );

  return (
    <TestRunsClient
      projectId={projectId}
      canWrite={canWrite}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
