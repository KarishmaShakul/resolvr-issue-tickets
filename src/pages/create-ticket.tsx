import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { categories, priorities } from "@/data/mock-data";
import { Loader2, Upload, X, Sparkles, FileText, Image as ImageIcon, File, Save, AlertTriangle, Brain, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { useCreateTicket, useUploadAttachment, useTickets } from "@/hooks/use-tickets";
import { classifyTicket, detectDuplicates } from "@/services/ai-service";
import type { TicketCategory, TicketPriority } from "@/types";

const DRAFT_KEY = "resolvr_ticket_draft";

const ticketSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(150, "Title must be under 150 characters"),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(5000, "Description must be under 5000 characters"),
  category: z.string().min(1, "Please select a category"),
  priority: z.string().min(1, "Please select a priority"),
});

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  progress: number;
}

interface AiSuggestion {
  category: string;
  categoryConfidence: number;
  priority: string;
  priorityConfidence: number;
  reasoning: string;
}

interface DuplicateMatch {
  id: string;
  title: string;
  similarity: number;
  reason: string;
}

export default function CreateTicketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const createTicket = useCreateTicket();
  const uploadAttachment = useUploadAttachment();
  const { data: existingTickets = [] } = useTickets();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // AI state
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [aiApplied, setAiApplied] = useState(false);

  // Load draft on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        setTitle(parsed.title || "");
        setDescription(parsed.description || "");
        setCategory(parsed.category || "");
        setPriority(parsed.priority || "");
        setTags(parsed.tags || []);
      }
    } catch {
      // ignore
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (title || description || category || priority || tags.length) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, description, category, priority, tags }));
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      }
    }, 1500);
    return () => clearTimeout(timeout);
  }, [title, description, category, priority, tags]);

  // AI auto-classify when title+description are long enough
  useEffect(() => {
    if (title.length < 5 || description.length < 20) {
      setAiSuggestion(null);
      setAiApplied(false);
      return;
    }
    const timeout = setTimeout(async () => {
      setAiLoading(true);
      try {
        const result = await classifyTicket(title, description);
        setAiSuggestion({
          category: result.category,
          categoryConfidence: result.category_confidence,
          priority: result.priority,
          priorityConfidence: result.priority_confidence,
          reasoning: result.reasoning,
        });
        setAiApplied(false);
      } catch {
        // silently fail – AI is optional
      } finally {
        setAiLoading(false);
      }
    }, 1500);
    return () => clearTimeout(timeout);
  }, [title, description]);

  // Duplicate detection when title is long enough
  useEffect(() => {
    if (title.length < 10 || existingTickets.length === 0) {
      setDuplicates([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setDuplicateLoading(true);
      try {
        const ticketSummaries = existingTickets
          .filter((t) => t.status !== "resolved")
          .slice(0, 20)
          .map((t) => ({ id: t.ticket_number, title: t.title, status: t.status }));
        const result = await detectDuplicates(title, description, ticketSummaries);
        setDuplicates(result.duplicates.filter((d) => d.similarity >= 0.5));
      } catch {
        // silently fail
      } finally {
        setDuplicateLoading(false);
      }
    }, 2000);
    return () => clearTimeout(timeout);
  }, [title, description, existingTickets]);

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    setCategory(aiSuggestion.category);
    setPriority(aiSuggestion.priority);
    setAiApplied(true);
    toast({ title: "AI suggestions applied", description: "Category and priority have been set." });
  };

  const clearDraft = () => localStorage.removeItem(DRAFT_KEY);

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleFileAdd = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const allowed = ["image/png", "image/jpeg", "image/gif", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    const maxSize = 10 * 1024 * 1024;

    Array.from(newFiles).forEach((file) => {
      if (!allowed.includes(file.type)) {
        toast({ title: "Invalid file type", description: `${file.name} is not supported.`, variant: "destructive" });
        return;
      }
      if (file.size > maxSize) {
        toast({ title: "File too large", description: `${file.name} exceeds 10MB limit.`, variant: "destructive" });
        return;
      }
      const uploaded: UploadedFile = {
        id: crypto.randomUUID(),
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
        progress: 100,
      };
      setFiles((prev) => [...prev, uploaded]);
    });
  }, [toast]);

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const f = prev.find((p) => p.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileAdd(e.dataTransfer.files);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (type === "application/pdf") return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const validate = () => {
    const result = ticketSchema.safeParse({ title, description, category, priority });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        const field = e.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = e.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;

    try {
      const ticket = await createTicket.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        category: category as TicketCategory,
        priority: priority as TicketPriority,
        tags,
        userId: user.id,
      });

      for (const f of files) {
        await uploadAttachment.mutateAsync({
          ticketId: ticket.id,
          userId: user.id,
          file: f.file,
        });
      }

      clearDraft();
      toast({ title: "Ticket created!", description: `Ticket ${ticket.ticket_number} has been submitted successfully.` });
      navigate("/tickets");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create ticket";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const isSubmitting = createTicket.isPending || uploadAttachment.isPending;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Create New Ticket</h1>
            <p className="text-muted-foreground text-sm">Describe your issue and we'll get it resolved</p>
          </div>
          {draftSaved && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground animate-in fade-in">
              <Save className="h-3 w-3" /> Draft saved
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ticket Details</CardTitle>
              <CardDescription>Provide a clear title and description for your issue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Brief summary of the issue"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={cn(errors.title && "border-destructive")}
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                <p className="text-xs text-muted-foreground">{title.length}/150 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the issue in detail. Include steps to reproduce if applicable..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  className={cn(errors.description && "border-destructive")}
                />
                {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
                <div className="flex justify-between">
                  <p className="text-xs text-muted-foreground">Supports plain text formatting</p>
                  <p className="text-xs text-muted-foreground">{description.length}/5000</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Duplicate Detection Alert */}
          {(duplicates.length > 0 || duplicateLoading) && (
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="pt-6">
                {duplicateLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking for similar tickets...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-warning">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Potential duplicate tickets found</span>
                    </div>
                    <div className="space-y-2">
                      {duplicates.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-start gap-3 rounded-md border border-border bg-background p-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{d.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{d.reason}</p>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {Math.round(d.similarity * 100)}% match
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You can still submit this ticket if it's a different issue.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Suggestion Card */}
          {(aiSuggestion || aiLoading) && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                {aiLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Brain className="h-4 w-4 animate-pulse" />
                    AI is analyzing your ticket...
                  </div>
                ) : aiSuggestion ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-primary">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-sm font-medium">AI Suggestion</span>
                      </div>
                      {!aiApplied ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={applyAiSuggestion}
                        >
                          <Check className="h-3 w-3" /> Apply
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Check className="h-3 w-3" /> Applied
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Category</span>
                        <p className="font-medium capitalize">
                          {categories.find((c) => c.value === aiSuggestion.category)?.label ?? aiSuggestion.category}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({Math.round(aiSuggestion.categoryConfidence * 100)}%)
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Priority</span>
                        <p className="font-medium capitalize">
                          {aiSuggestion.priority}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({Math.round(aiSuggestion.priorityConfidence * 100)}%)
                          </span>
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{aiSuggestion.reasoning}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Classification
                <Badge variant="secondary" className="gap-1 text-xs font-normal">
                  <Sparkles className="h-3 w-3" /> AI-assisted
                </Badge>
              </CardTitle>
              <CardDescription>Category and priority can be auto-suggested by AI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className={cn(errors.category && "border-destructive")}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Priority *</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {priorities.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPriority(p.value)}
                        className={cn(
                          "rounded-md border px-2 py-2 text-xs font-medium transition-colors",
                          priority === p.value
                            ? p.value === "critical"
                              ? "border-destructive bg-destructive/10 text-destructive"
                              : p.value === "high"
                                ? "border-warning bg-warning/10 text-warning"
                                : p.value === "medium"
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border bg-muted text-muted-foreground"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {errors.priority && <p className="text-xs text-destructive">{errors.priority}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>Add</Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{tags.length}/10 tags</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attachments</CardTitle>
              <CardDescription>Upload relevant files (screenshots, logs, documents)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-input")?.click()}
                className={cn(
                  "flex items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
                  isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
              >
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.gif,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => handleFileAdd(e.target.files)}
                />
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Drag & drop files here, or click to browse</p>
                  <p className="text-xs text-muted-foreground">Max 10MB per file · PNG, JPG, PDF, DOC</p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                      {f.preview ? (
                        <img src={f.preview} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                          {getFileIcon(f.file.type)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(f.file.size)}</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(f.id)} className="shrink-0">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { clearDraft(); navigate(-1); }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Ticket"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
