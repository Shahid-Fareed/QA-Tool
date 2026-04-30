"use client";

import React from "react";
import {
  X,
  Paperclip,
  Send,
  Code2,
  MessageSquare,
  Trash2,
  Info,
} from "lucide-react";
import { ChatAttachment } from "@/types/qa";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AuditInputProps {
  input: string;
  setInput: (val: string) => void;
  customLogic: string;
  setCustomLogic: (val: string) => void;
  pendingFiles: ChatAttachment[];
  removePendingFile: (idx: number) => void;
  onAnalyze: (e?: React.FormEvent) => void;
  onAttachClick: () => void;
  isAnalyzing: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const AuditInput: React.FC<AuditInputProps> = ({
  input,
  setInput,
  customLogic,
  setCustomLogic,
  pendingFiles,
  removePendingFile,
  onAnalyze,
  onAttachClick,
  isAnalyzing,
  textareaRef,
}) => {
  const [activeTab, setActiveTab] = React.useState<"code" | "instructions">(
    "code",
  );

  return (
    <div className="absolute bottom-0 left-0 right-0 pb-2 px-4 md:px-8 pt-0 z-40">
      <div className="max-w-3xl mx-auto flex flex-col gap-1.5">
        <form
          onSubmit={onAnalyze}
          className="relative rounded-[20px] bg-surface/80 backdrop-blur-3xl border border-brand/20 shadow-[0_15px_40px_rgba(0,0,0,0.1)] overflow-hidden transition-all duration-500 focus-within:border-brand/40"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-1 border-b border-border/50 bg-muted/5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("code")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-semibold uppercase tracking-widest transition-all",
                  activeTab === "code"
                    ? "bg-brand/10 text-brand border border-brand/20"
                    : "text-muted-foreground/80 hover:text-foreground",
                )}
              >
                <Code2 className="w-3 h-3" />
                Paste Code
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("instructions")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-semibold uppercase tracking-widest transition-all",
                  activeTab === "instructions"
                    ? "bg-brand/10 text-brand border border-brand/20"
                    : "text-muted-foreground/80 hover:text-foreground",
                )}
              >
                <MessageSquare className="w-3 h-3" />
                Add Instructions
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setInput("");
                setCustomLogic("");
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-semibold text-muted-foreground/70 hover:text-red-500 hover:bg-red-500/5 transition-all uppercase tracking-widest border border-transparent hover:border-red-500/20"
            >
              <Trash2 className="w-2.5 h-2.5" />
              Clear
            </button>
          </div>

          {/* Input Area */}
          <div className="flex min-h-[60px] max-h-[250px]">
            {/* Line Numbers Simulation */}
            <div className="w-7 bg-muted/5 border-r border-border/50 flex flex-col items-center py-2 text-[8px] font-mono text-muted-foreground/50 select-none">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-4 flex items-center">
                  {n}
                </div>
              ))}
            </div>

            <div className="flex-1 relative">
              {activeTab === "code" ? (
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste your code here..."
                  className="w-full h-full bg-transparent border-none outline-none focus:ring-0 p-2 text-[11px] font-mono leading-4 resize-none scrollbar-hide text-foreground/80 placeholder:text-muted-foreground/50"
                />
              ) : (
                <textarea
                  value={customLogic}
                  onChange={(e) => setCustomLogic(e.target.value)}
                  placeholder="Add specific instructions..."
                  className="w-full h-full bg-transparent border-none outline-none focus:ring-0 p-2 text-[11px] leading-relaxed resize-none scrollbar-hide text-brand placeholder:text-brand/40"
                />
              )}
            </div>
          </div>

          {/* Pending Files Chip Array */}
          {pendingFiles.length > 0 && (
            <div className="px-5 py-1 flex flex-wrap gap-1 border-t border-border/20 bg-muted/5">
              {pendingFiles.map((file: ChatAttachment, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 bg-brand/5 border border-brand/10 px-1.5 py-0.5 rounded animate-in zoom-in duration-200"
                >
                  <Code2 className="w-2 h-2 text-brand" />
                  <span className="text-[8px] font-semibold text-foreground truncate max-w-[100px]">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePendingFile(idx)}
                    className="p-0.5 hover:bg-red-500/10 rounded text-muted-foreground/40 hover:text-red-500 transition-all"
                  >
                    <X className="w-1.5 h-1.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-5 py-1.5 border-t border-border/50 bg-muted/5">
            <button
              type="button"
              onClick={onAttachClick}
              className="p-1.5 text-muted-foreground/70 hover:text-brand hover:bg-brand/5 rounded transition-all active:scale-95 border border-transparent hover:border-brand/10"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>

            <button
              type="submit"
              disabled={
                isAnalyzing || (!input.trim() && pendingFiles.length === 0)
              }
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1 rounded-lg font-semibold text-[10px] transition-all shadow-lg active:scale-95",
                (input.trim() || pendingFiles.length > 0) && !isAnalyzing
                  ? "bg-brand text-white shadow-brand/10 hover:shadow-brand/20 hover:-translate-y-0.5"
                  : "bg-muted text-muted-foreground/60 grayscale pointer-events-none",
              )}
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Code"}
              <Send className="w-3 h-3" />
            </button>
          </div>
        </form>

        {/* Forensic Tip */}
        <div className="flex items-center justify-center gap-1 text-[9px] font-semibold text-muted-foreground/60 tracking-tight animate-in fade-in duration-1000 delay-500">
          <Info className="w-2.5 h-2.5" />
          <span>Tip: Provide clear context for better results.</span>
        </div>
      </div>
    </div>
  );
};
