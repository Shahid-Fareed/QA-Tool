"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  ArrowLeft,
  Loader2,
  Save,
  User,
  Mail,
  Sparkles,
  ShieldCheck,
  Fingerprint,
  Check,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import {
  Role,
  Permission,
  Resource,
  Action,
  getRoleLabel,
  ROLE_PERMISSIONS,
  hasPermission,
} from "@/lib/rbac";
import { updateUserRoleAndPermissions, getUserById } from "../../admin-actions";

const ROLES: Array<Role> = [
  "company_admin",
  "team_lead",
  "manager",
  "hr",
  "employee",
];
const RESOURCES: { id: Resource; label: string }[] = [
  { id: "projects", label: "Projects Management" },
  { id: "use_cases", label: "Use Cases & Scenarios" },
  { id: "test_cases", label: "Test Case Directory" },
  { id: "bugs", label: "Bug Tracking System" },
  { id: "users", label: "User Administration" },
  { id: "generate", label: "AI Test Generation" },
  { id: "test_runs", label: "Test Executions" },
  { id: "visual_report", label: "UI Testing" },
  { id: "code_evaluation", label: "Code Evaluation" },
];
const ACTIONS: { id: Action; label: string }[] = [
  { id: "read", label: "Read" },
  { id: "write", label: "Write" },
  { id: "edit", label: "Edit" },
  { id: "delete", label: "Delete" },
];

export default function PermissionPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    role: Role;
    customPermissions: Permission[];
  } | null>(null);

  useEffect(() => {
    async function loadUser() {
      const result = await getUserById(userId);
      if (result.success) {
        setUserData({
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          customPermissions: result.user.customPermissions || [],
        });
      } else {
        setError(result.error || "Failed to load user");
      }
      setIsLoading(false);
    }
    loadUser();
  }, [userId]);

  const togglePermission = (perm: Permission, currentPerms: Permission[]) => {
    if (!userData) return;
    setUserData((current) => {
      if (!current) return null;
      const isRemoving = currentPerms.includes(perm);
      let updated = isRemoving
        ? currentPerms.filter((p) => p !== perm)
        : [...currentPerms, perm];

      if (!isRemoving) {
        const [action, resource] = perm.split(":") as [Action, Resource];
        if (action !== "read") {
          const readPerm: Permission = `read:${resource}`;
          if (!updated.includes(readPerm)) updated.push(readPerm);
        }
      }
      return { ...current, customPermissions: updated };
    });
  };

  const handleSave = () => {
    if (!userData) return;
    startTransition(async () => {
      const result = await updateUserRoleAndPermissions(
        userId,
        userData.role,
        userData.customPermissions,
      );
      if (result.success) {
        router.push("/admin/users");
        router.refresh();
      } else {
        setError(result.error || "Failed to save changes");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-foreground/40 font-semibold uppercase tracking-widest text-xs">
          User Not Found
        </p>
        <button
          onClick={() => router.back()}
          className="text-brand text-xs font-semibold hover:underline"
        >
          Return to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-8 space-y-8 animate-in fade-in duration-700">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="group flex items-center gap-3 px-6 py-2.5 rounded-full bg-surface border border-border hover:border-brand/30 transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-foreground/40 group-hover:text-brand transition-colors" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/40 group-hover:text-foreground transition-colors">
            Back
          </span>
        </button>

        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-3 px-10 py-2.5 rounded-full bg-brand text-white font-semibold text-xs uppercase tracking-widest shadow-xl shadow-brand/20 hover:bg-brand-muted transition-all active:scale-95 disabled:opacity-30"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isPending ? "Updating..." : "Save Permission"}</span>
        </button>
      </div>

      <div className="w-full space-y-8">
        {/* Permission Grid */}
        <div className="bg-surface border border-border/50 rounded-[32px] overflow-hidden shadow-2xl shadow-brand/5">
          {/* Grid Header */}
          <div className="px-10 py-8 border-b border-border/50 bg-brand/3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-xl font-semibold text-foreground/80 tracking-tighter uppercase">
                  Permission
                </span>
                <span className="text-sm font-semibold text-foreground/30 uppercase tracking-widest">
                  — {userData.name}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-brand/1 border-b border-border/10">
                  <th className="px-10 py-6 text-[10px] font-semibold text-foreground/20 uppercase tracking-[0.2em]">
                    Resource
                  </th>
                  {ACTIONS.map((action) => (
                    <th
                      key={action.id}
                      className="px-6 py-6 text-[10px] font-semibold text-foreground/50 uppercase tracking-[0.2em] text-center"
                    >
                      {action.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {RESOURCES.map((resource) => (
                  <tr
                    key={resource.id}
                    className="group hover:bg-brand/2 transition-all duration-300"
                  >
                    <td className="px-10 py-7">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-foreground/80 group-hover:text-brand transition-colors tracking-tight">
                          {resource.label}
                        </span>
                        <span className="text-[9px] text-foreground/20 font-mono font-semibold uppercase tracking-widest">
                          {resource.id}
                        </span>
                      </div>
                    </td>
                    {ACTIONS.map((action) => {
                      const perm: Permission = `${action.id}:${resource.id}`;
                      const isSelected = hasPermission(
                        userData.role,
                        perm,
                        userData.customPermissions,
                      );
                      return (
                        <td key={action.id} className="px-6 py-7 text-center">
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                let currentPerms = userData.customPermissions;
                                // If no custom perms exist yet, start with the defaults
                                if (currentPerms.length === 0) {
                                  currentPerms =
                                    ROLE_PERMISSIONS[userData.role] || [];
                                }
                                togglePermission(perm, currentPerms);
                              }}
                              className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-300 ${
                                isSelected
                                  ? "bg-brand border-brand text-white shadow-lg shadow-brand/20 scale-110"
                                  : "bg-brand/5 border-border text-transparent hover:border-brand/40 hover:bg-brand/10"
                              }`}
                            >
                              <Check
                                className={`w-3.5 h-3.5 transition-transform duration-300 ${isSelected ? "scale-100" : "scale-0"}`}
                              />
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
