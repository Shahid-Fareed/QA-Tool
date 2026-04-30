"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X } from "lucide-react";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}

export function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
}: DeleteModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-md w-full bg-surface border border-border rounded-3xl p-10 shadow-3xl text-center space-y-8 relative"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto border border-red-500/20">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-semibold text-foreground">
                Delete Session?
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed px-4">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">"{title}"</span>
                ? This action is permanent and cannot be undone.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                onClick={onClose}
                className="px-6 py-3.5 rounded-2xl border border-border font-semibold text-sm hover:bg-muted transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-6 py-3.5 rounded-2xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all active:scale-95"
              >
                Delete Now
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
