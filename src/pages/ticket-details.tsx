import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { AppLayout } from "@/components/app-layout";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Clock,
  User as UserIcon,
  Tag,
  MessageSquare,
  CheckCircle2,
  Circle,
  ArrowRightCircle,
  Link2,
  Edit,
  Sparkles,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTicket, useTickets, useUpdateTicket, useAddComment, useAdminUsers } from "@/hooks/use-tickets";
import { subscribeToComments } from "@/services/ticket-service";
import { suggestSolutions } from "@/services/ai-service";
import type { TicketStatus } from "@/types";

const statusSteps: { key: TicketStatus; label: string; icon: typeof Circle }[] = [
  { key: "open", label: "Open", icon: Circle },
  { key: "in_progress", label: "In Progress", icon: ArrowRightCircle },
  { key: "resolved", label: "Resolved", icon: CheckCircle2 },
];

function getStatusIndex(status: TicketStatus) {
  return statusSteps.findIndex((s) => s.key === status);
}

interface Solution {
  title: string;
  description: string;
  confidence: number;
}

export default function TicketDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");

  const { data: ticket, isLoading, refetch } = useTicket(id);
  const updateTicket = useUpdateTicket();
  const addCommentMutation = useAddComment();
  const { data: adminUsers } = useAdminUsers();
  const { data: allTickets } = useTickets();

  // AI solutions state
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [solutionsLoading, setSolutionsLoading] = useState(false);
  const [solutionsFetched, setSolutionsFetched] = useState(false);

  const isAdmin = user?.role === "admin";

  // Real-time comment subscription
  useEffect(() => {
    if (!id) return;
    const channel = subscribeToComments(id, () => { refetch(); });
    return () => { channel.unsubscribe(); };
  }, [id, refetch]);

  const relatedTickets = ticket && allTickets
    ? allTickets.filter((t) => t.id !== ticket.id && t.category === ticket.category).slice(0, 3)
    : [];

  const fetchSolutions = async () => {
    if (!ticket || solutionsLoading) return;
    setSolutionsLoading(true);
    try {
      const result = await suggestSolutions(ticket.title, ticket.description, ticket.category);
      setSolutions(result.solutions);
      setSolutionsFetched(true);
    } catch {
      toast({ title: "Error", description: "Failed to load AI suggestions", variant: "destructive" });
    } finally {
      setSolutionsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!ticket) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">Ticket not found</p>
          <Button variant="link" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </AppLayout>
    );
  }

  const statusIdx = getStatusIndex(ticket.status);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateTicket.mutateAsync({ ticketId: ticket.id, status: newStatus as TicketStatus });
      toast({ title: "Status updated", description: `Ticket status changed to ${newStatus.replace("_", " ")}` });
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const handleAssign = async (userId: string) => {
    try {
      await updateTicket.mutateAsync({ ticketId: ticket.id, assigned_to: userId });
      const assignee = adminUsers?.find((u) => u.user_id === userId);
      toast({ title: "Ticket assigned", description: `Assigned to ${assignee?.full_name ?? "Unknown"}` });
    } catch {
      toast({ title: "Error", description: "Failed to assign ticket", variant: "destructive" });
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !user) return;
    try {
      await addCommentMutation.mutateAsync({
        ticketId: ticket.id,
        userId: user.id,
        content: newComment.trim(),
      });
      toast({ title: "Comment posted" });
      setNewComment("");
    } catch {
      toast({ title: "Error", description: "Failed to post comment", variant: "destructive" });
    }
  };

  const applySolutionAsComment = (solution: Solution) => {
    setNewComment(`💡 AI Suggested Solution: ${solution.title}\n\n${solution.description}`);
    toast({ title: "Solution added to comment", description: "Edit and post the comment to share this solution." });
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="font-mono text-xs text-muted-foreground">{ticket.ticket_number}</p>
              <h1 className="text-2xl font-display font-bold">{ticket.title}</h1>
            </div>
            <div className="flex gap-2 shrink-0">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><UserIcon className="h-3.5 w-3.5" /> {ticket.user_name}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
            <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> {ticket.category}</span>
          </div>
        </div>

        {/* Status Timeline */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {statusSteps.map((step, i) => {
                const StepIcon = step.icon;
                const isCompleted = i <= statusIdx;
                const isCurrent = i === statusIdx;
                return (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground"
                          : isCompleted
                            ? "border-success bg-success/10 text-success"
                            : "border-border text-muted-foreground"
                      )}>
                        <StepIcon className="h-4 w-4" />
                      </div>
                      <span className={cn(
                        "text-xs font-medium",
                        isCurrent ? "text-primary" : isCompleted ? "text-success" : "text-muted-foreground"
                      )}>
                        {step.label}
                      </span>
                    </div>
                    {i < statusSteps.length - 1 && (
                      <div className={cn(
                        "flex-1 h-0.5 mx-3 mt-[-1rem]",
                        i < statusIdx ? "bg-success" : "bg-border"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                {ticket.tags && ticket.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {ticket.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Solution Suggestions */}
            {ticket.status !== "resolved" && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Solution Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!solutionsFetched && !solutionsLoading ? (
                    <div className="flex flex-col items-center py-4 gap-3">
                      <Lightbulb className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground text-center">
                        Get AI-powered solution suggestions for this issue
                      </p>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchSolutions}>
                        <Sparkles className="h-3.5 w-3.5" /> Get Suggestions
                      </Button>
                    </div>
                  ) : solutionsLoading ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing ticket and generating solutions...
                    </div>
                  ) : solutions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No solutions could be generated.</p>
                  ) : (
                    <div className="space-y-3">
                      {solutions.map((sol, i) => (
                        <div key={i} className="rounded-lg border border-border p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium">{sol.title}</h4>
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {Math.round(sol.confidence * 100)}%
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sol.description}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs gap-1"
                            onClick={() => applySolutionAsComment(sol)}
                          >
                            <MessageSquare className="h-3 w-3" /> Use as comment
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Admin Actions */}
            {isAdmin && (
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Edit className="h-4 w-4" /> Admin Actions</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <FieldLabel>Update Status</FieldLabel>
                      <Select value={ticket.status} onValueChange={handleStatusChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>Assign To</FieldLabel>
                      <Select value={ticket.assigned_to ?? ""} onValueChange={handleAssign}>
                        <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
                        <SelectContent>
                          {adminUsers?.filter((u) => u.role === "admin").map((u) => (
                            <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments ({ticket.comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticket.comments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first to comment.</p>
                )}
                {ticket.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {comment.user_name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{comment.user_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), "MMM d 'at' h:mm a")}
                        </span>
                        {comment.is_internal && (
                          <Badge variant="outline" className="text-[10px] px-1.5">Internal</Badge>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="space-y-3">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button size="sm" disabled={!newComment.trim() || addCommentMutation.isPending} onClick={handlePostComment}>
                      {addCommentMutation.isPending ? "Posting..." : "Post Comment"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned to</span>
                  <span className="font-medium">{ticket.assigned_to_name ?? "Unassigned"}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <Badge variant="outline" className="text-xs capitalize">{ticket.category}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{format(new Date(ticket.updated_at), "MMM d, yyyy")}</span>
                </div>
                {ticket.resolved_at && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Resolved</span>
                      <span>{format(new Date(ticket.resolved_at), "MMM d, yyyy")}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Activity */}
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Activity</CardTitle></CardHeader>
              <CardContent>
                {ticket.audit_trail.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No activity recorded yet.</p>
                ) : (
                  <div className="relative space-y-3">
                    {ticket.audit_trail.map((entry, i) => (
                      <div key={entry.id} className="flex gap-3">
                        <div className="relative flex flex-col items-center">
                          <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0 z-10" />
                          {i < ticket.audit_trail.length - 1 && (
                            <div className="w-px flex-1 bg-border" />
                          )}
                        </div>
                        <div className="pb-3">
                          <p className="text-xs">
                            <span className="font-medium">{entry.user_name}</span>{" "}
                            <span className="text-muted-foreground">{entry.action}</span>
                            {entry.new_value && <span className="text-muted-foreground"> → {entry.new_value}</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.created_at), "MMM d 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Related Tickets */}
            {relatedTickets.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5" /> Related Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {relatedTickets.map((rt) => (
                    <button
                      key={rt.id}
                      onClick={() => navigate(`/tickets/${rt.id}`)}
                      className="w-full text-left rounded-md border border-border p-2.5 hover:bg-muted transition-colors"
                    >
                      <p className="text-xs font-mono text-muted-foreground">{rt.ticket_number}</p>
                      <p className="text-sm font-medium truncate">{rt.title}</p>
                      <div className="mt-1">
                        <StatusBadge status={rt.status} />
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function FieldLabel({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium", className)} {...props}>{children}</label>;
}
