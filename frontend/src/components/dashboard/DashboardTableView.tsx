"use client";

import React, { useState, useEffect } from "react";
import { apiClientFetch } from "@/lib/api-client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Edit2,
  Trash2,
  CheckCircle2,
  Layers,
  Loader2,
  ChevronDown,
  X,
  Search,
  Plus,
  Camera,
} from "lucide-react";
import Link from "next/link";
import { ColumnDef, ResourceStats, CurrentUser } from "@/lib/types";
import { Tooltip } from "@/components/ui/Tooltip";
import AddItemModal from "./AddItemModal";
import DashboardHeader from "./DashboardHeader";
import PriorityStats from "./PriorityStats";
import DetailModal from "./DetailModal";

interface DashboardTableViewProps {
  title: string;
  projectId: string; // Added direct projectId prop
  data: any[];
  linkedData?: any[];
  currentUser?: CurrentUser;
  columns: ColumnDef[];
  newItemLabel?: string;
  moduleIcon?: "layers" | "bug" | "file" | "test";
  projectBackHref?: string;
  itemType?: "use-cases" | "test-cases" | "bugs";
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  currentPage?: number;
  totalPages?: number;
  serverStats?: ResourceStats;
}

export const DashboardTableView: React.FC<DashboardTableViewProps> = ({
  title,
  projectId,
  data,
  linkedData,
  currentUser,
  columns,
  newItemLabel = "New Item",
  moduleIcon = "layers",
  projectBackHref,
  itemType = "use-cases",
  canAdd = false,
  canEdit = false,
  canDelete = false,
  currentPage = 1,
  totalPages = 1,
  serverStats,
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const activeModule = searchParams.get("module");
  const activePriority = searchParams.get("priority");
  const activeStatus = searchParams.get("status");
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [customStatuses, setCustomStatuses] = useState<any[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Auto-clear notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".filter-container")) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Deep-linking: Auto-open modal if 'selected' ID is in URL
  useEffect(() => {
    const selectedId = searchParams.get("selected");
    if (selectedId && data) {
      const targetItem = data.find((item: any) => item._id === selectedId);
      if (targetItem) {
        setSelectedItem(targetItem);
        setIsEditMode(false);
      }
    }
  }, [searchParams, data]);

  // Fetch custom statuses
  useEffect(() => {
    const fetchCustomStatuses = async () => {
      try {
        const res = await apiClientFetch("/api/status-configs");
        if (res.ok) {
          const data = await res.json();
          setCustomStatuses(data);
        }
      } catch (err) {
        console.error("Failed to fetch custom statuses", err);
      }
    };
    fetchCustomStatuses();
  }, []);

  // Fetch available users for bug assignment
  useEffect(() => {
    if (itemType === "bugs") {
      apiClientFetch("/api/users")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setAvailableUsers(data);
          } else {
            console.warn("Expected array of users, received:", data);
            setAvailableUsers([]);
          }
        })
        .catch((err) => {
          console.error("Error fetching users:", err);
          setAvailableUsers([]);
        });
    }
  }, [itemType]);

  const handleCloseModal = () => {
    if (searchParams.get("selected")) {
      router.back();
    } else {
      setSelectedItem(null);
    }
  };

  const handleUpdate = async (item: any, updates: any) => {
    setIsUpdating(true);
    try {
      const res = await apiClientFetch(
        `/api/resources/${itemType}/${item._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        },
      );

      if (res.ok) {
        // Just refresh the server-side data
        router.refresh();
        setNotification({
          message: `${itemType.replace("-", " ")} updated successfully`,
          type: "success",
        });
        if (selectedItem) {
          handleCloseModal();
        }
      }
    } catch (err) {
      console.error("Update Error:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete || !itemType) return;
    setIsDeleting(true);
    try {
      const res = await apiClientFetch(
        `/api/resources/${itemType}/${itemToDelete._id}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        setItemToDelete(null);
        router.refresh();
        setNotification({
          message: `${itemType.replace("-", " ")} deleted successfully`,
          type: "success",
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const selectPriority = (priority: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (priority) {
      params.set("priority", priority);
    } else {
      params.delete("priority");
    }
    params.set("page", "1"); // Reset to page 1
    router.push(`?${params.toString()}`);
  };

  const selectStatus = (status: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status) {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    params.set("page", "1"); // Reset to page 1
    router.push(`?${params.toString()}`);
  };

  const isOverview = !activeModule && !activePriority && !activeStatus;
  const effectiveLimit = isOverview ? 10 : 25;

  // Filter local data based on search query
  const filteredItems = data.filter((item) =>
    Object.values(item).some(
      (val) =>
        typeof val === "string" &&
        val.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );

  const handleModuleClick = (modId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("module", modId);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("module");
    params.delete("priority");
    params.delete("status");
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const pathname = usePathname();

  // Contextual back button HREF
  const effectiveBackHref = !isOverview ? pathname : projectBackHref;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative">
      {/* Global Updating Overlay */}
      {isUpdating && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-background/30 backdrop-blur-[2px] transition-all">
          <div className="bg-surface border border-brand/20 p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in duration-300">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-brand/10 border-t-brand animate-spin" />
              <Loader2 className="w-6 h-6 text-brand absolute inset-0 m-auto animate-pulse" />
            </div>
            <p className="text-sm font-semibold text-foreground tracking-tight">
              Changes...
            </p>
          </div>
        </div>
      )}

      <DashboardHeader
        title={isOverview ? "Overview" : activeModule || "Details"}
        projectName={`${data[0]?.projectName || "Project Portal"} • ${title}`}
        moduleIcon={moduleIcon}
        projectBackHref={effectiveBackHref}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        canAdd={canAdd}
        onAddNew={() => setIsAddModalOpen(true)}
        newItemLabel={newItemLabel}
        activeFilter={!!(activeModule || activePriority || activeStatus)}
        onClearFilter={clearFilters}
        itemType={itemType}
        projectId={projectId}
      />

      {serverStats && (
        <div className="space-y-6">
          {itemType !== "use-cases" && (
            <PriorityStats
              serverStats={serverStats}
              activePriority={activeStatus}
              onSelectPriority={selectStatus}
              itemType={itemType}
            />
          )}

          <div className="flex flex-wrap items-center gap-3 py-4">
            {itemType !== "use-cases" && (
              <div className="relative filter-container">
                <div
                  onClick={() =>
                    setActiveDropdown(
                      activeDropdown === "status" ? null : "status",
                    )
                  }
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-surface transition-all cursor-pointer ${activeStatus ? "border-brand/40 ring-1 ring-brand/10" : "border-border hover:border-brand/30"}`}
                >
                  <span className="text-xs font-semibold text-foreground/70">
                    {activeStatus || "Status"}
                  </span>
                  {activeStatus && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectStatus(null);
                      }}
                      className="p-0.5 hover:bg-brand/10 rounded-md transition-colors"
                    >
                      <X className="w-3 h-3 text-foreground/40" />
                    </button>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-foreground/30 transition-transform ${activeDropdown === "status" ? "rotate-180" : ""}`}
                  />
                </div>

                <div
                  className={`absolute top-full left-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl transition-all z-100 p-1.5 ${activeDropdown === "status" ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"}`}
                >
                  {[
                    {
                      label: "All Statuses",
                      value: null,
                      color: "bg-foreground/10",
                    },
                    ...(itemType === "test-cases"
                      ? [
                          {
                            label: "Pending",
                            value: "Pending",
                            color: "bg-amber-400",
                          },
                          {
                            label: "Passed",
                            value: "Passed",
                            color: "bg-emerald-400",
                          },
                          {
                            label: "Failed",
                            value: "Failed",
                            color: "bg-red-400",
                          },
                          {
                            label: "Closed",
                            value: "Closed",
                            color: "bg-foreground/40",
                          },
                        ]
                      : itemType === "bugs"
                        ? []
                        : [
                            {
                              label: "Open",
                              value: "Open",
                              color: "bg-blue-400",
                            },
                            {
                              label: "Pending",
                              value: "Pending",
                              color: "bg-amber-400",
                            },
                            {
                              label: "Passed",
                              value: "Passed",
                              color: "bg-emerald-400",
                            },
                            {
                              label: "Failed",
                              value: "Failed",
                              color: "bg-red-400",
                            },
                            {
                              label: "Closed",
                              value: "Closed",
                              color: "bg-foreground/40",
                            },
                          ]),
                    ...customStatuses
                      .filter((s) =>
                        itemType === "bugs"
                          ? true
                          : itemType === "test-cases"
                            ? false
                            : ![
                                "Open",
                                "Pending",
                                "Passed",
                                "Failed",
                                "Closed",
                              ].includes(s.name),
                      )
                      .map((s) => ({
                        label: s.name,
                        value: s.name,
                        color: "bg-brand",
                      })),
                  ].map((opt, idx) => (
                    <button
                      key={`${opt.label}-${idx}`}
                      onClick={() => {
                        selectStatus(opt.value);
                        setActiveDropdown(null);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-brand/5 transition-colors group/item"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                        <span
                          className={`text-xs font-semibold ${activeStatus === opt.value ? "text-brand" : "text-foreground/70"}`}
                        >
                          {opt.label}
                        </span>
                      </div>
                      {activeStatus === opt.value && (
                        <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Priority Filter Tag */}
            {itemType !== "use-cases" && (
              <div className="relative filter-container">
                <div
                  onClick={() =>
                    setActiveDropdown(
                      activeDropdown === "priority" ? null : "priority",
                    )
                  }
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-surface transition-all cursor-pointer ${activePriority ? "border-brand/40 ring-1 ring-brand/10" : "border-border hover:border-brand/30"}`}
                >
                  {activePriority && (
                    <div
                      className={`w-2 h-2 rounded-full ${activePriority === "high" ? "bg-red-500" : activePriority === "medium" ? "bg-foreground/40" : "bg-cyan-400"}`}
                    />
                  )}
                  <span className="text-xs font-semibold text-foreground/70 capitalize">
                    {activePriority || "Priority"}
                  </span>
                  {activePriority && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectPriority(null);
                      }}
                      className="p-0.5 hover:bg-brand/10 rounded-md transition-colors"
                    >
                      <X className="w-3 h-3 text-foreground/40" />
                    </button>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-foreground/30 transition-transform ${activeDropdown === "priority" ? "rotate-180" : ""}`}
                  />
                </div>

                <div
                  className={`absolute top-full left-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl transition-all z-100 p-1.5 ${activeDropdown === "priority" ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"}`}
                >
                  {[
                    {
                      label: "All Priorities",
                      value: null,
                      color: "bg-foreground/10",
                    },
                    { label: "Low", value: "low", color: "bg-cyan-400" },
                    {
                      label: "Medium",
                      value: "medium",
                      color: "bg-foreground/40",
                    },
                    { label: "High", value: "high", color: "bg-red-500" },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => {
                        selectPriority(opt.value);
                        setActiveDropdown(null);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-brand/5 transition-colors group/item"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                        <span
                          className={`text-xs font-semibold ${activePriority === opt.value ? "text-brand" : "text-foreground/70"}`}
                        >
                          {opt.label}
                        </span>
                      </div>
                      {activePriority === opt.value && (
                        <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(activeStatus || activePriority) && (
              <button
                onClick={clearFilters}
                className="text-[10px] font-semibold text-brand uppercase tracking-widest hover:underline ml-2"
              >
                Clear All
              </button>
            )}

            <div className="flex-1 min-w-[200px] relative group max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20" />
              <input
                type="text"
                placeholder="Search overview..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-brand/40 transition-all shadow-sm placeholder:text-foreground/20"
              />
            </div>

            {canAdd && (
              <div className="flex items-center gap-2 ml-auto">
                {itemType === "bugs" && (
                  <Link
                    href={`/projects/${projectId}/visual-reporter`}
                    className="flex items-center gap-2 h-9 px-4 bg-surface border border-border text-foreground/60 rounded-xl font-semibold text-[10px] transition-all hover:bg-brand/5 hover:text-brand whitespace-nowrap"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>UI Testing</span>
                  </Link>
                )}
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 h-9 px-5 bg-brand text-white rounded-xl font-semibold text-[10px] transition-all hover:bg-brand/90 shadow-lg shadow-brand/10 active:scale-95 whitespace-nowrap uppercase tracking-widest"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{newItemLabel}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="spatial-card rounded-xl overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-[10px] uppercase font-semibold text-foreground/70 tracking-wider font-mono">
            <tr>
              {isOverview ? (
                <>
                  <th className="px-3 py-4 border-b border-border">
                    Module Name
                  </th>
                  <th className="px-3 py-4 border-b border-border">
                    Total {title}
                  </th>
                </>
              ) : (
                columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-4 border-b border-border"
                  >
                    {col.label}
                  </th>
                ))
              )}
              {(canEdit || canDelete || isOverview) && (
                <th className="px-3 py-4 border-b border-border text-left min-w-[80px]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filteredItems.map((item, index) => (
              <tr
                key={item._id || item.moduleId}
                className="hover:bg-brand/5 transition-all cursor-pointer group"
                onClick={() => {
                  if (isOverview) {
                    handleModuleClick(item.moduleId);
                  } else {
                    setSelectedItem(item);
                    setIsEditMode(false);
                  }
                }}
              >
                {isOverview ? (
                  <>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                          <Layers className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-foreground">
                          {item.moduleId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-brand/5 text-brand border border-brand/20 uppercase tracking-widest">
                        {item.totalItems}{" "}
                        {itemType === "use-cases"
                          ? "Use Cases"
                          : itemType === "test-cases"
                            ? "Test Cases"
                            : "Bugs"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button className="flex items-center gap-2 text-xs font-semibold text-brand hover:underline">
                        View Details <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    {columns.map((col) => {
                      let val = item[col.key];

                      if (col.type === "priority" || col.type === "severity") {
                        const getPriorityStyles = (v: string) => {
                          const val = (v || "Medium").toLowerCase();
                          if (
                            ["critical", "blocker", "high", "major"].includes(
                              val,
                            )
                          ) {
                            return "text-red-500 bg-red-500/10 border-red-500/20";
                          }
                          if (["medium", "moderate"].includes(val)) {
                            return "text-amber-500 bg-amber-500/10 border-amber-500/20";
                          }
                          if (["low", "minor"].includes(val)) {
                            return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
                          }
                          return "text-foreground/50 bg-foreground/5 border-border";
                        };

                        if (canEdit) {
                          const options = ["Low", "Medium", "High", "Critical"];
                          return (
                            <td
                              key={col.key}
                              className="px-3 py-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="relative w-fit group/priority">
                                <select
                                  value={val || "Medium"}
                                  onChange={(e) =>
                                    handleUpdate(item, {
                                      [col.key]: e.target.value,
                                    })
                                  }
                                  disabled={isUpdating}
                                  className={`pl-3 pr-8 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest cursor-pointer outline-none transition-all appearance-none border ${getPriorityStyles(val)} hover:brightness-95 active:scale-95 disabled:opacity-50`}
                                >
                                  {options.map((opt) => (
                                    <option
                                      key={opt}
                                      value={opt}
                                      className="bg-surface text-foreground"
                                    >
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown
                                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 opacity-40 group-hover/priority:opacity-100 transition-opacity pointer-events-none ${getPriorityStyles(val).split(" ")[0]}`}
                                />
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={col.key} className="px-3 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest border ${getPriorityStyles(val)}`}
                            >
                              {val || "Medium"}
                            </span>
                          </td>
                        );
                      }

                      if (col.type === "status" || col.type === "badge") {
                        const getBadgeStyle = (v: string) => {
                          const valLower = (v || "").toLowerCase();
                          const custom =
                            itemType === "bugs"
                              ? customStatuses.find(
                                  (c) => c.name.toLowerCase() === valLower,
                                )
                              : null;

                          if (custom) {
                            const styleObj: any = {};
                            const styleMatch =
                              custom.color.match(/style="([^"]+)"/);
                            if (styleMatch) {
                              styleMatch[1].split(";").forEach((s: string) => {
                                const [key, val] = s
                                  .split(":")
                                  .map((p) => p.trim());
                                if (key && val) {
                                  const camelKey = key.replace(
                                    /-([a-z])/g,
                                    (g) => g[1].toUpperCase(),
                                  );
                                  styleObj[camelKey] = val;
                                }
                              });
                            }
                            return { style: styleObj, className: "" };
                          }

                          const s = (v || "").toLowerCase();
                          if (s === "none" || s === "")
                            return {
                              className:
                                "bg-foreground/5 text-foreground/40 border-foreground/10",
                              style: {},
                            };
                          if (s === "open" || s === "high" || s === "failed")
                            return {
                              className:
                                "bg-red-500/10 text-red-500 border-red-500/20",
                              style: {},
                            };
                          if (s === "passed")
                            return {
                              className:
                                "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                              style: {},
                            };
                          if (
                            s === "pending" ||
                            s === "medium" ||
                            s === "select"
                          )
                            return {
                              className:
                                "bg-amber-500/10 text-amber-500 border-amber-500/20",
                              style: {},
                            };
                          if (s === "resolved" || s === "closed" || s === "low")
                            return {
                              className:
                                "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                              style: {},
                            };
                          return {
                            className: "bg-brand/10 text-brand border-brand/20",
                            style: {},
                          };
                        };

                        const isLinkedUC = col.key === "linkedUseCase";
                        const linkedObj =
                          isLinkedUC && linkedData
                            ? linkedData.find((ld) => ld.customId === val)
                            : null;

                        // Static Linked UC Link
                        if (isLinkedUC && linkedObj) {
                          const badgeInfo = getBadgeStyle(val);
                          return (
                            <td key={col.key} className="px-3 py-4">
                              <Link
                                href={`/projects/${item.projectId}/use-cases?module=${linkedObj.moduleId}&selected=${linkedObj._id}`}
                                onClick={(e) => e.stopPropagation()}
                                className={`px-3 py-1 rounded-full text-[9px] font-semibold uppercase tracking-widest border hover:bg-brand/20 hover:border-brand/40 cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center gap-2 w-fit shadow-sm ${badgeInfo.className}`}
                                style={badgeInfo.style}
                              >
                                {val}
                              </Link>
                            </td>
                          );
                        }

                        // Inline Status Selection
                        if (
                          canEdit &&
                          col.key === "status" &&
                          (itemType === "bugs" || itemType === "test-cases")
                        ) {
                          const options =
                            itemType === "bugs"
                              ? customStatuses.map((c) => c.name)
                              : ["Pending", "Passed", "Failed"];

                          const badgeInfo = getBadgeStyle(
                            val || (itemType === "bugs" ? "None" : "Pending"),
                          );

                          return (
                            <td
                              key={col.key}
                              className="px-3 py-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="relative w-fit group/status">
                                <select
                                  value={val || ""}
                                  onChange={(e) =>
                                    handleUpdate(item, {
                                      status: e.target.value || null,
                                    })
                                  }
                                  disabled={isUpdating}
                                  className={`pl-2.5 pr-6 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border bg-transparent cursor-pointer outline-none focus:ring-2 focus:ring-brand/20 transition-all appearance-none ${badgeInfo.className}`}
                                  style={badgeInfo.style}
                                >
                                  {!val && (
                                    <option
                                      value=""
                                      className="bg-surface text-foreground"
                                    >
                                      None
                                    </option>
                                  )}
                                  {options.map((opt) => (
                                    <option
                                      key={opt}
                                      value={opt}
                                      className="bg-surface text-foreground"
                                    >
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50 group-hover/status:opacity-100 transition-opacity pointer-events-none" />
                              </div>
                            </td>
                          );
                        }

                        if (isLinkedUC && !val) {
                          return (
                            <td
                              key={col.key}
                              className="px-3 py-4 text-foreground/30 italic"
                            >
                              None
                            </td>
                          );
                        }

                        const badgeInfo = getBadgeStyle(
                          val || (itemType === "bugs" ? "None" : "Pending"),
                        );
                        return (
                          <td key={col.key} className="px-3 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-[9px] font-semibold uppercase tracking-widest border shadow-sm ${badgeInfo.className}`}
                              style={badgeInfo.style}
                            >
                              {val ||
                                (itemType === "bugs" ? "None" : "Pending")}
                            </span>
                          </td>
                        );
                      }

                      // Inline Assignee Selection (Bugs Only) - Only if unassigned
                      if (
                        col.key === "assigneeName" &&
                        itemType === "bugs" &&
                        canEdit &&
                        !item.assigneeId
                      ) {
                        return (
                          <td
                            key={col.key}
                            className="px-4 py-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1 group/assignee w-fit cursor-pointer">
                              <div className="relative flex items-center">
                                <select
                                  value={item.assigneeId || "unassigned"}
                                  disabled={isUpdating}
                                  onChange={(e) => {
                                    const user = availableUsers.find(
                                      (u) => u._id === e.target.value,
                                    );
                                    handleUpdate(item, {
                                      assigneeId:
                                        e.target.value === "unassigned"
                                          ? null
                                          : e.target.value,
                                      assigneeName: user
                                        ? user.name
                                        : "Unassigned",
                                      assigneeRole: user
                                        ? user.role
                                        : "Unassigned",
                                      status:
                                        e.target.value === "unassigned"
                                          ? "Open"
                                          : "Pending",
                                    });
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                >
                                  <option
                                    value="unassigned"
                                    className="bg-surface"
                                  >
                                    Unassigned
                                  </option>
                                  {availableUsers.map((u) => (
                                    <option
                                      key={u._id}
                                      value={u._id}
                                      className="bg-surface"
                                    >
                                      {u.name} ({u.role})
                                    </option>
                                  ))}
                                </select>
                                <span className="text-foreground font-medium text-sm hover:text-brand transition-colors whitespace-nowrap">
                                  {item.assigneeName || "Unassigned"}
                                </span>
                              </div>
                              <ChevronDown className="w-4 h-4 text-foreground/40 group-hover/assignee:text-brand transition-colors pointer-events-none shrink-0" />
                            </div>
                          </td>
                        );
                      }

                      if (col.type === "date") {
                        return (
                          <td
                            key={col.key}
                            className="px-4 py-4 text-foreground/75 font-mono text-[10px] uppercase"
                          >
                            {val
                              ? new Date(val).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}
                          </td>
                        );
                      }

                      if (col.type === "mono") {
                        return (
                          <td
                            key={col.key}
                            className="px-4 py-4 font-mono text-xs text-foreground/70"
                          >
                            <div className="flex items-center gap-2">
                              {val}
                              {col.key === "customId" && item.isManual && (
                                <span className="bg-brand/10 text-brand text-[8px] font-semibold uppercase px-1.5 py-0.5 rounded border border-brand/20 flex items-center justify-center h-4">
                                  NEW
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={col.key} className="px-3 py-4">
                          {val ? (
                            <Tooltip content={val}>
                              <div className="truncate max-w-[140px] text-foreground/85 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                                {val}
                              </div>
                            </Tooltip>
                          ) : (
                            <span className="text-foreground/30">—</span>
                          )}
                        </td>
                      );
                    })}
                    {(canEdit || canDelete) && (
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 transition-opacity">
                          {canEdit && (
                            <Tooltip content="Edit Item">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItem(item);
                                  setIsEditMode(true);
                                }}
                                className="p-1.5 rounded-md hover:bg-blue-500/10 text-foreground/60 hover:text-blue-500"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </Tooltip>
                          )}
                          {canDelete && (
                            <Tooltip content="Delete Item">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setItemToDelete(item);
                                }}
                                className="p-1.5 rounded-md hover:bg-red-500/10 text-foreground/60 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={100} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 rounded-[2.5rem] bg-brand/5 border border-brand/10 flex items-center justify-center shadow-inner">
                      <AlertCircle className="w-10 h-10 text-brand/20" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-xl font-semibold text-foreground tracking-tight">
                        No results found
                      </h3>
                      <p className="text-sm text-foreground/40 max-w-[280px] mx-auto leading-relaxed">
                        We couldn't find any {itemType?.replace("-", " ")}{" "}
                        matching your current filters or search query.
                      </p>
                    </div>
                    {(activeStatus || activePriority || searchQuery) && (
                      <button
                        onClick={() => {
                          clearFilters();
                          setSearchQuery("");
                        }}
                        className="mt-2 px-6 py-2 bg-brand/5 hover:bg-brand/10 text-brand rounded-xl font-semibold text-xs transition-all active:scale-95 border border-brand/20"
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages >= 1 && (
        <div className="flex items-center justify-between mt-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-border disabled:opacity-30"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-brand font-mono">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-border disabled:opacity-30"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {selectedItem && (
        <DetailModal
          selectedItem={selectedItem}
          isEditMode={isEditMode}
          itemType={itemType}
          currentUser={currentUser || null}
          availableUsers={availableUsers}
          isUpdating={isUpdating}
          onClose={handleCloseModal}
          onUpdate={handleUpdate}
          linkedData={linkedData}
        />
      )}

      {itemToDelete && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl p-8 max-w-md w-full animate-fade-in-up">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold mb-4">Delete this item?</h3>
            <div className="flex gap-4">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-3 rounded-xl border border-border font-semibold hover:bg-brand/5"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 shadow-lg shadow-red-500/20"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <AddItemModal
        projectId={projectId}
        itemType={itemType}
        activeModule={activeModule}
        linkedData={linkedData}
        onAddSuccess={() => {
          router.refresh();
          setNotification({
            message: `${itemType.replace("-", " ")} created successfully`,
            type: "success",
          });
        }}
        newItemLabel={newItemLabel}
        currentUser={currentUser}
        isOpen={isAddModalOpen}
        setIsOpen={setIsAddModalOpen}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-200 animate-fade-in-up">
          <div className="flex items-center gap-3 px-6 py-3 bg-surface/80 backdrop-blur-md border border-brand/20 rounded-2xl shadow-2xl shadow-brand/10">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {notification.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
