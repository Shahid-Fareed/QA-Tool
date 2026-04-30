"use client";

import React from "react";
import { VisionDropzone } from "@/components/projects/VisionDropzone";

export function VisualReporterClient() {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-brand/5 blur-[100px] -z-10 rounded-full opacity-50" />
      <VisionDropzone onFileSelect={() => {}} isProcessing={false} />
    </div>
  );
}
