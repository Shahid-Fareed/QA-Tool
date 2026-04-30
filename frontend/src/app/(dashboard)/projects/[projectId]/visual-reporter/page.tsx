import React from "react";
import { notFound } from "next/navigation";
import { Camera, Sparkles, Zap } from "lucide-react";
import { VisualReporterClient } from "@/components/projects/VisualReporterClient";
import { apiFetch } from "@/lib/api-server";

function isValidObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export default async function VisualReporterPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  if (!isValidObjectId(projectId)) notFound();

  const res = await apiFetch(`/api/projects/${projectId}`);
  if (!res.ok) notFound();

  return (
    <div className="relative min-h-screen bg-brand/1">
      <div className="max-w-7xl mx-auto pt-6 pb-3 animate-fade-in-up">
        <div className="flex flex-col items-center text-center mb-12">
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-4">
            UI TESTING
          </h1>

          <p className="text-muted-foreground max-w-2xl text-base md:text-lg leading-relaxed font-medium">
            Upload a screenshot for automated AI forensic analysis. Iterate
            through your session to build a comprehensive audit trail.
          </p>
        </div>

        <div className="w-full">
          <VisualReporterClient />
        </div>
      </div>
    </div>
  );
}
