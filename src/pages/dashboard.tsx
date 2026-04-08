import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { AppLayout } from "@/components/app-layout";
import { StatCard } from "@/components/stat-card";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Ticket, Clock, CheckCircle2, AlertCircle, PlusCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import type { TicketStatus } from "@/types";
import { useTickets, useTicketStats } from "@/hooks/use-tickets";
import { subscribeToTickets } from "@/services/ticket-service";
import { useQueryClient } from "@tanstack/react-query";

const PAGE_SIZE = 5;
const quickFilters: { label: string; value: TicketStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
];

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useTicketStats(user?.id);
  const { data: tickets = [], isLoading: ticketsLoading } = useTickets({ userId: user?.id });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [page, setPage] = useState(1);

  // Real-time refresh
  useEffect(() => {
    const channel = subscribeToTickets(() => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticketStats"] });
    });
    return () => { channel.unsubscribe(); };
  }, [queryClient]);

  const filtered = useMemo(() => {
    return tickets
      .filter((t) => {
        if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (statusFilter !== "all" && t.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [tickets, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const isLoading = statsLoading || ticketsLoading;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
            <p className="text-muted-foreground text-sm">Here's an overview of your tickets</p>
          </div>
          <Button onClick={() => navigate("/tickets/create")} className="gap-2">
            <PlusCircle className="h-4 w-4" /> New Ticket
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              <StatCard title="Total Tickets" value={stats?.total ?? 0} icon={Ticket} />
              <StatCard title="Open" value={stats?.open ?? 0} icon={AlertCircle} iconClassName="bg-primary/10 text-primary" />
              <StatCard title="In Progress" value={stats?.inProgress ?? 0} icon={Clock} iconClassName="bg-warning/10 text-warning" />
              <StatCard title="Resolved" value={stats?.resolved ?? 0} icon={CheckCircle2} iconClassName="bg-success/10 text-success" />
            </>
          )}
        </div>

        {/* Tickets */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-lg">My Tickets</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search tickets..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((f) => (
                <Button key={f.value} variant={statusFilter === f.value ? "default" : "outline"} size="sm" onClick={() => { setStatusFilter(f.value); setPage(1); }}>
                  {f.label}
                </Button>
              ))}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Ticket className="h-10 w-10 mb-3 opacity-40" />
                <p className="font-medium">No tickets found</p>
                <p className="text-sm">
                  {search || statusFilter !== "all" ? "Try adjusting your filters" : "Create your first ticket to get started"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="hidden md:table-cell">Status</TableHead>
                        <TableHead className="hidden md:table-cell">Priority</TableHead>
                        <TableHead className="hidden lg:table-cell">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((ticket) => (
                        <TableRow key={ticket.id} className="cursor-pointer" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{ticket.ticket_number}</TableCell>
                          <TableCell className="font-medium">{ticket.title}</TableCell>
                          <TableCell className="hidden md:table-cell"><StatusBadge status={ticket.status} /></TableCell>
                          <TableCell className="hidden md:table-cell"><PriorityBadge priority={ticket.priority} /></TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{format(new Date(ticket.created_at), "MMM d, yyyy")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm px-2">{currentPage} / {totalPages}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
