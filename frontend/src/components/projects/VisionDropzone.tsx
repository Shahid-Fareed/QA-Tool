"use client";

import React, { useCallback, useState } from "react";
import { apiClientFetch } from "@/lib/api-client";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  ArrowRight,
  FileText,
  Loader2,
  Camera,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Zap,
  Upload,
  Info,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Tooltip } from "@/components/ui/Tooltip";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface VisionDropzoneProps {
  onFileSelect: (file: File | null, prompt?: string) => void;
  isProcessing: boolean;
}

export const VisionDropzone: React.FC<VisionDropzoneProps> = ({
  onFileSelect,
  isProcessing,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState("");
  const [isVisionLoading, setIsVisionLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  };

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  const handleSend = async () => {
    if (!selectedFile && !instructions.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      text: instructions,
      file: selectedFile,
      preview: previewUrl,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInstructions("");
    setSelectedFile(null);
    setPreviewUrl(null);

    // Logic for Image Vision API
    if (
      userMessage.file &&
      userMessage.file.type.startsWith("image/") &&
      projectId
    ) {
      setIsVisionLoading(true);
      setError(null);

      // Add loading message
      const loadingId = "loading-" + Date.now();
      setMessages((prev) => [
        ...prev,
        { id: loadingId, role: "ai", type: "loading" },
      ]);

      try {
        const formData = new FormData();
        formData.append("file", userMessage.file);
        if (userMessage.text.trim()) {
          formData.append("instructions", userMessage.text.trim());
        }

        const res = await apiClientFetch(
          `/api/projects/${projectId}/bugs/analyze-vision?preview=true`,
          {
            method: "POST",
            body: formData,
          },
        );

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to analyze image");
        }

        const result = await res.json();

        // Update loading message to analysis result
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? {
                  ...m,
                  type: "analysis",
                  data: result,
                  error: result.error ? result.message || result.error : null,
                }
              : m,
          ),
        );
      } catch (err: any) {
        setError(err.message);
        setMessages((prev) => prev.filter((m) => m.id !== loadingId));
      } finally {
        setIsVisionLoading(false);
      }
      return;
    } else if (userMessage.text.trim()) {
      // Handle text-only message
      const responseId = "ai-" + Date.now();
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: responseId,
            role: "ai",
            type: "text",
            text: "I'm ready to perform a audit of your UI. Please upload or paste a screenshot for analysis.",
          },
        ]);
      }, 600);
    }

    onFileSelect(selectedFile, instructions);
  };

  const handleSaveMessage = async (messageId: string, bugData: any) => {
    if (!bugData || !projectId) return;

    setIsSaving(true);
    setError(null);
    try {
      const res = await apiClientFetch(
        `/api/projects/${projectId}/bugs/persist-vision`,
        {
          method: "POST",
          body: JSON.stringify(bugData),
        },
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save bug");
      }

      const result = await res.json();

      // Update message to success state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                type: "success",
                successData: {
                  id: result.customId,
                  moduleId: result.moduleId,
                  mongoId: result._id,
                },
              }
            : m,
        ),
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col pb-40">
      {messages.length === 0 && (
        <div className="relative group animate-in fade-in zoom-in duration-1000 delay-200">
          <div
            className={cn(
              "relative w-full max-w-4xl mx-auto border-2 border-dashed border-brand/20 rounded-[40px] bg-white/2 py-8 px-12 flex flex-col items-center justify-center transition-all duration-500",
              "hover:border-brand/40 hover:bg-brand/1",
            )}
          >
            {/* Visual Indicators */}
            <div className="flex items-center gap-4 mb-3 relative">
              <div className="w-14 h-14 rounded-3xl bg-brand/5 border border-brand/10 flex items-center justify-center text-brand/20 -rotate-12">
                <FileText className="w-6 h-6" />
              </div>
              <div className="w-16 h-16 rounded-[24px] bg-brand text-white flex items-center justify-center shadow-2xl shadow-brand/20 z-10">
                <Camera className="w-8 h-8" />
              </div>
              <div className="w-14 h-14 rounded-3xl bg-brand/5 border border-brand/10 flex items-center justify-center text-brand/20 rotate-12">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>

            <div className="text-center space-y-2 mb-8">
              <h2 className="text-lg font-semibold text-foreground tracking-tight">
                Upload a screenshot to start AI analysis
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                Drag & drop, paste from clipboard, or browse
              </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              {[
                { label: "PNG, JPG, JPEG", icon: CheckCircle2 },
                { label: "Max 10MB", icon: CheckCircle2 },
                { label: "Up to 4K resolution", icon: CheckCircle2 },
              ].map((badge, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand/3 border border-brand/10 text-[10px] font-semibold text-brand"
                >
                  <badge.icon className="w-3 h-3" />
                  {badge.label}
                </div>
              ))}
            </div>

            <label
              htmlFor="dropzone-file"
              className="flex items-center gap-3 px-8 py-2 rounded-xl bg-brand text-white font-semibold text-[13px] shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer mb-6"
            >
              <Upload className="w-4 h-4" />
              Choose File
            </label>
            <input
              id="dropzone-file"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="image/*"
            />

            {/* Paste Hint */}
            <div className="w-full max-w-sm flex items-center gap-4 text-muted-foreground/30">
              <div className="h-px flex-1 bg-border/40" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">
                OR
              </span>
              <div className="h-px flex-1 bg-border/40" />
            </div>

            <div className="mt-6 flex items-center gap-3 text-muted-foreground/50">
              <span className="text-[11px] font-medium">
                Paste screenshot from clipboard
              </span>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border/50 bg-muted/30 text-[10px] font-semibold font-mono">
                Ctrl + V
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Chat Thread (Active Session) ── */}
      {messages.length > 0 && (
        <div className="flex-1 space-y-10 pt-10">
          {messages.map((m) => (
            <div
              key={m.id}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              {m.role === "user" ? (
                /* User Message Bubble */
                <div className="flex flex-col items-end gap-3 group">
                  <div
                    className={cn(
                      "max-w-[95%] transition-all",
                      m.preview
                        ? "rounded-2xl overflow-hidden shadow-2xl"
                        : "bg-brand text-white px-5 py-3 shadow-lg shadow-brand/10 rounded-3xl rounded-tr-none",
                    )}
                  >
                    {m.text && (
                      <p
                        className={cn(
                          "text-sm leading-relaxed",
                          m.preview ? "p-4 bg-brand text-white" : "",
                        )}
                      >
                        {m.text}
                      </p>
                    )}
                    {m.preview && (
                      <img
                        src={m.preview}
                        alt="Upload"
                        className="w-full max-h-[600px] object-contain block"
                      />
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-foreground/20 uppercase tracking-widest mr-2 transition-opacity group-hover:opacity-100">
                    You
                  </span>
                </div>
              ) : (
                /* AI Response Bubble */
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0 border border-brand/20 mt-1 shadow-sm">
                    <Sparkles className="w-4 h-4 text-brand" />
                  </div>
                  <div className="flex-1 max-w-[95%] space-y-2">
                    <div className="bg-surface border border-border rounded-2xl rounded-tl-none p-6 shadow-sm">
                      {m.type === "loading" ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
                            <span className="text-xs font-semibold text-brand uppercase tracking-widest animate-pulse">
                              Analyzing Vision...
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="h-3 bg-brand/5 rounded-full w-[85%] animate-pulse" />
                            <div className="h-3 bg-brand/5 rounded-full w-[60%] animate-pulse delay-75" />
                          </div>
                        </div>
                      ) : m.type === "analysis" ? (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground uppercase tracking-widest mb-1 flex items-center gap-2">
                              Audit Report Generated
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            </h3>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                              Review findings and persist to tracker
                            </p>
                          </div>

                          {m.error ? (
                            <div className="p-4 rounded-xl bg-brand/5 italic text-sm text-muted-foreground leading-relaxed">
                              {m.error}
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {/* Detailed Report Section */}
                              <div className="p-5 rounded-2xl bg-brand/3 space-y-4">
                                <h5 className="text-[10px] font-semibold text-brand uppercase tracking-widest flex items-center gap-2 mb-4">
                                  <FileText className="w-3 h-3" />
                                  Analysis Report
                                </h5>
                                <div className="space-y-4">
                                  {(() => {
                                    let raw = m.data?.detailedAnalysis;
                                    if (
                                      typeof raw === "string" &&
                                      raw.trim().startsWith("{")
                                    ) {
                                      try {
                                        raw = JSON.parse(raw);
                                      } catch (e) {}
                                    }

                                    if (
                                      raw &&
                                      typeof raw === "object" &&
                                      !Array.isArray(raw)
                                    ) {
                                      return Object.entries(raw).map(
                                        ([key, value], i) => (
                                          <div
                                            key={i}
                                            className="space-y-2 mb-6 last:mb-0"
                                          >
                                            <div className="flex items-center gap-2">
                                              <div className="w-1 h-3.5 bg-brand rounded-full shrink-0" />
                                              <span className="text-[10px] font-semibold text-foreground uppercase tracking-widest">
                                                {key
                                                  .replace(/[^\w\s&]/g, "")
                                                  .trim()}
                                                :
                                              </span>
                                            </div>
                                            <p className="text-xs text-foreground/70 leading-relaxed font-medium px-3">
                                              {String(value)}
                                            </p>
                                          </div>
                                        ),
                                      );
                                    }

                                    const content = String(
                                      raw || "Analysis complete.",
                                    );
                                    return content
                                      .split("\n")
                                      .filter((line: string) => line.trim())
                                      .map((line: string, i: number) => {
                                        const isHeading = line
                                          .trim()
                                          .match(/^[^\w\s]*\s*[A-Z\s&]+\:$/);
                                        const isBullet =
                                          line.trim().startsWith("-") ||
                                          line.trim().startsWith("•");

                                        if (isHeading) {
                                          return (
                                            <div
                                              key={i}
                                              className="flex items-center gap-2 mt-6 first:mt-0 pt-2"
                                            >
                                              <div className="w-1 h-3.5 bg-brand rounded-full shrink-0" />
                                              <span className="text-[10px] font-semibold text-foreground uppercase tracking-widest">
                                                {line.trim()}
                                              </span>
                                            </div>
                                          );
                                        }

                                        return (
                                          <div
                                            key={i}
                                            className="flex gap-3 px-1"
                                          >
                                            {isBullet && (
                                              <div className="w-1.5 h-1.5 rounded-full bg-brand/30 mt-1.5 shrink-0" />
                                            )}
                                            <p className="text-xs text-foreground/70 leading-relaxed font-medium">
                                              {isBullet
                                                ? line
                                                    .trim()
                                                    .substring(1)
                                                    .trim()
                                                : line.trim()}
                                            </p>
                                          </div>
                                        );
                                      });
                                  })()}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 rounded bg-brand/5 text-[10px] font-mono font-semibold text-brand uppercase tracking-wider">
                                  ID: {m.data.customId}
                                </span>
                                <span className="px-2 py-1 rounded bg-brand/5 text-[10px] font-mono font-semibold text-brand uppercase tracking-wider">
                                  Module: {m.data.moduleId}
                                </span>
                                <span
                                  className={cn(
                                    "px-2 py-1 rounded text-[10px] font-mono font-semibold uppercase tracking-wider",
                                    m.data.priority === "Critical" ||
                                      m.data.priority === "High"
                                      ? "bg-red-500/10 text-red-500"
                                      : "bg-emerald-500/10 text-emerald-500",
                                  )}
                                >
                                  Priority: {m.data.priority}
                                </span>
                              </div>

                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-foreground">
                                  {m.data.title}
                                </h4>
                                <p className="text-xs text-foreground/50 leading-relaxed">
                                  {m.data.description}
                                </p>
                              </div>

                              <button
                                onClick={() => {
                                  const { detailedAnalysis, ...bugToSave } =
                                    m.data;
                                  handleSaveMessage(m.id, bugToSave);
                                }}
                                disabled={isProcessing || isSaving}
                                className="w-full h-11 bg-brand text-white rounded-2xl text-[11px] font-semibold uppercase tracking-widest hover:shadow-lg hover:shadow-brand/20 transition disabled:opacity-50"
                              >
                                {isSaving ? (
                                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                ) : (
                                  "Save Bug to Tracker"
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : m.type === "success" ? (
                        <div className="space-y-4 animate-in zoom-in duration-300">
                          <div className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-500/5">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-sm font-semibold text-foreground">
                                Bug Persisted
                              </h4>
                              <p className="text-xs text-foreground/40 font-medium">
                                Report has been successfully archived.
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 rounded bg-emerald-500/10 text-[10px] font-mono font-semibold text-emerald-600">
                              ID: {m.successData.id}
                            </span>
                            <span className="px-2 py-1 rounded bg-emerald-500/10 text-[10px] font-mono font-semibold text-emerald-600">
                              MODULE: {m.successData.moduleId}
                            </span>
                          </div>

                          <button
                            onClick={() =>
                              router.push(
                                `/projects/${projectId}/bugs?selected=${m.successData.mongoId}&module=${encodeURIComponent(m.successData.moduleId)}`,
                              )
                            }
                            className="w-full py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-semibold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                          >
                            View Archived Details{" "}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : m.type === "text" ? (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {m.text}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-[10px] font-semibold text-foreground/30 uppercase tracking-widest ml-2">
                      QA AI
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Sticky Input Section ── */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-full rounded-3xl bg-surface/80 backdrop-blur-3xl px-5 py-3.5 border border-brand/20 shadow-[0_20px_60px_rgba(0,0,0,0.15)] focus-within:border-brand/50 focus-within:ring-4 focus-within:ring-brand/5 transition-all duration-300">
            {selectedFile && (
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-brand/10 px-3 py-2 text-xs text-foreground/80 animate-in zoom-in duration-300 border border-brand/20">
                <FileText className="w-4 h-4 text-brand" />
                <span className="truncate max-w-[200px] font-semibold text-foreground">
                  {selectedFile.name}
                </span>
                <button
                  type="button"
                  onClick={clearFile}
                  className="h-6 w-6 flex items-center justify-center rounded-lg bg-brand/20 text-brand hover:bg-brand/30 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-4">
              <label
                htmlFor="footer-upload"
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-brand/5 text-foreground/30 hover:text-brand hover:bg-brand/10 transition cursor-pointer shrink-0"
              >
                <Camera className="w-5 h-5" />
              </label>
              <input
                id="footer-upload"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="image/*"
              />

              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    (selectedFile || instructions.trim()) &&
                    !isVisionLoading
                  ) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                onPaste={(e) => {
                  const item = e.clipboardData.items[0];
                  if (item?.type.startsWith("image/")) {
                    const file = item.getAsFile();
                    if (file) {
                      setSelectedFile(file);
                      const url = URL.createObjectURL(file);
                      setPreviewUrl(url);
                    }
                  }
                }}
                placeholder="Describe what you want to test or check in this screenshot..."
                className="flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none font-medium"
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={
                  isVisionLoading || (!selectedFile && !instructions.trim())
                }
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-2xl transition",
                  selectedFile || instructions.trim()
                    ? "bg-brand text-white shadow-lg shadow-brand/20 hover:scale-105 active:scale-95"
                    : "bg-muted/30 text-muted-foreground/30",
                )}
              >
                {isVisionLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Tips / Info */}
          <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground/50 tracking-tight">
            <Info className="w-3.5 h-3.5" />
            <span>
              Tip: For best results, include the full screen and ensure text is
              clear and readable.
            </span>
          </div>
        </div>
      </div>

      {/* ── Errors ── */}
      {error && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 z-50 p-4 rounded-2xl bg-red-500 border border-red-600 text-white text-sm flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <AlertCircle className="w-5 h-5" />
          <p className="font-semibold">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-4 opacity-50 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
