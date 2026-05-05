"use client";

import React, { useState, useRef } from "react";
import {
  X,
  FileText,
  Upload,
  ArrowRight,
  Loader2,
  FileSearch,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DashboardDropzoneProps {
  onFileSelect: (file: File | null, instructions?: string) => void;
  isProcessing: boolean;
}

export const DashboardDropzone: React.FC<DashboardDropzoneProps> = ({
  onFileSelect,
  isProcessing,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    if (!selectedFile && !instructions.trim()) return;
    onFileSelect(selectedFile, instructions);
    // Clear after submission if needed, but usually the parent handles state
  };

  return (
    <div className="w-full space-y-6">
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative group border-2 border-dashed rounded-[32px] p-12 transition-all duration-500",
          selectedFile
            ? "border-brand bg-brand/2 shadow-2xl shadow-brand/5"
            : "border-border hover:border-brand/40 bg-surface/50 hover:bg-brand/1",
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          accept=".pdf,.docx,.doc,.txt"
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center text-center space-y-4">
          <div
            className={cn(
              "w-20 h-20 rounded-[24px] flex items-center justify-center transition-all duration-500",
              selectedFile
                ? "bg-brand text-white scale-110 shadow-xl shadow-brand/20"
                : "bg-brand/5 text-brand group-hover:scale-105",
            )}
          >
            {isProcessing ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : selectedFile ? (
              <FileSearch className="w-10 h-10" />
            ) : (
              <Upload className="w-10 h-10" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-foreground tracking-tight">
              {selectedFile ? selectedFile.name : "Upload Requirements"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              {selectedFile
                ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for extraction`
                : "Drag & drop your PRD, SRS or technical specs (PDF, DOCX)"}
            </p>
          </div>

          {selectedFile && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="relative z-20 px-4 py-2 rounded-xl cursor-pointer bg-red-500/10 text-red-500 text-xs font-semibold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
            >
              <X className="w-3.5 h-3.5" />
              Remove File
            </button>
          )}
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-linear-to-r from-brand/20 to-brand/0 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
        <div className="relative flex items-center gap-3 bg-surface border border-border rounded-3xl p-2 pl-6 shadow-sm focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all">
          <input
            type="text"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Any specific instructions for the AI? (Optional)"
            className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/50"
            disabled={isProcessing}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={isProcessing || (!selectedFile && !instructions.trim())}
            className={cn(
              "h-12 px-6 rounded-2xl font-semibold text-[11px] uppercase tracking-widest transition-all flex items-center gap-2",
              selectedFile || instructions.trim()
                ? "bg-brand text-white shadow-lg shadow-brand/20 hover:scale-[1.02] active:scale-95"
                : "bg-muted text-muted-foreground cursor-not-allowed",
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
  );
};
