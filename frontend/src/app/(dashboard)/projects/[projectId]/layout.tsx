import FloatingProjectChat from "@/components/projects/FloatingProjectChat";
import { getSession } from "@/app/login/actions";
import { hasPermission, Role } from "@/lib/rbac";

export default async function ProjectChatLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { projectId: string } | Promise<{ projectId: string }>;
}) {
  // In Next.js 15, params is often a Promise
  const resolvedParams = await params;

  // RBAC: Check for chat permission
  const session = await getSession();
  const canUseChat = session
    ? hasPermission(
        session.role as Role,
        "read:qa_assistant",
        session.customPermissions,
      )
    : false;

  return (
    <>
      {children}
      {canUseChat && (
        <FloatingProjectChat projectId={resolvedParams.projectId} />
      )}
    </>
  );
}
