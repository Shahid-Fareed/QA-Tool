import React from "react";
import { getLocalSession, apiFetch } from "@/lib/api-server";
import { hasPermission } from "@/lib/rbac";
import ProjectListClient from "@/components/projects/ProjectListClient";

export const metadata = {
  title: "Projects — QA Tool",
  description: "Browse all generated QA projects.",
};

export default async function ProjectsPage() {
  const session = await getLocalSession();

  const res = await apiFetch("/api/projects");
  const rawProjects = res.ok ? (await res.json()).projects : [];

  const projects = rawProjects.map((p: any) => ({
    id: p.id,
    projectName: p.projectName ?? "Untitled Project",
    description: p.description ?? "",
    createdAt: p.createdAt,
    hasUseCases: true,
    hasTestCases: true,
  }));

  const permissions = {
    canWrite: session
      ? hasPermission(session.role, "write:projects", session.customPermissions)
      : false,
    canEdit: session
      ? hasPermission(session.role, "edit:projects", session.customPermissions)
      : false,
    canDelete: session
      ? hasPermission(
          session.role,
          "delete:projects",
          session.customPermissions,
        )
      : false,
    canReadUseCases: session
      ? hasPermission(session.role, "read:use_cases", session.customPermissions)
      : false,
    canReadTestCases: session
      ? hasPermission(
          session.role,
          "read:test_cases",
          session.customPermissions,
        )
      : false,
    canReadBugs: session
      ? hasPermission(session.role, "read:bugs", session.customPermissions)
      : false,
  };

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 py-10 animate-fade-in-up">
      <ProjectListClient
        initialProjects={projects}
        session={session}
        permissions={permissions}
      />
    </div>
  );
}
