import { cn } from "@/lib/utils";
import type { TicketStatus, TicketPriority } from "@/types";

const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-primary/10 text-primary border-primary/20" },
  in_progress: { label: "In Progress", className: "bg-warning/10 text-warning border-warning/20" },
  resolved: { label: "Resolved", className: "bg-success/10 text-success border-success/20" },
};

const priorityConfig: Record<TicketPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground border-border" },
  medium: { label: "Medium", className: "bg-primary/10 text-primary border-primary/20" },
  high: { label: "High", className: "bg-warning/10 text-warning border-warning/20" },
  critical: { label: "Critical", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", config.className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", {
        "bg-primary": status === "open",
        "bg-warning": status === "in_progress",
        "bg-success": status === "resolved",
      })} />
      {config.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const config = priorityConfig[priority];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", config.className)}>
      {config.label}
    </span>
  );
}
