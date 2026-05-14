"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Loader2, Check, AlertCircle, Search } from "lucide-react";
import { Role, Permission, hasPermission } from "@/lib/rbac";
import { apiClientFetch } from "@/lib/api-client";

interface AddItemModalProps {
  projectId: string;
  itemType: "use-cases" | "test-cases" | "bugs";
  activeModule: string | null;
  linkedData?: any[];
  currentUser?: {
    id: string;
    role: string;
    name: string;
    customPermissions?: Permission[];
  };
  onAddSuccess: (item: any) => void;
  newItemLabel: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function AddItemModal({
  projectId,
  itemType,
  activeModule,
  linkedData,
  currentUser,
  onAddSuccess,
  newItemLabel,
  isOpen,
  setIsOpen,
}: AddItemModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [formData, setFormData] = useState<any>({
    title: "",
    moduleId: activeModule || "",
    description: "",
    priority: "Medium",
    status: "Open", // For bugs
    severity: "Medium", // For bugs
    assigneeId: "",
    assigneeName: "Unassigned",
    linkedUseCase: "",
    steps: "", // For test cases
    preConditions: "", // For test cases
    expectedResult: "", // For test cases
    actors: "", // For use cases
    mainFlow: "", // For use cases
  });

  const resetForm = () => {
    setFormData((prev: any) => ({
      ...prev,
      title: "",
      moduleId: activeModule || "",
      description: "",
      priority: "Medium",
      status: "Open",
      severity: "Medium",
      assigneeId: "",
      assigneeName: "Unassigned",
      linkedUseCase: "",
      steps: "",
      preConditions: "",
      expectedResult: "",
      actors: "",
      mainFlow: "",
    }));
    setError(null);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync moduleId when activeModule changes
  useEffect(() => {
    if (activeModule) {
      setFormData((prev: any) => ({ ...prev, moduleId: activeModule }));
    }
  }, [activeModule]);

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen && itemType === "bugs" && assignees.length === 0) {
      fetchAssignees();
    }
  }, [isOpen]);

  // Fetch users with bug reading permission when opening bug modal
  const fetchAssignees = async () => {
    if (itemType !== "bugs" || assignees.length > 0) return;
    setIsLoadingUsers(true);
    try {
      const res = await apiClientFetch("/api/users");
      const users = await res.json();
      if (Array.isArray(users)) {
        const filtered = users.filter((u: any) =>
          hasPermission(u.role as Role, "read:bugs", u.customPermissions),
        );
        setAssignees(filtered);
      }
    } catch (err) {
      console.error("Failed to fetch assignees:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!formData.moduleId.trim()) {
      setError("Module ID / Name is required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await apiClientFetch(`/api/resources/${itemType}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            projectId,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create item");
        }

        const newItem = await res.json();
        // Add a temporary flag for the "NEW" badge
        onAddSuccess({ ...newItem, _isNewSession: true });
        setIsOpen(false);
        resetForm();
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  return (
    <>
      {isOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 sm:p-6 text-foreground">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => !isPending && setIsOpen(false)}
            />

            <div className="relative w-full max-w-2xl max-h-[90vh] bg-surface border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-fade-in-up">
              <div className="flex items-center justify-between p-6 border-b border-border bg-surface/50 shrink-0">
                <div>
                  <p className="text-[10px] font-semibold text-brand uppercase tracking-wider mb-1">
                    Project Portal
                  </p>
                  <h3 className="text-xl font-semibold text-foreground">
                    Create {newItemLabel}
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="p-2 rounded-xl text-foreground/60 hover:bg-brand/10 hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="col-span-full">
                    <label className="text-xs uppercase font-semibold tracking-wider text-foreground/70 flex items-center gap-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      onFocus={() => {
                        console.log("AddItemModal: Focus on title");
                        setFocusedField("title");
                      }}
                      className="mt-2 w-full bg-brand/5 border border-border rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-brand/30 focus:bg-brand/10 transition-all text-foreground placeholder-foreground/30"
                      placeholder={`Enter ${itemType.slice(0, -1)} title...`}
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-semibold tracking-wider text-foreground/70 flex items-center gap-1">
                      Module ID / Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={formData.moduleId}
                      disabled={!!activeModule}
                      onChange={(e) =>
                        setFormData({ ...formData, moduleId: e.target.value })
                      }
                      onFocus={() => {
                        console.log("AddItemModal: Focus on moduleId");
                        setFocusedField("moduleId");
                      }}
                      className="mt-2 w-full bg-brand/5 border border-border rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-brand/30 focus:bg-brand/10 transition-all text-foreground placeholder-foreground/30 disabled:opacity-50"
                      placeholder="e.g. Module 01: Login"
                    />
                  </div>

                  {itemType !== "use-cases" && (
                    <div>
                      <label className="text-xs uppercase font-semibold tracking-wider text-foreground/70">
                        Priority
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) =>
                          setFormData({ ...formData, priority: e.target.value })
                        }
                        className="mt-2 w-full appearance-none bg-brand/5 border border-border rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-brand/30 focus:bg-brand/10 transition-all text-foreground"
                      >
                        <option value="Low" className="bg-surface">
                          Low
                        </option>
                        <option value="Medium" className="bg-surface">
                          Medium
                        </option>
                        <option value="High" className="bg-surface">
                          High
                        </option>
                        <option value="Critical" className="bg-surface">
                          Critical
                        </option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Dynamic Sections Based on Type */}
                {itemType === "use-cases" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs uppercase font-semibold tracking-wider text-foreground/70">
                        Actors
                      </label>
                      <input
                        value={formData.actors}
                        onChange={(e) =>
                          setFormData({ ...formData, actors: e.target.value })
                        }
                        onFocus={() => {
                          console.log("AddItemModal: Focus on actors");
                          setFocusedField("actors");
                        }}
                        className="mt-2 w-full bg-brand/5 border border-border rounded-lg py-2 px-4 text-sm focus:outline-none"
                        placeholder="e.g. User, Admin"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase font-semibold tracking-wider text-foreground/70">
                        Main Flow
                      </label>
                      <textarea
                        value={formData.mainFlow}
                        onChange={(e) =>
                          setFormData({ ...formData, mainFlow: e.target.value })
                        }
                        onFocus={() => {
                          console.log("AddItemModal: Focus on mainFlow");
                          setFocusedField("mainFlow");
                        }}
                        className="mt-2 w-full bg-brand/5 border border-border rounded-lg py-2 px-4 text-sm focus:outline-none h-24 resize-none"
                        placeholder="Step by step description..."
                      />
                    </div>
                  </div>
                )}

                {itemType === "test-cases" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs uppercase font-semibold tracking-wider text-foreground/70">
                        Linked Use Case
                      </label>
                      <select
                        value={formData.linkedUseCase}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            linkedUseCase: e.target.value,
                          })
                        }
                        className="mt-2 w-full appearance-none bg-brand/5 border border-border rounded-lg py-2 px-4 text-sm focus:outline-none"
                      >
                        <option value="" className="bg-surface">
                          None
                        </option>
                        {linkedData
                          ?.filter((uc) => {
                            if (!uc.moduleId || !formData.moduleId)
                              return false;
                            const ucMatch =
                              uc.moduleId.match(/Module\s*(\d+)/i);
                            const formMatch =
                              formData.moduleId.match(/Module\s*(\d+)/i);
                            if (ucMatch && formMatch) {
                              return (
                                parseInt(ucMatch[1], 10) ===
                                parseInt(formMatch[1], 10)
                              );
                            }
                            return (
                              uc.moduleId
                                .toLowerCase()
                                .includes(formData.moduleId.toLowerCase()) ||
                              formData.moduleId
                                .toLowerCase()
                                .includes(uc.moduleId.toLowerCase())
                            );
                          })
                          .sort((a, b) =>
                            (a.customId || "").localeCompare(
                              b.customId || "",
                              undefined,
                              { numeric: true, sensitivity: "base" },
                            ),
                          )
                          .map((uc) => (
                            <option
                              key={uc._id}
                              value={uc.customId}
                              className="bg-surface"
                            >
                              {uc.customId}: {uc.title}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs uppercase font-semibold tracking-wider text-foreground/70">
                          Pre-conditions (Optional)
                        </label>
                        <textarea
                          value={formData.preConditions}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              preConditions: e.target.value,
                            })
                          }
                          onFocus={() => {
                            console.log("AddItemModal: Focus on preConditions");
                            setFocusedField("preConditions");
                          }}
                          className="mt-2 w-full bg-brand/5 border border-border rounded-lg py-2 px-4 text-sm focus:outline-none h-20 resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase font-semibold tracking-wider text-foreground/70">
                          Steps (Optional)
                        </label>
                        <textarea
                          value={formData.steps}
                          onChange={(e) =>
                            setFormData({ ...formData, steps: e.target.value })
                          }
                          onFocus={() => {
                            console.log("AddItemModal: Focus on steps");
                            setFocusedField("steps");
                          }}
                          className="mt-2 w-full bg-brand/5 border border-border rounded-lg py-2 px-4 text-sm focus:outline-none h-20 resize-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs uppercase font-semibold tracking-wider text-foreground/70">
                        Expected Result (Optional)
                      </label>
                      <textarea
                        value={formData.expectedResult}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            expectedResult: e.target.value,
                          })
                        }
                        onFocus={() => {
                          console.log("AddItemModal: Focus on expectedResult");
                          setFocusedField("expectedResult");
                        }}
                        className="mt-2 w-full bg-brand/5 border border-border rounded-lg py-2 px-4 text-sm focus:outline-none h-20 resize-none"
                        placeholder="Expected outcome of the test case..."
                      />
                    </div>
                  </div>
                )}

                {itemType === "bugs" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs uppercase font-semibold tracking-wider text-foreground/70">
                          Status
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) =>
                            setFormData({ ...formData, status: e.target.value })
                          }
                          className="mt-2 w-full appearance-none bg-brand/5 border border-border rounded-lg py-2 px-4 text-sm focus:outline-none"
                        >
                          <option value="Open" className="bg-surface">
                            Open
                          </option>
                          <option value="In Progress" className="bg-surface">
                            In Progress
                          </option>
                          <option value="Resolved" className="bg-surface">
                            Resolved
                          </option>
                          <option value="Closed" className="bg-surface">
                            Closed
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs uppercase font-semibold tracking-wider text-foreground/70">
                          Assignee
                        </label>
                        <select
                          value={formData.assigneeId}
                          onChange={(e) => {
                            const user = assignees.find(
                              (u) => u._id === e.target.value,
                            );
                            setFormData({
                              ...formData,
                              assigneeId: e.target.value,
                              assigneeName: user ? user.name : "Unassigned",
                            });
                          }}
                          className="mt-2 w-full appearance-none bg-brand/5 border border-border rounded-lg py-2 px-4 text-sm focus:outline-none disabled:opacity-50"
                          disabled={isLoadingUsers}
                        >
                          <option value="" className="bg-surface">
                            Unassigned
                          </option>
                          {assignees.map((u) => (
                            <option
                              key={u._id}
                              value={u._id}
                              className="bg-surface"
                            >
                              {u.name} ({u.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs uppercase font-semibold tracking-wider text-foreground/70">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    onFocus={() => {
                      console.log("AddItemModal: Focus on description");
                      setFocusedField("description");
                    }}
                    className="mt-2 w-full bg-brand/5 border border-border rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-brand/30 focus:bg-brand/10 transition-all text-foreground h-24 resize-none"
                    placeholder="Detailed description..."
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-border bg-surface/50 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-brand/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand/20 text-brand border border-brand/30 hover:bg-brand/30 transition-colors disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isPending
                    ? "Creating..."
                    : `Create ${itemType.slice(0, -1)}`}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
