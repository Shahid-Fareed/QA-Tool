// Server Component – reads session from cookie for RBAC, renders within (dashboard) layout
import React from "react";
import { QADataDisplayWrapper } from "@/components/dashboard/QADataDisplayWrapper";
import { getSession } from "@/app/login/actions";
import { type Role, hasPermission } from "@/lib/rbac";

export default async function Home() {
  const session = await getSession();
  const role = (session?.role ?? "employee") as Role;
  const userName = session?.name ?? "Guest";
  const userId = session?.id ?? "guest";

  const canWrite = session
    ? hasPermission(
        role,
        ["write:generate", "write:projects"],
        session.customPermissions,
      )
    : false;

  const canViewAssistant = session
    ? hasPermission(
        role,
        ["write:generate", "write:projects", "read:qa_assistant"],
        session.customPermissions,
      )
    : false;

  return (
    <div className="w-full animate-fade-in-up overflow-x-hidden">
      {/* Core Interface Area */}
      {canViewAssistant && (
        <div className="w-full relative">
          <QADataDisplayWrapper
            userName={userName}
            canWrite={canWrite}
            userId={userId}
          />
        </div>
      )}
    </div>
  );
}
