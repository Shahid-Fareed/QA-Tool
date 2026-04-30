"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiClientFetch } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Circle,
  Loader2,
  ClipboardList,
  ChevronRight,
  Play,
  CheckSquare,
  Square,
  MousePointerClick,
  RefreshCw,
  Code,
  Copy,
  Check,
  X,
} from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

// ─── Types ────────────────────────────────────────────────────
type ExecutionStatus = "Untested" | "Passed" | "Failed";

interface TestCaseDetail {
  _id: string;
  customId: string;
  title: string;
  preconditions: string;
  steps: string;
  expectedResult: string;
  description: string;
  priority: string;
  isManual?: boolean;
}

interface Execution {
  testCaseId: TestCaseDetail | string;
  status: ExecutionStatus;
  actualResult: string;
  evidence: string;
}

interface TestRun {
  _id: string;
  title: string;
  status: string;
  executions: Execution[];
}

const statusIcon: Record<ExecutionStatus, React.ReactNode> = {
  Untested: <Circle className="w-4 h-4 text-foreground/30" />,
  Passed: <CheckCircle2 className="w-4 h-4 text-green-400" />,
  Failed: <XCircle className="w-4 h-4 text-red-400" />,
};

const statusPill: Record<ExecutionStatus, string> = {
  Untested: "bg-border/40 text-foreground/40 border-border/60",
  Passed: "bg-green-400/10 text-green-400 border-green-400/20",
  Failed: "bg-red-400/10 text-red-400 border-red-400/20",
};

function getTC(exec: Execution): TestCaseDetail | null {
  if (typeof exec.testCaseId === "object" && exec.testCaseId !== null) {
    return exec.testCaseId as TestCaseDetail;
  }
  return null;
}

