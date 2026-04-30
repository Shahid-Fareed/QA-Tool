"use client";

import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = "top",
  delay = 300,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let top = 0;
      let left = 0;

      // Vertical centering/positioning
      if (side === "top") {
        top = rect.top - 8; // 8px gap
        left = rect.left + rect.width / 2;
      } else if (side === "bottom") {
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2;
      } else if (side === "left") {
        top = rect.top + rect.height / 2;
        left = rect.left - 8;
      } else if (side === "right") {
        top = rect.top + rect.height / 2;
        left = rect.right + 8;
      }

      setCoords({ top, left });
    }
  };

  const handleMouseEnter = () => {
    updateCoords();
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useLayoutEffect(() => {
    if (isVisible) {
      updateCoords();
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [isVisible]);

  const animations = {
    top: { opacity: 0, y: 5, x: "-50%" },
    bottom: { opacity: 0, y: -5, x: "-50%" },
    left: { opacity: 0, x: 5, y: "-50%" },
    right: { opacity: 0, x: -5, y: "-50%" },
  };

  const positions = {
    top: "left-0 -translate-x-1/2 -translate-y-full mb-2",
    bottom: "left-0 -translate-x-1/2 mt-2",
    left: "top-0 -translate-x-full -translate-y-1/2 mr-2",
    right: "top-0 -translate-y-1/2 ml-2",
  };

  return (
    <div
      ref={triggerRef}
      className="inline-flex items-center justify-center w-fit"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-9999 pointer-events-none"
            style={{
              top: coords.top,
              left: coords.left,
            }}
          >
            <AnimatePresence>
              <motion.div
                initial={animations[side]}
                animate={{
                  opacity: 1,
                  x: side === "left" || side === "right" ? 0 : "-50%",
                  y: side === "top" || side === "bottom" ? 0 : "-50%",
                }}
                exit={animations[side]}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={`absolute ${positions[side]}`}
              >
                <div className="bg-neutral-950 text-white text-xs font-medium px-3 py-2 rounded-xl shadow-2xl whitespace-nowrap border border-white/5 flex items-center gap-2">
                  {content}
                </div>
                {/* Arrow */}
                <div
                  className={`absolute border-[6px] border-transparent ${
                    side === "top"
                      ? "top-full left-1/2 -translate-x-1/2 border-t-neutral-950"
                      : side === "bottom"
                        ? "bottom-full left-1/2 -translate-x-1/2 border-b-neutral-950"
                        : side === "left"
                          ? "left-full top-1/2 -translate-y-1/2 border-l-neutral-950"
                          : "right-full top-1/2 -translate-y-1/2 border-r-neutral-950"
                  }`}
                />
              </motion.div>
            </AnimatePresence>
          </div>,
          document.body,
        )}
    </div>
  );
};
