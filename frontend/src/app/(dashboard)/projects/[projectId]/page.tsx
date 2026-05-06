import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  FileText,
  TestTube2,
  ArrowLeft,
  Bug,
  Camera,
  Zap,
  ShieldCheck,
  PenLine,
  Play,
} from "lucide-react";
import { getLocalSession, apiFetch } from "@/lib/api-server";
import { hasPermission } from "@/lib/rbac";
// import ProjectAnalytics from "@/components/dashboard/ProjectAnalytics";

function isValidObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  if (!isValidObjectId(projectId)) notFound();

  const res = await apiFetch(`/api/projects/${projectId}`);
  if (!res.ok) notFound();

  const project = await res.json();
  const session = await getLocalSession();

  const canReadProjects = session
    ? hasPermission(session.role, "read:projects", session.customPermissions)
    : false;

  if (!canReadProjects) {
    if (session) {
      if (
        hasPermission(session.role, "read:use_cases", session.customPermissions)
      ) {
        redirect(`/projects/${projectId}/use-cases`);
      }
      if (
        hasPermission(
          session.role,
          "read:test_cases",
          session.customPermissions,
        )
      ) {
        redirect(`/projects/${projectId}/test-cases`);
      }
      if (hasPermission(session.role, "read:bugs", session.customPermissions)) {
        redirect(`/projects/${projectId}/bugs`);
      }
    }
    redirect("/projects");
  }

  // Fetch all resource counts for the overview bar
  const [useCasesRes, testCasesRes, bugsRes, runsRes] = await Promise.all([
    apiFetch(`/api/projects/${projectId}/data/use-cases?limit=1`),
    apiFetch(`/api/projects/${projectId}/data/test-cases?limit=1`),
    apiFetch(`/api/projects/${projectId}/data/bugs?limit=1`),
    apiFetch(`/api/projects/${projectId}/test-runs`),
  ]);

  const { serverStats: ucStats } = await useCasesRes.json();
  const { serverStats: tcStats } = await testCasesRes.json();
  const { serverStats: bugStatsData } = await bugsRes.json();
  const runs = await runsRes.json();

  const useCaseCount = ucStats?.total || 0;
  const testCaseCount = tcStats?.total || 0;
  const bugCount = bugStatsData?.total || 0;
  const runCount = Array.isArray(runs) ? runs.length : 0;

  const bugStats = [
    { severity: "High", count: bugStatsData?.high || 0 },
    { severity: "Medium", count: bugStatsData?.medium || 0 },
    { severity: "Low", count: bugStatsData?.low || 0 },
  ];

  if (bugStatsData?.vision > 0) {
    bugStats.push({ severity: "Critical", count: bugStatsData.vision });
  }

  // Dynamic Code Score Calculation based on Bug Status
  const calculateCodeScore = () => {
    let score = 100;

    // Status-based penalties
    const backlogCount =
      (bugStatsData?.backlog || 0) + (bugStatsData?.pending || 0);
    const inProgressCount = bugStatsData?.inProgress || 0;
    const inReviewCount = bugStatsData?.inReview || 0;

    // Any bug that isn't Done/Closed/Resolved/Backlog/InProgress/InReview
    // is essentially "Open" or "Unassigned" and should be penalized like Backlog
    const resolvedCount =
      (bugStatsData?.done || 0) + (bugStatsData?.closed || 0);
    const accountedActive = backlogCount + inProgressCount + inReviewCount;
    const otherActiveCount = Math.max(
      0,
      (bugStatsData?.total || 0) - resolvedCount - accountedActive,
    );

    score -= (backlogCount + otherActiveCount) * 15;
    score -= inProgressCount * 10;
    score -= inReviewCount * 5;

    const finalScore = Math.max(0, Math.min(100, score));
    let rating = "Good";
    if (finalScore >= 95) rating = "Excellent";
    else if (finalScore >= 80) rating = "Good";
    else if (finalScore >= 60) rating = "Average";
    else rating = "Poor";

    return { value: `${finalScore}%`, rating };
  };

  const dynamicScore = calculateCodeScore();

  // Stats bar data
  const overviewStats = [
    {
      label: "Use Cases",
      subLabel: "Extracted",
      value: useCaseCount || 0,
      icon: FileText,
      color: "text-brand",
    },
    {
      label: "Test Cases",
      subLabel: "Generated",
      value: testCaseCount || 0,
      icon: PenLine,
      color: "text-brand",
    },
    {
      label: "Open Bugs",
      subLabel: "Needs attention",
      value: bugCount || 0,
      icon: Bug,
      color: "text-brand",
    },
    {
      label: "Test Runs",
      subLabel: "Executed",
      value: runCount || 0,
      icon: Play,
      color: "text-brand",
    },
    {
      label: "Code Score",
      subLabel: dynamicScore.rating,
      value: dynamicScore.value,
      icon: ShieldCheck,
      color: "text-brand",
    },
  ];

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 py-10 animate-fade-in-up">
      {/* Breadcrumb & Title Area */}
      <div className="mb-10">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors mb-5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All Projects
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
              {project.projectName}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-muted-foreground text-sm font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Generated {formatDate(project.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        <Link
          href={`/projects/${project.id}/use-cases`}
          className="spatial-card rounded-xl p-5 group flex items-center gap-4 hover:shadow-[0_0_30px_-10px_rgba(16,217,180,0.2)] transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
            <FileText className="w-5 h-5 text-brand" />
          </div>
          <div>
            <p className="text-foreground font-semibold text-sm">Use Cases</p>
            <p className="text-muted-foreground text-xs">
              View all extracted use cases
            </p>
          </div>
        </Link>

        <Link
          href={`/projects/${project.id}/test-cases`}
          className="spatial-card rounded-xl p-5 group flex items-center gap-4 hover:shadow-[0_0_30px_-10px_rgba(16,217,180,0.2)] transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
            <TestTube2 className="w-5 h-5 text-brand" />
          </div>
          <div>
            <p className="text-foreground font-semibold text-sm">Test Cases</p>
            <p className="text-muted-foreground text-xs">
              View all generated test cases
            </p>
          </div>
        </Link>

        <Link
          href={`/projects/${project.id}/bugs`}
          className="spatial-card rounded-xl p-5 group flex items-center gap-4 hover:shadow-[0_0_30px_-10px_rgba(16,217,180,0.2)] transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
            <Bug className="w-4 h-4 text-brand" />
          </div>
          <div>
            <p className="text-foreground font-semibold text-sm">Bug Tracker</p>
            <p className="text-muted-foreground text-xs">
              View generated bug reports and risks
            </p>
          </div>
        </Link>

        <Link
          href={`/projects/${project.id}/test-runs`}
          className="spatial-card rounded-xl p-5 group flex items-center gap-4 hover:shadow-[0_0_30px_-10px_rgba(16,217,180,0.2)] transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
            <Zap className="w-5 h-5 text-brand" />
          </div>
          <div>
            <p className="text-foreground font-semibold text-sm">Test Runs</p>
            <p className="text-muted-foreground text-xs">
              Execute and manage test runs
            </p>
          </div>
        </Link>

        <Link
          href={`/projects/${project.id}/visual-reporter`}
          className="spatial-card rounded-xl p-5 group flex items-center gap-4 hover:shadow-[0_0_30px_-10px_rgba(16,217,180,0.2)] transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
            <Camera className="w-5 h-5 text-brand" />
          </div>
          <div>
            <p className="text-foreground font-semibold text-sm">UI Testing</p>
            <p className="text-muted-foreground text-xs">
              Report bugs using AI Vision
            </p>
          </div>
        </Link>
        <Link
          href={`/projects/${project.id}/code-evaluation`}
          className="spatial-card rounded-xl p-5 group flex items-center gap-4 hover:shadow-[0_0_30px_-10px_rgba(16,217,180,0.2)] transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
            <ShieldCheck className="w-5 h-5 text-brand" />
          </div>
          <div>
            <p className="text-foreground font-semibold text-sm">
              Code Evaluation
            </p>
            <p className="text-muted-foreground text-xs">
              AI-driven code security & audit
            </p>
          </div>
        </Link>
      </div>

      {/* Project Analytics Section */}
      {/* <div className="mb-12">
        <h2 className="text-xs font-semibold text-brand uppercase tracking-widest mb-6 flex items-center gap-2">
          <Zap className="w-3 h-3" />
          Project Insights
        </h2>
        <ProjectAnalytics
          bugStats={bugStats}
          executionTrends={executionTrends}
        />
      </div> */}

      <div className="space-y-10">
        {/* Project Overview Stats Bar */}
        <section>
          <h2 className="text-xs font-semibold text-brand uppercase tracking-widest mb-4">
            Project Overview
          </h2>
          <div className="spatial-card rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 relative">
              {overviewStats.map((stat, idx) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-3 relative"
                >
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-brand/5 border border-brand/10 flex items-center justify-center text-brand">
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-0">
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-xl font-semibold text-foreground leading-none tracking-tight">
                        {stat.value}
                      </p>
                      <p className="text-[13px] font-semibold text-foreground/80 leading-tight">
                        {stat.label}
                      </p>
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {stat.subLabel}
                    </p>
                  </div>
                  {idx < overviewStats.length - 1 && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-px h-8 bg-border/40" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-brand uppercase tracking-widest mb-4">
            Project Description
          </h2>
          <div className="spatial-card rounded-2xl p-6 md:p-8">
            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
              {project.description}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