// ─── Re-execution filter modal ────────────────────────────────
function ReExecFilterModal({
  run,
  onSelect,
  onCancel,
  onSaveAsNew,
  onReset,
}: {
  run: TestRun;
  onSelect: (filter: ExecutionStatus[]) => void;
  onCancel: () => void;
  onSaveAsNew: () => void;
  onReset: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  const counts = {
    Passed: run.executions.filter((e) => e.status === "Passed").length,
    Failed: run.executions.filter((e) => e.status === "Failed").length,
  };

  const options: {
    label: string;
    filter: ExecutionStatus[];
    color: string;
    bg: string;
    border: string;
    icon: React.ReactNode;
    count: number;
    isAll?: boolean;
  }[] = [
    {
      label: "All Test Cases",
      filter: ["Passed", "Failed", "Untested"],
      color: "text-brand",
      bg: "bg-brand/10",
      border: "border-brand/20",
      icon: <RefreshCw className="w-5 h-5" />,
      count: run.executions.length,
      isAll: true,
    },
    {
      label: "Failed Only",
      filter: ["Failed"],
      color: "text-red-400",
      bg: "bg-red-400/10",
      border: "border-red-400/20",
      icon: <XCircle className="w-5 h-5" />,
      count: counts.Failed,
    },
    {
      label: "Passed Only",
      filter: ["Passed"],
      color: "text-green-400",
      bg: "bg-green-400/10",
      border: "border-green-400/20",
      icon: <CheckCircle2 className="w-5 h-5" />,
      count: counts.Passed,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl animate-fade-in-up overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-brand" />
            </div>
            <h2 className="font-semibold text-foreground text-base">
              {showConfirm ? "Are you sure?" : "Re-execute Run"}
            </h2>
          </div>
          <p className="text-sm text-foreground/50 ml-12">
            {showConfirm
              ? "This run is already completed. Would you like to Reset and start new run"
              : "Which test cases do you want to re-execute?"}
          </p>
        </div>

        {!showConfirm ? (
          <>
            {/* Options */}
            <div className="p-4 grid grid-cols-2 gap-3">
              {options.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => {
                    if (opt.count === 0) return;
                    if (opt.isAll) setShowConfirm(true);
                    else onSelect(opt.filter);
                  }}
                  disabled={opt.count === 0}
                  className={`flex flex-col items-start gap-2 p-4 rounded-xl border transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-100 ${opt.bg} ${opt.border} hover:brightness-110`}
                >
                  <span className={opt.color}>{opt.icon}</span>
                  <div className="text-left">
                    <p className={`text-sm font-semibold ${opt.color}`}>
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-foreground/50 mt-0.5">
                      {opt.count} test case{opt.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Cancel */}
            <div className="px-4 pb-5 flex justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-sm text-foreground/50 hover:text-foreground hover:bg-brand/5 transition-colors"
              >
                Cancel — View Only
              </button>
            </div>
          </>
        ) : (
          <div className="p-6 space-y-3">
            <button
              onClick={onReset}
              className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-brand text-white font-semibold hover:brightness-110 transition-all shadow-lg shadow-brand/20"
            >
              <CheckCircle2 className="w-5 h-5" />
              Yes, Reset and Start
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-surface border border-border text-foreground/60 font-semibold hover:bg-brand/5 transition-all"
            >
              <X className="w-5 h-5" />
              No, Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────
export default function ExecutionStepperClient({
  runId,
  projectId,
  canEdit,
}: {
  runId: string;
  projectId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [run, setRun] = useState<TestRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [actualResult, setActualResult] = useState("");
  const [saving, setSaving] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // ── Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // AI Script Generation
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptsMap, setScriptsMap] = useState<
    Record<string, { script: string; framework: string; language: string }>
  >({});
  const [showScriptForActive, setShowScriptForActive] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState("Playwright");
  const [selectedLanguage, setSelectedLanguage] = useState("TypeScript");
  const [isCopied, setIsCopied] = useState(false);

  // ── Re-execution state (for completed runs)
  const [showReExecModal, setShowReExecModal] = useState(false);
  // null = not editing; array = which statuses to show for re-exec
  const [reExecFilter, setReExecFilter] = useState<ExecutionStatus[] | null>(
    null,
  );

  // Fetch run with populated test case details
  const fetchRun = useCallback(async () => {
    const res = await apiClientFetch(`/api/test-runs/${runId}`);
    const data = await res.json();

    // Sort executions naturally by customId if testCaseId is populated
    if (data.executions) {
      data.executions.sort((a: any, b: any) => {
        const idA =
          typeof a.testCaseId === "object"
            ? a.testCaseId?.customId || "ZZZ"
            : "ZZZ";
        const idB =
          typeof b.testCaseId === "object"
            ? b.testCaseId?.customId || "ZZZ"
            : "ZZZ";
        return idA.localeCompare(idB, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
    }

    setRun(data);
    setLoading(false);

    // Only auto-jump to first untested if the run is NOT completed
    if (data.status !== "Completed") {
      const firstUntested = data.executions?.findIndex(
        (e: Execution) => e.status === "Untested",
      );
      if (firstUntested >= 0) setActiveIdx(firstUntested);
    }
  }, [runId]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  // Show re-exec modal ONLY on initial load if the run is already completed
  useEffect(() => {
    if (loading || !run || !isInitialLoad) return;

    if (run.status === "Completed" && canEdit && reExecFilter === null) {
      setShowReExecModal(true);
      setIsInitialLoad(false);
    } else if (run.status !== "Completed") {
      setIsInitialLoad(false);
    }
  }, [loading, run, canEdit, reExecFilter, isInitialLoad]);

  // Sync actualResult and reset AI states when active execution changes
  useEffect(() => {
    if (!run) return;
    setActualResult(run.executions[activeIdx]?.actualResult ?? "");
    setIsGeneratingScript(false);
    setShowScriptForActive(false);
  }, [activeIdx, run]);

  // Clear selection when leaving select mode
  useEffect(() => {
    if (!selectMode) setSelectedIds(new Set());
  }, [selectMode]);

  // ── Filtered executions (for re-execution mode)
  // reExecFilter === null  → modal hasn't shown yet (show all)
  // reExecFilter === []    → user chose "View Only" (show all, no editing)
  // reExecFilter has items → show only matching statuses
  const visibleExecutions = run
    ? reExecFilter !== null && reExecFilter.length > 0
      ? run.executions.filter((e) => reExecFilter.includes(e.status))
      : run.executions
    : [];

  // Clamp activeIdx to visible list
  const safeActiveIdx = Math.min(
    activeIdx,
    Math.max(0, visibleExecutions.length - 1),
  );
  const activeExec = visibleExecutions[safeActiveIdx];
  const activeTC = activeExec ? getTC(activeExec) : null;

  // ── Toggle single item selection
  const toggleSelect = (tcId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tcId)) next.delete(tcId);
      else next.add(tcId);
      return next;
    });
  };

  // ── Select / deselect all (only visible)
  const allIds =
    (visibleExecutions.map((e) => getTC(e)?._id).filter(Boolean) as string[]) ??
    [];
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allIds));
  };

  // ── Select remaining (Untested only)
  const selectRemaining = () => {
    const remainingIds = visibleExecutions
      .filter((e) => e.status === "Untested")
      .map((e) => getTC(e)?._id)
      .filter(Boolean) as string[];

    setSelectedIds((prev) => {
      const next = new Set(prev);
      remainingIds.forEach((id) => next.add(id));
      return next;
    });
  };

  // ── Single mark
  const handleMark = async (status: ExecutionStatus) => {
    if (!activeTC || !canEdit) return;
    setSaving(true);

    const res = await apiClientFetch(`/api/test-runs/${runId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testCaseId: activeTC._id, status, actualResult }),
    });
    const updated: TestRun = await res.json();
    setRun(updated);
    setSaving(false);

    // In re-exec mode, advance to next item in the filtered list that hasn't been re-marked yet
    // Just advance by index within visible list
    if (safeActiveIdx < visibleExecutions.length - 1) {
      setActiveIdx(safeActiveIdx + 1);
    }
  };

  // ── Bulk mark
  const handleBulkMark = async (status: ExecutionStatus) => {
    if (!canEdit || selectedIds.size === 0) return;
    setSaving(true);

    const bulk = Array.from(selectedIds).map((id) => ({
      testCaseId: id,
      status,
      actualResult: "",
    }));

    const res = await apiClientFetch(`/api/test-runs/${runId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulk }),
    });
    const updated: TestRun = await res.json();
    setRun(updated);
    setSaving(false);
    setSelectedIds(new Set());
    setSelectMode(false);

    if (safeActiveIdx < visibleExecutions.length - 1) {
      setActiveIdx(safeActiveIdx + 1);
    }
  };

  // ── Save as New (v2, v3, etc)
  const handleSaveAsNew = async () => {
    if (!run) return;
    setSaving(true);
    try {
      const res = await apiClientFetch(`/api/projects/${projectId}/test-runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: run.title }),
      });
      const newRun = await res.json();
      router.push(`/projects/${projectId}/test-runs/${newRun._id}`);
    } catch (err) {
      console.error("Failed to save as new run:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Reset Current
  const handleResetCurrent = async () => {
    if (!run) return;
    setSaving(true);
    try {
      const res = await apiClientFetch(`/api/test-runs/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetAll: true }),
      });
      const updated = await res.json();
      setRun(updated);
      setShowReExecModal(false);
      setActiveIdx(0);
    } catch (err) {
      console.error("Failed to reset current run:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!activeTC) return;

    // If already generated, just show it
    if (scriptsMap[activeTC._id]) {
      setShowScriptForActive(true);
      return;
    }

    setIsGeneratingScript(true);
    try {
      const res = await apiClientFetch(
        `/api/generate/${activeTC._id}/generate-script`,
        {
          method: "POST",
          body: JSON.stringify({
            framework: selectedFramework,
            language: selectedLanguage,
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        setScriptsMap((prev) => ({
          ...prev,
          [activeTC._id]: {
            script: data.script,
            framework: selectedFramework,
            language: selectedLanguage,
          },
        }));
        setShowScriptForActive(true);
      }
    } catch (err) {
      console.error("Generation error:", err);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const copyToClipboard = () => {
    const script = scriptsMap[activeTC?._id ?? ""]?.script;
    if (!script) return;
    navigator.clipboard.writeText(script);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Progress (always off the full run)
  const total = run?.executions.length ?? 0;
  const done =
    run?.executions.filter((e) => e.status !== "Untested").length ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  // Are we in re-execution editing mode? (filter chosen with items)
  const isReExec = reExecFilter !== null && reExecFilter.length > 0;
  // Can action buttons appear?
  // - Normal run (not completed): yes if canEdit
  // - Completed + chose a filter: yes if canEdit
  // - Completed + chose "View Only" ([]): no
  // - Read-only user: never
  const showActions = canEdit && (run?.status !== "Completed" || isReExec);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-6 h-6 text-brand animate-spin" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] text-foreground/40">
        Test run not found.
      </div>
    );
  }

  return (
    <>
      {/* ── Re-execution filter modal */}
      {showReExecModal && (
        <ReExecFilterModal
          run={run}
          onSelect={(filter) => {
            setReExecFilter(filter);
            setShowReExecModal(false);
            setActiveIdx(0);
          }}
          onCancel={() => {
            setReExecFilter([]); // empty = view-only, no filter active but no editing
            setShowReExecModal(false);
          }}
          onSaveAsNew={handleSaveAsNew}
          onReset={handleResetCurrent}
        />
      )}

      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        {/* ── Top Bar ── */}
        <header className="shrink-0 flex items-center gap-4 px-5 py-3 border-b border-border bg-surface/80 backdrop-blur-sm">
          <Tooltip content="Back to Test Runs" side="bottom">
            <Link
              href={`/projects/${projectId}/test-runs`}
              className="p-1.5 rounded-lg text-foreground/50 hover:text-brand hover:bg-brand/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Tooltip>

          <div className="flex items-center gap-2 min-w-0">
            <ClipboardList className="w-4 h-4 text-brand shrink-0" />
            <span className="font-semibold text-foreground text-sm truncate">
              {run.title}
            </span>
          </div>

          {/* Progress bar */}
          <div className="flex-1 hidden sm:flex items-center gap-3 max-w-xs">
            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-brand transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-foreground/50 shrink-0">
              {done}/{total}
            </span>
          </div>

          {/* Overall status */}
          <span
            className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
              run.status === "Completed"
                ? "bg-green-400/10 text-green-400 border-green-400/20"
                : run.status === "In Progress"
                  ? "bg-brand/10 text-brand border-brand/20"
                  : "bg-yellow-400/10 text-yellow-400 border-yellow-400/20"
            }`}
          >
            {run.status}
          </span>

          {/* Re-execute button (completed runs) */}
          {run.status === "Completed" && canEdit && (
            <button
              onClick={() => {
                setReExecFilter(null);
                setShowReExecModal(true);
              }}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand/10 border border-brand/20 text-brand text-xs font-semibold hover:bg-brand/20 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-execute
            </button>
          )}
        </header>

        {/* Re-exec filter banner */}
        {isReExec && reExecFilter!.length > 0 && (
          <div className="shrink-0 px-5 py-2 bg-brand/5 border-b border-brand/10 flex items-center justify-between gap-4">
            <p className="text-xs text-brand/80 font-medium">
              Re-executing:{" "}
              <span className="font-semibold">
                {reExecFilter!.join(", ")} ({visibleExecutions.length} test
                cases)
              </span>
            </p>
            <button
              onClick={() => {
                setReExecFilter(null);
                setShowReExecModal(true);
              }}
              className="text-[10px] text-brand/60 hover:text-brand transition-colors font-semibold uppercase tracking-wider"
            >
              Change filter
            </button>
          </div>
        )}

        {/* ── Split Pane ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* ─── LEFT PANE: Execution List ─── */}
          <aside className="w-72 shrink-0 border-r border-border flex flex-col overflow-hidden bg-surface/50">
            {/* Left pane header with select mode toggle */}
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase font-semibold text-foreground/40 tracking-widest">
                {isReExec && reExecFilter!.length > 0
                  ? `Filtered (${visibleExecutions.length})`
                  : `Test Cases (${total})`}
              </p>
              {showActions && (
                <button
                  onClick={() => setSelectMode((v) => !v)}
                  className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all ${
                    selectMode
                      ? "bg-brand/20 text-brand border border-brand/30"
                      : "text-foreground/40 hover:text-brand hover:bg-brand/10 border border-transparent"
                  }`}
                >
                  <MousePointerClick className="w-3 h-3" />
                  {selectMode ? "Cancel" : "Select"}
                </button>
              )}
            </div>

            {/* Select all bar */}
            {selectMode && (
              <div className="px-4 py-2 border-b border-border bg-brand/5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleAll}
                    className="flex items-center gap-2 text-xs text-foreground/60 hover:text-brand transition-colors font-medium"
                  >
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4 text-brand" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>

                  {!allSelected &&
                    visibleExecutions.some((e) => e.status === "Untested") && (
                      <button
                        onClick={selectRemaining}
                        className="text-[10px] font-semibold uppercase tracking-widest text-brand hover:brightness-125 transition-all bg-brand/10 px-2 py-0.5 rounded cursor-pointer"
                      >
                        Select Remaining
                      </button>
                    )}
                </div>
                {selectedIds.size > 0 && (
                  <span className="text-[10px] font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                    {selectedIds.size} selected
                  </span>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {visibleExecutions.map((exec, idx) => {
                const tc = getTC(exec);
                const tcId = tc?._id ?? "";
                const isActive = idx === safeActiveIdx;
                const isSelected = selectMode && selectedIds.has(tcId);

                return (
                  <button
                    key={tcId || idx}
                    onClick={() => {
                      if (selectMode && tcId) {
                        toggleSelect(tcId);
                      } else {
                        setActiveIdx(idx);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all border-b border-border/50 ${
                      isSelected
                        ? "bg-brand/15 border-l-2 border-l-brand"
                        : isActive && !selectMode
                          ? "bg-brand/10 border-l-2 border-l-brand"
                          : "hover:bg-brand/5 border-l-2 border-l-transparent"
                    }`}
                  >
                    <span className="shrink-0">
                      {selectMode ? (
                        isSelected ? (
                          <CheckSquare className="w-4 h-4 text-brand" />
                        ) : (
                          <Square className="w-4 h-4 text-foreground/30" />
                        )
                      ) : (
                        statusIcon[exec.status]
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-xs font-mono font-semibold ${
                            isSelected || (isActive && !selectMode)
                              ? "text-brand"
                              : "text-foreground/40"
                          }`}
                        >
                          {tc?.customId ?? "—"}
                        </p>
                        {tc?.isManual && (
                          <span className="bg-brand/10 text-brand text-[8px] font-semibold uppercase px-1 py-0.5 rounded border border-brand/20 flex items-center justify-center">
                            NEW
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs truncate mt-0.5 ${
                          isSelected || (isActive && !selectMode)
                            ? "text-foreground"
                            : "text-foreground/60"
                        }`}
                      >
                        {tc?.title ?? "Loading..."}
                      </p>
                    </div>

                    {selectMode && (
                      <span className="shrink-0">
                        {statusIcon[exec.status]}
                      </span>
                    )}
                    {!selectMode && isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-brand shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bulk Action Footer */}
            {selectMode && selectedIds.size > 0 && (
              <div className="shrink-0 border-t border-border bg-surface/90 backdrop-blur-sm p-3 space-y-2 animate-fade-in-up">
                <p className="text-[10px] uppercase font-semibold text-foreground/40 tracking-widest text-center">
                  Mark {selectedIds.size} selected as
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => handleBulkMark("Passed")}
                    disabled={saving}
                    className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl bg-green-400/15 text-green-400 border border-green-400/25 text-[10px] font-semibold hover:bg-green-400/25 transition-all disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Passed
                  </button>
                  <button
                    onClick={() => handleBulkMark("Failed")}
                    disabled={saving}
                    className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl bg-red-400/15 text-red-400 border border-red-400/25 text-[10px] font-semibold hover:bg-red-400/25 transition-all disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Failed
                  </button>
                </div>
              </div>
            )}
          </aside>

          {/* ─── RIGHT PANE: Active Execution ─── */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Select mode hint */}
            {selectMode && (
              <div className="shrink-0 px-6 py-3 bg-brand/5 border-b border-brand/10 flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-brand" />
                <p className="text-xs text-brand/80 font-medium">
                  Click test cases in the left panel to select them, then use
                  the bulk action buttons below the list to mark them all at
                  once.
                </p>
              </div>
            )}

            {!activeTC ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-green-400/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {isReExec && reExecFilter!.length > 0
                      ? "No test cases match the selected filter."
                      : "All done!"}
                  </p>
                  <p className="text-sm text-foreground/50 mt-1">
                    {isReExec && reExecFilter!.length > 0
                      ? "Try a different filter or go back."
                      : "All test cases have been executed."}
                  </p>
                </div>
                <Link
                  href={`/projects/${projectId}/test-runs`}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-brand/20 text-brand border border-brand/30 text-sm font-semibold hover:bg-brand/30 transition-all"
                >
                  Back to Test Runs
                </Link>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Details Section (scrollable) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                  {/* TC Header */}
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded">
                          {activeTC.customId}
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${statusPill[activeExec!.status]}`}
                        >
                          {activeExec!.status}
                        </span>
                        <span className="text-[10px] uppercase text-foreground/30 font-semibold tracking-wider px-2 py-0.5 rounded border border-border">
                          {activeTC.priority}
                        </span>
                        {activeTC.isManual && (
                          <span className="bg-brand/10 text-brand text-[8px] font-semibold uppercase px-2 py-0.5 rounded border border-brand/20">
                            Manual
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg font-semibold text-foreground">
                        {activeTC.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      {!showScriptForActive && !isGeneratingScript && (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={selectedFramework}
                            onChange={(e) =>
                              setSelectedFramework(e.target.value)
                            }
                            className="bg-brand/5 border border-border rounded-lg px-2 py-1 text-[10px] font-semibold text-foreground outline-none focus:border-brand/40"
                          >
                            <option value="Playwright">Playwright</option>
                            <option value="Cypress">Cypress</option>
                            <option value="Selenium">Selenium</option>
                          </select>
                          <select
                            value={selectedLanguage}
                            onChange={(e) =>
                              setSelectedLanguage(e.target.value)
                            }
                            className="bg-brand/5 border border-border rounded-lg px-2 py-1 text-[10px] font-semibold text-foreground outline-none focus:border-brand/40"
                          >
                            <option value="TypeScript">TypeScript</option>
                            <option value="JavaScript">JavaScript</option>
                            <option value="Python">Python</option>
                          </select>
                          <button
                            onClick={handleGenerateScript}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-brand/10 text-brand border border-brand/20 hover:bg-brand/20 transition-all"
                          >
                            <Code className="w-3 h-3" /> Generate Script
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isGeneratingScript && (
                    <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-brand/5 border border-brand/10 animate-pulse">
                      <Loader2 className="w-6 h-6 text-brand animate-spin mb-3" />
                      <p className="text-xs font-semibold text-brand">
                        AI is crafting your automation script...
                      </p>
                    </div>
                  )}

                  {showScriptForActive && scriptsMap[activeTC._id] && (
                    <div className="relative group/code animate-fade-in space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[10px] uppercase font-semibold text-brand tracking-widest">
                            AI Generated Script (
                            {scriptsMap[activeTC._id].framework} -{" "}
                            {scriptsMap[activeTC._id].language})
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Tooltip content="Change settings & rewrite">
                            <button
                              onClick={() => {
                                setScriptsMap((prev) => {
                                  const next = { ...prev };
                                  delete next[activeTC._id];
                                  return next;
                                });
                                setShowScriptForActive(false);
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 hover:bg-blue-500/20 transition-all text-[10px] font-semibold"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Rewrite
                            </button>
                          </Tooltip>
                          <div className="w-px h-4 bg-border mx-1 self-center" />
                          <Tooltip content="Copy Code">
                            <button
                              onClick={copyToClipboard}
                              className="p-1.5 rounded-lg bg-surface border border-border text-foreground/60 hover:text-brand transition-all"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </Tooltip>
                          <Tooltip content="Close Script">
                            <button
                              onClick={() => setShowScriptForActive(false)}
                              className="p-1.5 rounded-lg bg-surface border border-border text-foreground/60 hover:text-red-500 transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                      <pre className="p-5 rounded-2xl bg-slate-950 text-slate-300 text-[10px] font-mono overflow-x-auto max-h-64 custom-scrollbar border border-border/50 shadow-inner">
                        <code>{scriptsMap[activeTC._id].script}</code>
                      </pre>
                    </div>
                  )}

                  {/* Preconditions */}
                  {activeTC.preconditions && (
                    <section className="spatial-card rounded-xl p-5 border border-border space-y-2">
                      <p className="text-[10px] uppercase font-semibold text-foreground/40 tracking-widest">
                        Preconditions
                      </p>
                      <div className="prose prose-sm prose-invert max-w-none text-foreground/80 text-sm leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {activeTC.preconditions}
                        </ReactMarkdown>
                      </div>
                    </section>
                  )}

                  {/* Steps */}
                  {activeTC.steps && (
                    <section className="spatial-card rounded-xl p-5 border border-border space-y-2">
                      <p className="text-[10px] uppercase font-semibold text-foreground/40 tracking-widest">
                        Test Steps
                      </p>
                      <div className="prose prose-sm prose-invert max-w-none text-foreground/80 text-sm leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {activeTC.steps}
                        </ReactMarkdown>
                      </div>
                    </section>
                  )}

                  {/* Expected Result */}
                  {activeTC.expectedResult && (
                    <section className="spatial-card rounded-xl p-5 border border-green-400/10 bg-green-400/5 space-y-2">
                      <p className="text-[10px] uppercase font-semibold text-green-400/60 tracking-widest">
                        Expected Result
                      </p>
                      <div className="prose prose-sm max-w-none text-foreground/80 text-sm leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {activeTC.expectedResult}
                        </ReactMarkdown>
                      </div>
                    </section>
                  )}
                </div>

                {/* ─── Action Form (fixed bottom) ─── */}
                {!selectMode && (
                  <div className="shrink-0 border-t border-border bg-surface/80 backdrop-blur-sm p-5 space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-foreground/40 tracking-widest mb-2">
                        Actual Result
                      </label>
                      <textarea
                        value={actualResult}
                        onChange={(e) => setActualResult(e.target.value)}
                        disabled={!showActions || saving}
                        placeholder="Describe what actually happened during execution..."
                        rows={3}
                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-brand/40 resize-none disabled:opacity-50"
                      />
                    </div>

                    {showActions ? (
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          onClick={() => handleMark("Passed")}
                          disabled={saving}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-400/20 text-green-400 border border-green-400/30 text-sm font-semibold hover:bg-green-400/30 transition-all disabled:opacity-50"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          Mark Passed
                        </button>
                        <button
                          onClick={() => handleMark("Failed")}
                          disabled={saving}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-400/20 text-red-400 border border-red-400/30 text-sm font-semibold hover:bg-red-400/30 transition-all disabled:opacity-50"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Mark Failed
                        </button>

                        {/* Skip/next (only for non-completed runs) */}
                        {run.status !== "Completed" && (
                          <button
                            disabled={saving}
                            onClick={() => {
                              const nextIdx = visibleExecutions.findIndex(
                                (e, i) =>
                                  i > safeActiveIdx && e.status === "Untested",
                              );
                              if (nextIdx >= 0) setActiveIdx(nextIdx);
                            }}
                            className="ml-auto flex items-center gap-1.5 text-xs text-foreground/40 hover:text-foreground/70 transition-colors"
                          >
                            <Play className="w-3.5 h-3.5" /> Skip to next
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-foreground/40 italic">
                        {run.status === "Completed"
                          ? 'Click "Re-execute" in the top bar to modify results.'
                          : "You have read-only access to this test run."}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
