import React from "react";
import {
  Search,
  Plus,
  Filter,
  ArrowLeft,
  X,
  Layers,
  Bug,
  FileText,
  TestTube2,
  Camera,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tooltip } from "@/components/ui/Tooltip";

interface DashboardHeaderProps {
  title: string;
  projectName: string;
  moduleIcon?: "layers" | "bug" | "file" | "test";
  projectBackHref?: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  canAdd: boolean;
  onAddNew: () => void;
  newItemLabel: string;
  activeFilter: boolean;
  onClearFilter: () => void;
  itemType?: "use-cases" | "test-cases" | "bugs";
  projectId?: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  projectName,
  moduleIcon = "layers",
  projectBackHref,
  searchQuery,
  setSearchQuery,
  canAdd,
  onAddNew,
  newItemLabel,
  activeFilter,
  onClearFilter,
  itemType,
  projectId,
}) => {
  const router = useRouter();
  const iconMap = {
    layers: Layers,
    bug: Bug,
    file: FileText,
    test: TestTube2,
  };
  const SelectedIcon = iconMap[moduleIcon] || Layers;

  const handleBack = (e: React.MouseEvent) => {
    if (activeFilter) {
      e.preventDefault();
      router.back();
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
      <div className="flex items-center gap-6">
        {projectBackHref && (
          <Tooltip content="Back to Project" side="right">
            <Link
              href={projectBackHref}
              onClick={handleBack}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-surface border border-border text-foreground/40 hover:text-brand hover:border-brand/40 transition-all active:scale-95 shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Tooltip>
        )}
        <div className="flex items-center gap-5">
          <div className="w-10 h-10 rounded-2xl bg-brand/5 border border-brand/10 flex items-center justify-center shadow-sm">
            <SelectedIcon className="w-5 h-5 text-brand" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-foreground tracking-tight leading-none flex items-center gap-1">
              <Tooltip content="Current Project" side="top">
                <span className="text-foreground cursor-default">
                  {projectName.split(" • ")[0]}
                </span>
              </Tooltip>
              <span className="text-foreground font-light">/</span>
              <span className="uppercase tracking-widest text-brand text-lg">
                {itemType?.replace("-", " ") || title}
              </span>
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
