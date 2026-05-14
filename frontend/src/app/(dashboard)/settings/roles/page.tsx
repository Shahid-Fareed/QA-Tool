import { redirect } from "next/navigation";
import { getLocalSession, apiFetch } from "@/lib/api-server";
import { Role, hasPermission } from "@/lib/rbac";
import RoleTemplateManager from "./RoleTemplateManager";
import type { RoleTemplate } from "./role-actions";

export default async function AdminRolesPage() {
  const session = await getLocalSession();

  const canAccess = session
    ? hasPermission(
        session.role as Role,
        "write:users",
        session.customPermissions,
      )
    : false;

  if (!canAccess) {
    redirect("/");
  }

  const res = await apiFetch("/api/role-templates");
  const templates: RoleTemplate[] = res.ok ? await res.json() : [];

  const canEdit = session
    ? hasPermission(
        session.role as Role,
        "edit:users",
        session.customPermissions,
      )
    : false;

  const canDelete = session
    ? hasPermission(
        session.role as Role,
        "delete:users",
        session.customPermissions,
      )
    : false;

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 py-10">
      <RoleTemplateManager
        initialTemplates={templates}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
