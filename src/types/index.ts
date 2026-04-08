export type UserRole = "user" | "admin";

export type TicketStatus = "open" | "in_progress" | "resolved";
export type TicketPriority = "low" | "medium" | "high" | "critical";
export type TicketCategory =
  | "technical"
  | "network"
  | "hardware"
  | "software"
  | "access"
  | "hr"
  | "facilities"
  | "other";

export interface DashboardStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
}
