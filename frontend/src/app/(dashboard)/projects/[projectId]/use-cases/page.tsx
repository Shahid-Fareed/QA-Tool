import React from "react";
import { notFound } from "next/navigation";
import { DashboardTableView } from "@/components/dashboard/DashboardTableView";
import { ColumnDef } from "@/lib/types";
import { apiFetch, getLocalSession } from "@/lib/api-server";

function isValidObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export default async function UseCasesPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    page?: string;
    limit?: string;
    module?: string;
    priority?: string;
  }>;
}) {
  const { projectId } = await params;
  const {
    page: pageStr,
    limit: limitStr,
    module: activeModule,
    priority: activePriority,
  } = await searchParams;

  if (!isValidObjectId(projectId)) notFound();

  const page = parseInt(pageStr || "1", 10);
  const limit = parseInt(limitStr || "25", 10);
  const session = await getLocalSession();

  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (activeModule) qs.set("module", activeModule);
  if (activePriority) qs.set("priority", activePriority);

  const [dataRes, projectRes] = await Promise.all([
    apiFetch(`/api/projects/${projectId}/data/use-cases?${qs}`),
    apiFetch("/api/projects"),
  ]);

  if (!dataRes.ok) notFound();

  const { data: useCases, totalPages, serverStats } = await dataRes.json();
  const { projects } = await projectRes.json();
  const project = projects?.find((p: any) => p.id === projectId);
  const projectName = project?.projectName ?? "Project";

  const columns: ColumnDef[] = [
    { key: "customId", label: "ID", type: "mono" },
    { key: "moduleId", label: "Module", type: "text" },
    { key: "title", label: "Title", type: "text" },
    { key: "createdAt", label: "Created Date", type: "date" },
  ];

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 py-10">
      <DashboardTableView
        title="Use Cases"
        projectId={projectId}
        data={useCases.map((uc: any) => ({ ...uc, projectName }))}
        currentUser={session || undefined}
        columns={columns}
        newItemLabel="Create New Use Case"
        moduleIcon="layers"
        itemType="use-cases"
        projectBackHref={`/projects/${projectId}`}
        canAdd={
          session?.role === "company_admin" ||
          session?.customPermissions?.includes("edit" as any)
        }
        canEdit={
          session?.role === "company_admin" ||
          session?.customPermissions?.includes("edit" as any)
        }
        canDelete={
          session?.role === "company_admin" ||
          session?.role === "manager" ||
          session?.customPermissions?.includes("delete" as any)
        }
        currentPage={page}
        totalPages={totalPages}
        serverStats={serverStats}
      />
    </div>
  );
}
