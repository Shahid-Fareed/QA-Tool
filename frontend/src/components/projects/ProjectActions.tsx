"use client";

import React, { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { Edit2, Trash2, X, Check, Loader2, AlertCircle } from "lucide-react";
import {
  updateProject,
  deleteProject,
} from "@/app/(dashboard)/projects/project-actions";

interface ProjectActionsProps {
  project: {
    id: string;
    projectName: string;
    description: string;
  };
  canEdit: boolean;
  canDelete: boolean;
}

export default function ProjectActions({
  project,
  canEdit,
  canDelete,
}: ProjectActionsProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  const [editForm, setEditForm] = useState({
    projectName: project.projectName,
    description: project.description,
  });

  const handleUpdate = () => {
    startTransition(async () => {
      const res = await updateProject(project.id, editForm);
      if (res.success) setIsEditOpen(false);
      else alert(res.error);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteProject(project.id);
      if (res.success) setIsDeleteOpen(false);
      else alert(res.error);
    });
  };

  if (!canEdit && !canDelete) return null;

  return (
    <div className="flex items-center gap-1">
      {canEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditOpen(true);
          }}
          className={`p-1.5 rounded-lg transition-colors ${
            mounted
              ? resolvedTheme === "dark"
                ? "text-white/30 hover:text-white hover:bg-white/10"
                : "text-muted-foreground/60 hover:text-foreground hover:bg-brand/5"
              : "text-muted-foreground/30"
          }`}
          title="Edit Project"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )}

      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsDeleteOpen(true);
          }}
          className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
          title="Delete Project"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Edit Modal */}
      {isEditOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => !isPending && setIsEditOpen(false)}
            />
            <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl animate-fade-in-up">
              <h3 className="text-xl font-semibold text-foreground mb-6">
                Edit Project
              </h3>
              <div className="space-y-4">
                <label className="block text-left">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Project Name
                  </span>
                  <input
                    value={editForm.projectName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, projectName: e.target.value })
                    }
                    className="mt-2 w-full bg-surface border border-border rounded-xl py-2 px-4 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-brand/30"
                  />
                </label>
                <label className="block text-left">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Description
                  </span>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    className="mt-2 w-full bg-surface border border-border rounded-xl py-2 px-4 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-brand/30 h-24 resize-none"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  disabled={isPending}
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={isPending}
                  onClick={handleUpdate}
                  className="flex items-center gap-2 bg-brand/20 text-brand border border-brand/30 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand/30 transition-all"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Delete Confirmation */}
      {isDeleteOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => !isPending && setIsDeleteOpen(false)}
            />
            <div className="relative w-full max-w-sm bg-surface border border-red-500/20 rounded-2xl p-8 shadow-2xl animate-fade-in-up">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2 text-left">
                Delete Project?
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-8 text-left">
                This will permanently remove{" "}
                <span className="text-foreground font-semibold">
                  "{project.projectName}"
                </span>{" "}
                and all its associated data. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  disabled={isPending}
                  onClick={() => setIsDeleteOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-brand/5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-brand/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={isPending}
                  onClick={handleDelete}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500/20 text-red-500 border border-red-500/20 text-sm font-semibold hover:bg-red-500/30 transition-all"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    "Delete Project"
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
