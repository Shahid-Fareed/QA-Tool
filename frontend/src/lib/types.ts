import { Permission } from "./rbac";

export interface ColumnDef {
  key: string;
  label: string;
  type?:
  | "text"
  | "badge"
  | "status"
  | "priority"
  | "severity"
  | "date"
  | "mono";
}

export interface ResourceStats {
  total: number;
  high: number;
  medium: number;
  low: number;
  vision?: number;
  manual?: number;
  passed?: number;
  failed?: number;
  pending?: number;
  closed?: number;
}

export interface CurrentUser {
  id: string;
  role: string;
  name: string;
  customPermissions?: Permission[];
}
