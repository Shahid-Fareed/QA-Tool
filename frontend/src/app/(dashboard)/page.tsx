// Server Component – reads session from cookie for RBAC, renders within (dashboard) layout
import React from "react";
import { QADataDisplayWrapper } from "@/components/dashboard/QADataDisplayWrapper";
import { getSession } from "@/app/login/actions";
import { type Role, hasPermission } from "@/lib/rbac";
import {
  Zap,
  ShieldCheck,
  Sparkles,
  FileCode,
  CheckCircle2,
} from "lucide-react";

export default async function Home() {
  const session = await getSession();
  const role = (session?.role ?? "employee") as Role;
  const userName = session?.name ?? "Guest";

  const canWriteProjects = session
    ? hasPermission(
        role,
        ["write:generate", "write:projects"],
        session.customPermissions,
      )
    : false;

  return (
    <div className="w-full animate-fade-in-up overflow-x-hidden">
      {/* Core Interface Area */}
      {canWriteProjects && (
        <div className="w-full relative">
          <QADataDisplayWrapper userName={userName} />
        </div>
      )}
    </div>
  );
}
