"use client";

import React, { useState, useEffect, useRef } from "react";
import { saveAs } from "file-saver";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  X,
  ArrowRight,
  Loader2,
  Sparkles,
  MessageSquare,
  Upload,
  RefreshCw,
  FileCode,
  FileText,
  Table2,
  Plus,
  Check,
  Download,
  Copy,
} from "lucide-react";
import { apiClientFetch } from "@/lib/api-client";
import { useSearchParams, useRouter } from "next/navigation";
import { Tooltip } from "@/components/ui/Tooltip";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Markdown Table Renderer ────────────────────────────────────────────────

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

function parseMarkdownTable(text: string): ParsedTable | null {
  const lines = text.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 3) return null;

  const parseRow = (line: string): string[] =>
    line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

  const headers = parseRow(lines[0]);
  // lines[1] is the separator row — skip it
  const rows = lines.slice(2).map(parseRow);

  return { headers, rows };
}

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "bg-red-500/15 text-red-400 border border-red-500/30",
  High: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  Medium: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  Low: "bg-green-500/15 text-green-400 border border-green-500/30",
  Pending: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  Open: "bg-red-500/15 text-red-400 border border-red-500/30",
};

function Badge({ value }: { value: string }) {
  const colorClass =
    SEVERITY_COLORS[value] ||
    "bg-foreground/5 text-foreground/60 border border-border";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${colorClass}`}
    >
      {value}
    </span>
  );
}

const BADGE_COLUMNS = new Set(["Priority", "Status", "Severity"]);

function QATable({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  // Extract heading and table portion
  const headingMatch = text.match(/^(###[^\n]+)\n/);
  const heading = headingMatch ? headingMatch[1].replace(/^###\s*/, "") : "";
  const tableStart = text.indexOf("|");
  const tablePart = tableStart !== -1 ? text.slice(tableStart) : text;

  const parsed = parseMarkdownTable(tablePart);
  if (!parsed) return <p className="text-sm text-foreground/60">{text}</p>;

  const handleCopy = async () => {
    const headerStr = parsed.headers.join("\t");
    const rowsStr = parsed.rows.map((row) => row.join("\t")).join("\n");
    const plainText = `${headerStr}\n${rowsStr}`;

    const htmlTable = `
      <table style="border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 11px; border: 1px solid #e5e7eb;">
        <thead>
          <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
            ${parsed.headers.map((h) => `<th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left; font-weight: bold; color: #374151;">${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${parsed.rows
            .map(
              (row, ri) => `
            <tr style="background-color: ${ri % 2 === 0 ? "#ffffff" : "#f9fafb"}; border-bottom: 1px solid #e5e7eb;">
              ${row.map((cell) => `<td style="padding: 10px; border: 1px solid #e5e7eb; vertical-align: top; color: #4b5563;">${cell}</td>`).join("")}
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `;

    try {
      if (typeof ClipboardItem !== "undefined") {
        const item = new ClipboardItem({
          "text/plain": new Blob([plainText], { type: "text/plain" }),
          "text/html": new Blob([htmlTable], { type: "text/html" }),
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
    } catch (err) {
      console.error("Rich copy failed, falling back to text copy:", err);
      await navigator.clipboard.writeText(plainText);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-4">
        {heading ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
              <Table2 className="w-3.5 h-3.5 text-brand" />
            </div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              {heading}
            </h3>
          </div>
        ) : (
          <div />
        )}
      </div>

      <div className="w-full overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-brand/5 border-b border-border">
              {parsed.headers.map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left font-semibold text-foreground/70 uppercase tracking-wider text-[10px] whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
              {/* Copy icon as last column header */}
              <th className="px-4 py-3 text-right whitespace-nowrap">
                <button
                  onClick={handleCopy}
                  title={copied ? "Copied!" : "Copy Table"}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-foreground/5 hover:bg-brand/10 hover:text-brand border border-border/50 text-foreground/50 transition-all"
                >
                  {copied ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3 " />
                  )}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {parsed.rows.map((row, ri) => (
              <tr
                key={ri}
                className={cn(
                  "border-b border-border/50 transition-colors hover:bg-brand/3",
                  ri % 2 === 0 ? "bg-transparent" : "bg-foreground/1",
                )}
              >
                {row.map((cell, ci) => {
                  const headerName = parsed.headers[ci] || "";
                  const isBadge = BADGE_COLUMNS.has(headerName);
                  const isId =
                    ci === 0 &&
                    (cell.startsWith("TC-") ||
                      cell.startsWith("BUG-") ||
                      cell.startsWith("UC-"));

                  return (
                    <td
                      key={ci}
                      className="px-4 py-3 align-top text-foreground/80 leading-relaxed"
                    >
                      {isBadge ? (
                        <Badge value={cell} />
                      ) : isId ? (
                        <span className="font-mono font-bold text-brand text-[11px]">
                          {cell}
                        </span>
                      ) : (
                        <span>
                          {cell.split(/<br\s*\/?>/i).map((line, idx) => (
                            <React.Fragment key={idx}>
                              {idx > 0 && <br />}
                              {line}
                            </React.Fragment>
                          ))}
                        </span>
                      )}
                    </td>
                  );
                })}
                {/* Empty td to match the copy-icon th column */}
                <td />
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t border-border/50 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-foreground/50 uppercase tracking-widest">
            {parsed.rows.length} item{parsed.rows.length !== 1 ? "s" : ""}
          </span>
          <span className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest">
            QA Assistant
          </span>
        </div>
      </div>
    </div>
  );
}

function isTableMessage(text: string): boolean {
  // Must contain at least one markdown table separator row
  return /\|[-| ]+\|/.test(text);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "ai";
  text: string;
  id: string;
  projectId?: string;
  isReport?: boolean;
  isError?: boolean;
  isAudit?: boolean;
  isTestCases?: boolean;
  isFilePrompt?: boolean;
  pendingFileName?: string;
}

interface QAAssistantChatProps {
  onFileSelect: (file: File | null, instructions?: string) => void;
  isProcessing: boolean;
  onBack?: () => void;
  canWrite?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function QAAssistantChat({
  onFileSelect,
  isProcessing,
  onBack,
  canWrite = true,
}: QAAssistantChatProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get("sessionId");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(sessionIdFromUrl);
  const [isTyping, setIsTyping] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState<"document" | "code">("document");
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastFileRef = useRef<{ file: File; instructions: string } | null>(null);
  const pendingFileRef = useRef<{ file: File; instructions: string } | null>(
    null,
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showCenteredLayout =
    messages.length === 0 ||
    (messages.length === 1 && messages[0].id === "welcome-init");

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const saveMessagesToHistory = async (msgs: Message[]) => {
    try {
      const res = await apiClientFetch("/api/generate/chat/append", {
        method: "POST",
        body: JSON.stringify({ sessionId, messages: msgs }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
        }
        window.dispatchEvent(new CustomEvent("assistant-history-updated"));
      }
    } catch (err) {
      console.error("Failed to save history:", err);
    }
  };

  // Listen for generation complete signal from parent
  useEffect(() => {
    const handleGenerationComplete = async (e: any) => {
      const { projectId, projectName } = e.detail;
      const successMessage: Message = {
        role: "ai",
        id: `success-${Date.now()}`,
        text: `The project "${projectName}" has been successfully analyzed and stored in your dashboard with all use cases, test cases, and risk reports.`,
        projectId: projectId,
      };
      setMessages((prev) => [...prev, successMessage]);
      await saveMessagesToHistory([successMessage]);
    };

    window.addEventListener("generation-complete", handleGenerationComplete);
    return () =>
      window.removeEventListener(
        "generation-complete",
        handleGenerationComplete,
      );
  }, [sessionId]);

  useEffect(() => {
    const handleGenerationError = async (e: any) => {
      const errorMessage: Message = {
        role: "ai",
        id: `error-${Date.now()}`,
        text: "You hit your daily limit, please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
      await saveMessagesToHistory([errorMessage]);
    };

    window.addEventListener("generation-error", handleGenerationError);
    return () =>
      window.removeEventListener("generation-error", handleGenerationError);
  }, [sessionId]);

  useEffect(() => {
    lastFileRef.current = null;
    if (sessionIdFromUrl) {
      setMessages([]);
      loadSession(sessionIdFromUrl);
    } else {
      // Reset if no sessionId in URL
      setMessages([]);
      setSessionId(null);
    }
  }, [sessionIdFromUrl]);

  // Listen for "new-chat" event (fired by Brand logo & QA Assistant nav link)
  useEffect(() => {
    const handleNewChat = () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      pendingFileRef.current = null;
      lastFileRef.current = null;
      setMessages([]);
      setSessionId(null);
      setInput("");
      setSelectedFile(null);
      setIsTyping(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    window.addEventListener("new-chat", handleNewChat);
    return () => window.removeEventListener("new-chat", handleNewChat);
  }, []);

  const loadSession = async (id: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoadingSession(true);
    try {
      const res = await apiClientFetch(`/api/generate/chat/${id}`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(
          data.messages.map((m: any) => ({
            role: m.role,
            text: m.text,
            id: m._id,
            projectId: m.projectId,
            isReport: m.isReport,
          })),
        );
        setSessionId(id);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Failed to load session:", err);
    } finally {
      if (abortControllerRef.current === controller) {
        setLoadingSession(false);
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      const frameId = requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
      return () => cancelAnimationFrame(frameId);
    }
  }, [messages, isTyping]);

  // ── Download DOCX Handler ───────────────────────────────────────────────────
  const handleDownloadDocx = async (markdown: string) => {
    try {
      const res = await apiClientFetch("/api/generate/download-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      if (!res.ok) throw new Error("Failed to generate DOCX");
      const blob = await res.blob();
      saveAs(blob, "QA_Analysis_Report.docx");
    } catch (err) {
      console.error("Download DOCX Error:", err);
    }
  };

  // ── Save as Project Handler ─────────────────────────────────────────────────
  const handleSaveProject = (reportText: string, messageId: string) => {
    const isLatestMessage =
      messages.length > 0 && messages[messages.length - 1].id === messageId;
    if (isLatestMessage && lastFileRef.current?.file) {
      onFileSelect(lastFileRef.current.file, lastFileRef.current.instructions);
    } else {
      onFileSelect(
        null,
        `Based on this QA Analysis Report, please generate the full project:\n\n${reportText}`,
      );
    }
  };

  const handleSend = async (actionType?: "audit" | "testcases") => {
    if (!input.trim() && !selectedFile && !actionType) return;

    // ── File uploaded without an action: show the "what do you want?" prompt ──
    if (selectedFile && !actionType) {
      const file = selectedFile;
      const instructions = input.trim();

      // Store file for later use when user picks an action
      pendingFileRef.current = { file, instructions };

      const userMessage: Message = {
        role: "user",
        text: `[File: ${file.name}]${instructions ? ` ${instructions}` : ""}`.trim(),
        id: Date.now().toString(),
      };

      const promptMessage: Message = {
        role: "ai",
        text: "",
        id: (Date.now() + 1).toString(),
        isFilePrompt: true,
        pendingFileName: file.name,
      };

      setMessages((prev) => [...prev, userMessage, promptMessage]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setInput("");

      // Save just the user message to history
      await saveMessagesToHistory([userMessage]);
      return;
    }

    // ── Action chosen from the file-prompt message ───────────────────────────
    if (actionType && pendingFileRef.current) {
      lastFileRef.current = pendingFileRef.current;
      pendingFileRef.current = null;

      const finalInput =
        actionType === "audit"
          ? lastFileRef.current.instructions
            ? `Perform a complete QA audit report on this file. Instructions: ${lastFileRef.current.instructions}`
            : "Perform a complete QA audit report on this file."
          : lastFileRef.current.instructions
            ? `Generate a detailed test cases table for this file. Instructions: ${lastFileRef.current.instructions}`
            : "Generate a detailed test cases table for this file formatted as a markdown table.";

      const aiMessageId = Date.now().toString();
      const aiMessage: Message = {
        role: "ai",
        text: "",
        id: aiMessageId,
        isReport: true,
        isAudit: actionType === "audit",
        isTestCases: actionType === "testcases",
      };

      // Replace the file-prompt message with the generating message
      setMessages((prev) =>
        prev.map((m) => (m.isFilePrompt ? { ...aiMessage } : m)),
      );
      setIsTyping(true);

      try {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const formData = new FormData();
        formData.append("file", lastFileRef.current.file);
        const calculatedReportType =
          actionType === "testcases" ? "testcases" : reportType;
        formData.append("reportType", calculatedReportType);
        if (finalInput) {
          formData.append("instructions", finalInput);
        }

        const res = await apiClientFetch("/api/generate/report", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to generate report");

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value, { stream: true });
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMessageId ? { ...m, text: fullText } : m,
              ),
            );
          }
        }

        const RATE_LIMIT_MSG =
          "⚠️ **Daily API limit reached.** The service is temporarily unavailable. Please try again in a few minutes.";
        const INTERNAL_ERR_MSG =
          "⚠️ **Something went wrong** while generating the report. Please try again.";

        if (fullText.includes("ERROR_SIGNAL:RATE_LIMIT")) {
          const cleanText = fullText
            .replace(/\n*ERROR_SIGNAL:RATE_LIMIT/, "")
            .trim();
          const finalText =
            cleanText.length > 0
              ? `${cleanText}\n\n---\n\n${RATE_LIMIT_MSG}`
              : RATE_LIMIT_MSG;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId
                ? { ...m, text: finalText, isReport: false, isError: true }
                : m,
            ),
          );
          await saveMessagesToHistory([{ ...aiMessage, text: finalText }]);
          return;
        }

        if (fullText.includes("ERROR_SIGNAL:INTERNAL")) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId
                ? {
                    ...m,
                    text: INTERNAL_ERR_MSG,
                    isReport: false,
                    isError: true,
                  }
                : m,
            ),
          );
          await saveMessagesToHistory([
            { ...aiMessage, text: INTERNAL_ERR_MSG },
          ]);
          return;
        }

        if (!fullText.trim()) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId
                ? { ...m, text: RATE_LIMIT_MSG, isReport: false, isError: true }
                : m,
            ),
          );
          await saveMessagesToHistory([{ ...aiMessage, text: RATE_LIMIT_MSG }]);
          return;
        }

        await saveMessagesToHistory([{ ...aiMessage, text: fullText }]);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error(err);
        const errText = "Failed to generate report. Please try again.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? { ...m, text: errText, isReport: false, isError: true }
              : m,
          ),
        );
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // ── Text-only path (no file) ─────────────────────────────────────────────
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      text: input,
      id: Date.now().toString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await apiClientFetch("/api/generate/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMessage.text, sessionId }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Failed to chat");

      const data = await res.json();
      setSessionId(data.sessionId);

      const aiMessage: Message = {
        role: "ai",
        text: data.text,
        id: (Date.now() + 1).toString(),
      };

      // If the AI triggered a file-based project generation
      if (data.action === "generate" && data.triggerInfo) {
        setMessages((prev) => [...prev, aiMessage]);
        onFileSelect(
          null,
          `Module: ${data.triggerInfo.moduleName}. Context: ${data.triggerInfo.projectInfo}`,
        );
      } else {
        // Inline table or plain conversation — just show in chat
        setMessages((prev) => [...prev, aiMessage]);
      }

      window.dispatchEvent(new CustomEvent("assistant-history-updated"));
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error(err);
    } finally {
      if (abortControllerRef.current === controller) {
        setIsTyping(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-switch to 'code' type for code extensions
      const codeExtensions = [
        ".js",
        ".jsx",
        ".ts",
        ".tsx",
        ".py",
        ".java",
        ".cpp",
        ".c",
        ".h",
        ".cs",
        ".go",
        ".rb",
        ".php",
        ".html",
        ".css",
      ];
      const isCode = codeExtensions.some((ext) =>
        file.name.toLowerCase().endsWith(ext),
      );
      if (isCode) {
        setReportType("code");
      } else {
        setReportType("document");
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-28px)] w-full bg-surface border-x md:border-x-0 border-t border-border overflow-x-hidden relative group animate-in fade-in duration-500">
      {/* Header */}
      <div className="px-8 py-4 border-b border-border bg-surface/80 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-brand" />
          </div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground leading-none">
              QA Assistant
            </h4>
            <Tooltip
              content="Ask for test cases, bug reports, or use cases directly — or upload a file to generate a full project."
              side="bottom"
            >
              <div className="w-4 h-4 rounded-full bg-foreground/10 flex items-center justify-center cursor-help">
                <span className="text-[10px] font-semibold text-foreground/60">
                  i
                </span>
              </div>
            </Tooltip>
          </div>
        </div>
      </div>

      {showCenteredLayout ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-3xl mx-auto w-full z-10 select-none animate-in fade-in zoom-in-95 duration-500">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground/95 mb-10 text-center max-w-2xl leading-relaxed">
            Hello! I am your QA Assistant.
            <br />
            How can I help you today?
          </h1>

          {selectedFile && (
            <div className="w-full max-w-2xl flex justify-start mb-3 animate-in zoom-in duration-300">
              <div className="flex items-center gap-2 bg-brand/10 px-3 py-2 rounded-xl border border-brand/20 w-fit font-medium">
                <FileText className="w-3.5 h-3.5 text-brand" />
                <span className="text-[10px] font-semibold text-brand uppercase truncate max-w-[150px]">
                  {selectedFile.name}
                </span>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-brand hover:scale-110 transition-transform"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="w-full max-w-2xl relative group/input">
            <div className="absolute -inset-1 bg-brand/10 rounded-full blur-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center gap-3 bg-foreground/3 border border-border/60 rounded-full p-2 pl-4 pr-3 shadow-lg focus-within:border-brand/40 focus-within:bg-foreground/5 transition-all">
              {canWrite && (
                <Tooltip
                  content="Upload requirements (.pdf, .docx, .txt)"
                  side="top"
                >
                  <label className="h-10 w-10 flex items-center justify-center rounded-full bg-foreground/5 text-foreground/60 hover:text-brand hover:bg-brand/10 cursor-pointer transition-all shrink-0">
                    <Plus className="w-5 h-5" />
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.docx,.txt,.js,.jsx,.ts,.tsx,.py,.java"
                    />
                  </label>
                </Tooltip>
              )}

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything"
                className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-foreground/40 text-foreground font-medium px-2"
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={isProcessing}
              />

              <div className="flex items-center gap-3 pr-1 shrink-0">
                <button
                  onClick={() => handleSend()}
                  disabled={isProcessing || (!input.trim() && !selectedFile)}
                  className={cn(
                    "h-10 w-10 rounded-full transition-all flex items-center justify-center shrink-0",
                    (input.trim() || selectedFile) && !isProcessing
                      ? "bg-brand/80 hover:bg-brand text-white shadow-lg shadow-brand/10"
                      : "bg-foreground/5 text-foreground/30 cursor-not-allowed border border-border/50",
                  )}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden p-8 space-y-8 z-10 relative"
          >
            {loadingSession && (
              <div className="absolute inset-0 bg-surface/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
                <RefreshCw className="w-8 h-8 animate-spin text-brand" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground/60">
                  Restoring Chat History...
                </p>
              </div>
            )}

            {messages.length === 0 && !loadingSession && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                <div className="w-20 h-20 rounded-[28px] bg-brand/5 border-2 border-dashed border-brand/20 flex items-center justify-center rotate-3">
                  <MessageSquare className="w-10 h-10 text-brand" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground uppercase tracking-widest">
                    Start a conversation
                  </p>
                  <p className="text-[10px] font-semibold max-w-[240px] leading-relaxed text-foreground/60">
                    Ask for test cases, bug reports, or use cases — or upload a
                    file.
                  </p>
                </div>
              </div>
            )}

            {messages.map((m) => {
              const fileMatch = m.text.match(/^\[File:\s*(.*?)\]\s*([\s\S]*)$/);
              const fileName = fileMatch ? fileMatch[1] : null;
              let remainingText = fileMatch ? fileMatch[2] : m.text;

              // CLEANUP: Strip any leaked <style> blocks or raw CSS strings and 1000+ pages hallucinations
              if (m.role === "ai") {
                remainingText = remainingText
                  .replace(/<style>[\s\S]*?<\/style>/gi, "")
                  // Catch raw CSS strings like h1 { font-size: ... }
                  .replace(/h1\s*\{\s*font-size:[\s\S]*?\}/gi, "")
                  .replace(/h2\s*\{\s*font-size:[\s\S]*?\}/gi, "")
                  .replace(/h3\s*\{\s*font-size:[\s\S]*?\}/gi, "")
                  .replace(/p,\s*li,\s*td\s*\{\s*font-family:[\s\S]*?\}/gi, "")
                  .replace(/table\s*\{\s*border:[\s\S]*?\}/gi, "")
                  .replace(/th\s*\{\s*background-color:[\s\S]*?\}/gi, "")
                  .replace(/1000\+\s*pages\s*analysed/gi, "Scope analysed")
                  .trim();
              }

              const isDocx = fileName?.toLowerCase().endsWith(".docx");
              const isPdf = fileName?.toLowerCase().endsWith(".pdf");
              const isTable =
                m.role === "ai" && !m.isReport && isTableMessage(m.text);

              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300",
                    m.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      m.role === "user"
                        ? "max-w-[85%] flex flex-col items-end space-y-3"
                        : isTable
                          ? "w-full space-y-3"
                          : "max-w-[85%] flex flex-col items-start space-y-3",
                    )}
                  >
                    {/* File attachment pill */}
                    {fileName && (
                      <div
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl border bg-surface/50 backdrop-blur-sm shadow-sm min-w-[240px] max-w-sm group/file",
                          m.role === "user"
                            ? "border-brand/30"
                            : "border-border",
                        )}
                      >
                        <div
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover/file:scale-110",
                            isDocx
                              ? "bg-blue-500/10 text-blue-500"
                              : isPdf
                                ? "bg-red-500/10 text-red-500"
                                : "bg-brand/10 text-brand",
                          )}
                        >
                          {isDocx ? (
                            <FileCode className="w-6 h-6" />
                          ) : isPdf ? (
                            <FileText className="w-6 h-6" />
                          ) : (
                            <Upload className="w-6 h-6" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-widest text-foreground/60 mb-1">
                            Attachment
                          </p>
                          <h5 className="text-sm font-semibold text-foreground truncate">
                            {fileName}
                          </h5>
                        </div>
                      </div>
                    )}

                    {/* File prompt: AI asking what to do with the uploaded file */}
                    {m.isFilePrompt && (
                      <div className="bg-surface border border-border rounded-[28px] rounded-tl-none px-6 py-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <p className="text-sm font-medium text-foreground mb-4">
                          I received{" "}
                          <span className="font-semibold text-brand">
                            {m.pendingFileName}
                          </span>
                          . What would you like me to do with it?
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <button
                            onClick={() => handleSend("audit")}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand/80 hover:bg-brand text-white text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-brand/10 disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Perform Audit
                          </button>
                          <button
                            onClick={() => handleSend("testcases")}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground/5 border border-border text-foreground hover:bg-brand/10 hover:border-brand/30 hover:text-brand text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                          >
                            <Table2 className="w-3.5 h-3.5" />
                            Generate Test Cases
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Message body — table or plain text */}
                    {!m.isFilePrompt && isTable ? (
                      <div className="w-full px-0 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <QATable text={m.text} />
                      </div>
                    ) : (
                      remainingText && (
                        <div
                          className={cn(
                            "relative px-6 py-4 rounded-[32px] text-sm leading-relaxed shadow-sm",
                            m.role === "user"
                              ? "bg-brand text-white rounded-tr-none whitespace-pre-wrap"
                              : "bg-surface border border-border text-foreground rounded-tl-none prose prose-sm dark:prose-invert max-w-none",
                          )}
                        >
                          {m.role === "user" ? (
                            remainingText
                          ) : (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: ({ ...props }) => (
                                  <h1
                                    className="text-2xl font-bold mb-4 mt-6 first:mt-0 text-foreground tracking-tight border-b border-border pb-2"
                                    {...props}
                                  />
                                ),
                                h2: ({ ...props }) => (
                                  <h2
                                    className="text-xl font-bold mb-3 mt-5 first:mt-0 text-foreground/90 tracking-tight"
                                    {...props}
                                  />
                                ),
                                h3: ({ ...props }) => (
                                  <h3
                                    className="text-lg font-bold mb-2 mt-4 first:mt-0 text-foreground/80"
                                    {...props}
                                  />
                                ),
                                h4: ({ ...props }) => (
                                  <h4
                                    className="text-xs font-bold mb-1 mt-2 first:mt-0 uppercase tracking-wider"
                                    {...props}
                                  />
                                ),
                                p: ({ ...props }) => (
                                  <p className="mb-2 last:mb-0" {...props} />
                                ),
                                ul: ({ ...props }) => (
                                  <ul
                                    className="list-disc pl-4 mb-2 last:mb-0"
                                    {...props}
                                  />
                                ),
                                ol: ({ ...props }) => (
                                  <ol
                                    className="list-decimal pl-4 mb-2 last:mb-0"
                                    {...props}
                                  />
                                ),
                                li: ({ ...props }) => (
                                  <li className="mb-1 last:mb-0" {...props} />
                                ),
                                strong: ({ ...props }) => (
                                  <strong className="font-bold" {...props} />
                                ),
                                // Hide technical style blocks if they leak into the markdown
                                style: () => null,
                                table: ({ ...props }) => (
                                  <div className="my-6 w-full overflow-x-auto rounded-2xl border border-border/50 bg-foreground/2">
                                    <table
                                      className="w-full text-left border-collapse"
                                      {...props}
                                    />
                                  </div>
                                ),
                                thead: ({ ...props }) => (
                                  <thead
                                    className="bg-foreground/3 border-b border-border/50"
                                    {...props}
                                  />
                                ),
                                th: ({ ...props }) => (
                                  <th
                                    className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-foreground/60"
                                    {...props}
                                  />
                                ),
                                td: ({ children, ...props }) => {
                                  const content = String(children);

                                  // Style Severity
                                  if (content === "CRITICAL") {
                                    return (
                                      <td className="px-4 py-3 border-b border-border/10 last:border-0">
                                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-wider">
                                          Critical
                                        </span>
                                      </td>
                                    );
                                  }
                                  if (content === "HIGH") {
                                    return (
                                      <td className="px-4 py-3 border-b border-border/10 last:border-0">
                                        <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-[10px] font-bold uppercase tracking-wider">
                                          High
                                        </span>
                                      </td>
                                    );
                                  }
                                  if (content === "MEDIUM") {
                                    return (
                                      <td className="px-4 py-3 border-b border-border/10 last:border-0">
                                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider">
                                          Medium
                                        </span>
                                      </td>
                                    );
                                  }

                                  // Style Status Checkbox or "Pending" text
                                  if (
                                    content === "☐" ||
                                    content === "Pending"
                                  ) {
                                    return (
                                      <td className="px-4 py-3 border-b border-border/10 last:border-0">
                                        <span className="px-2 py-0.5 rounded-md bg-foreground/5 text-foreground/40 text-[9px] font-bold uppercase tracking-widest border border-border/50">
                                          Open
                                        </span>
                                      </td>
                                    );
                                  }

                                  // Style Findings IDs (S1, F1, etc)
                                  if (/^[A-Z]\d+$/.test(content)) {
                                    return (
                                      <td className="px-4 py-3 border-b border-border/10 last:border-0 font-mono font-bold text-brand text-[11px]">
                                        {content}
                                      </td>
                                    );
                                  }

                                  const renderedChildren = React.Children.map(
                                    children,
                                    (child) => {
                                      if (typeof child === "string") {
                                        const parts =
                                          child.split(/<br\s*\/?>/i);
                                        if (parts.length > 1) {
                                          return parts.map((part, index) => (
                                            <React.Fragment key={index}>
                                              {index > 0 && <br />}
                                              {part}
                                            </React.Fragment>
                                          ));
                                        }
                                      }
                                      return child;
                                    },
                                  );

                                  return (
                                    <td
                                      className="px-4 py-3 text-xs border-b border-border/10 last:border-0 text-foreground/80"
                                      {...props}
                                    >
                                      {renderedChildren}
                                    </td>
                                  );
                                },
                              }}
                            >
                              {remainingText}
                            </ReactMarkdown>
                          )}

                          {/* Audit: download icon in top-right corner of bubble */}
                          {m.isReport &&
                            m.isAudit &&
                            !m.isError &&
                            m.text.length > 0 &&
                            !isTyping && (
                              <div className="absolute top-4 right-4">
                                <Tooltip
                                  content="Download Audit (.docx)"
                                  side="top"
                                >
                                  <button
                                    onClick={() =>
                                      handleDownloadDocx(remainingText || "")
                                    }
                                    className="p-2 rounded-xl bg-foreground/5 hover:bg-brand/10 hover:text-brand border border-border/50 text-foreground/60 transition-all shadow-sm"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </Tooltip>
                              </div>
                            )}

                          {/* Test Cases: Save as Project button at bottom */}
                          {m.isReport &&
                            m.isTestCases &&
                            !m.isError &&
                            m.text.length > 0 &&
                            !isTyping && (
                              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border/30 pt-5">
                                <button
                                  onClick={() =>
                                    handleSaveProject(remainingText || "", m.id)
                                  }
                                  disabled={isProcessing}
                                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand/80 hover:bg-brand text-white font-semibold text-xs shadow-lg shadow-brand/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-4 h-4" />
                                  )}
                                  Save as Project
                                </button>
                              </div>
                            )}

                          {m.projectId && (
                            <div className="mt-6 pt-6 border-t border-border/10 flex flex-col gap-3">
                              <div className="flex items-center gap-2 px-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                                <span className="text-[10px] font-semibold text-brand uppercase tracking-widest">
                                  Project Analysis Ready
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  router.push(`/projects/${m.projectId}`)
                                }
                                className="w-full h-12 bg-brand/80 hover:bg-brand text-white rounded-2xl font-semibold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-brand/10 group/btn"
                              >
                                Explore Dashboard
                                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>

                  <span className="text-[9px] font-semibold text-foreground/50 uppercase tracking-[0.2em] mt-3 px-2">
                    {m.role === "user" ? "You" : "QA Assistant"}
                  </span>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="bg-surface border border-border px-5 py-3.5 rounded-3xl rounded-tl-none shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand/40 animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand/40 animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand/40 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 bg-surface/80 backdrop-blur-md border-t border-border z-10">
            {selectedFile && (
              <div className="w-full max-w-2xl mx-auto flex justify-start mb-3 animate-in zoom-in duration-300">
                <div className="flex items-center gap-2 bg-brand/10 px-3 py-2 rounded-xl border border-brand/20 w-fit font-medium">
                  <FileText className="w-3.5 h-3.5 text-brand" />
                  <span className="text-[10px] font-semibold text-brand uppercase truncate max-w-[150px]">
                    {selectedFile.name}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-brand hover:scale-110 transition-transform"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="relative group/input max-w-2xl mx-auto">
              <div className="absolute -inset-1 bg-brand/10 rounded-full blur-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center gap-3 bg-foreground/3 border border-border/60 rounded-full p-2 pl-4 pr-3 shadow-lg focus-within:border-brand/40 focus-within:bg-foreground/5 transition-all">
                {canWrite && (
                  <Tooltip
                    content="Upload requirements (.pdf, .docx, .txt)"
                    side="top"
                  >
                    <label className="h-10 w-10 flex items-center justify-center rounded-full bg-foreground/5 text-foreground/60 hover:text-brand hover:bg-brand/10 cursor-pointer transition-all shrink-0">
                      <Plus className="w-5 h-5" />
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".pdf,.docx,.txt,.js,.jsx,.ts,.tsx,.py,.java"
                      />
                    </label>
                  </Tooltip>
                )}

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    selectedFile
                      ? `Instructions for ${selectedFile.name}...`
                      : "Ask anything"
                  }
                  className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-foreground/40 text-foreground font-medium px-2"
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  disabled={isProcessing}
                />

                <div className="flex items-center gap-3 pr-1 shrink-0">
                  <button
                    onClick={() => handleSend()}
                    disabled={isProcessing || (!input.trim() && !selectedFile)}
                    className={cn(
                      "h-10 w-10 rounded-full transition-all flex items-center justify-center shrink-0",
                      (input.trim() || selectedFile) && !isProcessing
                        ? "bg-brand/80 hover:bg-brand text-white shadow-lg shadow-brand/10"
                        : "bg-foreground/5 text-foreground/30 cursor-not-allowed border border-border/50",
                    )}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
