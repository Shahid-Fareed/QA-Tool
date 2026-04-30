"use client";
import React, { useState } from "react";
import Link from "next/link";
import {
  Settings2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Bug,
  Pencil,
  Trash2,
  Check,
  X as CloseIcon,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@/lib/rbac";

export default function SettingsPage() {
  const { user } = useAuth();

  const initialItems = [
    {
      label: "Bug Status",
      description: "Manage global bug lifecycle states and transitions",
      href: "/settings/statuses?type=bugs",
      resource: "bug_status",
      icon: Bug,
      category: "Lifecycle",
    },
  ];

  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canEdit = user
    ? hasPermission(user.role, "edit:bugs", user.customPermissions)
    : true;
  const canDelete = user
    ? hasPermission(user.role, "delete:bugs", user.customPermissions)
    : true;

  const handleStartEdit = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (!canEdit) return;
    setEditingId(item.resource);
    setEditValue(item.label);
  };

  const handleSaveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setItems(
      items.map((i) =>
        i.resource === editingId ? { ...i, label: editValue } : i,
      ),
    );
    setEditingId(null);
  };

  const handleDelete = () => {
    setItems(items.filter((i) => i.resource !== deleteId));
    setDeleteId(null);
  };

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 py-10 animate-fade-in-up">
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-3xl font-semibold text-foreground tracking-tight">
          Platform Settings
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Manage system architecture and workflows
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((item) => {
          const Icon = item.icon;
          const isEditing = editingId === item.resource;

          return (
            <div
              key={item.resource}
              className="spatial-card rounded-2xl p-6 group block relative overflow-hidden hover:shadow-[0_0_40px_-12px_rgba(0,229,255,0.2)] transition-all duration-300"
            >
              {!isEditing && (
                <Link
                  href={item.href}
                  className="absolute inset-0 z-0"
                  aria-label={item.label}
                />
              )}

              <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-brand/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="relative z-10 pointer-events-none">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors duration-300">
                    <Icon className="w-5 h-5 text-brand" />
                  </div>

                  <div className="flex items-center gap-2 relative z-20 pointer-events-auto">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center shadow-lg active:scale-95"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(null);
                          }}
                          className="w-8 h-8 rounded-lg bg-surface border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95"
                        >
                          <CloseIcon className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => handleStartEdit(e, item)}
                          disabled={!canEdit}
                          className="w-8 h-8 rounded-lg bg-surface border border-border/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:text-brand hover:border-brand/40 shadow-sm active:scale-95 disabled:opacity-0"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canDelete) setDeleteId(item.resource);
                          }}
                          disabled={!canDelete}
                          className="w-8 h-8 rounded-lg bg-surface border border-border/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:text-red-500 hover:border-red-500/40 shadow-sm active:scale-95 disabled:opacity-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="relative z-20 pointer-events-auto mb-1">
                    <input
                      autoFocus
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSaveEdit(e as any)
                      }
                      className="w-full bg-surface border-b border-brand text-foreground font-semibold text-base py-1 outline-none"
                    />
                  </div>
                ) : (
                  <h2 className="text-foreground font-semibold text-base mb-1 truncate leading-tight">
                    {item.label}
                  </h2>
                )}

                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-5">
                  <Clock className="w-3 h-3" />
                  <span>System Default</span>
                </div>
              </div>

              <div className="relative z-20 flex items-center gap-2 flex-wrap mt-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-brand/10 text-brand border border-brand/15 group-hover:border-brand/30 transition-all duration-200 uppercase tracking-widest">
                  {item.category}
                </span>
              </div>

              <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0 pointer-events-none">
                <ArrowRight className="w-4 h-4 text-brand" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-surface border border-border rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground uppercase tracking-tight">
                  Remove Category?
                </h3>
                <p className="text-sm text-foreground/40 font-medium leading-relaxed">
                  You are about to remove this settings category.
                  <br />
                  <span className="text-foreground font-semibold italic">
                    "{items.find((i) => i.resource === deleteId)?.label}"
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 px-6 py-3 rounded-2xl bg-brand/5 text-foreground/40 text-xs font-semibold uppercase tracking-widest hover:bg-brand/10 hover:text-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 rounded-2xl bg-red-500 text-white text-xs font-semibold uppercase tracking-widest hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all active:scale-95"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
