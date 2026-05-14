"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  Mail,
  Search,
  ChevronDown,
  Loader2,
  UserPlus,
  Trash2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import {
  getRoleLabel,
  Permission,
  Resource,
  Action,
  Role,
  ROLE_PERMISSIONS,
} from "@/lib/rbac";
import {
  updateUserRoleAndPermissions,
  deleteUser,
  createUser,
} from "./admin-actions";
import {
  Settings2,
  Check,
  X,
  Copy,
  Sparkles,
  User,
  ShieldCheck,
} from "lucide-react";
import { apiClientFetch } from "@/lib/api-client";

interface RoleTemplate {
  _id: string;
  name: string;
  permissions: string[];
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  customPermissions: Permission[];
  appliedTemplate?: { id: string | null; name: string | null } | null;
  employeeId?: string;
  id?: string;
}

const isValidEmail = (email: string) => {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
};

interface UserDirectoryProps {
  users: AdminUser[];
  canEdit: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

const ROLES: Array<"all" | Role> = [
  "all",
  "company_admin",
  "team_lead",
  "manager",
  "hr",
  "employee",
];

export default function UserDirectory({
  users,
  canEdit,
  canWrite,
  canDelete,
}: UserDirectoryProps) {
  const [userList, setUserList] = useState<AdminUser[]>(users);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    employeeId: "",
    role: "employee" as Role,
    appliedTemplateId: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null); // userId
  const [templateMenuOpen, setTemplateMenuOpen] = useState<string | null>(null); // userId
  const templateMenuRef = useRef<HTMLDivElement>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Fetch templates for Apply Template feature
  useEffect(() => {
    apiClientFetch("/api/role-templates")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Close template menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        templateMenuRef.current &&
        !templateMenuRef.current.contains(e.target as Node)
      ) {
        setTemplateMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredUsers = useMemo(() => {
    return userList.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchable = [
        user.name,
        user.email,
        getRoleLabel(user.role),
        ...user.customPermissions,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [userList, normalizedQuery, roleFilter]);

  const totalUsers = userList.length;
  const adminCount = userList.filter(
    (user) => user.role === "company_admin",
  ).length;

  const handleUpdateSuccess = (
    userId: string,
    role: Role,
    permissions: Permission[],
  ) => {
    setUserList((current) =>
      current.map((u) =>
        u._id === userId ? { ...u, role, customPermissions: permissions } : u,
      ),
    );
  };

  const handleToggleInlinePermission = async (
    user: AdminUser,
    p: Permission,
  ) => {
    if (!canEdit) return;

    const userId = user._id;
    setIsUpdating(`${userId}-${p}`);

    try {
      const currentPerms =
        user.customPermissions && user.customPermissions.length > 0
          ? user.customPermissions
          : ROLE_PERMISSIONS[user.role] || [];
      const isRemoving = currentPerms.includes(p);
      let updated = isRemoving
        ? currentPerms.filter((item) => item !== p)
        : [...currentPerms, p];

      // Dependency Logic: If adding (write/edit/delete), ensure 'read' is also added
      if (!isRemoving) {
        const [action, resource] = p.split(":") as [Action, Resource];
        if (action !== "read") {
          const readPerm: Permission = `read:${resource}`;
          if (!updated.includes(readPerm)) {
            updated.push(readPerm);
          }
        }
      }

      const result = await updateUserRoleAndPermissions(
        userId,
        user.role,
        updated,
      );
      if (result.success) {
        handleUpdateSuccess(userId, user.role, updated);
      } else {
        alert("Error: " + result.error);
      }
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const result = await deleteUser(userToDelete._id);
      if (result.success) {
        setUserList((current) =>
          current.filter((u) => u._id !== userToDelete._id),
        );
        setUserToDelete(null);
      } else {
        alert("Error: " + result.error);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInlineCreate = async () => {
    if (!newUser.name || !newUser.email || !isValidEmail(newUser.email)) return;
    setIsSaving(true);
    try {
      let customPermissions: Permission[] = [];
      let appliedTemplate: { id: string; name: string } | null = null;

      if (newUser.appliedTemplateId) {
        const t = templates.find((x) => x._id === newUser.appliedTemplateId);
        if (t) {
          customPermissions = t.permissions as Permission[];
          appliedTemplate = { id: t._id, name: t.name };
        }
      }

      const result = await createUser({
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        employeeId: newUser.employeeId,
        customPermissions,
        appliedTemplate,
      });
      if (result.success) {
        setCreatedPassword(result.password || "");
        // We'll add the new user to the list locally
        const addedUser: AdminUser = {
          _id: Math.random().toString(36).substr(2, 9),
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          employeeId: newUser.employeeId,
          customPermissions,
          appliedTemplate,
        };
        setUserList((prev) => [addedUser, ...prev]);
        setIsAdding(false);
        setNewUser({
          name: "",
          email: "",
          employeeId: "",
          role: "employee" as Role,
          appliedTemplateId: "",
        });
      } else {
        alert("Error: " + result.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyTemplate = async (
    user: AdminUser,
    template: RoleTemplate,
  ) => {
    if (!canEdit) return;
    setApplyingTemplate(user._id);
    setTemplateMenuOpen(null);
    try {
      const result = await updateUserRoleAndPermissions(
        user._id,
        user.role,
        template.permissions as Permission[],
        { id: template._id, name: template.name },
      );
      if (result.success) {
        setUserList((current) =>
          current.map((u) =>
            u._id === user._id
              ? {
                  ...u,
                  customPermissions: template.permissions as Permission[],
                  appliedTemplate: { id: template._id, name: template.name },
                }
              : u,
          ),
        );
      } else {
        alert("Error: " + result.error);
      }
    } finally {
      setApplyingTemplate(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6 animate-fade-in-up w-full max-w-full">
        {/* ... existing content ... */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            User Directory
          </h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            {
              label: "Total Users",
              count: totalUsers,
              color: "text-blue-400",
              bg: "bg-blue-500/10",
            },
            {
              label: "Admins",
              count: adminCount,
              color: "text-brand",
              bg: "bg-brand/10",
            },
            {
              label: "Managers",
              count: userList.filter((u) => u.role === "manager").length,
              color: "text-yellow-400",
              bg: "bg-yellow-500/10",
            },
            {
              label: "Team Leads",
              count: userList.filter((u) => u.role === "team_lead").length,
              color: "text-purple-400",
              bg: "bg-purple-500/10",
            },
            {
              label: "HR Staff",
              count: userList.filter((u) => u.role === "hr").length,
              color: "text-rose-400",
              bg: "bg-rose-500/10",
            },
            {
              label: "Employees",
              count: userList.filter((u) => u.role === "employee").length,
              color: "text-green-400",
              bg: "bg-green-500/10",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="spatial-card rounded-xl p-4 flex items-center justify-between"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bg}`}
              >
                <span className={`font-semibold ${stat.color}`}>#</span>
              </div>
              <div className="text-left w-full pl-3 hover:pl-4 transition-all duration-300">
                <p className="text-2xl font-semibold text-foreground leading-none">
                  {stat.count}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-foreground/70 mt-1">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Bar: Filter, Search, and Add User */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
          {/* Filter Section */}
          <div className="flex items-center gap-3 px-1">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-foreground/40">
              Filter:
            </div>
            <div className="relative min-w-[140px]">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as "all" | Role)}
                className="w-full appearance-none bg-surface border border-border rounded-lg py-1.5 pl-3 pr-8 text-xs outline-none focus:border-brand/30 transition-all text-foreground font-semibold"
              >
                {ROLES.map((roleOpt) => (
                  <option
                    key={roleOpt}
                    value={roleOpt}
                    className="bg-surface text-foreground"
                  >
                    {roleOpt === "all" ? "All roles" : getRoleLabel(roleOpt)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40" />
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30 group-focus-within:text-brand transition-colors" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand/40 transition-all text-foreground placeholder-foreground/30 shadow-sm"
            />
          </div>

          {/* Spacer to push Add User button to the right */}
          <div className="flex-1" />

          {/* Add User Button */}
          {canWrite && (
            <div className="shrink-0">
              <button
                onClick={() => {
                  if (isAdding) {
                    setNewUser({
                      name: "",
                      email: "",
                      employeeId: "",
                      role: "employee" as Role,
                      appliedTemplateId: "",
                    });
                  }
                  setIsAdding(!isAdding);
                }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[11px] font-semibold uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
                  isAdding
                    ? "bg-surface border border-border text-foreground/40 hover:text-foreground"
                    : "bg-brand text-white shadow-brand/20 hover:bg-brand-muted hover:scale-105"
                }`}
              >
                {isAdding ? (
                  <X className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span>{isAdding ? "Cancel" : "Add User"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Modern Card-List UI */}
        <div className="spatial-card rounded-2xl overflow-hidden border border-border/50 bg-surface/30">
          {/* Header Row */}
          <div className="flex items-center px-8 py-4 bg-brand/3 border-b border-border/50 text-[10px] font-semibold uppercase tracking-widest text-foreground/40">
            <div className="w-24 text-center">ID</div>
            <div className="flex-1 px-4">Name</div>
            <div className="flex-[1.4] px-4">Email</div>
            <div className="flex-1 px-4">Role</div>
            <div className="flex-1 px-4">Permission</div>
            <div className="w-24 text-right">Action</div>
          </div>

          <div className="divide-y divide-border/30">
            {isAdding && (
              <div className="flex items-center px-8 py-6 bg-brand/5 animate-in slide-in-from-top-1 duration-300 border-b border-brand/20">
                {/* ID Input */}
                <div className="w-24 flex justify-center">
                  <input
                    placeholder="EMP-ID"
                    value={newUser.employeeId}
                    onChange={(e) =>
                      setNewUser({ ...newUser, employeeId: e.target.value })
                    }
                    className="w-16 bg-surface border border-border/40 rounded px-2 py-1 text-[9px] font-mono font-semibold text-foreground outline-none focus:border-brand/40 uppercase"
                  />
                </div>

                {/* Name Input */}
                <div className="flex-1 px-4 min-w-0">
                  <input
                    autoFocus
                    placeholder="Full Name"
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                    className="w-full bg-surface border border-border/40 rounded-lg px-3 py-2 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand/40 shadow-sm"
                  />
                </div>

                {/* Email Input */}
                <div className="flex-[1.4] px-4 min-w-0">
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    className={`w-full bg-surface border rounded-lg px-3 py-2 text-xs font-semibold text-foreground outline-none focus:ring-2 shadow-sm transition-all ${
                      newUser.email && !isValidEmail(newUser.email)
                        ? "border-red-500/50 focus:ring-red-500/10 focus:border-red-500"
                        : "border-border/40 focus:ring-brand/10 focus:border-brand/40"
                    }`}
                  />
                </div>

                {/* Role Select */}
                <div className="flex-1 px-4 flex justify-start">
                  {templates.length > 0 ? (
                    <div className="relative w-full max-w-[170px]">
                      <select
                        value={newUser.appliedTemplateId}
                        onChange={(e) =>
                          setNewUser({
                            ...newUser,
                            appliedTemplateId: e.target.value,
                          })
                        }
                        className="w-full appearance-none bg-brand/10 border border-brand/20 rounded-full px-8 py-2 text-[10px] font-semibold uppercase tracking-widest text-brand text-left cursor-pointer outline-none transition-all hover:bg-brand/15"
                      >
                        <option value="" className="bg-surface text-foreground/40">
                          Select Role
                        </option>
                        {templates.map((t) => (
                          <option
                            key={t._id}
                            value={t._id}
                            className="bg-surface text-foreground"
                          >
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-brand/40 pointer-events-none" />
                    </div>
                  ) : (
                    <div className="relative w-full max-w-[150px]">
                      <select
                        value={newUser.role}
                        onChange={(e) =>
                          setNewUser({ ...newUser, role: e.target.value as Role })
                        }
                        className="w-full appearance-none bg-brand/10 border border-brand/20 rounded-full px-8 py-2 text-[10px] font-semibold uppercase tracking-widest text-brand text-left cursor-pointer outline-none"
                      >
                        {ROLES.filter((r) => r !== "all").map((roleOpt) => (
                          <option
                            key={roleOpt}
                            value={roleOpt}
                            className="bg-surface text-foreground"
                          >
                            {getRoleLabel(roleOpt as Role)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-brand/40 pointer-events-none" />
                    </div>
                  )}
                </div>

                {/* Permission Placeholder */}
                <div className="flex-1 px-4 flex justify-start text-[10px] font-semibold text-foreground/20 uppercase">
                  Default Access
                </div>

                {/* Actions */}
                <div className="w-24 flex items-center justify-end gap-2">
                  <button
                    onClick={handleInlineCreate}
                    disabled={
                      isSaving ||
                      !newUser.name ||
                      !newUser.email ||
                      !isValidEmail(newUser.email) ||
                      (templates.length > 0 && !newUser.appliedTemplateId)
                    }
                    className="p-2 rounded-xl bg-brand text-white hover:bg-brand-muted transition-all shadow-lg shadow-brand/20 disabled:opacity-30 active:scale-90"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {filteredUsers.length === 0 && !isAdding ? (
              <div className="px-8 py-20 text-center text-foreground/30 italic font-medium">
                No users match the current filter.
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className="group flex items-center px-8 py-6 hover:bg-brand/2 transition-all duration-300 relative"
                >
                  {/* ID Column */}
                  <div className="w-24 flex justify-center">
                    <span className="px-2 py-0.5 rounded bg-brand/5 border border-brand/10 text-[9px] font-mono font-semibold text-brand/70 uppercase tracking-tighter">
                      {user.employeeId || user.id || "—"}
                    </span>
                  </div>

                  {/* Name Column */}
                  <div className="flex-1 px-4 min-w-0">
                    <span
                      className="text-sm font-semibold text-foreground/90 tracking-tight font-sans truncate block"
                      title={user.name}
                    >
                      {user.name}
                    </span>
                  </div>

                  {/* Email Column */}
                  <div className="flex-[1.4] flex items-center justify-start gap-2 px-4 min-w-0 text-xs text-foreground/60 font-semibold tracking-tight">
                    <Mail className="w-3.5 h-3.5 opacity-40 text-brand shrink-0" />
                    <span className="truncate" title={user.email}>
                      {user.email}
                    </span>
                  </div>

                  {/* Role Column — template dropdown */}
                  <div className="flex-1 px-4 flex justify-start">
                    {canEdit && templates.length > 0 ? (
                      <div className="relative w-full max-w-[170px]">
                        <select
                          value={user.appliedTemplate?.id ?? ""}
                          onChange={async (e) => {
                            const tplId = e.target.value;
                            if (!tplId) return;
                            const tpl = templates.find((t) => t._id === tplId);
                            if (tpl) await handleApplyTemplate(user, tpl);
                          }}
                          disabled={applyingTemplate === user._id}
                          className="w-full appearance-none bg-brand/6 border border-brand/10 rounded-full px-8 py-2 text-[10px] font-semibold uppercase tracking-widest text-brand text-left cursor-pointer hover:bg-brand/10 hover:border-brand/30 transition-all outline-none disabled:opacity-50"
                        >
                          <option
                            value=""
                            className="bg-surface text-foreground/40"
                          >
                            Select Role
                          </option>
                          {templates.map((t) => (
                            <option
                              key={t._id}
                              value={t._id}
                              className="bg-surface text-foreground"
                            >
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          {applyingTemplate === user._id ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-brand/60" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-brand/40" />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="px-6 py-2 rounded-full bg-brand/6 border border-brand/10 text-[10px] font-semibold uppercase tracking-widest text-brand text-center">
                        {user.appliedTemplate?.name ?? getRoleLabel(user.role)}
                      </div>
                    )}
                  </div>

                  {/* Permission Column */}
                  <div className="flex-1 px-4 flex justify-start">
                    <Link
                      href={`/admin/users/${user._id}/permission`}
                      className="text-[10px] font-semibold text-brand hover:text-brand-muted transition-colors flex items-center gap-2 group/link"
                    >
                      View Detailed
                      <ChevronDown className="w-4 h-4 -rotate-90 group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                  </div>

                  {/* Action Column */}
                  <div className="w-24 flex items-center justify-end">
                    {canDelete && (
                      <button
                        onClick={() => setUserToDelete(user)}
                        className="p-2 rounded-xl text-foreground/20 hover:text-red-500 hover:bg-red-500/10 transition-all"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center p-6 backdrop-blur-xl bg-slate-950/40">
          <div className="bg-surface border border-border rounded-3xl p-8 max-w-md w-full animate-fade-in-up shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />

            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 relative">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>

            <h3 className="text-2xl font-semibold mb-2 tracking-tight">
              Delete User?
            </h3>
            <p className="text-foreground/50 text-sm font-medium mb-10 leading-relaxed">
              Are you sure you want to permanently remove{" "}
              <span className="text-foreground font-semibold">
                {userToDelete.name}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-4 rounded-2xl border border-border text-xs font-semibold uppercase tracking-widest hover:bg-brand/5 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 py-4 rounded-2xl bg-red-500 text-white text-xs font-semibold uppercase tracking-widest hover:bg-red-600 shadow-xl shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Delete User"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Password Success Modal */}
      {createdPassword && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center p-6 backdrop-blur-xl bg-slate-950/40 animate-in fade-in duration-300">
          <div className="bg-surface border border-border rounded-[40px] p-10 max-w-md w-full animate-in zoom-in-95 duration-300 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-brand/5 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse" />

            <div className="flex flex-col items-center text-center space-y-8">
              <div className="w-20 h-20 rounded-3xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                <Sparkles className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-semibold text-foreground uppercase tracking-tight">
                  User Activated
                </h3>
                <p className="text-sm text-foreground/40 font-medium leading-relaxed">
                  The account has been created. Please share this temporary
                  access key with the user.
                </p>
              </div>

              <div className="w-full space-y-4">
                <div className="flex items-center gap-4 bg-brand/5 border border-brand/10 p-5 rounded-3xl group transition-all hover:bg-brand/10">
                  <code className="flex-1 text-xl font-mono font-semibold text-foreground tracking-tighter truncate">
                    {createdPassword}
                  </code>
                  <button
                    onClick={() => copyToClipboard(createdPassword)}
                    className="p-3 rounded-2xl bg-brand/10 text-brand hover:bg-brand hover:text-white transition-all shadow-lg shadow-brand/10"
                  >
                    {copied ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] font-semibold text-foreground/20 uppercase tracking-widest flex items-center justify-center gap-2">
                  <AlertCircle className="w-3 h-3" /> Expires in 24 hours
                </p>
              </div>

              <button
                onClick={() => {
                  setCreatedPassword(null);
                  setUserList(users); // Trigger refresh or just let it be
                }}
                className="w-full py-4 rounded-2xl bg-foreground text-surface text-[10px] font-semibold uppercase tracking-widest hover:bg-foreground/90 transition-all shadow-xl active:scale-95"
              >
                Close and Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
