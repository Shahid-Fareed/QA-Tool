import {
  AlertCircle,
  Clock,
  CheckCircle2,
  ListTodo,
  Filter,
  X,
  Camera,
  Info,
} from "lucide-react";
import { ResourceStats } from "@/lib/types";
import { Tooltip } from "@/components/ui/Tooltip";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PriorityStatsProps {
  serverStats: ResourceStats;
  activePriority: string | null;
  onSelectPriority: (priority: string | null) => void;
  itemType?: "use-cases" | "test-cases" | "bugs";
}

const PriorityStats: React.FC<PriorityStatsProps> = ({
  serverStats,
  activePriority,
  onSelectPriority,
  itemType,
}) => {
  const total = serverStats.total || 0;

  const statsConfig =
    itemType === "use-cases"
      ? [
          {
            label: "Total",
            count: serverStats.total,
            icon: ListTodo,
            color: "text-brand",
            bgColor: "bg-brand/10",
            barColor: "bg-brand",
            filter: "all",
          },
          {
            label: "High",
            count: serverStats.high,
            icon: AlertCircle,
            color: "text-red-500",
            bgColor: "bg-red-500/10",
            barColor: "bg-red-500",
            filter: "high",
          },
          {
            label: "Medium",
            count: serverStats.medium,
            icon: Clock,
            color: "text-amber-500",
            bgColor: "bg-amber-500/10",
            barColor: "bg-amber-500",
            filter: "medium",
          },
          {
            label: "Low",
            count: serverStats.low,
            icon: CheckCircle2,
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
            barColor: "bg-emerald-500",
            filter: "low",
          },
        ]
      : [
          {
            label: "Pending",
            count: serverStats.pending || 0,
            icon: Clock,
            color: "text-amber-500",
            bgColor: "bg-amber-500/10",
            barColor: "bg-amber-500",
            filter: "Pending",
          },
          {
            label: "Passed",
            count: serverStats.passed || 0,
            icon: CheckCircle2,
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
            barColor: "bg-emerald-500",
            filter: "Passed",
          },
          {
            label: "Failed",
            count: serverStats.failed || 0,
            icon: AlertCircle,
            color: "text-red-500",
            bgColor: "bg-red-500/10",
            barColor: "bg-red-500",
            filter: "Failed",
          },
          {
            label: "Closed",
            count: serverStats.closed || 0,
            icon: X,
            color: "text-foreground/40",
            bgColor: "bg-foreground/5",
            barColor: "bg-foreground/20",
            filter: "Closed",
          },
        ];

  return (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat, i) => {
          const isActive =
            activePriority === stat.filter ||
            (stat.filter === "all" && !activePriority);

          const percentage =
            total > 0 ? Math.round((stat.count / total) * 100) : 0;

          return (
            <div
              key={i}
              onClick={() =>
                onSelectPriority(
                  isActive ? null : stat.filter === "all" ? null : stat.filter,
                )
              }
              className={`relative p-5 rounded-2xl cursor-pointer transition-all duration-300 group bg-surface border ${
                isActive
                  ? "border-brand shadow-[0_15px_40px_-15px_rgba(16,217,180,0.2)] -translate-y-1"
                  : "border-border/50 hover:border-brand/30 hover:-translate-y-0.5"
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bgColor}`}
                >
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                    {stat.label}
                  </span>
                  <span className="text-2xl font-semibold text-foreground leading-tight">
                    {stat.count}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground/40">
                    {percentage}% of total
                  </span>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="h-1 w-full bg-muted/30 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ease-out ${stat.barColor}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {isActive && (
                <div className="absolute top-4 right-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PriorityStats;
