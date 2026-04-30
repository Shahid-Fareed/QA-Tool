import { redirect } from "next/navigation";
import { getLocalSession, apiFetch } from "@/lib/api-server";
import UserDirectory from "./UserDirectory";
import { Role, hasPermission } from "@/lib/rbac";

export default async function AdminUsersPage() {
  const session = await getLocalSession();

  const canReadUsers = session
    ? hasPermission(
        session.role as Role,
        "read:users",
        session.customPermissions,
      )
    : false;

  if (!canReadUsers) {
    redirect("/");
  }

  const res = await apiFetch("/api/users");
  const users = res.ok ? await res.json() : [];

  const canEditUsers = session
    ? hasPermission(
        session.role as Role,
        "edit:users",
        session.customPermissions,
      )
    : false;
  const canWriteUsers = session
    ? hasPermission(
        session.role as Role,
        "write:users",
        session.customPermissions,
      )
    : false;
  const canDeleteUsers = session
    ? hasPermission(
        session.role as Role,
        "delete:users",
        session.customPermissions,
      )
    : false;

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 py-10">
      <UserDirectory
        users={users}
        canEdit={canEditUsers}
        canWrite={canWriteUsers}
        canDelete={canDeleteUsers}
      />
    </div>
  );
}
