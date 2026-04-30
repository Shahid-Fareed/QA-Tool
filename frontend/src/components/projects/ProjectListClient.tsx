"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FolderOpen,
  Clock,
  ArrowRight,
  Plus,
  Search,
  ArrowUpDown,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ProjectActions from "@/components/projects/ProjectActions";
import { hasPermission } from "@/lib/rbac";

interface ProjectCard {
  id: string;
  projectName: string;
  description: string;
  createdAt: string;
  hasUseCases: boolean;
  hasTestCases: boolean;
}

interface ProjectListClientProps {
  initialProjects: ProjectCard[];
  session: any;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canReadUseCases: boolean;
    canReadTestCases: boolean;
    canReadBugs: boolean;
    canWrite: boolean;
  };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ProjectListClient({
  initialProjects,
  session,
  permissions,
}: ProjectListClientProps) {
  const [isSortOpen, setIsSortOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "name" | "name-desc"
  >("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Filtering and Sorting logic
  const filteredAndSortedProjects = useMemo(() => {
    let result = initialProjects.filter((p) =>
      p.projectName.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    if (sortBy === "newest") {
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else if (sortBy === "oldest") {
      result.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    } else if (sortBy === "name") {
      result.sort((a, b) => a.projectName.localeCompare(b.projectName));
    } else if (sortBy === "name-desc") {
      result.sort((a, b) => b.projectName.localeCompare(a.projectName));
    }

    return result;
  }, [initialProjects, searchQuery, sortBy]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedProjects.length / itemsPerPage);
  const paginatedProjects = filteredAndSortedProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const sortOptions = [
    { label: "Newest First", value: "newest" as const },
    { label: "Oldest First", value: "oldest" as const },
    { label: "Name (A-Z)", value: "name" as const },
    { label: "Name (Z-A)", value: "name-desc" as const },
  ];

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            Projects
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-medium">
            {initialProjects.length === 0
              ? "No projects yet — generate one on the Dashboard."
              : `${initialProjects.length} project${initialProjects.length > 1 ? "s" : ""} generated`}
          </p>
        </div>

        {permissions.canWrite && (
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold shadow-lg shadow-brand/20 hover:bg-brand/90 hover:scale-[1.02] transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Link>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row items-center gap-4 mb-10">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search projects..."
            className="w-full h-12 pl-11 pr-4 bg-surface border border-border/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative">
            <button
              onClick={() => {
                setIsSortOpen(!isSortOpen);
              }}
              className={`flex items-center gap-2 h-12 px-5 rounded-2xl border transition-all text-sm font-semibold capitalize ${
                isSortOpen
                  ? "bg-brand/5 border-brand/40 text-brand"
                  : "bg-surface border-border/50 text-foreground hover:bg-muted/50"
              }`}
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortOptions.find((o) => o.value === sortBy)?.label || sortBy}
            </button>

            {isSortOpen && (
              <div className="absolute top-[calc(100%+8px)] right-0 z-50 w-56 bg-surface border border-border shadow-2xl rounded-2xl p-2 animate-fade-in-up">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value);
                      setIsSortOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      sortBy === option.value
                        ? "bg-brand/10 text-brand"
                        : "text-foreground hover:bg-brand/5 hover:text-brand"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center p-1 bg-surface border border-border/50 rounded-2xl ml-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 rounded-xl transition-all ${
                viewMode === "grid"
                  ? "bg-brand/10 text-brand shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 rounded-xl transition-all ${
                viewMode === "list"
                  ? "bg-brand/10 text-brand shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {paginatedProjects.length > 0 ? (
        <>
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12"
                : "flex flex-col gap-4 mb-12"
            }
          >
            {paginatedProjects.map((project) => (
              <div
                key={project.id}
                className={`spatial-card rounded-2xl group block relative overflow-hidden hover:shadow-[0_0_40px_-12px_rgba(16,217,180,0.2)] transition-all duration-300 ${
                  viewMode === "grid"
                    ? "p-6"
                    : "p-4 pr-12 flex items-center gap-6"
                }`}
              >
                {session &&
                hasPermission(
                  session.role,
                  "read:projects",
                  session.customPermissions,
                ) ? (
                  <Link
                    href={`/projects/${project.id}`}
                    className="absolute inset-0 z-0"
                    aria-label={project.projectName}
                  />
                ) : (
                  <div className="absolute inset-0 z-0 cursor-default" />
                )}

                <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-brand/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div
                  className={`relative z-10 pointer-events-none flex ${
                    viewMode === "grid" ? "flex-col" : "items-center flex-1"
                  }`}
                >
                  <div
                    className={`flex items-start justify-between ${
                      viewMode === "grid" ? "mb-5" : "mr-6"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors duration-300">
                      <FolderOpen className="w-5 h-5 text-brand" />
                    </div>
                  </div>

                  <div className={viewMode === "list" ? "flex-1" : ""}>
                    <h2 className="text-foreground font-semibold text-base mb-1 truncate leading-tight">
                      {project.projectName}
                    </h2>

                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Clock className="w-3 h-3" />
                      <span>{timeAgo(project.createdAt)}</span>
                    </div>
                  </div>

                  {viewMode === "grid" && (
                    <div className="absolute top-0 right-0 z-30 pointer-events-auto">
                      <ProjectActions
                        project={project}
                        canEdit={permissions.canEdit}
                        canDelete={permissions.canDelete}
                      />
                    </div>
                  )}
                </div>

                <div
                  className={`relative z-20 flex items-center gap-2 flex-wrap ${
                    viewMode === "grid" ? "mt-5" : "ml-auto"
                  }`}
                >
                  {permissions.canReadTestCases && (
                    <Link
                      href={`/projects/${project.id}/test-cases`}
                      className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-brand/10 text-brand border border-brand/15 hover:bg-brand/20 hover:border-brand/30 transition-all duration-200"
                    >
                      Test Cases
                    </Link>
                  )}
                  {permissions.canReadUseCases && (
                    <Link
                      href={`/projects/${project.id}/use-cases`}
                      className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 transition-all duration-200"
                    >
                      Use Cases
                    </Link>
                  )}
                  {permissions.canReadBugs && (
                    <Link
                      href={`/projects/${project.id}/bugs`}
                      className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 transition-all duration-200"
                    >
                      Bug Tracker
                    </Link>
                  )}
                </div>

                {viewMode === "list" && (
                  <div className="relative z-30 pointer-events-auto ml-4">
                    <ProjectActions
                      project={project}
                      canEdit={permissions.canEdit}
                      canDelete={permissions.canDelete}
                    />
                  </div>
                )}

                <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0 pointer-events-none">
                  <ArrowRight className="w-4 h-4 text-brand" />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  // Simple pagination: show first few, last few, and current
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all ${
                          currentPage === pageNum
                            ? "bg-brand text-white shadow-md shadow-brand/20"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return (
                      <span
                        key={pageNum}
                        className="px-1 text-muted-foreground"
                      >
                        .
                      </span>
                    );
                  }
                  return null;
                })}
              </div>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="spatial-card rounded-2xl p-20 text-center flex flex-col items-center">
          <div className="w-10 h-10 rounded-lg bg-brand/5 flex items-center justify-center group-hover:bg-brand/10 transition-colors">
            <Search className="w-5 h-5 text-brand" />
          </div>
          <h3 className="text-muted-foreground font-semibold text-lg mb-2">
            No projects found
          </h3>
          <p className="text-muted-foreground/50 text-sm max-w-sm">
            Try adjusting your search or filter to find what you're looking for.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSortBy("newest");
            }}
            className="mt-8 flex items-center gap-2 px-6 py-3 rounded-xl bg-brand/10 border border-brand/20 text-brand text-sm font-semibold hover:bg-brand/20 transition-all"
          >
            Clear Filters
          </button>
        </div>
      )}
    </>
  );
}
