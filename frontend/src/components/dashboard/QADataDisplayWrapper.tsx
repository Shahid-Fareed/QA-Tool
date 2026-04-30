"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { QAAssistantChat } from "@/components/dashboard/QAAssistantChat";
import { useCaseGenerator } from "@/hooks/useCaseGenerator";
import {
  MessageSquare,
  Sparkles,
  ArrowRight,
  FileText,
  Zap,
  LineChart,
} from "lucide-react";

export function QADataDisplayWrapper({ userName }: { userName: string }) {
  const { generate, isGenerating, output, error, projectId, projectName } =
    useCaseGenerator();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("sessionId");
  const mode = searchParams.get("mode");
  const [isChatMode, setIsChatMode] = React.useState(mode === "chat");

  // Sync state with URL mode param
  React.useEffect(() => {
    setIsChatMode(mode === "chat");
  }, [mode]);

  // Notify chat when generation is complete
  React.useEffect(() => {
    if (projectId && !isGenerating) {
      window.dispatchEvent(
        new CustomEvent("generation-complete", {
          detail: {
            projectId,
            projectName: projectName || "New Project",
          },
        }),
      );
    }
  }, [projectId, isGenerating, projectName]);

  // Notify chat when generation fails
  React.useEffect(() => {
    if (error && isChatMode) {
      window.dispatchEvent(
        new CustomEvent("generation-error", {
          detail: { error },
        }),
      );
    }
  }, [error, isChatMode]);

  // Determine if we should show the welcome header
  const showHeader = !sessionId && !output && !isGenerating && !isChatMode;

  const handleFileSelect = (file: File | null, instructions?: string) => {
    // Only navigate if not already in chat mode — avoids remounting QAAssistantChat
    // which would wipe in-flight state (messages being saved to history)
    if (!isChatMode) {
      router.push("/?mode=chat");
    }
    generate(file, instructions);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full px-6 max-w-[1400px] mx-auto">
      {showHeader && (
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mt-8 md:mt-12 mb-8">
          <div className="space-y-2 max-w-xl">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tighter text-foreground">
              Welcome back, <span className="text-brand">{userName}</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground font-medium leading-relaxed max-w-lg">
              Accelerate your testing lifecycle with AI-driven Use Case
              extraction and Test Case generation.
            </p>
          </div>

          {/* Decorative Illustration Area */}
          <div className="hidden md:block relative">
            <div className="absolute inset-0 bg-brand/5 blur-[80px] rounded-full" />
            <div className="relative w-48 h-32 flex items-center justify-center">
              <div className="absolute -top-3 -right-3 w-16 h-16 bg-brand/5 border border-brand/10 rounded-2xl rotate-12" />
              <div className="absolute top-6 -left-6 w-14 h-14 bg-brand/3 border border-brand/5 rounded-xl -rotate-6" />
              <div className="w-20 h-20 rounded-[24px] bg-brand/10 border border-brand/20 flex items-center justify-center text-brand animate-pulse">
                <Sparkles className="w-10 h-10 opacity-40" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-10 w-full pb-16">
        {error && !isChatMode && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
            <div className="w-full max-w-4xl p-6 rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-md shadow-[0_0_20px_rgba(239,68,68,0.2)] text-red-500 relative overflow-hidden">
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1 tracking-tight uppercase">
                    Generation Error
                  </h3>
                  <p className="text-xs font-semibold opacity-80 font-mono tracking-wider">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Entry Point or Active Intelligence Flow */}
        {isChatMode || isGenerating || sessionId ? (
          <QAAssistantChat
            onFileSelect={handleFileSelect}
            isProcessing={isGenerating}
            onBack={() => router.push("/")}
          />
        ) : (
          <div className="animate-in fade-in zoom-in slide-in-from-bottom-6 duration-700">
            <div className="bg-surface border border-border/40 rounded-[32px] overflow-hidden shadow-2xl shadow-brand/5 grid lg:grid-cols-2">
              {/* Left Column: CTA */}
              <div className="p-8 md:p-12 flex flex-col items-start gap-8">
                <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                  <Sparkles className="w-7 h-7" />
                </div>

                <div className="space-y-3">
                  <h2 className="text-3xl font-semibold text-foreground tracking-tight leading-tight">
                    Begin with <br />
                    AI Intelligence
                  </h2>
                  <p className="text-muted-foreground text-sm font-medium max-w-sm leading-relaxed">
                    Let our AI Assistant help you extract use cases from
                    requirements and generate comprehensive test cases
                    instantly.
                  </p>
                </div>

                <button
                  onClick={() => router.push("/?mode=chat")}
                  className="group flex items-center gap-4 px-8 py-3.5 rounded-xl bg-brand text-white font-semibold text-[13px] uppercase tracking-widest shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open AI Assistant</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Right Column: Features */}
              <div className="bg-brand/1 border-l border-border/40 p-8 md:p-12 flex flex-col justify-center gap-8">
                <div className="flex items-start gap-5 group">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-surface border border-border/50 flex items-center justify-center text-brand shadow-sm group-hover:border-brand/30 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-semibold text-foreground tracking-tight">
                      Extract Smarter
                    </h4>
                    <p className="text-[13px] text-muted-foreground font-medium leading-snug">
                      Use AI to extract clear, structured use cases from any
                      requirement type.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-5 group">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-surface border border-border/50 flex items-center justify-center text-brand shadow-sm group-hover:border-brand/30 transition-colors">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-semibold text-foreground tracking-tight">
                      Generate Faster
                    </h4>
                    <p className="text-[13px] text-muted-foreground font-medium leading-snug">
                      Automatically generate detailed and accurate test cases in
                      minutes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-5 group">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-surface border border-border/50 flex items-center justify-center text-brand shadow-sm group-hover:border-brand/30 transition-colors">
                    <LineChart className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-semibold text-foreground tracking-tight">
                      Improve Quality
                    </h4>
                    <p className="text-[13px] text-muted-foreground font-medium leading-snug">
                      Enhance test coverage and consistency across your QA
                      process.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
