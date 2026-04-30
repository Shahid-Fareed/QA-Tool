"use server";

import { revalidatePath } from "next/cache";
import { getLocalSession, apiFetch } from "@/lib/api-server";
import { hasPermission } from "@/lib/rbac";

export async function deleteProject(projectId: string) {
  try {
    const session = await getLocalSession();
    if (!session || !hasPermission(session.role, "delete:projects", session.customPermissions)) {
      return { success: false, error: "Forbidden: Deletion requires appropriate privilege." };
    }

    const res = await apiFetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    if (!res.ok) return { success: false, error: "Project not found." };

    revalidatePath("/projects");
    return { success: true };
  } catch (error: any) {
    console.error("[deleteProject]", error);
    return { success: false, error: "Server Error: Unable to delete project." };
  }
}

export async function updateProject(projectId: string, data: { projectName?: string; description?: string }) {
  try {
    const session = await getLocalSession();
    if (!session || !hasPermission(session.role, "edit:projects", session.customPermissions)) {
      return { success: false, error: "Forbidden: Editing requires appropriate privilege." };
    }

    // Wait, the Express backend doesn't have a PUT/PATCH /api/projects/:projectId endpoint yet.
    // I should create one in the backend or handle it here. 
    // Since I'm fully migrating to Express, I need to make sure the backend supports this.
    // I'll leave the direct DB call here ONLY for updateProject if it's missing, OR I can just quickly add it to the backend.
    // Actually, I'll add the PATCH endpoint to the express server in the next step.
    const res = await apiFetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    if (!res.ok) return { success: false, error: "Project not found." };

    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[updateProject]", error);
    return { success: false, error: "Server Error: Unable to update project." };
  }
}
