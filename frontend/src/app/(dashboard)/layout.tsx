import React from "react";
import { getSession } from "@/app/login/actions";
import { DashboardLayoutClient } from "@/components/layout/DashboardLayoutClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    return null; // Middleware will handle the redirect
  }

  const { name: userName, role, customPermissions = [] } = session;

  return (
    <>
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-surface">
        <div className="absolute top-[-10%] left-[5%] w-[35%] h-[35%] bg-brand/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] bg-brand/5 blur-[120px] rounded-full" />
      </div>

      <DashboardLayoutClient
        userName={userName}
        role={role}
        customPermissions={customPermissions}
      >
        {children}
      </DashboardLayoutClient>
    </>
  );
}
