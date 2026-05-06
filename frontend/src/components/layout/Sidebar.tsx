"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap,
  LayoutDashboard,
  FolderOpen,
  BarChart2,
  FileText,
  TestTube2,
  Bug,
  ChevronLeft,
  ChevronDown,
  Users,
  Play,
  Camera,
  FileCode,
  Plus,
  MessageSquare,
  Settings,
  AlertCircle,
} from "lucide-react";
import { apiClientFetch } from "@/lib/api-client";
import { useSearchParams, useRouter } from "next/navigation";
import { CodeAuditSession } from "@/types/qa";
import { UserAccount } from "@/components/layout/UserAccount";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tooltip } from "@/components/ui/Tooltip";
import { Role, Permission, hasPermission } from "@/lib/rbac";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Brand } from "./sidebar/Brand";
import { NavLink } from "./sidebar/NavLink";
import { HistoryItem } from "./sidebar/HistoryItem";
import { HistorySection } from "./sidebar/HistorySection";
import { DeleteModal } from "./sidebar/DeleteModal";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  userName: string;
  role: Role;
  customPermissions: Permission[];
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  userName,
  role,
  customPermissions,
  mobileOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [sessions, setSessions] = useState<CodeAuditSession[]>([]);
  const [assistantHistory, setAssistantHistory] = useState<any[]>([]);
  const [showAllAssistant, setShowAllAssistant] = useState(false);
  const [editingAssistantId, setEditingAssistantId] = useState<string | null>(
    null,
  );
  const [assistantEditTitle, setAssistantEditTitle] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState<any | null>(null);
  const [deleteType, setDeleteType] = useState<"evaluation" | "assistant">(
    "assistant",
  );
  const [isAssistantExpanded, setIsAssistantExpanded] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeSessionId = searchParams.get("sessionId");
  const isCodeEvaluationPage = pathname.includes("/code-evaluation");

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved !== null) setIsCollapsed(saved === "true");
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("sidebar_collapsed", String(isCollapsed));
    }
  }, [isCollapsed, isMounted]);

  useEffect(() => {
    if (mobileOpen && onClose) {
      onClose();
    }
  }, [pathname]);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  const effectiveCollapsed = mobileOpen ? false : isCollapsed;

  const pathParts = pathname.split("/").filter(Boolean);
  const isProjectDetail = pathParts[0] === "projects" && pathParts.length >= 2;
  const currentProjectId = isProjectDetail ? pathParts[1] : null;

  useEffect(() => {
    if (isCodeEvaluationPage && currentProjectId) {
      const fetchSessions = async () => {
        try {
          const res = await apiClientFetch(
            `/api/code-evaluation/sessions?projectId=${currentProjectId}`,
          );
          if (res.ok) {
            const data = await res.json();
            setSessions(data);
          }
        } catch (err) {
          console.error("Failed to fetch sessions in sidebar", err);
        }
      };
      fetchSessions();
    }
  }, [isCodeEvaluationPage, currentProjectId, activeSessionId]);

  useEffect(() => {
    const fetchAssistantHistory = async () => {
      try {
        const res = await apiClientFetch(`/api/generate/history`);
        if (res.ok) {
          const data = await res.json();
          setAssistantHistory(data);
        }
      } catch (err) {
        console.error("Failed to fetch assistant history in sidebar", err);
      }
    };

    fetchAssistantHistory();
    window.addEventListener("assistant-history-updated", fetchAssistantHistory);

    const handleGlobalDeleteRequest = (e: any) => {
      const { session, type } = e.detail;
      setDeleteType(type || "assistant");
      setSessionToDelete(session);
    };
    window.addEventListener(
      "request-delete-session",
      handleGlobalDeleteRequest,
    );

    return () => {
      window.removeEventListener(
        "assistant-history-updated",
        fetchAssistantHistory,
      );
      window.removeEventListener(
        "request-delete-session",
        handleGlobalDeleteRequest,
      );
    };
  }, [pathname]);

  const handleDeleteRequest = (
    session: CodeAuditSession,
    type: "evaluation" | "assistant",
  ) => {
    setDeleteType(type);
    setSessionToDelete(session);
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    const sessionId = sessionToDelete._id!;
    const url =
      deleteType === "assistant"
        ? `/api/generate/chat/${sessionId}`
        : `/api/code-evaluation/sessions/${sessionId}`;

    try {
      const res = await apiClientFetch(url, { method: "DELETE" });
      if (res.ok) {
        if (deleteType === "assistant") {
          setAssistantHistory((prev) =>
            prev.filter((s) => s._id !== sessionId),
          );
        } else {
          setSessions((prev) => prev.filter((s) => s._id !== sessionId));
        }

        if (activeSessionId === sessionId) router.push(pathname);
        setSessionToDelete(null);
        window.dispatchEvent(new CustomEvent("assistant-history-updated"));
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const handleRename = async (
    type: "evaluation" | "assistant",
    id: string,
    title: string,
  ) => {
    if (!title.trim()) {
      if (type === "evaluation") setEditingSessionId(null);
      else setEditingAssistantId(null);
      return;
    }

    const url =
      type === "evaluation"
        ? `/api/code-evaluation/sessions/${id}`
        : `/api/generate/chat/${id}`;

    try {
      const res = await apiClientFetch(url, {
        method: "PATCH",
        body: JSON.stringify({ title: title.trim() }),
      });
      if (res.ok) {
        if (type === "evaluation") {
          setSessions((prev) =>
            prev.map((s) => (s._id === id ? { ...s, title: title.trim() } : s)),
          );
          setEditingSessionId(null);
        } else {
          setAssistantHistory((prev) =>
            prev.map((s) => (s._id === id ? { ...s, title: title.trim() } : s)),
          );
          setEditingAssistantId(null);
        }
      }
    } catch (err) {
      console.error("Failed to rename session", err);
    }
  };

  const isActive = (href: string, exact = false) => {
    if (href === "/" || exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const projectSubNav = currentProjectId
    ? [
        {
          href: `/projects/${currentProjectId}`,
          label: "Overview",
          icon: BarChart2,
          exact: true,
          permission: "read:projects" as Permission,
        },
        {
          href: `/projects/${currentProjectId}/use-cases`,
          label: "Use Cases",
          icon: FileText,
          exact: false,
          permission: "read:use_cases" as Permission,
        },
        {
          href: `/projects/${currentProjectId}/test-cases`,
          label: "Test Cases",
          icon: TestTube2,
          exact: false,
          permission: "read:test_cases" as Permission,
        },
        {
          href: `/projects/${currentProjectId}/bugs`,
          label: "Bug Tracker",
          icon: Bug,
          exact: false,
          permission: "read:bugs" as Permission,
        },
        {
          href: `/projects/${currentProjectId}/test-runs`,
          label: "Test Runs",
          icon: Play,
          exact: false,
          permission: "read:test_runs" as Permission,
        },
        {
          href: `/projects/${currentProjectId}/visual-reporter`,
          label: "UI Testing",
          icon: Camera,
          exact: false,
          permission: "read:visual_report" as Permission,
        },
        {
          href: `/projects/${currentProjectId}/code-evaluation`,
          label: "Code Evaluation",
          icon: FileCode,
          exact: false,
          permission: "read:projects" as Permission,
        },
      ]
    : [];

  return (
    <>
      {mobileOpen && (
        <div className="sidebar-backdrop md:hidden" onClick={onClose} />
      )}

      <aside
        className={`sidebar-shell relative ${effectiveCollapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
      >
        <Tooltip
          content={effectiveCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          side="right"
        >
          <button
            onClick={toggleSidebar}
            className={`absolute -right-3.5 top-20 z-10 w-7 h-7 rounded-full bg-brand flex items-center justify-center shadow-lg hover:scale-110 transition-all cursor-pointer border-2 border-surface ${effectiveCollapsed ? "rotate-180" : ""}`}
          >
            <ChevronLeft className="w-4 h-4 text-surface font-semibold" />
          </button>
        </Tooltip>

        <Brand isCollapsed={effectiveCollapsed} onClose={onClose} />

        <nav
          className={`flex-1 overflow-y-auto space-y-6 ${effectiveCollapsed ? "px-3" : "px-4"}`}
        >
          <div className="space-y-1">
            {!effectiveCollapsed && (
              <p className="sidebar-section-label">Main</p>
            )}

            <NavLink
              href="/"
              label="QA Assistant"
              icon={LayoutDashboard}
              isActive={isActive("/")}
              isCollapsed={effectiveCollapsed}
              onClick={() => {
                window.dispatchEvent(new CustomEvent("new-chat"));
                if (onClose) onClose();
              }}
            />

            {!isProjectDetail && assistantHistory.length > 0 && (
              <HistorySection
                label="Recent Sessions"
                isExpanded={isAssistantExpanded}
                onToggle={() => setIsAssistantExpanded(!isAssistantExpanded)}
                isCollapsed={effectiveCollapsed}
              >
                {(showAllAssistant
                  ? assistantHistory
                  : assistantHistory.slice(0, 5)
                ).map((session) => (
                  <HistoryItem
                    key={session._id}
                    id={session._id!}
                    title={session.title}
                    isActive={searchParams.get("sessionId") === session._id}
                    isCollapsed={effectiveCollapsed}
                    isEditing={editingAssistantId === session._id}
                    editValue={assistantEditTitle}
                    onEditChange={setAssistantEditTitle}
                    onEditSubmit={() =>
                      handleRename(
                        "assistant",
                        session._id!,
                        assistantEditTitle,
                      )
                    }
                    onEditCancel={() => setEditingAssistantId(null)}
                    onEditStart={() => {
                      setEditingAssistantId(session._id || null);
                      setAssistantEditTitle(session.title);
                    }}
                    onDeleteRequest={() =>
                      handleDeleteRequest(session, "assistant")
                    }
                    href={`/?mode=chat&sessionId=${session._id}`}
                    onClick={onClose}
                  />
                ))}
                {!effectiveCollapsed && assistantHistory.length > 5 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAllAssistant(!showAllAssistant);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 mt-1 rounded-xl bg-brand/5 border border-dashed border-brand/15 hover:border-brand/35 text-brand text-[10px] font-bold uppercase tracking-widest hover:bg-brand/10 hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    {showAllAssistant
                      ? "Show Less"
                      : `Show More (${assistantHistory.length - 5} more)`}
                  </button>
                )}
              </HistorySection>
            )}

            <NavLink
              href="/?mode=chat"
              label="Chat"
              icon={MessageSquare}
              isActive={searchParams.get("mode") === "chat"}
              isCollapsed={effectiveCollapsed}
              onClick={onClose}
            />

            {hasPermission(role, "read:projects", customPermissions) && (
              <NavLink
                href="/projects"
                label="Projects"
                icon={FolderOpen}
                isActive={isActive("/projects")}
                isCollapsed={effectiveCollapsed}
                onClick={onClose}
              />
            )}

            {!isProjectDetail &&
              hasPermission(role, "read:users", customPermissions) && (
                <NavLink
                  href="/admin/users"
                  label="Users"
                  icon={Users}
                  isActive={isActive("/admin/users")}
                  isCollapsed={effectiveCollapsed}
                  onClick={onClose}
                />
              )}

            <NavLink
              href="/settings"
              label="Settings"
              icon={Settings}
              isActive={isActive("/settings")}
              isCollapsed={effectiveCollapsed}
              onClick={onClose}
            />
          </div>

          {isProjectDetail && (
            <div className="space-y-1 pt-4 border-t border-border/50">
              {!effectiveCollapsed && (
                <p className="sidebar-section-label">Project Tools</p>
              )}

              {isCodeEvaluationPage ? (
                <div className="space-y-1">
                  <NavLink
                    href={`/projects/${currentProjectId}`}
                    label="Overview"
                    icon={BarChart2}
                    isActive={false}
                    isCollapsed={effectiveCollapsed}
                    onClick={onClose}
                  />

                  <NavLink
                    href={pathname}
                    label="New Evaluation"
                    icon={Plus}
                    isActive={!activeSessionId}
                    isCollapsed={effectiveCollapsed}
                    onClick={() => {
                      router.replace(pathname);
                      if (onClose) onClose();
                    }}
                  />

                  {sessions.length > 0 && (
                    <HistorySection
                      label="History"
                      isExpanded={true}
                      onToggle={() => {}}
                      isCollapsed={effectiveCollapsed}
                    >
                      {sessions.map((session) => (
                        <HistoryItem
                          key={session._id}
                          id={session._id!}
                          title={session.title}
                          isActive={activeSessionId === session._id}
                          isCollapsed={effectiveCollapsed}
                          isEditing={editingSessionId === session._id}
                          editValue={editTitle}
                          onEditChange={setEditTitle}
                          onEditSubmit={() =>
                            handleRename("evaluation", session._id!, editTitle)
                          }
                          onEditCancel={() => setEditingSessionId(null)}
                          onEditStart={() => {
                            setEditingSessionId(session._id || null);
                            setEditTitle(session.title);
                          }}
                          onDeleteRequest={() =>
                            handleDeleteRequest(session, "evaluation")
                          }
                          href={`${pathname}?sessionId=${session._id}`}
                          onClick={onClose}
                        />
                      ))}
                    </HistorySection>
                  )}
                </div>
              ) : (
                projectSubNav.map(
                  ({ href, label, icon: Icon, exact, permission }) => {
                    if (
                      permission &&
                      !hasPermission(role, permission, customPermissions)
                    )
                      return null;
                    return (
                      <NavLink
                        key={href}
                        href={href}
                        label={label}
                        icon={Icon}
                        isActive={isActive(href, exact)}
                        isCollapsed={effectiveCollapsed}
                        onClick={onClose}
                      />
                    );
                  },
                )
              )}
            </div>
          )}
        </nav>

        <div
          className={`p-4 border-t border-border flex items-center gap-2 ${effectiveCollapsed ? "flex-col justify-center" : "justify-between"}`}
        >
          <UserAccount
            name={userName}
            role={role}
            isCollapsed={effectiveCollapsed}
          />
          <ThemeToggle />
        </div>
      </aside>

      <DeleteModal
        isOpen={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        onConfirm={confirmDelete}
        title={sessionToDelete?.title || ""}
      />
    </>
  );
}
