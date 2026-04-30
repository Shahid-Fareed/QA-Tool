"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Edit3, FileCode, ShieldCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ChatAttachment } from "@/types/qa";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CodeBlock = ({
  language,
  content,
  ...props
}: {
  language: string;
  content: string;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <div className="relative group/code mt-4 mb-6 max-w-full overflow-hidden shadow-xl rounded-xl border border-border/50">
      <div className="absolute top-3 right-3 opacity-0 group-hover/code:opacity-100 transition-opacity z-20">
        <button
          onClick={handleCopy}
          className={cn(
            "p-2 rounded-lg border transition-all flex items-center gap-1.5 backdrop-blur-md",
            copied
              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
              : "bg-black/40 border-white/10 text-slate-300 hover:text-white hover:bg-black/60",
          )}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span className="text-[10px] font-semibold uppercase tracking-widest">
            {copied ? "Copied" : "Copy"}
          </span>
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language || "javascript"}
        PreTag="div"
        className="rounded-xl bg-[#0d0d0d]! p-6! m-0! font-mono text-[13px] leading-relaxed overflow-x-auto w-full custom-scrollbar"
        {...props}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
};

export const UserMessageContent = ({
  content,
  attachments,
  customRules,
  onEdit,
  isLastMessage,
}: {
  content: string;
  attachments?: ChatAttachment[];
  customRules?: string;
  onEdit?: () => void;
  isLastMessage?: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <div className="space-y-4">
      {customRules && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand/5 border border-brand/10 p-4 rounded-xl space-y-3 relative overflow-hidden group/rules"
        >
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <ShieldCheck className="w-12 h-12 text-brand/20" />
          </div>
          <div className="flex items-center gap-2 text-[9px] font-semibold text-brand uppercase tracking-[0.2em] relative z-10">
            <Edit3 className="w-3 h-3" />
            Applied_Custom_Rules
          </div>
          <div className="pl-4 border-l border-brand/30">
            <p className="text-[12px] font-mono text-brand leading-relaxed italic relative z-10">
              "{customRules}"
            </p>
          </div>
        </motion.div>
      )}

      {attachments && attachments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {attachments.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 bg-muted/30 border border-border/50 p-3 rounded-xl group/file hover:bg-muted/50 transition-all shadow-sm"
            >
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                <FileCode className="w-4 h-4 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-foreground truncate">
                  {file.name}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium">
                  {file.type || "Source Code"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex flex-col items-start gap-3 group/user-content">
        {content && (
          <div className="w-full text-left text-[13px] font-mono leading-relaxed bg-muted/20 p-5 rounded-xl border border-border shadow-inner text-foreground">
            <pre className="whitespace-pre-wrap">{content}</pre>
          </div>
        )}

        {content && (
          <div className="flex gap-2 relative z-20">
            {isLastMessage && onEdit && (
              <button
                onClick={onEdit}
                className="px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex items-center gap-2 backdrop-blur-md group/edit-btn shadow-sm"
                title="Neural Re-edit"
              >
                <Edit3 className="w-3.5 h-3.5 group-hover/edit-btn:rotate-12 transition-transform" />
                <span className="text-[9px] font-semibold uppercase tracking-widest leading-none">
                  Edit
                </span>
              </button>
            )}
            <button
              onClick={handleCopy}
              className={cn(
                "px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 backdrop-blur-md shadow-sm",
                copied
                  ? "bg-brand/20 border-brand/30 text-brand font-semibold"
                  : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span className="text-[9px] font-semibold uppercase tracking-widest leading-none">
                {copied ? "Copied" : "Copy"}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
