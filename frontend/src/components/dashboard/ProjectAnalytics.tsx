"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
} from "recharts";

export interface BugStat {
  severity: string;
  count: number;
}

export interface ExecutionTrend {
  date: string;
  passed: number;
  failed: number;
}

export interface ProjectAnalyticsProps {
  bugStats: BugStat[];
  executionTrends: ExecutionTrend[];
}

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#ef4444", // Red-500
  High: "#f97316", // Orange-500
  Medium: "#f59e0b", // Amber-500
  Low: "#10b981", // Emerald-500
  Minor: "#6366f1", // Indigo-500
};

const DEFAULT_COLOR = "#94a3b8"; // Slate-400

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-white/20 dark:border-white/10 p-3 rounded-xl shadow-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/50 mb-1">
          {payload[0].name}
        </p>
        <p className="text-lg font-semibold text-foreground">
          {payload[0].value}{" "}
          <span className="text-xs font-medium text-foreground/60">Bugs</span>
        </p>
      </div>
    );
  }
  return null;
};

const ProjectAnalytics: React.FC<ProjectAnalyticsProps> = ({
  bugStats,
  executionTrends,
}) => {
  // Map bugStats to Recharts format
  const chartData = bugStats.map((stat) => ({
    name: stat.severity,
    value: stat.count,
  }));

  // Calculate success rate for trends
  const trendData = executionTrends.map((t) => {
    const total = t.passed + t.failed;
    return {
      ...t,
      rate: total > 0 ? Math.round((t.passed / total) * 100) : 0,
    };
  });

  const showTrends = executionTrends && executionTrends.length > 0;
  const showBugs = bugStats && bugStats.length > 0;

  if (!showBugs && !showTrends) return null;

  return (
    <div
      className={`grid grid-cols-1 ${showTrends && showBugs ? "md:grid-cols-2" : ""} gap-6 w-full animate-fade-in-up`}
    >
      {/* Bug Severity Distribution Card */}
      <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-xl flex flex-col h-[350px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-semibold text-foreground/70 uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            Bug Severity Distribution
          </h3>
        </div>

        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={8}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={SEVERITY_COLORS[entry.name] || DEFAULT_COLOR}
                    className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-foreground/50 ml-1">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Execution Trends Card */}
      {showTrends && (
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl p-6 shadow-xl flex flex-col h-[350px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-semibold text-foreground/70 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Execution Trends
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[8px] font-semibold text-foreground/40 uppercase tracking-widest">
                  Passed
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[8px] font-semibold text-foreground/40 uppercase tracking-widest">
                  Failed
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={trendData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                barGap={8}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="currentColor"
                  className="text-foreground/5"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 700, fill: "currentColor" }}
                  className="text-foreground/30 uppercase tracking-widest"
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 700, fill: "currentColor" }}
                  className="text-foreground/30"
                />
                <Tooltip
                  cursor={{ fill: "currentColor", opacity: 0.05 }}
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-white/20 dark:border-white/10 p-4 rounded-xl shadow-2xl min-w-[140px]">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/50 mb-3 border-b border-white/10 pb-2">
                            {payload[0].payload.date}
                          </p>
                          <div className="space-y-2">
                            {payload
                              .filter((p: any) => p.dataKey !== "rate")
                              .map((entry: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between gap-6"
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-1.5 h-1.5 rounded-full"
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-foreground/60">
                                      {entry.name}
                                    </span>
                                  </div>
                                  <span
                                    className="text-sm font-semibold"
                                    style={{ color: entry.color }}
                                  >
                                    {entry.value}
                                  </span>
                                </div>
                              ))}
                            <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between">
                              <span className="text-[10px] font-semibold uppercase text-emerald-500 tracking-widest">
                                Success Rate
                              </span>
                              <span className="text-sm font-semibold text-emerald-500">
                                {
                                  payload.find((p: any) => p.dataKey === "rate")
                                    ?.value
                                }
                                %
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="passed"
                  stackId="a"
                  fill="#10b981"
                  radius={[0, 0, 4, 4]}
                  name="Passed"
                  barSize={32}
                />
                <Bar
                  dataKey="failed"
                  stackId="a"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  name="Failed"
                  barSize={32}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                  hide={true} // Just for the tooltip
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectAnalytics;
