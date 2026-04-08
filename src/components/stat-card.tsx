import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: string;
  className?: string;
  iconClassName?: string;
}

export function StatCard({ title, value, icon: Icon, trend, className, iconClassName }: StatCardProps) {
  return (
    <Card className={cn("animate-fade-in", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold font-display tracking-tight">{value}</p>
            {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
          </div>
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", iconClassName ?? "bg-primary/10")}>
            <Icon className={cn("h-5 w-5", iconClassName ? "text-current" : "text-primary")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
