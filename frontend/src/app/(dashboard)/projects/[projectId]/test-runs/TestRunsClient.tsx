"use client";
import { apiClientFetch } from "@/lib/api-client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Play,
  PlusCircle,
  Loader2,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ClipboardList,
  Pencil,
  Trash2,
  X,
  Check,
  XCircle,
  AlertTriangle,
  Circle,
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
  canWrite,
  canEdit,
  canDelete,
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

  const handleModuleClick = (moduleId: string) => {
    // Find the latest run for this module (already sorted by createdAt -1)
    const latestRun = runs.find((r) => (r as any).moduleId === moduleId);

    if (latestRun) {
      router.push(`/projects/${projectId}/test-runs/${latestRun._id}`);
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
      router.push(`/projects/${projectId}/test-runs/${data._id}`);
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
              {modules.map((moduleId) => {
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
