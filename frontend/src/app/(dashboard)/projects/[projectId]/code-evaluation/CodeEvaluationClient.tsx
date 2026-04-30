"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  X,
  AlertCircle,
  Plus,
  ArrowLeft,
  FileText,
  Code2,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { CodeAuditSession, ChatMessage, ChatAttachment } from "@/types/qa";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { AuditMessage } from "./components/AuditMessage";
import { AuditInput } from "./components/AuditInput";

export default function CodeEvaluationClient({
  projectId,
}: {
  projectId: string;
}) {
  // Syncing component state to resolve potential module factory issues
  const [activeSession, setActiveSession] = useState<CodeAuditSession | null>(
    null,
  );
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const sessionId = searchParams.get("sessionId");

  const [sessions, setSessions] = useState<CodeAuditSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<ChatAttachment[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-clear error after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [sessionToDelete, setSessionToDelete] =
    useState<CodeAuditSession | null>(null);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [customLogic, setCustomLogic] = useState("");
  const [isFixing, setIsFixing] = useState<string | null>(null);
  const [requestedDepPath, setRequestedDepPath] = useState<string | null>(null);

  useEffect(() => {
    const sid = searchParams.get("sessionId");
    if (sid) {
      const sess = sessions.find((s) => s._id === sid);
      if (sess) {
        loadSession(sess);
      } else if (sessions.length > 0) {
        fetchSessions();
      }
    } else {
      startNewAudit();
    }
  }, [searchParams, sessions.length]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const depFileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const API_BASE = `${API_URL}/api/code-evaluation`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        formRef.current &&
        !formRef.current.contains(event.target as Node) &&
        isInputExpanded
      ) {
        setIsInputExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isInputExpanded]);

  useEffect(() => {
    fetchSessions();
  }, [projectId]);

  // Restore active session on mount
  useEffect(() => {
    if (sessions.length > 0 && !activeSession && messages.length === 0) {
      if (typeof window !== "undefined") {
        const savedAuditId = localStorage.getItem(
          `qa_tool_active_audit_${projectId}`,
        );
        if (savedAuditId) {
          const sessionToRestore = sessions.find((s) => s._id === savedAuditId);
          if (sessionToRestore) {
            loadSession(sessionToRestore);
          }
        }
      }
    }
  }, [sessions, activeSession, messages.length, projectId]);

  // Save active session to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (activeSession?._id) {
        localStorage.setItem(
          `qa_tool_active_audit_${projectId}`,
          activeSession._id,
        );
      } else {
        localStorage.removeItem(`qa_tool_active_audit_${projectId}`);
      }
    }
  }, [activeSession, projectId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAnalyzing]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    }
  };

  const startNewAudit = () => {
    if (sessionId) {
      router.push(pathname);
    }
    setActiveSession(null);
    setMessages([]);
    setInput("");
    setPendingFiles([]);
    setError(null);
    setIsInputExpanded(false);
    setCustomLogic("");
    if (typeof window !== "undefined") {
      localStorage.removeItem(`qa_tool_active_audit_${projectId}`);
      if (window.innerWidth < 1024) {
        setIsMobileSidebarOpen(false);
      }
    }
  };

  const loadSession = (session: CodeAuditSession) => {
    setActiveSession(session);
    setMessages(session.messages || []);
    setInput("");
    setPendingFiles([]);
    setError(null);
    setIsInputExpanded(false);
    setCustomLogic("");
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsMobileSidebarOpen(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (pendingFiles.length + files.length > 10) {
      setError("Maximum 10 files can be uploaded at a time.");
      return;
    }

    files.forEach((file) => {
      if (file.size > 1024 * 1024 * 2) {
        setError(`${file.name} exceeds 2MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        let content = event.target?.result as string;

        // Specialized handling for Jupyter Notebooks
        if (file.name.endsWith(".ipynb")) {
          try {
            const nb = JSON.parse(content);
            if (nb.cells && Array.isArray(nb.cells)) {
              content = nb.cells
                .filter((cell: any) => cell.cell_type === "code")
                .map((cell: any) =>
                  Array.isArray(cell.source)
                    ? cell.source.join("")
                    : cell.source || "",
                )
                .join("\n\n");
            }
          } catch (e) {
            console.error("Failed to parse .ipynb file:", e);
          }
        }

        setPendingFiles((prev) => [
          ...prev,
          {
            name: file.name,
            url: content,
            type: file.type,
          },
        ]);
        setError(null);
      };
      reader.readAsText(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const saveCurrentSession = async (
    currentMessages: ChatMessage[],
    forceTitle?: string,
  ) => {
    try {
      const title =
        forceTitle ||
        activeSession?.title ||
        (currentMessages[0]?.attachments?.[0]
          ? currentMessages[0].attachments[0].name
          : currentMessages[0]?.content?.split("\n")[0]?.substring(0, 30)) ||
        "Code Audit";

      // Sanitize messages to avoid Mongoose validation errors on incomplete attachments
      const cleanMessages = (currentMessages || []).map((msg) => ({
        ...msg,
        attachments: (msg.attachments || []).filter(
          (att) => att && att.name && att.url,
        ),
      }));

      const sessionPayload = {
        _id: activeSession?._id,
        projectId: /^[0-9a-fA-F]{24}$/.test(projectId) ? projectId : undefined,
        title,
        messages: cleanMessages,
      };

      const saveRes = await fetch(`${API_BASE}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionPayload),
      });

      if (saveRes.ok) {
        const savedSession = await saveRes.json();
        setActiveSession(savedSession);
        fetchSessions();

        // Always sync URL if it doesn't match the saved session ID
        if (sessionId !== savedSession._id) {
          router.push(`${pathname}?sessionId=${savedSession._id}`);
        }
      } else {
        const errorData = await saveRes.json();
        console.error(
          `Session save failed (Status: ${saveRes.status}):`,
          errorData,
        );
        setError(
          `Failed to sync session to server: ${errorData.error || "Unknown error"}`,
        );
      }
    } catch (err) {
      console.error("Save session error:", err);
    }
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    e?.preventDefault();
    console.log("Analyzing...", {
      input: input.trim(),
      files: pendingFiles.length,
    });
    if (!input.trim() && pendingFiles.length === 0) return;

    // Check for unsupported file types (PDF, Docx, etc.)
    const unsupportedFile = pendingFiles.find((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return [
        "pdf",
        "docx",
        "doc",
        "xlsx",
        "pptx",
        "png",
        "jpg",
        "jpeg",
        "zip",
      ].includes(ext || "");
    });

    if (unsupportedFile) {
      const ext = unsupportedFile.name.split(".").pop()?.toLowerCase();
      const refusalContent = `I am designed to audit source code and project configurations. I cannot process .${ext} files or non-textual data.`;

      const userMsg: ChatMessage = {
        role: "user",
        content: input.trim(),
        attachments: [...pendingFiles],
      };
      const assistantMsg: ChatMessage = {
        role: "ai",
        content: refusalContent,
      };

      const newMsgs = [...messages, userMsg, assistantMsg];
      setMessages(newMsgs);
      setPendingFiles([]);
      setInput("");
      setIsInputExpanded(false);
      await saveCurrentSession(newMsgs);
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim() || (pendingFiles.length > 0 ? "" : ""),
      attachments: [...pendingFiles],
      customRules: customLogic.trim() || undefined,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsAnalyzing(true);
    setError(null);
    setInput("");
    setPendingFiles([]);
    setIsInputExpanded(false);

    try {
      const response = await fetch(`${API_BASE}/analyze-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          customLogic,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed");
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.analysis,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      // Save session using helper
      await saveCurrentSession(finalMessages);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("rate limit") || msg.includes("429")) {
        setError(
          "Capacity Reached. Please wait a few minutes before the next analysis.",
        );
      } else {
        setError(msg || "Audit engine interrupted.");
      }
      setMessages(updatedMessages);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEditPrompt = (msg: ChatMessage) => {
    setInput(msg.content);
    setCustomLogic(msg.customRules || "");
    setPendingFiles(msg.attachments || []);
    setIsInputExpanded(true);

    const messageIndex = messages.findIndex((m) => m === msg);
    if (messageIndex !== -1) {
      setMessages(messages.slice(0, messageIndex));
    }

    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleFixIssue = async (issueDescription: string | string[]) => {
    const originalMessage = messages.find((m) => m.role === "user");
    const originalCode =
      originalMessage?.attachments?.[0]?.url || originalMessage?.content;

    if (!originalCode) {
      setError("Could not locate original code to apply fix.");
      return;
    }

    setIsFixing(
      Array.isArray(issueDescription) ? "ALL_ISSUES" : issueDescription,
    );
    try {
      const response = await fetch(`${API_BASE}/fix-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          issueDescription,
        }),
      });

      if (!response.ok) throw new Error("Fix generation failed");

      const data = await response.json();

      let processedContent = data.fixedCode.trim();
      if (
        !processedContent.includes("```") &&
        (processedContent.includes("{") ||
          processedContent.includes("function") ||
          processedContent.includes("def "))
      ) {
        processedContent = `**FILE: resolution_context**\n\`\`\`javascript\n${processedContent}\n\`\`\``;
      }

      const fixedMessage: ChatMessage = {
        role: "assistant",
        content: `### 🛠️ Resolution for Issue\n\n${processedContent}`,
      };

      const finalMessages = [...messages, fixedMessage];
      setMessages(finalMessages);

      // Save session using helper
      await saveCurrentSession(finalMessages);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("rate limit") || msg.includes("429")) {
        setError(
          "Capacity Reached. Fix Engine is cooling down. Please wait a few minutes.",
        );
      } else {
        setError(msg || "Failed to generate fix.");
      }
    } finally {
      setIsFixing(null);
    }
  };

  const handleDependencyUploadRequest = (path: string) => {
    setRequestedDepPath(path);
    depFileInputRef.current?.click();
  };

  const handleDepFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const filePromises = Array.from(files).map((file) => {
        return new Promise<{ name: string; content: string }>(
          (resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve({
                name: file.name,
                content: event.target?.result as string,
              });
            };
            reader.onerror = reject;
            reader.readAsText(file);
          },
        );
      });

      const uploadedFiles = await Promise.all(filePromises);

      let combinedContent = "";
      if (uploadedFiles.length === 1) {
        combinedContent = `Here is the missing dependency you requested for deep analysis (${requestedDepPath || uploadedFiles[0].name}):\n\n\`\`\`\n${uploadedFiles[0].content}\n\`\`\`\n\nPlease continue your audit incorporating this new context.`;
      } else {
        combinedContent = `Here are the missing dependencies you requested for deep analysis:\n\n${uploadedFiles
          .map((f) => `FILE: ${f.name}\n\`\`\`\n${f.content}\n\`\`\``)
          .join(
            "\n\n",
          )}\n\nPlease continue your audit incorporating these new contexts.`;
      }

      const userMessage: ChatMessage = {
        role: "user",
        content: combinedContent,
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setRequestedDepPath(null);

      const response = await fetch(`${API_BASE}/analyze-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          customLogic,
        }),
      });

      if (!response.ok) throw new Error("Analysis failed");
      const data = await response.json();

      const aiMessage: ChatMessage = {
        role: "ai",
        content: data.analysis,
      };

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
      await saveCurrentSession(finalMessages);
    } catch (err: any) {
      setError(err.message || "Failed to process files.");
    } finally {
      setIsAnalyzing(false);
      if (depFileInputRef.current) depFileInputRef.current.value = "";
    }
  };

  const deleteSession = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s._id !== id));
        if (activeSession?._id === id) startNewAudit();
        setSessionToDelete(null);
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  return (
    <div className="w-full flex flex-1 min-h-0 overflow-hidden relative bg-background">
      {/* Workspace Area */}
      <div className="flex-1 flex flex-col relative bg-background min-w-0 overflow-hidden">
        {/* Sticky Header */}
        <div className="h-16 border-b border-border/50 flex items-center px-8 justify-between bg-background/50 backdrop-blur-md sticky top-0 z-50 shrink-0">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${projectId}`}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface border border-border hover:bg-muted/50 transition-all text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-foreground tracking-tight">
                Code Evaluation
              </h1>
              <p className="text-[10px] text-muted-foreground font-medium">
                Upload files or paste code to begin analysis.
              </p>
            </div>
          </div>

          <button
            onClick={startNewAudit}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand/5 border border-brand/10 hover:bg-brand/10 text-brand transition-all font-semibold group"
          >
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
            <span className="text-[9px] uppercase tracking-widest">
              New Audit
            </span>
          </button>
        </div>

        {/* Global Grid Overlay */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-[0.03] dark:opacity-[0.07]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-foreground"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Message / Chat Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 pb-[400px] space-y-10 scrollbar-hide relative z-10">
          {messages.length === 0 && (
            <div className="flex flex-col items-center">
              {/* Landing Dropzone Area */}
              <div
                className="w-full max-w-4xl border-2 border-dashed border-brand/20 rounded-[32px] bg-white/2 p-10 flex flex-col items-center justify-center transition-all hover:border-brand/40 animate-in fade-in zoom-in duration-700"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files);
                  if (files.length > 0) {
                    const event = {
                      target: { files },
                    } as unknown as React.ChangeEvent<HTMLInputElement>;
                    handleFileUpload(event);
                  }
                }}
              >
                {/* Visual Indicators */}
                <div className="flex items-center gap-4 mb-6 relative">
                  <div className="w-10 h-10 rounded-xl bg-brand/5 border border-brand/10 flex items-center justify-center text-brand/20 -rotate-12">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shadow-2xl shadow-brand/10 z-10">
                    <div className="relative">
                      <Bot className="w-8 h-8" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand text-white rounded-lg flex items-center justify-center shadow-lg">
                        <Code2 className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-brand/5 border border-brand/10 flex items-center justify-center text-brand/20 rotate-12">
                    <Code2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="text-center space-y-1 mb-4">
                  <h2 className="text-xl font-semibold text-foreground tracking-tight leading-tight">
                    Upload files or paste code
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium">
                    to begin analysis
                  </p>
                </div>

                <p className="text-[11px] text-muted-foreground mb-6 font-medium">
                  Drag & drop files here, paste code below, or{" "}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-brand font-semibold hover:underline"
                  >
                    browse
                  </button>
                </p>

                {/* Badges */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {[
                    { label: "Supports multiple languages", icon: Shield },
                    { label: "Max file size 10MB", icon: FileText },
                    {
                      label: ".py, .js, .ts, .java, .cpp and more",
                      icon: Code2,
                    },
                  ].map((badge, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/3 border border-brand/10 text-[9px] font-semibold text-muted-foreground/60"
                    >
                      <badge.icon className="w-3 h-3 text-brand" />
                      {badge.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* OR Separator */}
              <div className="w-full max-w-xs flex items-center gap-4 my-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                <div className="h-px flex-1 bg-border/50" />
                <span className="text-[9px] font-semibold text-muted-foreground/30 tracking-widest">
                  OR
                </span>
                <div className="h-px flex-1 bg-border/50" />
              </div>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((message, i) => (
              <AuditMessage
                key={i}
                message={message}
                isLast={i === messages.length - 1}
                onEdit={handleEditPrompt}
                onFix={handleFixIssue}
                onUploadDep={handleDependencyUploadRequest}
                isFixing={isFixing}
              />
            ))}

            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-6 max-w-5xl mx-auto w-full"
              >
                <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-brand animate-pulse" />
                </div>
                <div className="px-6 py-4 rounded-2xl bg-muted/20 border border-border rounded-tl-none">
                  <span className="text-xs text-muted-foreground italic font-mono">
                    Auditor is analyzing structures...
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={scrollRef} className="h-30" />
        </div>

        {/* Error Feedback Toast */}
        <AnimatePresence>
          {error && (
            <div className="fixed top-6 right-6 w-full max-w-sm z-200">
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                className="bg-red-500/10 border border-red-500/20 text-red-500 p-5 rounded-2xl flex items-start gap-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-300"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-1">
                    System_Error
                  </p>
                  <p className="text-[12px] font-medium leading-relaxed">
                    {error}
                  </p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="p-1 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Floating Input Dock */}
        <AuditInput
          input={input}
          setInput={setInput}
          customLogic={customLogic}
          setCustomLogic={setCustomLogic}
          pendingFiles={pendingFiles}
          removePendingFile={removePendingFile}
          onAnalyze={handleAnalyze}
          onAttachClick={() => fileInputRef.current?.click()}
          isAnalyzing={isAnalyzing}
          textareaRef={textareaRef}
        />
      </div>

      {/* Invisible Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
        accept=".ts,.tsx,.js,.jsx,.py,.go,.java,.c,.cpp,.rs"
      />
      <input
        type="file"
        ref={depFileInputRef}
        onChange={handleDepFileUpload}
        className="hidden"
        multiple
        accept=".ts,.tsx,.js,.jsx,.py,.go,.java,.c,.cpp,.rs,.json"
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {sessionToDelete && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full bg-surface border border-border rounded-3xl p-10 shadow-3xl text-center space-y-8"
            >
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto border border-red-500/20">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-foreground tracking-tight leading-none">
                  Confirm Deletion
                </h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  Are you sure you want to delete{" "}
                  <span className="text-foreground font-semibold italic">
                    "{sessionToDelete?.title}"
                  </span>
                  ? This action is permanent.
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setSessionToDelete(null)}
                  className="flex-1 py-4 rounded-2xl bg-muted text-foreground font-semibold text-[11px] uppercase tracking-widest hover:bg-muted/80 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteSession(sessionToDelete?._id!)}
                  className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-semibold text-[11px] uppercase tracking-widest hover:bg-red-600 shadow-xl shadow-red-500/20 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
