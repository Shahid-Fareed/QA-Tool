"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Check,
  Sparkles,
  X,
  ChevronRight,
  Shield,
  ArrowLeft,
  Search,
  Settings2,
  Edit2,
} from "lucide-react";
import {
  createRoleTemplate,
  updateRoleTemplate,
  deleteRoleTemplate,
  type RoleTemplate,
} from "./role-actions";

// ─── Permission Matrix Config ─────────────────────────────────────────────────

const ACTIONS = ["read", "write", "edit", "delete"] as const;
type Action = (typeof ACTIONS)[number];

const RESOURCES = [
  { key: "projects", label: "Projects" },
  { key: "use_cases", label: "Use Cases" },
  { key: "test_cases", label: "Test Cases" },
  { key: "bugs", label: "Bug Tracker" },
  { key: "test_runs", label: "Test Runs" },
  { key: "generate", label: "AI Generate" },
  { key: "visual_report", label: "Visual Report" },
  { key: "qa_assistant", label: "QA Assistant" },
  { key: "code_evaluation", label: "Code Evaluation" },
  { key: "users", label: "User Management" },
] as const;

type Resource = (typeof RESOURCES)[number]["key"];

function makePermission(action: Action, resource: Resource): string {
  return `${action}:${resource}`;
}

function buildPermissionSet(permissions: string[]): Set<string> {
  return new Set(permissions);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RoleTemplateManagerProps {
  initialTemplates: RoleTemplate[];
  canEdit: boolean;
  canDelete: boolean;
}

export default function RoleTemplateManager({
  initialTemplates,
  canEdit,
  canDelete,
}: RoleTemplateManagerProps) {
  const [templates, setTemplates] = useState<RoleTemplate[]>(initialTemplates);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Editor state
  const [editorName, setEditorName] = useState("");
  const [editorDescription, setEditorDescription] = useState("");
  const [editorPermissions, setEditorPermissions] = useState<Set<string>>(
    new Set(),
  );
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<RoleTemplate | null>(null);

  // Directory State
  const [searchQuery, setSearchQuery] = useState("");

  // Auto-clear feedback messages after 5 seconds
  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => {
      setSuccessMsg(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => {
      setError(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const filteredTemplates = templates.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q)
    );
  });

  const selectedTemplate = templates.find((t) => t._id === selectedId) ?? null;

  // ── Load template into editor ──────────────────────────────────────────────
  function loadTemplate(template: RoleTemplate) {
    setSelectedId(template._id);
    setIsCreating(false);
    setEditorName(template.name);
    setEditorDescription(template.description);
    setEditorPermissions(buildPermissionSet(template.permissions));
    setError(null);
    setSuccessMsg(null);
  }

  function startNewTemplate() {
    setSelectedId(null);
    setIsCreating(true);
    setEditorName("");
    setEditorDescription("");
    setEditorPermissions(new Set());
    setError(null);
    setSuccessMsg(null);
  }

  // ── Toggle a permission cell ───────────────────────────────────────────────
  function togglePermission(action: Action, resource: Resource) {
    const perm = makePermission(action, resource);
    const next = new Set(editorPermissions);
    if (next.has(perm)) {
      next.delete(perm);
      // If un-reading, also remove write/edit/delete for that resource
      if (action === "read") {
        ACTIONS.forEach((a) => {
          if (a !== "read") next.delete(makePermission(a, resource));
        });
      }
    } else {
      next.add(perm);
      // If adding write/edit/delete, auto-add read
      if (action !== "read") {
        next.add(makePermission("read", resource));
      }
    }
    setEditorPermissions(next);
  }

  // ── Toggle entire row ──────────────────────────────────────────────────────
  function toggleRow(resource: Resource) {
    const allPerms = ACTIONS.map((a) => makePermission(a, resource));
    const allChecked = allPerms.every((p) => editorPermissions.has(p));
    const next = new Set(editorPermissions);
    if (allChecked) {
      allPerms.forEach((p) => next.delete(p));
    } else {
      allPerms.forEach((p) => next.add(p));
    }
    setEditorPermissions(next);
  }

  // ── Toggle entire column ───────────────────────────────────────────────────
  function toggleColumn(action: Action) {
    const allPerms = RESOURCES.map((r) =>
      makePermission(action, r.key as Resource),
    );
    const allChecked = allPerms.every((p) => editorPermissions.has(p));
    const next = new Set(editorPermissions);
    if (allChecked) {
      allPerms.forEach((p) => next.delete(p));
    } else {
      allPerms.forEach((p) => next.add(p));
      // auto-add read for all if toggling non-read column
      if (action !== "read") {
        RESOURCES.forEach((r) =>
          next.add(makePermission("read", r.key as Resource)),
        );
      }
    }
    setEditorPermissions(next);
  }

  // ── Save (create or update) ────────────────────────────────────────────────
  function handleSave() {
    if (!editorName.trim()) {
      setError("Template name is required.");
      return;
    }
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const permArray = Array.from(editorPermissions);
      if (isCreating) {
        const result = await createRoleTemplate({
          name: editorName.trim(),
          description: editorDescription.trim(),
          permissions: permArray,
        });
        if (!result.success) {
          setError(result.error ?? "Failed to create roles and permissions.");
          return;
        }
        const newTpl = result.template as RoleTemplate;
        setTemplates((prev) => [newTpl, ...prev]);
        setSelectedId(null);
        setIsCreating(false);
        setSuccessMsg("Role and permissions created successfully!");
      } else if (selectedId) {
        const result = await updateRoleTemplate(selectedId, {
          name: editorName.trim(),
          description: editorDescription.trim(),
          permissions: permArray,
        });
        if (!result.success) {
          setError(result.error ?? "Failed to update roles.");
          return;
        }
        const updated = result.template as RoleTemplate;
        setTemplates((prev) =>
          prev.map((t) => (t._id === selectedId ? updated : t)),
        );
        setSelectedId(null);
        setIsCreating(false);
        setSuccessMsg("Role and permissions updated successfully!");
      }
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  function executeDelete() {
    if (!roleToDelete || !canDelete) return;

    startTransition(async () => {
      const result = await deleteRoleTemplate(roleToDelete._id);
      if (!result.success) {
        setError(result.error ?? "Failed to delete roles and permissions.");
        setRoleToDelete(null);
        return;
      }
      const next = templates.filter((t) => t._id !== roleToDelete._id);
      setTemplates(next);
      setSelectedId(null);
      setIsCreating(false);
      setEditorName("");
      setEditorDescription("");
      setEditorPermissions(new Set());
      setError(null);
      setSuccessMsg("Role and permissions deleted successfully!");
      setRoleToDelete(null);
    });
  }

  const totalSelected = editorPermissions.size;

  if (!selectedId && !isCreating) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in-up w-full max-w-full">
        {/* Back Navigation to Settings */}
        <Link
          href="/settings"
          className="group flex items-center gap-3 px-6 py-2.5 rounded-full bg-surface border border-border hover:border-brand/30 transition-all active:scale-95 shadow-sm w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-foreground/40 group-hover:text-brand transition-colors" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 group-hover:text-foreground transition-colors">
            Back to Settings
          </span>
        </Link>

        {/* Header Area */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground tracking-tight flex items-center gap-3">
              Roles and Permissions
            </h1>
            <p className="text-sm text-foreground/40 mt-1 font-medium">
              Create and manage reusable permission presets to assign to your
              team.
            </p>
          </div>
          <button
            onClick={startNewTemplate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-semibold uppercase tracking-widest shadow-xl transition-all active:scale-95 bg-brand text-white shadow-brand/20 hover:bg-brand-muted hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            New Role & Permissions
          </button>
        </div>

        {/* Feedback Banners */}
        {error && (
          <div className="flex items-center gap-2 text-xs font-semibold text-red-500 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 animate-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 text-xs font-semibold text-brand bg-brand/5 border border-brand/20 rounded-xl px-4 py-3 animate-in slide-in-from-top-1">
            <Check className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Toolbar Area */}
        <div className="flex items-center justify-between gap-4 mt-2">
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30 group-focus-within:text-brand transition-colors" />
            <input
              type="text"
              placeholder="Search roles by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand/40 transition-all text-foreground placeholder-foreground/30 shadow-sm"
            />
          </div>
        </div>

        {/* Main Table Card */}
        <div className="spatial-card rounded-[32px] overflow-hidden border border-border/50 bg-surface/30 shadow-2xl shadow-brand/5">
          <div className="flex items-center px-8 py-4 bg-brand/3 border-b border-border/50 text-[10px] font-semibold uppercase tracking-widest text-foreground/40">
            <div className="flex-1 px-4">Role Name</div>
            <div className="flex-2 px-4">Description</div>
            <div className="w-48 text-center">Permissions</div>
            <div className="w-32 text-right">Actions</div>
          </div>

          <div className="divide-y divide-border/10">
            {filteredTemplates.length === 0 ? (
              <div className="px-8 py-20 text-center flex flex-col items-center justify-center">
                <Shield className="w-12 h-12 text-foreground/10 mb-4" />
                <p className="text-sm font-semibold text-foreground/30 italic">
                  No roles and permissions found.
                </p>
                <p className="text-xs text-foreground/20 mt-1">
                  Try broadening your search or create a new role template.
                </p>
              </div>
            ) : (
              filteredTemplates.map((t) => (
                <div
                  key={t._id}
                  className="group flex items-center px-8 py-6 hover:bg-brand/2 transition-all duration-300 relative"
                >
                  {/* Name Column */}
                  <div className="flex-1 px-4 min-w-0">
                    <span
                      onClick={() => loadTemplate(t)}
                      className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors tracking-tight cursor-pointer truncate block"
                      title={t.name}
                    >
                      {t.name}
                    </span>
                  </div>

                  {/* Description Column */}
                  <div className="flex-2 px-4 min-w-0">
                    <span
                      className="text-xs text-foreground/50 font-medium tracking-tight truncate block"
                      title={t.description}
                    >
                      {t.description || (
                        <span className="italic opacity-50">
                          No description provided.
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Permission Count Column */}
                  <div className="w-48 flex justify-center">
                    <span className="px-4 py-1 rounded-full bg-brand/5 border border-brand/10 text-[10px] font-semibold text-brand uppercase tracking-widest">
                      {t.permissions.length} Active
                    </span>
                  </div>

                  {/* Actions Column */}
                  <div className="w-32 flex items-center justify-end gap-1">
                    <button
                      onClick={() => loadTemplate(t)}
                      className="p-2 rounded-xl text-foreground/40 hover:text-brand hover:bg-brand/10 transition-all active:scale-90"
                      title="Edit Role"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => setRoleToDelete(t)}
                        className="p-2 rounded-xl text-foreground/20 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90"
                        title="Delete Role"
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

        {/* Delete Confirmation Modal */}
        {roleToDelete &&
          mounted &&
          createPortal(
            <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 backdrop-blur-xl bg-slate-950/60 animate-in fade-in duration-300">
              <div className="w-full max-w-md bg-[#0a0e17] border border-slate-800 rounded-[32px] p-10 shadow-2xl shadow-black animate-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center text-center space-y-6">
                  {/* Circle Exclamation Icon */}
                  <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                    <AlertCircle className="w-8 h-8" />
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-[17px] font-bold text-white uppercase tracking-[0.12em]">
                      Delete Role?
                    </h3>
                    <p className="text-[13px] text-slate-400/80 font-medium leading-relaxed px-4">
                      You are about to permanently remove{" "}
                      <span className="text-white font-semibold">
                        "{roleToDelete.name}"
                      </span>
                      . This action cannot be undone.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 w-full pt-2">
                    <button
                      onClick={() => setRoleToDelete(null)}
                      className="flex-1 px-6 py-3.5 rounded-2xl bg-[#0e1a1a] border border-brand/10 text-brand/60 text-[11px] font-bold uppercase tracking-widest hover:bg-brand/10 hover:text-brand transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeDelete}
                      disabled={isPending}
                      className="flex-1 px-6 py-3.5 rounded-2xl bg-red-500 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-red-600 shadow-[0_10px_25px_-5px_rgba(239,68,68,0.4)] border border-red-400/10 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Delete"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </div>
    );
  }

  // Render Full-Width Editor for the selected role
  return (
    <div className="flex flex-col gap-6 animate-fade-in-up w-full max-w-full">
      {/* Top Back Navigation & Save Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            setSelectedId(null);
            setIsCreating(false);
            setError(null);
            setSuccessMsg(null);
          }}
          className="group flex items-center gap-3 px-6 py-2.5 rounded-full bg-surface border border-border hover:border-brand/30 transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-foreground/40 group-hover:text-brand transition-colors" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 group-hover:text-foreground transition-colors">
            Back to Roles
          </span>
        </button>

        <div className="flex items-center gap-2.5">
          {totalSelected > 0 && (
            <span className="text-[9px] font-bold text-brand bg-brand/10 px-3 py-1.5 rounded-full border border-brand/20 uppercase tracking-wider shadow-sm mr-2 animate-in fade-in">
              {totalSelected} Selected
            </span>
          )}

          {canEdit && (
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-muted transition-all shadow-lg shadow-brand/20 disabled:opacity-40 active:scale-95"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Changes
            </button>
          )}
        </div>
      </div>

      {/* Main Editor Content Grid */}
      <div className="w-full space-y-8 animate-in fade-in duration-500">
        <div className="spatial-card rounded-[32px] overflow-hidden border border-border/50 bg-surface/30 shadow-2xl shadow-brand/5">
          {/* Editor Sub-Header */}
          <div className="px-10 py-8 border-b border-border/50 bg-brand/3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                <Settings2 className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
                  {isCreating ? "Create Mode" : "Edit Mode"}
                </span>
                <h2 className="text-xl font-semibold text-foreground/90 tracking-tight uppercase">
                  {isCreating
                    ? "New Role & Permissions"
                    : editorName || "Edit Role"}
                </h2>
              </div>
            </div>
          </div>

          <div className="p-10 space-y-10">
            {/* Form Inputs and Notifications */}
            <div className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 text-xs font-semibold text-red-500 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 animate-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="flex items-center gap-2 text-xs font-semibold text-brand bg-brand/5 border border-brand/20 rounded-xl px-4 py-3 animate-in slide-in-from-top-1">
                  <Check className="w-4 h-4 shrink-0" />
                  {successMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-1">
                    Role Name
                  </label>
                  <input
                    value={editorName}
                    onChange={(e) => setEditorName(e.target.value)}
                    placeholder="e.g. Senior QA Engineer"
                    className="w-full bg-brand/5 border border-border/50 rounded-xl px-4 py-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand/40 shadow-sm transition-all placeholder:text-foreground/20 hover:border-border"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-1">
                    Description (Optional)
                  </label>
                  <input
                    value={editorDescription}
                    onChange={(e) => setEditorDescription(e.target.value)}
                    placeholder="e.g. Full read/write permissions for all system features"
                    className="w-full bg-brand/5 border border-border/50 rounded-xl px-4 py-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand/40 shadow-sm transition-all placeholder:text-foreground/20 hover:border-border"
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </div>

            {/* Matrix Container */}
            <div className="space-y-4 border-t border-border/20 pt-8">
              <div className="flex items-center justify-between pb-2 border-b border-border/20">
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/60 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand" />
                  Permission Matrix Override
                </h3>
              </div>

              <div className="overflow-x-auto bg-surface/10 rounded-2xl border border-border/20 shadow-inner">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-brand/1 border-b border-border/20">
                      <th className="px-10 py-5 text-[10px] font-semibold text-foreground/40 uppercase tracking-widest min-w-[220px]">
                        Resource Name
                      </th>
                      {ACTIONS.map((action) => (
                        <th
                          key={action}
                          className="px-6 py-5 text-center min-w-[100px]"
                        >
                          <button
                            onClick={() => toggleColumn(action)}
                            disabled={!canEdit}
                            className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50 hover:text-brand hover:underline underline-offset-4 transition-all mx-auto disabled:cursor-not-allowed"
                            title={`Toggle all ${action}`}
                          >
                            {action}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {RESOURCES.map((resource) => {
                      const rowPerms = ACTIONS.map((a) =>
                        makePermission(a, resource.key as Resource),
                      );
                      const allRowChecked = rowPerms.every((p) =>
                        editorPermissions.has(p),
                      );
                      return (
                        <tr
                          key={resource.key}
                          className="hover:bg-brand/2 transition-all duration-300 group/row"
                        >
                          {/* Row Label & Bulk Selection Checkbox */}
                          <td className="px-10 py-6">
                            <button
                              onClick={() =>
                                toggleRow(resource.key as Resource)
                              }
                              disabled={!canEdit}
                              className="flex items-center gap-3.5 group disabled:cursor-not-allowed text-left w-full"
                            >
                              <div
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                                  allRowChecked
                                    ? "bg-brand border-brand text-white shadow-lg shadow-brand/20"
                                    : "bg-brand/5 border-border/50 hover:border-brand/30 text-transparent"
                                }`}
                              >
                                {allRowChecked && (
                                  <Check className="w-3 h-3 text-white stroke-3" />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors tracking-tight">
                                  {resource.label}
                                </span>
                              </div>
                            </button>
                          </td>

                          {/* Cell Checkboxes */}
                          {ACTIONS.map((action) => {
                            const perm = makePermission(
                              action,
                              resource.key as Resource,
                            );
                            const isChecked = editorPermissions.has(perm);
                            const isDisabledRead =
                              action === "read" &&
                              ACTIONS.some(
                                (a) =>
                                  a !== "read" &&
                                  editorPermissions.has(
                                    makePermission(a, resource.key as Resource),
                                  ),
                              );
                            return (
                              <td
                                key={action}
                                className="px-6 py-6 text-center"
                              >
                                <div className="flex justify-center">
                                  <button
                                    onClick={() =>
                                      togglePermission(
                                        action,
                                        resource.key as Resource,
                                      )
                                    }
                                    disabled={!canEdit || isDisabledRead}
                                    title={`${action}:${resource.key}`}
                                    className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-300 active:scale-90 ${
                                      isChecked
                                        ? "bg-brand border-brand text-white shadow-lg shadow-brand/20 scale-110"
                                        : "bg-brand/5 border-border/50 text-transparent hover:border-brand/40 hover:bg-brand/10"
                                    } ${isDisabledRead ? "opacity-40 cursor-not-allowed" : "cursor-pointer"} disabled:cursor-not-allowed`}
                                  >
                                    {isChecked && (
                                      <Check className="w-3.5 h-3.5 text-white stroke-3" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 flex items-start gap-2 px-2 opacity-50">
                <AlertCircle className="w-4 h-4 mt-px shrink-0 text-foreground/40" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/40 leading-relaxed">
                  Tip: Click a{" "}
                  <span className="text-foreground font-bold">
                    column header
                  </span>{" "}
                  or <span className="text-foreground font-bold">row item</span>{" "}
                  to toggle permissions in bulk. Enabling write, edit, or delete
                  will automatically enforce read privileges.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
