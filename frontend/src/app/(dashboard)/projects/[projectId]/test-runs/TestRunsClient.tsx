"use client";
import { apiClientFetch } from "@/lib/api-client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Play,
  Loader2,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ClipboardList,
  Search,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react";

interface TestRun {
  _id: string;
  title: string;
  status: "Pending" | "In Progress" | "Completed";
  executions: { status: string }[];
  createdAt: string;
}

const statusConfig = {
  Pending: {
    icon: Clock,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/20",
  },
  "In Progress": {
    icon: Play,
    color: "text-brand",
    bg: "bg-brand/10",
    border: "border-brand/20",
  },
  Completed: {
    icon: CheckCircle2,
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
  },
};

export default function TestRunsClient({
  projectId,
}: {
  projectId: string;
  canWrite: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [modules, setModules] = useState<string[]>([]);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name-asc");
  const [activeDropdown, setActiveDropdown] = useState<"status" | "sort" | null>(null);
  const searchParams = useSearchParams();
  const autoModule = searchParams.get("module");
  const autoSelected = searchParams.get("selected");

  const filteredModules = modules.filter((moduleId) => {
    if (
      searchQuery &&
      !moduleId.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (statusFilter !== "All") {
      const moduleRuns = runs.filter((r) => (r as any).moduleId === moduleId);
      const latestRun = moduleRuns[0];
      const status = latestRun ? latestRun.status : "No Runs";
      if (status !== statusFilter) {
        return false;
      }
    }
    return true;
  });

  const sortedModules = [...filteredModules].sort((a, b) => {
    const aTCs = testCases.filter((tc) => tc.moduleId === a).length;
    const bTCs = testCases.filter((tc) => tc.moduleId === b).length;

    const aRuns = runs.filter((r) => (r as any).moduleId === a);
    const bRuns = runs.filter((r) => (r as any).moduleId === b);
    const aLatest = aRuns[0];
    const bLatest = bRuns[0];

    const getStatusWeight = (status: string) => {
      switch (status) {
        case "Completed":
          return 4;
        case "In Progress":
          return 3;
        case "Pending":
          return 2;
        default:
          return 1;
      }
    };

    const getProgressPct = (run: any) => {
      if (!run || !run.executions.length) return 0;
      const untested = run.executions.filter(
        (e: any) => e.status === "Untested",
      ).length;
      return Math.round(
        ((run.executions.length - untested) / run.executions.length) * 100,
      );
    };

    switch (sortBy) {
      case "name-asc":
        return a.localeCompare(b);
      case "name-desc":
        return b.localeCompare(a);
      case "tc-desc":
        return bTCs - aTCs;
      case "tc-asc":
        return aTCs - bTCs;
      case "status":
        const aStatusVal = aLatest ? getStatusWeight(aLatest.status) : 0;
        const bStatusVal = bLatest ? getStatusWeight(bLatest.status) : 0;
        return bStatusVal - aStatusVal;
      case "progress":
        const aProg = getProgressPct(aLatest);
        const bProg = getProgressPct(bLatest);
        return bProg - aProg;
      default:
        return 0;
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [runsRes, tcRes] = await Promise.all([
          apiClientFetch(`/api/projects/${projectId}/test-runs`),
          apiClientFetch(
            `/api/projects/${projectId}/data/test-cases?priority=all&limit=1000`,
          ),
        ]);

        const runsData = await runsRes.json();
        const tcData = await tcRes.json();

        const allRuns = Array.isArray(runsData) ? runsData : [];
        setRuns(allRuns);

        const allTCs = tcData.data || [];
        setTestCases(allTCs);

        const uniqueModules = Array.from(
          new Set(allTCs.map((tc: any) => tc.moduleId)),
        ).filter(Boolean) as string[];
        setModules(uniqueModules.sort());
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".filter-container")) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (loading || !autoModule || runs.length === 0) return;
    handleModuleClick(autoModule, autoSelected || undefined);
  }, [loading, autoModule, runs]);

  const handleModuleClick = (moduleId: string, selectedId?: string) => {
    // Find the latest run for this module (already sorted by createdAt -1)
    const latestRun = runs.find((r) => (r as any).moduleId === moduleId);

    if (latestRun) {
      router.replace(
        `/projects/${projectId}/test-runs/${latestRun._id}${selectedId ? `?selected=${selectedId}` : ""}`,
      );
      return;
    }

    // Otherwise, create a new run for this module
    startTransition(async () => {
      const res = await apiClientFetch(`/api/projects/${projectId}/test-runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create run");
        return;
      }
      router.replace(
        `/projects/${projectId}/test-runs/${data._id}${selectedId ? `?selected=${selectedId}` : ""}`,
      );
    });
  };

  const getProgress = (run: TestRun) => {
    const total = run.executions.length;
    if (!total)
      return {
        pct: 0,
        done: 0,
        total: 0,
        passed: 0,
        failed: 0,
        untested: 0,
      };
    const passed = run.executions.filter((e) => e.status === "Passed").length;
    const failed = run.executions.filter((e) => e.status === "Failed").length;
    const untested = run.executions.filter(
      (e) => e.status === "Untested",
    ).length;
    const done = total - untested;
    return {
      pct: Math.round((done / total) * 100),
      done,
      total,
      passed,
      failed,
      untested,
    };
  };

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 py-10 space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1.5 text-xs text-foreground/50 hover:text-brand transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Project
          </Link>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-brand" /> Modules
          </h1>
          <p className="text-sm text-foreground/50 mt-1">
            Select a module to start or continue testing.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      {!loading && modules.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 py-4">
          {/* Status Filter */}
          <div className="relative filter-container z-20">
            <button
              onClick={() => setActiveDropdown(activeDropdown === "status" ? null : "status")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all font-semibold text-xs ${
                activeDropdown === "status"
                  ? "bg-brand/5 border-brand/50 text-brand"
                  : "bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-slate-900 dark:text-neutral-100"
              }`}
            >
              <span>{statusFilter === "All" ? "Status" : statusFilter}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 transition-transform duration-200 ${
                  activeDropdown === "status" ? "rotate-180 text-brand" : ""
                }`}
              />
            </button>

            <div
              className={`absolute top-full left-0 mt-2 w-48 bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 rounded-xl shadow-lg transition-all duration-150 p-1.5 z-50 ${
                activeDropdown === "status"
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-2 pointer-events-none"
              }`}
            >
              {[
                { value: "All", label: "Status" },
                { value: "Pending", label: "Pending" },
                { value: "In Progress", label: "In Progress" },
                { value: "Completed", label: "Completed" },
                { value: "No Runs", label: "No Runs" },
              ].map((opt) => {
                const isSelected = statusFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setStatusFilter(opt.value);
                      setActiveDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-xs font-semibold ${
                      isSelected
                        ? "bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold"
                        : "text-slate-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort Selector */}
          <div className="relative filter-container z-20">
            <button
              onClick={() => setActiveDropdown(activeDropdown === "sort" ? null : "sort")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all font-semibold text-xs ${
                activeDropdown === "sort"
                  ? "bg-brand/5 border-brand/50 text-brand"
                  : "bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-slate-900 dark:text-neutral-100"
              }`}
            >
              <span>
                {sortBy === "name-asc" && "Sort: Module ID (A-Z)"}
                {sortBy === "name-desc" && "Sort: Module ID (Z-A)"}
                {sortBy === "tc-desc" && "Sort: Max Test Cases"}
                {sortBy === "tc-asc" && "Sort: Min Test Cases"}
                {sortBy === "status" && "Sort: Status"}
                {sortBy === "progress" && "Sort: Progress %"}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 transition-transform duration-200 ${
                  activeDropdown === "sort" ? "rotate-180 text-brand" : ""
                }`}
              />
            </button>

            <div
              className={`absolute top-full left-0 mt-2 w-56 bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 rounded-xl shadow-lg transition-all duration-150 p-1.5 z-50 ${
                activeDropdown === "sort"
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-2 pointer-events-none"
              }`}
            >
              {[
                { value: "name-asc", label: "Sort: Module ID (A-Z)" },
                { value: "name-desc", label: "Sort: Module ID (Z-A)" },
                { value: "tc-desc", label: "Sort: Max Test Cases" },
                { value: "tc-asc", label: "Sort: Min Test Cases" },
                { value: "status", label: "Sort: Status" },
                { value: "progress", label: "Sort: Progress %" },
              ].map((opt) => {
                const isSelected = sortBy === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSortBy(opt.value);
                      setActiveDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-xs font-semibold ${
                      isSelected
                        ? "bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold"
                        : "text-slate-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Input */}
          <div className="flex-1 min-w-[200px] relative group max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 group-hover:text-slate-500 dark:group-hover:text-neutral-400 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search modules..."
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-brand/60 focus:bg-white dark:focus:bg-neutral-900 transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modules Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-brand animate-spin" />
        </div>
      ) : modules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center">
            <ClipboardList className="w-8 h-8 text-brand/50" />
          </div>
          <p className="text-foreground/50 text-sm">
            No modules found in this project. Create test cases first.
          </p>
        </div>
      ) : sortedModules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-border/20 flex items-center justify-center">
            <Search className="w-8 h-8 text-foreground/30" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              No matching modules found
            </p>
            <p className="text-foreground/40 text-sm mt-1">
              Try adjusting your search query, status filter or sort order to
              find what you're looking for.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("All");
              setSortBy("name-asc");
            }}
            className="px-4 py-2 rounded-xl bg-brand/10 border border-brand/20 text-brand text-xs font-semibold hover:bg-brand/20 transition-all cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="spatial-card rounded-2xl overflow-hidden border border-border bg-surface/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface/80">
                <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-foreground/40">
                  Module Name
                </th>
                <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-foreground/40 text-center">
                  Test Cases
                </th>
                <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-foreground/40 text-center">
                  Status
                </th>
                <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest text-foreground/40">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {sortedModules.map((moduleId) => {
                const moduleTCs = testCases.filter(
                  (tc) => tc.moduleId === moduleId,
                );
                const moduleRuns = runs.filter(
                  (r) => (r as any).moduleId === moduleId,
                );
                const latestRun = moduleRuns[0];

                const stats = latestRun ? getProgress(latestRun) : null;
                const cfg = latestRun ? statusConfig[latestRun.status] : null;
                const StatusIcon = cfg?.icon;

                return (
                  <tr
                    key={moduleId}
                    className="group hover:bg-brand/5 transition-colors cursor-pointer"
                    onClick={() => handleModuleClick(moduleId)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center border border-brand/10 group-hover:scale-110 transition-transform">
                          <ClipboardList className="w-5 h-5 text-brand" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground group-hover:text-brand transition-colors">
                            {moduleId}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-semibold text-foreground/70">
                          {moduleTCs.length} TestCases
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-center">
                      {latestRun ? (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${cfg?.bg} ${cfg?.color} ${cfg?.border}`}
                        >
                          {StatusIcon && <StatusIcon className="w-3 h-3" />}
                          {latestRun.status}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-foreground/20 uppercase tracking-widest italic">
                          No Runs
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-5 min-w-[200px]">
                      {stats ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-green-400 font-semibold">
                                {stats.passed} Passed
                              </span>
                              <span className="text-[10px] text-red-400 font-semibold">
                                {stats.failed} Failed
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-foreground/40">
                              {stats.done}/{stats.total}
                            </span>
                          </div>
                          <div className="h-1.5 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand transition-all duration-500 shadow-[0_0_8px_rgba(16,217,180,0.4)]"
                              style={{ width: `${stats.pct}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-foreground/30 italic">
                          Not started yet
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
