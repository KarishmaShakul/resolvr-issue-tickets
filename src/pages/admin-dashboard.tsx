import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { StatCard } from "@/components/stat-card";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { categories } from "@/data/mock-data";
import {
  Ticket, Clock, CheckCircle2, AlertCircle, Search, PlusCircle,
  ChevronLeft, ChevronRight, Download, ArrowUpDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { useTickets, useTicketStats } from "@/hooks/use-tickets";
import { subscribeToTickets } from "@/services/ticket-service";
import { useQueryClient } from "@tanstack/react-query";

const PAGE_SIZE = 5;

const STATUS_COLORS: Record<string, string> = {
  open: "hsl(217, 91%, 60%)",
  in_progress: "hsl(38, 92%, 50%)",
  resolved: "hsl(160, 84%, 39%)",
};

type SortKey = "createdAt" | "priority" | "status" | "title";
const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);

  const { data: stats, isLoading: statsLoading } = useTicketStats();
  const { data: tickets = [], isLoading: ticketsLoading } = useTickets();

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
        if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
        if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "createdAt") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        else if (sortKey === "priority") cmp = priorityOrder[a.priority] - priorityOrder[b.priority];
        else if (sortKey === "title") cmp = a.title.localeCompare(b.title);
        else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
        return sortAsc ? cmp : -cmp;
      });
  }, [search, statusFilter, priorityFilter, categoryFilter, sortKey, sortAsc, tickets]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const allSelected = paginated.length > 0 && paginated.every((t) => selected.has(t.id));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(paginated.map((t) => t.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const exportCSV = () => {
    const header = "ID,Title,Status,Priority,Category,Submitted By,Created\n";
    const rows = filtered.map((t) =>
      `${t.ticket_number},"${t.title}",${t.status},${t.priority},${t.category},"${t.user_name}",${t.created_at}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tickets-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = statsLoading || ticketsLoading;

  // Chart data
  const statusChartData = [
    { name: "Open", value: stats?.open ?? 0 },
    { name: "In Progress", value: stats?.inProgress ?? 0 },
    { name: "Resolved", value: stats?.resolved ?? 0 },
  ];

  const categoryChartData = categories.map((c) => ({
    name: c.label,
    count: tickets.filter((t) => t.category === c.value).length,
  })).filter((c) => c.count > 0);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">Manage and monitor all tickets across the organization</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={() => navigate("/tickets/create")} className="gap-2">
              <PlusCircle className="h-4 w-4" /> New Ticket
            </Button>
          </div>
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Tickets by Category</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Tickets by Status</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      {statusChartData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name.toLowerCase().replace(" ", "_")] ?? "hsl(215,16%,47%)"} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">All Tickets</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search tickets..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {selected.size > 0 && (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2 text-sm">
                <span className="font-medium">{selected.size} selected</span>
                <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} /></TableHead>
                    <TableHead className="w-24">ID</TableHead>
                    <TableHead>
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("title")}>
                        Title <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">Submitted By</TableHead>
                    <TableHead>
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("status")}>
                        Status <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("priority")}>
                        Priority <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">Assigned</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("createdAt")}>
                        Created <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((ticket) => (
                    <TableRow key={ticket.id} className="cursor-pointer">
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selected.has(ticket.id)} onCheckedChange={() => toggleSelect(ticket.id)} />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground" onClick={() => navigate(`/tickets/${ticket.id}`)}>{ticket.ticket_number}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate" onClick={() => navigate(`/tickets/${ticket.id}`)}>{ticket.title}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm" onClick={() => navigate(`/tickets/${ticket.id}`)}>{ticket.user_name}</TableCell>
                      <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)}><StatusBadge status={ticket.status} /></TableCell>
                      <TableCell className="hidden md:table-cell" onClick={() => navigate(`/tickets/${ticket.id}`)}><PriorityBadge priority={ticket.priority} /></TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground" onClick={() => navigate(`/tickets/${ticket.id}`)}>{ticket.assigned_to_name ?? "Unassigned"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground" onClick={() => navigate(`/tickets/${ticket.id}`)}>{format(new Date(ticket.created_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                  {paginated.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No tickets found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Showing {filtered.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
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
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
