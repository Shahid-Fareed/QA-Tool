"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  ChevronLeft,
  Loader2,
  Settings2,
  Search,
  Pencil,
  AlertCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiClientFetch } from "@/lib/api-client";

interface StatusConfig {
  _id: string;
  name: string;
  color: string;
}

export default function StatusConfigsPage() {
  const searchParams = useSearchParams();
  const resourceType = searchParams.get("type") || "bugs";

  const [configs, setConfigs] = useState<StatusConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingConfig, setEditingConfig] = useState<StatusConfig | null>(null);
  const [configToDelete, setConfigToDelete] = useState<StatusConfig | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvancedColor, setShowAdvancedColor] = useState(false);
  const [isDraggingWheel, setIsDraggingWheel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [newName, setNewName] = useState("");
  const [hue, setHue] = useState(180);
  const [saturation, setSaturation] = useState(70);
  const lightness = 50; // Fixed lightness for better consistency

  // Derive colors from HSL
  const baseColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const badgeStyle = {
    backgroundColor: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.1)`,
    color: `hsl(${hue}, ${saturation}%, ${Math.max(lightness - 20, 20)}%)`,
    borderColor: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.2)`,
  };

  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConfigs();
  }, [resourceType]);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDraggingWheel(false);
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDraggingWheel) handleWheelClick(e as any);
    };

    if (isDraggingWheel) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDraggingWheel]);

  const fetchConfigs = async () => {
    try {
      const res = await apiClientFetch(
        `/api/status-configs?resourceType=${resourceType}`,
      );
      if (res.ok) {
        setConfigs(await res.json());
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStatus = async () => {
    if (!newName.trim()) return;

    // Use rounded values for cleaner storage
    const h = Math.round(hue * 100) / 100;
    const s = Math.round(saturation * 100) / 100;

    const bStyle = {
      backgroundColor: `hsla(${h}, ${s}%, ${lightness}%, 0.1)`,
      color: `hsl(${h}, ${s}%, ${Math.max(lightness - 20, 20)}%)`,
      borderColor: `hsla(${h}, ${s}%, ${lightness}%, 0.2)`,
    };

    const colorString = `style="background-color: ${bStyle.backgroundColor}; color: ${bStyle.color}; border-color: ${bStyle.borderColor}"`;

    setIsSaving(true);
    try {
      const url = editingConfig
        ? `/api/status-configs/${editingConfig._id}`
        : "/api/status-configs";
      const method = editingConfig ? "PUT" : "POST";

      const res = await apiClientFetch(url, {
        method,
        body: JSON.stringify({
          name: newName.trim(),
          color: colorString,
          resourceType,
        }),
      });
      if (res.ok) {
        setNewName("");
        setIsAdding(false);
        setEditingConfig(null);
        fetchConfigs();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (config: StatusConfig) => {
    setNewName(config.name);
    // Parse HSL from color string - supporting decimals for precision
    const hslMatch = config.color.match(
      /hsla?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)%/,
    );
    if (hslMatch) {
      setHue(parseFloat(hslMatch[1]));
      setSaturation(parseFloat(hslMatch[2]));
    }
    setEditingConfig(config);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteStatus = async () => {
    if (!configToDelete) return;
    const res = await apiClientFetch(
      `/api/status-configs/${configToDelete._id}`,
      {
        method: "DELETE",
      },
    );
    if (res.ok) {
      setConfigs((prev) => prev.filter((c) => c._id !== configToDelete._id));
      setConfigToDelete(null);
    }
  };

  const handleWheelClick = (e: React.MouseEvent) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;
    const angle = Math.atan2(y, x) * (180 / Math.PI);
    let h = angle + 90;
    if (h < 0) h += 360;
    setHue(h);
    const dist = Math.sqrt(x * x + y * y);
    const maxDist = rect.width / 2;
    setSaturation(Math.min((dist / maxDist) * 100, 100));
  };

  const filteredConfigs = configs.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 py-10 animate-fade-in-up">
      {/* Dashboard Header Style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex flex-col lg:flex-row lg:items-center gap-8">
          <div className="space-y-1">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors mb-3"
            >
              <ChevronLeft size={14} /> Back to Settings
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                <Settings2 size={20} />
              </div>
              <h1 className="text-3xl font-semibold text-foreground tracking-tight capitalize">
                {resourceType.replace(/_/g, " ")} Management
              </h1>
            </div>
          </div>

          {/* Search Bar on the Left */}
          <div className="relative w-full sm:w-72 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-brand transition-colors" />
            <input
              type="text"
              placeholder="Search statuses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (isAdding) {
                setEditingConfig(null);
                setNewName("");
              }
              setIsAdding(!isAdding);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover transition-all shadow-lg shadow-brand/20 active:scale-95 whitespace-nowrap"
          >
            {isAdding ? <X size={18} /> : <Plus size={18} />}
            {isAdding ? "Cancel" : "Add Status"}
          </button>
        </div>
      </div>

      {/* Table Container - Matches DashboardTableView */}
      <div className="spatial-card rounded-2xl overflow-hidden border border-border/40 bg-surface shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-brand/5 border-b border-border/50">
            <tr>
              <th className="px-6 py-5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap">
                Status Name
              </th>
              <th className="px-6 py-5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 text-center whitespace-nowrap">
                Color
              </th>
              <th className="px-6 py-5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 text-center whitespace-nowrap">
                Live Preview
              </th>
              <th className="px-6 py-5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 text-right whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {isAdding && (
              <tr className="bg-brand/3 animate-in slide-in-from-top-1 duration-300">
                <td className="px-6 py-8 align-top">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-brand px-1">
                      {editingConfig ? "Refine Name" : "Status Identity"}
                    </label>
                    <input
                      autoFocus
                      placeholder="Status name..."
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-surface border border-border/40 rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all shadow-sm"
                    />
                  </div>
                </td>
                <td className="px-6 py-8 align-top">
                  <div className="flex flex-col items-center gap-4">
                    {!showAdvancedColor ? (
                      <div className="flex flex-col items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl shadow-xl shadow-brand/10 transition-transform hover:scale-110 cursor-pointer"
                          style={{ backgroundColor: baseColor }}
                          onClick={() => setShowAdvancedColor(true)}
                        />
                        <button
                          onClick={() => setShowAdvancedColor(true)}
                          className="text-[10px] font-semibold text-brand uppercase tracking-widest hover:underline"
                        >
                          Customize
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                        <div
                          ref={wheelRef}
                          onMouseDown={(e) => {
                            setIsDraggingWheel(true);
                            handleWheelClick(e);
                          }}
                          className="w-32 h-32 rounded-full cursor-crosshair shadow-2xl relative overflow-hidden group"
                          style={{
                            background:
                              "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
                          }}
                        >
                          <div className="absolute inset-0 bg-white/10" />
                          <div
                            className="absolute inset-0 rounded-full"
                            style={{
                              background: `radial-gradient(circle, white, transparent)`,
                            }}
                          />
                          <div
                            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg pointer-events-none transition-transform duration-200"
                            style={{
                              left: "50%",
                              top: "50%",
                              transform: `translate(-50%, -50%) rotate(${hue - 90}deg) translateX(${saturation * 0.55}px) rotate(${-(hue - 90)}deg)`,
                              backgroundColor: baseColor,
                            }}
                          />
                        </div>
                        <button
                          onClick={() => setShowAdvancedColor(false)}
                          className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest hover:text-brand transition-colors"
                        >
                          Hide Wheel
                        </button>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-8 align-top text-center">
                  <div className="space-y-2 inline-block">
                    <div
                      className="px-6 py-2.5 rounded-xl border shadow-sm transition-all"
                      style={badgeStyle}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-[0.15em]">
                        {newName || "Preview"}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-8 align-top text-right">
                  <button
                    onClick={handleAddStatus}
                    disabled={isSaving || !newName.trim()}
                    className="px-8 py-2.5 bg-brand text-white text-[10px] font-semibold uppercase tracking-[0.15em] rounded-xl hover:bg-brand-hover transition-all shadow-lg active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2"
                  >
                    {isSaving && <Loader2 size={12} className="animate-spin" />}
                    {editingConfig ? "Update" : "Save"}
                  </button>
                </td>
              </tr>
            )}

            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center">
                  <Loader2 className="w-8 h-8 text-brand animate-spin mx-auto" />
                </td>
              </tr>
            ) : filteredConfigs.length === 0 && !isAdding ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-20 text-center text-muted-foreground/40 text-xs font-semibold uppercase tracking-widest italic"
                >
                  No statuses match your search
                </td>
              </tr>
            ) : (
              filteredConfigs.map((config) => {
                const styleMatch = config.color.match(/style="([^"]+)"/);
                const styleObj: any = {};
                if (styleMatch) {
                  styleMatch[1].split(";").forEach((s) => {
                    const [key, val] = s.split(":").map((p) => p.trim());
                    if (key && val) {
                      const camelKey = key.replace(/-([a-z])/g, (g) =>
                        g[1].toUpperCase(),
                      );
                      styleObj[camelKey] = val;
                    }
                  });
                }

                return (
                  <tr
                    key={config._id}
                    className="group hover:bg-brand/5 transition-all cursor-default"
                  >
                    <td className="px-6 py-5">
                      <span className="text-sm font-semibold text-foreground uppercase tracking-tight">
                        {config.name}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex justify-center">
                        <div
                          className="w-4 h-4 rounded-full border border-border/40 shadow-sm"
                          style={{
                            backgroundColor: styleObj.color || "#cbd5e1",
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span
                        className="px-4 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest border inline-block shadow-sm"
                        style={styleObj}
                      >
                        {config.name}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(config)}
                          className="p-2 rounded-lg hover:bg-brand/10 text-muted-foreground/40 hover:text-brand transition-all"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setConfigToDelete(config)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground/40 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {configToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-surface border border-border rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground uppercase tracking-tight">
                  Delete Status?
                </h3>
                <p className="text-sm text-foreground/40 font-medium leading-relaxed">
                  You are about to permanently remove{" "}
                  <span className="text-foreground font-semibold">
                    "{configToDelete.name}"
                  </span>
                  . This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => setConfigToDelete(null)}
                  className="flex-1 px-6 py-3 rounded-2xl bg-brand/5 text-foreground/40 text-xs font-semibold uppercase tracking-widest hover:bg-brand/10 hover:text-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteStatus}
                  className="flex-1 px-6 py-3 rounded-2xl bg-red-500 text-white text-xs font-semibold uppercase tracking-widest hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all active:scale-95"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
