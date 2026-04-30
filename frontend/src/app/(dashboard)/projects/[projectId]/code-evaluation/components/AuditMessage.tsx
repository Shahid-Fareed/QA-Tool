"use client";

import React from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  User,
  ShieldCheck,
  AlertCircle,
  FileCode,
  Zap,
  Plus,
  UploadCloud,
} from "lucide-react";
import { ChatMessage } from "@/types/qa";
import { CodeBlock, UserMessageContent } from "./MessageComponents";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AuditMessageProps {
  message: ChatMessage;
  isLast: boolean;
  onEdit: (msg: ChatMessage) => void;
  onFix: (fixActions: string[]) => void;
  onUploadDep: (path: string) => void;
  isFixing: string | null;
}

export const AuditMessage: React.FC<AuditMessageProps> = ({
  message,
  isLast,
  onEdit,
  onFix,
  onUploadDep,
  isFixing,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-6 min-w-0 w-full px-2",
        message.role === "user" ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform hover:scale-105",
          message.role === "user"
            ? "bg-brand text-white border-brand shadow-lg shadow-brand/20"
            : "bg-surface border-border shadow-sm",
        )}
      >
        {message.role === "user" ? (
          <User className="w-4 h-4" />
        ) : (
          <ShieldCheck className="w-5 h-5 text-brand" />
        )}
      </div>

      <div
        className={cn(
          "flex flex-col max-w-full flex-1 min-w-0",
          message.role === "user"
            ? "items-end text-right"
            : "items-start text-left",
        )}
      >
        <div className="flex items-center gap-2 mb-2 px-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">
          {message.role === "user" ? "Client_Request" : "Auditor_Response"}
          <span className="w-1 h-1 rounded-full bg-muted mx-2" />
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </div>

        <div
          className={cn(
            "px-6 py-4 rounded-2xl border transition-all max-w-full",
            message.role === "user"
              ? "bg-brand/5 border-brand/20 text-foreground rounded-tr-none shadow-xs"
              : "bg-surface border-border text-foreground rounded-tl-none shadow-sm hover:shadow-md",
          )}
        >
          {message.role === "user" ? (
            <UserMessageContent
              content={message.content}
              attachments={message.attachments}
              customRules={message.customRules}
              isLastMessage={isLast}
              onEdit={() => onEdit(message)}
            />
          ) : (
            <div className="space-y-8 w-full min-w-0">
              <div className="prose prose-sm dark:prose-invert max-w-none w-full min-w-0">
                <ReactMarkdown
                  components={{
                    h2: ({ children, ...props }) => {
                      const isMissingDeps =
                        String(children).toUpperCase().includes("MISSING") ||
                        String(children).toUpperCase().includes("REQUIRED");
                      return (
                        <div className="flex items-center justify-between mt-6 mb-3 group/h2">
                          <h2
                            className="text-base font-semibold text-foreground border-l-4 border-brand pl-4 uppercase tracking-widest"
                            {...props}
                          >
                            {children}
                          </h2>
                          {isMissingDeps && (
                            <button
                              onClick={() => onUploadDep("")}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand/5 border border-brand/10 hover:bg-brand/10 text-brand transition-all font-semibold group animate-in fade-in slide-in-from-right-2"
                            >
                              <UploadCloud className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                              <span className="text-[9px] uppercase tracking-widest">
                                Upload All Files
                              </span>
                            </button>
                          )}
                        </div>
                      );
                    },
                    h3: ({ ...props }) => (
                      <h3
                        className="text-sm font-semibold text-foreground mt-5 mb-2 border-b border-border pb-1"
                        {...props}
                      />
                    ),
                    p: ({ ...props }) => (
                      <p
                        className="text-muted-foreground leading-relaxed mb-3 text-[12px] font-light"
                        {...props}
                      />
                    ),
                    ul: ({ ...props }) => (
                      <ul className="space-y-2 mb-5 ml-4" {...props} />
                    ),
                    li: ({ ...props }) => {
                      const flattenChildren = (children: any): string => {
                        if (typeof children === "string") return children;
                        if (Array.isArray(children))
                          return children.map(flattenChildren).join("");
                        if (children?.props?.children)
                          return flattenChildren(children.props.children);
                        return "";
                      };

                      const textContent = flattenChildren(props.children);

                      // Handle [MISSING_DEPENDENCY:...]
                      const depMatch = textContent.match(
                        /\[MISSING_DEPENDENCY:(.*?)\]/,
                      );
                      if (depMatch) {
                        const depPath = depMatch[1].trim();
                        const cleanText = textContent.replace(
                          /\[MISSING_DEPENDENCY:.*?\]/,
                          "",
                        );
                        return (
                          <li className="flex flex-col items-start gap-4 bg-amber-500/3 dark:bg-amber-500/6 p-4 rounded-xl border border-amber-500/20 w-full mb-5 group/dep shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-3 w-full">
                              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                              </div>
                              <span className="text-[12px] leading-relaxed text-foreground font-medium pt-0.5">
                                {cleanText}
                              </span>
                            </div>
                            <div className="flex items-center justify-between w-full bg-surface/80 dark:bg-black/20 p-2.5 rounded-lg border border-amber-500/10 group-hover/dep:border-amber-500/30 transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-6 h-6 rounded-lg bg-amber-500/5 flex items-center justify-center shrink-0 border border-amber-500/10">
                                  <FileCode className="w-3 h-3 text-amber-500/50" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] font-semibold text-foreground truncate">
                                    Required:{" "}
                                    {depPath.split("/").pop() || depPath}
                                  </span>
                                  <code className="text-[8px] font-mono text-muted-foreground truncate">
                                    {depPath}
                                  </code>
                                </div>
                              </div>
                              <button
                                onClick={() => onUploadDep(depPath)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[9px] font-semibold uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                Upload
                              </button>
                            </div>
                          </li>
                        );
                      }

                      // Clean up [FIX_ACTION:...] and [NO FIX_ACTION:...]
                      const hasFix = textContent.includes("[FIX_ACTION:");
                      const cleanText = textContent
                        .replace(/\[FIX_ACTION:.*?\]/gi, "")
                        .replace(/\[NO FIX_ACTION:.*?\]/gi, "");

                      return (
                        <li className="flex flex-col gap-1 mb-1.5 group/li">
                          <div className="flex items-start gap-3 text-[12px] text-muted-foreground leading-relaxed">
                            <div className="w-1 h-1 rounded-full bg-brand/40 mt-[7px] shrink-0 group-hover/li:bg-brand transition-colors" />
                            <span>{cleanText}</span>
                          </div>
                          {hasFix && (
                            <div className="ml-7 mt-1.5 flex items-center gap-1.5 text-[9px] font-semibold text-brand uppercase tracking-widest animate-in fade-in slide-in-from-left-2 duration-500">
                              <Zap className="w-2.5 h-2.5 fill-brand/10" />
                              Fix action required: click the fix button below to
                              fix it
                            </div>
                          )}
                        </li>
                      );
                    },
                    code: ({ inline, className, children, ...props }: any) => {
                      const match = /language-(\w+)/.exec(className || "");
                      const content = String(children).replace(/\n$/, "");
                      if (!inline && match) {
                        return (
                          <CodeBlock
                            language={match[1]}
                            content={content}
                            {...props}
                          />
                        );
                      }
                      return (
                        <code
                          className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-brand border border-border/50"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    pre: ({ children }: any) => <>{children}</>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>

              {/* Diagnostics Section - Fix Actions Only */}
              {message.content.includes("[FIX_ACTION:") && (
                <div className="mt-8 pt-6 border-t border-border/50">
                  {(() => {
                    try {
                      const fixActions: string[] = [];
                      const fixRegex = /\[FIX_ACTION:(.*?)\]/g;
                      let match;
                      while (
                        (match = fixRegex.exec(message.content)) !== null
                      ) {
                        fixActions.push(match[1].trim());
                      }

                      if (fixActions.length === 0) return null;

                      return (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <div className="flex items-center justify-between bg-brand/5 p-3.5 rounded-2xl border border-brand/10">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-brand" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-semibold text-brand uppercase tracking-widest">
                                  Auto-Remediation Available
                                </span>
                                <span className="text-[11px] text-muted-foreground font-medium">
                                  {fixActions.length} issues can be
                                  automatically resolved
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => onFix(fixActions)}
                              disabled={isFixing !== null}
                              className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-xl text-[10px] font-semibold uppercase tracking-widest hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 disabled:opacity-50 active:scale-95 group"
                            >
                              <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                              {isFixing === "ALL_ISSUES"
                                ? "Fixing All..."
                                : "Fix All Issues"}
                            </button>
                          </div>
                        </div>
                      );
                    } catch (e) {
                      return null;
                    }
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
