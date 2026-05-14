import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  X,
  Layers,
  ArrowRight,
  ChevronDown,
  Check,
  Loader2,
  Shield,
  Terminal,
  Wifi,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { apiClientFetch } from "@/lib/api-client";
import { ColumnDef, CurrentUser } from "@/lib/types";

interface DetailModalProps {
  selectedItem: any;
  isEditMode: boolean;
  itemType: string;
  currentUser: CurrentUser | null;
  availableUsers: any[];
  isUpdating: boolean;
  onClose: () => void;
  onUpdate: (item: any, updates: any) => void;
  linkedData?: any[];
}

const DetailModal: React.FC<DetailModalProps> = ({
  selectedItem,
  isEditMode,
  itemType,
  currentUser,
  availableUsers,
  isUpdating,
  onClose,
  onUpdate,
  linkedData,
}) => {
  const [localData, setLocalData] = useState<any>({});

  const [customStatuses, setCustomStatuses] = useState<any[]>([]);

  // Sync local data when selected item changes OR edit mode toggles
  useEffect(() => {
    setLocalData({ ...selectedItem });
  }, [selectedItem, isEditMode]);

  // Fetch custom statuses
  useEffect(() => {
    const fetchCustomStatuses = async () => {
      try {
        const res = await apiClientFetch("/api/status-configs");
        if (res.ok) {
          const data = await res.json();
          setCustomStatuses(data);
        }
      } catch (err) {
        console.error("Failed to fetch custom statuses", err);
      }
    };
    fetchCustomStatuses();
  }, []);

  const handleLocalChange = (field: string, value: any) => {
    setLocalData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Only send the fields that can be edited
    const updates: any = {
      title: localData.title,
      moduleId: localData.moduleId,
      description: localData.description,
      priority: localData.priority,
      status: localData.status,
    };

    if (itemType === "use-cases") {
      updates.actors = localData.actors;
      updates.mainFlow = localData.mainFlow;
      updates.alternativeFlows = localData.alternativeFlows;
    } else if (itemType === "test-cases") {
      updates.preconditions = localData.preconditions;
      updates.steps = localData.steps;
      updates.expectedResult = localData.expectedResult;
      updates.linkedUseCase = localData.linkedUseCase;
    } else if (itemType === "bugs") {
      updates.potentialImpact = localData.potentialImpact;
      updates.assigneeId = localData.assigneeId;
      updates.assigneeName = localData.assigneeName;
    }

    onUpdate(selectedItem, updates);
  };

  // Find linked Use Case if applicable
  const linkedUseCaseObject =
    (itemType === "test-cases" || itemType === "bugs") &&
    localData.linkedUseCase &&
    linkedData
      ? linkedData.find((ld) => ld.customId === localData.linkedUseCase)
      : null;

  const canEdit = canEditAnywhere(currentUser);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-fade-in-up m-4 sm:m-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface/50">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-3 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-brand/10 text-brand">
                {selectedItem.customId}
              </span>
              {isEditMode ? (
                <input
                  value={localData.moduleId || ""}
                  onChange={(e) =>
                    handleLocalChange("moduleId", e.target.value)
                  }
                  className="bg-brand/5 border border-border rounded px-2 py-0.5 text-[10px] font-semibold text-brand uppercase tracking-wider focus:outline-none focus:border-brand/40"
                  placeholder="Module ID"
                />
              ) : (
                <span className="text-xs font-semibold text-brand uppercase tracking-wider truncate">
                  {selectedItem.moduleId}
                </span>
              )}
            </div>
            {isEditMode ? (
              <input
                value={localData.title || ""}
                onChange={(e) => handleLocalChange("title", e.target.value)}
                className="w-full bg-brand/5 border border-border rounded-lg px-2 py-1 text-xl font-semibold text-foreground focus:outline-none focus:border-brand/40"
              />
            ) : (
              <h3 className="text-xl font-semibold text-foreground line-clamp-1">
                {selectedItem.title}
              </h3>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-foreground/60 hover:bg-brand/10 hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-8">
          {/* Description Block */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-widest">
              Description
            </h4>
            {isEditMode ? (
              <textarea
                value={localData.description || ""}
                onChange={(e) =>
                  handleLocalChange("description", e.target.value)
                }
                className="w-full bg-brand/5 border border-border rounded-xl p-4 text-sm text-foreground focus:outline-none h-32 resize-none"
              />
            ) : (
              <div className="prose prose-invert max-w-none text-foreground/75 leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedItem.description}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Dynamic Property Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Status Section (Bugs & Test Cases only) */}
            {itemType !== "use-cases" && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-widest">
                  Status
                </h4>
                <div className="relative">
                  <select
                    value={localData.status || ""}
                    disabled={
                      !isEditMode &&
                      !(
                        currentUser?.id === selectedItem.assigneeId ||
                        currentUser?.role === "Admin"
                      )
                    }
                    onChange={(e) =>
                      handleLocalChange("status", e.target.value || null)
                    }
                    className="w-full bg-brand/5 border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-brand/40 transition-all disabled:opacity-50 appearance-none cursor-pointer"
                  >
                    {itemType === "test-cases" ? (
                      <>
                        <option value="Pending" className="bg-surface">
                          Pending
                        </option>
                        <option value="Passed" className="bg-surface">
                          Passed
                        </option>
                        <option value="Failed" className="bg-surface">
                          Failed
                        </option>
                      </>
                    ) : (
                      <>
                        {!localData.status && (
                          <option value="" className="bg-surface">
                            None
                          </option>
                        )}
                        {customStatuses
                          .filter((c) => c.resourceType === "bugs")
                          .map((c) => (
                            <option
                              key={c._id}
                              value={c.name}
                              className="bg-surface"
                            >
                              {c.name}
                            </option>
                          ))}
                      </>
                    )}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Priority Section */}
            {itemType !== "use-cases" && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-widest">
                  Priority
                </h4>
                <div className="relative">
                  <select
                    value={localData.priority || "Medium"}
                    disabled={!isEditMode}
                    onChange={(e) =>
                      handleLocalChange("priority", e.target.value)
                    }
                    className="w-full bg-brand/5 border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-brand/40 transition-all disabled:opacity-50 appearance-none cursor-pointer"
                  >
                    <option value="Low" className="bg-surface">
                      Low
                    </option>
                    <option value="Medium" className="bg-surface">
                      Medium
                    </option>
                    <option value="High" className="bg-surface">
                      High
                    </option>
                    <option value="Critical" className="bg-surface">
                      Critical
                    </option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Assignee Section (Bug Tracker Only) */}
            {itemType === "bugs" && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-widest">
                  Assign To
                </h4>
                <div className="relative">
                  <select
                    value={localData.assigneeId || "unassigned"}
                    disabled={!isEditMode && !canEdit}
                    onChange={(e) => {
                      const user = availableUsers.find(
                        (u) => u._id === e.target.value,
                      );
                      handleLocalChange(
                        "assigneeId",
                        e.target.value === "unassigned" ? null : e.target.value,
                      );
                      handleLocalChange(
                        "assigneeName",
                        user ? user.name : "Unassigned",
                      );
                    }}
                    className="w-full bg-brand/5 border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-brand/40 transition-all disabled:opacity-50 appearance-none"
                  >
                    <option value="unassigned" className="bg-surface">
                      Unassigned
                    </option>
                    {(availableUsers || []).map((u) => (
                      <option key={u._id} value={u._id} className="bg-surface">
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* Requirement Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Actors / Preconditions */}
            {(itemType === "use-cases" || itemType === "test-cases") && (
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-widest">
                  {itemType === "use-cases" ? "Actors" : "Preconditions"}
                </h4>
                {isEditMode ? (
                  <textarea
                    value={
                      itemType === "use-cases"
                        ? localData.actors
                        : localData.preconditions || ""
                    }
                    onChange={(e) =>
                      handleLocalChange(
                        itemType === "use-cases" ? "actors" : "preconditions",
                        e.target.value,
                      )
                    }
                    className="w-full bg-brand/5 border border-border rounded-xl p-4 text-sm text-foreground focus:outline-none h-24 resize-none"
                    placeholder={`Enter ${itemType === "use-cases" ? "actors" : "preconditions"}...`}
                  />
                ) : (
                  <div className="p-4 rounded-xl bg-brand/5 border border-border text-sm italic text-foreground/75 leading-relaxed">
                    {itemType === "use-cases"
                      ? selectedItem.actors
                      : selectedItem.preconditions || "None"}
                  </div>
                )}
              </div>
            )}

            {/* Linked Use Case / Potential Impact */}
            {(itemType === "test-cases" || itemType === "bugs") && (
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-widest">
                  {itemType === "test-cases"
                    ? "Linked Use Case"
                    : "Potential Impact"}
                </h4>
                {isEditMode ? (
                  itemType === "test-cases" ? (
                    <div className="relative">
                      <select
                        value={localData.linkedUseCase || ""}
                        onChange={(e) =>
                          handleLocalChange("linkedUseCase", e.target.value)
                        }
                        className="w-full bg-brand/5 border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none appearance-none"
                      >
                        <option value="" className="bg-surface">
                          None
                        </option>
                        {linkedData
                          ?.filter((uc) => {
                            if (!uc.moduleId || !localData.moduleId)
                              return false;
                            const ucMatch =
                              uc.moduleId.match(/Module\s*(\d+)/i);
                            const localMatch =
                              localData.moduleId.match(/Module\s*(\d+)/i);
                            if (ucMatch && localMatch) {
                              return (
                                parseInt(ucMatch[1], 10) ===
                                parseInt(localMatch[1], 10)
                              );
                            }
                            return (
                              uc.moduleId
                                .toLowerCase()
                                .includes(localData.moduleId.toLowerCase()) ||
                              localData.moduleId
                                .toLowerCase()
                                .includes(uc.moduleId.toLowerCase())
                            );
                          })
                          .sort((a, b) =>
                            (a.customId || "").localeCompare(
                              b.customId || "",
                              undefined,
                              { numeric: true, sensitivity: "base" },
                            ),
                          )
                          .map((uc) => (
                            <option
                              key={uc._id}
                              value={uc.customId}
                              className="bg-surface"
                            >
                              {uc.customId}: {uc.title}
                            </option>
                          ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
                    </div>
                  ) : (
                    <textarea
                      value={localData.potentialImpact || ""}
                      onChange={(e) =>
                        handleLocalChange("potentialImpact", e.target.value)
                      }
                      className="w-full bg-brand/5 border border-border rounded-xl p-4 text-sm text-foreground focus:outline-none h-24 resize-none"
                    />
                  )
                ) : (
                  <div className="p-4 rounded-xl bg-brand/10 border-brand/20 text-sm font-medium text-brand">
                    {itemType === "test-cases"
                      ? selectedItem.linkedUseCase || "None"
                      : selectedItem.potentialImpact || "None"}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main Content Blocks (Steps / Flows) */}
          {(itemType === "use-cases" || itemType === "test-cases") && (
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-widest">
                {itemType === "use-cases" ? "Main Workflow" : "Execution Steps"}
              </h4>
              {isEditMode ? (
                <textarea
                  value={
                    itemType === "use-cases"
                      ? localData.mainFlow
                      : localData.steps || ""
                  }
                  onChange={(e) =>
                    handleLocalChange(
                      itemType === "use-cases" ? "mainFlow" : "steps",
                      e.target.value,
                    )
                  }
                  className="w-full bg-surface border border-border rounded-2xl p-6 text-sm text-foreground focus:outline-none h-48"
                  placeholder="Enter steps..."
                />
              ) : (
                <div className="p-6 rounded-2xl bg-surface border border-border prose prose-invert max-w-none prose-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {itemType === "use-cases"
                      ? selectedItem.mainFlow
                      : selectedItem.steps}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {/* Results / Alternatives */}
          {(itemType === "use-cases" || itemType === "test-cases") && (
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-widest">
                {itemType === "test-cases"
                  ? "Expected Result"
                  : "Alternative Flows"}
              </h4>
              {isEditMode ? (
                <textarea
                  value={
                    itemType === "test-cases"
                      ? localData.expectedResult
                      : localData.alternativeFlows || ""
                  }
                  onChange={(e) =>
                    handleLocalChange(
                      itemType === "test-cases"
                        ? "expectedResult"
                        : "alternativeFlows",
                      e.target.value,
                    )
                  }
                  className="w-full bg-brand/5 border border-brand/20 rounded-2xl p-6 text-sm text-foreground focus:outline-none h-32"
                />
              ) : (
                <div className="p-6 rounded-2xl bg-brand/5 border border-brand/20 prose prose-invert max-w-none prose-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {itemType === "test-cases"
                      ? selectedItem.expectedResult
                      : selectedItem.alternativeFlows}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {/* Extension Capture Data (Bugs captured via extension) */}
          {!isEditMode &&
            itemType === "bugs" &&
            selectedItem.capturedVia === "extension" && (
              <div className="mt-8 pt-8 border-t border-purple-500/20">
                <ExtensionCapturePanel item={selectedItem} />
              </div>
            )}

          {/* Connected Use Case Cross-Reference (View Mode Only) */}
          {!isEditMode && selectedItem.linkedUseCase && (
            <div className="mt-8 pt-8 border-t border-brand/20 bg-brand/5 p-6 rounded-2xl relative overflow-hidden group/linked">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/linked:opacity-10 transition-opacity">
                <Layers className="w-20 h-20 text-brand" />
              </div>
              <h4 className="text-brand text-sm font-semibold flex items-center gap-2 mb-4 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                Connected Use Case ({selectedItem.linkedUseCase})
              </h4>
              {linkedUseCaseObject ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-foreground font-semibold text-base leading-tight">
                      {linkedUseCaseObject.title}
                    </h5>
                    <div className="px-2 py-0.5 rounded bg-brand/20 text-[10px] font-semibold text-brand uppercase">
                      {linkedUseCaseObject.moduleId}
                    </div>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none opacity-80 line-clamp-3">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {linkedUseCaseObject.description}
                    </ReactMarkdown>
                  </div>
                  <Link
                    href={`/projects/${selectedItem.projectId}/use-cases?module=${linkedUseCaseObject.moduleId}&selected=${linkedUseCaseObject._id}`}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-foreground/70 hover:text-brand transition-colors group/btn"
                  >
                    View Full Requirements
                    <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              ) : (
                <p className="text-foreground/70 text-xs italic">
                  *Could not locate the details for this linked use case in the
                  project database.*
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-surface/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-brand/5 transition-colors"
          >
            {isEditMode ? "Cancel" : "Close"}
          </button>

          {isEditMode && (
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold bg-brand text-white border border-brand hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-brand/20 disabled:opacity-50"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Extension Capture Panel ──────────────────────────────────────────
function ExtensionCapturePanel({ item }: { item: any }) {
  const [showLogs, setShowLogs] = useState(false);
  const [showNetwork, setShowNetwork] = useState(false);
  const [imgExpanded, setImgExpanded] = useState(false);

  const hasScreenshot = !!item.screenshot;
  const consoleLogs = item.consoleLogs || [];
  const networkErrors = item.networkErrors || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Shield className="w-4 h-4 text-purple-400 shrink-0" />
        <h4 className="text-purple-400 text-sm font-semibold uppercase tracking-widest">
          Captured via Extension
        </h4>
        {/* Reporter badge */}
        {item.reportedByName && (
          <span className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {item.reportedByName}
            {item.reportedByEmail && (
              <span className="text-purple-400/60 font-normal">
                · {item.reportedByEmail}
              </span>
            )}
          </span>
        )}
        {item.pageUrl && (
          <a
            href={item.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-[10px] text-foreground/40 hover:text-purple-400 transition-colors truncate max-w-[220px]"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            {item.pageUrl}
          </a>
        )}
      </div>

      {/* Screenshot */}
      {hasScreenshot && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/50 uppercase tracking-widest">
            <ImageIcon className="w-3.5 h-3.5" />
            Screenshot
          </div>
          <div
            className={`relative rounded-xl overflow-hidden border border-purple-500/20 cursor-zoom-in transition-all ${
              imgExpanded ? "max-h-[600px]" : "max-h-[140px]"
            }`}
            onClick={() => setImgExpanded(!imgExpanded)}
          >
            <img
              src={item.screenshot}
              alt="Captured screenshot"
              className="w-full object-cover object-top"
            />
            {!imgExpanded && (
              <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent flex items-end justify-center pb-2">
                <span className="text-[10px] text-white/70 font-semibold">
                  Click to expand
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Console Logs */}
      {consoleLogs.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-500/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">
                Console Logs
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-mono">
                {consoleLogs.length}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-amber-400/50 transition-transform ${showLogs ? "rotate-180" : ""}`}
            />
          </button>
          {showLogs && (
            <div className="px-4 pb-4 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
              {consoleLogs.map((log: string, i: number) => (
                <div
                  key={i}
                  className="font-mono text-[10px] text-amber-200/70 bg-amber-950/30 px-2 py-1 rounded leading-relaxed break-all"
                >
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Network Errors */}
      {networkErrors.length > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden">
          <button
            onClick={() => setShowNetwork(!showNetwork)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-500/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Wifi className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-semibold text-red-400">
                Network Errors
              </span>
              <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full font-mono">
                {networkErrors.length}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-red-400/50 transition-transform ${showNetwork ? "rotate-180" : ""}`}
            />
          </button>
          {showNetwork && (
            <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {networkErrors.map((err: any, i: number) => (
                <div
                  key={i}
                  className="font-mono text-[10px] bg-red-950/30 px-3 py-2 rounded flex items-center gap-3"
                >
                  <span
                    className={`font-bold ${
                      err.status >= 500
                        ? "text-red-400"
                        : err.status >= 400
                          ? "text-orange-400"
                          : "text-red-300"
                    }`}
                  >
                    {err.status || "ERR"}
                  </span>
                  <span className="text-red-300/60 uppercase text-[9px]">
                    {err.method || "GET"}
                  </span>
                  <span className="text-red-200/60 truncate">{err.url}</span>
                  <span className="text-foreground/20 ml-auto shrink-0">
                    {err.ts}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasScreenshot &&
        consoleLogs.length === 0 &&
        networkErrors.length === 0 && (
          <p className="text-xs text-foreground/30 italic">
            No additional capture data was recorded.
          </p>
        )}
    </div>
  );
}

// Helper inside file for now
function canEditAnywhere(currentUser: CurrentUser | null) {
  if (!currentUser) return false;
  return (
    currentUser.role === "Admin" ||
    currentUser.role === "company_admin" ||
    (currentUser.customPermissions &&
      currentUser.customPermissions.includes("edit" as any))
  );
}

export default DetailModal;
