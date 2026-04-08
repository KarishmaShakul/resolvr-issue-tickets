import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { AppLayout } from "@/components/app-layout";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, PlusCircle, LayoutGrid, LayoutList, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTickets } from "@/hooks/use-tickets";

const PAGE_SIZE = 8;

export default function AllTicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isAdmin = user?.role === "admin";

  const { data: tickets = [], isLoading } = useTickets(
    isAdmin ? undefined : { userId: user?.id }
  );

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter, priorityFilter, categoryFilter]);

  const filtered = useMemo(() => {
    return tickets
      .filter((t) => {
        if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.ticket_number.toLowerCase().includes(search.toLowerCase())) return false;
        if (statusFilter !== "all" && t.status !== statusFilter) return false;
        if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
        if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [search, statusFilter, priorityFilter, categoryFilter, tickets]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map((t) => t.id)));
  };

  const handleBulkAction = (action: string) => {
    toast({ title: `Bulk ${action}`, description: `Applied to ${selected.size} ticket(s)` });
    setSelected(new Set());
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">{isAdmin ? "All Tickets" : "My Tickets"}</h1>
            <p className="text-muted-foreground text-sm">{filtered.length} ticket{filtered.length !== 1 ? "s" : ""} found</p>
          </div>
          <div className="flex gap-2">
            <div className="flex rounded-md border border-border">
              <Button variant="ghost" size="icon" onClick={() => setViewMode("table")} className={cn("rounded-r-none h-9 w-9", viewMode === "table" && "bg-muted")}>
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setViewMode("grid")} className={cn("rounded-l-none h-9 w-9", viewMode === "grid" && "bg-muted")}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => navigate("/tickets/create")} className="gap-2">
              <PlusCircle className="h-4 w-4" /> New Ticket
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by title or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Category</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="access">Access</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="facilities">Facilities</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {isAdmin && selected.size > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction("status update")}>Update Status</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction("assign")}>Assign</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}

        {/* Table View */}
        {viewMode === "table" && (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && (
                      <TableHead className="w-10">
                        <Checkbox checked={paged.length > 0 && selected.size === paged.length} onCheckedChange={toggleAll} />
                      </TableHead>
                    )}
                    <TableHead className="w-24">ID</TableHead>
                    <TableHead>Title</TableHead>
                    {isAdmin && <TableHead className="hidden md:table-cell">Submitted By</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Priority</TableHead>
                    <TableHead className="hidden lg:table-cell">Category</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((ticket) => (
                    <TableRow key={ticket.id} className="cursor-pointer" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                      {isAdmin && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selected.has(ticket.id)} onCheckedChange={() => toggleSelect(ticket.id)} />
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-xs text-muted-foreground">{ticket.ticket_number}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{ticket.title}</TableCell>
                      {isAdmin && <TableCell className="hidden md:table-cell text-sm">{ticket.user_name}</TableCell>}
                      <TableCell><StatusBadge status={ticket.status} /></TableCell>
                      <TableCell className="hidden md:table-cell"><PriorityBadge priority={ticket.priority} /></TableCell>
                      <TableCell className="hidden lg:table-cell text-sm capitalize">{ticket.category}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{format(new Date(ticket.created_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                  {paged.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-muted-foreground">No tickets found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Grid View */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paged.map((ticket) => (
              <Card key={ticket.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">{ticket.ticket_number}</span>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <h3 className="font-medium text-sm leading-tight line-clamp-2">{ticket.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{ticket.description}</p>
                  <div className="flex items-center justify-between pt-1">
                    <PriorityBadge priority={ticket.priority} />
                    <span className="text-xs text-muted-foreground">{format(new Date(ticket.created_at), "MMM d")}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {paged.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">No tickets found</div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button key={i + 1} variant={page === i + 1 ? "default" : "outline"} size="icon" onClick={() => setPage(i + 1)} className="w-9">
                  {i + 1}
                </Button>
              ))}
              <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
