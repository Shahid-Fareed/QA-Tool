"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ArrowRight,
  Loader2,
  Sparkles,
  Camera,
  History,
  MessageSquare,
  Upload,
  RefreshCw,
  FileCode,
  FileText,
} from "lucide-react";
import { apiClientFetch } from "@/lib/api-client";
import { useSearchParams, useRouter } from "next/navigation";
import { Tooltip } from "@/components/ui/Tooltip";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  role: "user" | "ai";
  text: string;
  id: string;
  projectId?: string;
}

interface QAAssistantChatProps {
  onFileSelect: (file: File | null, instructions?: string) => void;
  isProcessing: boolean;
  onBack?: () => void;
}

export function QAAssistantChat({
  onFileSelect,
  isProcessing,
  onBack,
}: QAAssistantChatProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get("sessionId");
  const WELCOME_MESSAGE: Message = {
    role: "ai",
    id: "welcome-init",
    text: "Hello! I am your QA Assistant. To get started, please either:\n\n• Upload a requirements file (.pdf, .docx, or .txt) using the upload button below, or\n• Type a specific module or feature name (e.g. \"use case for Filters\") and I will generate comprehensive test cases and use cases for it.\n\nHow can I help you today?",
  };

  const [messages, setMessages] = useState<Message[]>(
    sessionIdFromUrl ? [] : [WELCOME_MESSAGE],
  );
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(sessionIdFromUrl);
  const [isTyping, setIsTyping] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
        // Notify history sidebar to refresh
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
    if (sessionIdFromUrl) {
      // Clear the welcome message and load the real session
      setMessages([]);
      loadSession(sessionIdFromUrl);
    }
  }, [sessionIdFromUrl]);

  const loadSession = async (id: string) => {
    setLoadingSession(true);
    try {
      const res = await apiClientFetch(`/api/generate/chat/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(
          data.messages.map((m: any) => ({
            role: m.role,
            text: m.text,
            id: m._id,
            projectId: m.projectId,
          })),
        );
        setSessionId(id);
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    } finally {
      setLoadingSession(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() && !selectedFile) return;

    const userMessage: Message = {
      role: "user",
      text: selectedFile
        ? `[File: ${selectedFile.name}] ${input}`.trim()
        : input,
      id: Date.now().toString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    if (selectedFile) {
      const aiMessage: Message = {
        role: "ai",
        text: `I've received your file "${selectedFile.name}". I'm starting the generation process now...`,
        id: (Date.now() + 1).toString(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      // PERSIST FIRST — before onFileSelect triggers router.push which remounts the component
      await saveMessagesToHistory([userMessage, aiMessage]);

      onFileSelect(selectedFile, input);
      setSelectedFile(null);
      setInput("");
      return;
    }

    setInput("");
    setIsTyping(true);

    try {
      const res = await apiClientFetch("/api/generate/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMessage.text, sessionId }),
      });

      if (!res.ok) throw new Error("Failed to chat");

      const data = await res.json();
      setSessionId(data.sessionId);

      const aiMessage: Message = {
        role: "ai",
        text: data.text,
        id: (Date.now() + 1).toString(),
      };

      // If the AI triggered a generation action
      if (data.action === "generate" && data.triggerInfo) {
        setMessages((prev) => [...prev, aiMessage]);
        // Trigger the actual generation logic via the parent
        // Since we don't have a file here, we pass null and the prompt/context
        onFileSelect(
          null,
          `Module: ${data.triggerInfo.moduleName}. Context: ${data.triggerInfo.projectInfo}`,
        );
      } else {
        setMessages((prev) => [...prev, aiMessage]);
      }

      // Notify sidebar to refresh history
      window.dispatchEvent(new CustomEvent("assistant-history-updated"));
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-28px)] w-full bg-surface border-x md:border-x-0 border-t border-border overflow-x-hidden relative group animate-in fade-in duration-500">
      {/* Subtle glow */}
      <div className="absolute inset-0 bg-brand/2 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Header */}
      <div className="px-8 py-4 border-b border-border bg-surface/80 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl hover:bg-brand/10 text-foreground/40 hover:text-brand transition-all group/back"
              title="Back to Dashboard"
            >
              <ArrowRight className="w-4 h-4 rotate-180 group-hover/back:-translate-x-1 transition-transform" />
            </button>
          )}
          <div className="flex items-center gap-3 border-l border-border pl-4">
            <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-brand" />
            </div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground leading-none">
                QA AI Assistant
              </h4>
              <Tooltip
                content="Analyze requirements, generate test cases, and identify risks with AI."
                side="bottom"
              >
                <div className="w-4 h-4 rounded-full bg-foreground/5 flex items-center justify-center cursor-help">
                  <span className="text-[10px] font-semibold text-foreground/40">
                    i
                  </span>
                </div>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Thread */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-8 space-y-8 scroll-smooth z-10 relative"
      >
        {loadingSession && (
          <div className="absolute inset-0 bg-surface/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
            <RefreshCw className="w-8 h-8 animate-spin text-brand" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground/40">
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
              <p className="text-[10px] font-semibold max-w-[200px] leading-relaxed">
                Upload a requirements file or describe your module to begin.
              </p>
            </div>
          </div>
        )}

        {messages.map((m) => {
          const fileMatch = m.text.match(/^\[File:\s*(.*?)\]\s*([\s\S]*)$/);
          const fileName = fileMatch ? fileMatch[1] : null;
          const remainingText = fileMatch ? fileMatch[2] : m.text;
          const isDocx = fileName?.toLowerCase().endsWith(".docx");
          const isPdf = fileName?.toLowerCase().endsWith(".pdf");
          const isTxt = fileName?.toLowerCase().endsWith(".txt");

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
                  "max-w-[85%] space-y-3",
                  m.role === "user"
                    ? "flex flex-col items-end"
                    : "flex flex-col items-start",
                )}
              >
                {fileName && (
                  <div
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border bg-surface/50 backdrop-blur-sm shadow-sm min-w-[240px] max-w-sm group/file",
                      m.role === "user" ? "border-brand/30" : "border-border",
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
                      <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40 mb-1">
                        Attachment
                      </p>
                      <h5 className="text-sm font-semibold text-foreground truncate">
                        {fileName}
                      </h5>
                    </div>
                  </div>
                )}

                {remainingText && (
                  <div
                    className={cn(
                      "px-6 py-4 rounded-[32px] text-sm leading-relaxed shadow-sm whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-brand text-white rounded-tr-none"
                        : "bg-surface border border-border text-foreground rounded-tl-none",
                    )}
                  >
                    {remainingText}

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
                          className="w-full h-12 bg-brand hover:bg-brand/90 text-white rounded-2xl font-semibold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-brand/20 group/btn"
                        >
                          Explore Dashboard
                          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <span className="text-[9px] font-semibold text-foreground/20 uppercase tracking-[0.2em] mt-3 px-2">
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
        <div className="relative group/input">
          <div className="absolute -inset-1 bg-brand/10 rounded-[24px] blur-lg opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center gap-3 bg-surface border border-border rounded-[24px] p-2 pl-6 shadow-sm focus-within:border-brand/40 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                selectedFile
                  ? `Instructions for ${selectedFile.name}...`
                  : "Type a message or paste requirements..."
              }
              className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-foreground/40 text-foreground font-medium"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={isProcessing}
            />

            <div className="flex items-center gap-2">
              <Tooltip
                content="Upload requirements (.pdf, .docx, .txt)"
                side="top"
              >
                <label className="h-11 px-3 flex items-center justify-center rounded-xl bg-brand/5 text-foreground/60 hover:text-brand cursor-pointer transition-colors border border-brand/5">
                  <Upload className="w-4 h-4" />
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.txt"
                  />
                </label>
              </Tooltip>

              {selectedFile && (
                <div className="flex items-center gap-2 bg-brand/10 px-3 py-2 rounded-xl border border-brand/20 animate-in zoom-in">
                  <span className="text-[10px] font-semibold text-brand uppercase truncate max-w-[80px]">
                    {selectedFile.name}
                  </span>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-brand hover:scale-110 transition-transform"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={isProcessing || (!input.trim() && !selectedFile)}
                className={cn(
                  "h-11 px-6 rounded-xl font-semibold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2",
                  (input.trim() || selectedFile) && !isProcessing
                    ? "bg-brand text-white shadow-lg shadow-brand/20 hover:shadow-brand/40"
                    : "bg-surface text-foreground/40 cursor-not-allowed border border-border/50",
                )}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Send <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
