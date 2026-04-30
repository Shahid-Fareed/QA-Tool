import React from "react";
import { notFound } from "next/navigation";
import { DashboardTableView } from "@/components/dashboard/DashboardTableView";
import { ColumnDef } from "@/lib/types";
import { apiFetch, getLocalSession } from "@/lib/api-server";
import { hasPermission } from "@/lib/rbac";

function isValidObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export default async function TestCasesPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    page?: string;
    limit?: string;
    module?: string;
    priority?: string;
    status?: string;
  }>;
}) {
  const { projectId } = await params;
  const {
    page: pageStr,
    limit: limitStr,
    module: activeModule,
    priority: activePriority,
    status: activeStatus,
  } = await searchParams;

  if (!isValidObjectId(projectId)) notFound();

  const page = parseInt(pageStr || "1", 10);
  const limit = parseInt(limitStr || "25", 10);
  const session = await getLocalSession();

  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (activeModule) qs.set("module", activeModule);
  if (activePriority) qs.set("priority", activePriority);
  if (activeStatus) qs.set("status", activeStatus);

  const [dataRes, projectRes, useCasesRes] = await Promise.all([
    apiFetch(`/api/projects/${projectId}/data/test-cases?${qs}`),
    apiFetch("/api/projects"),
    apiFetch(`/api/projects/${projectId}/use-cases`),
  ]);

  if (!dataRes.ok) notFound();

  const { data: testCases, totalPages, serverStats } = await dataRes.json();
  const { projects } = await projectRes.json();
  const project = projects?.find((p: any) => p.id === projectId);
  const projectName = project?.projectName ?? "Project";

  const useCases = useCasesRes.ok ? await useCasesRes.json() : [];

  const columns: ColumnDef[] = [
    { key: "customId", label: "ID", type: "mono" },
    { key: "moduleId", label: "Module", type: "text" },
    { key: "title", label: "Title", type: "text" },
    { key: "description", label: "Description", type: "text" },
    { key: "linkedUseCase", label: "Linked UC", type: "badge" },
    { key: "priority", label: "Priority", type: "priority" },
    { key: "status", label: "Status", type: "status" },
    { key: "createdAt", label: "Created Date", type: "date" },
  ];

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 py-10">
      <DashboardTableView
        title="Test Cases"
        projectId={projectId}
        data={testCases.map((tc: any) => ({ ...tc, projectName }))}
        linkedData={useCases}
        currentUser={session || undefined}
        columns={columns}
        newItemLabel="Add Test Case"
        moduleIcon="test"
        itemType="test-cases"
        projectBackHref={`/projects/${projectId}`}
        canAdd={hasPermission(
          session?.role as any,
          "write:test_cases",
          session?.customPermissions,
        )}
        canEdit={hasPermission(
          session?.role as any,
          "edit:test_cases",
          session?.customPermissions,
        )}
        canDelete={hasPermission(
          session?.role as any,
          "delete:test_cases",
          session?.customPermissions,
        )}
        currentPage={page}
        totalPages={totalPages}
        serverStats={serverStats}
      />
    </div>
  );
}
