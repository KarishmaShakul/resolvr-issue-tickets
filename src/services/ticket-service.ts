import { supabase } from "@/integrations/supabase/client";
import type { TicketStatus, TicketPriority, TicketCategory } from "@/types";

// ── Types ──

export interface TicketRow {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  tags: string[];
  user_id: string;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommentRow {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface AttachmentRow {
  id: string;
  ticket_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  created_at: string;
}

export interface AuditRow {
  id: string;
  ticket_id: string;
  user_id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface TicketWithRelations extends TicketRow {
  comments: (CommentRow & { user_name: string })[];
  attachments: (AttachmentRow & { url: string })[];
  audit_trail: (AuditRow & { user_name: string })[];
  user_name: string;
  assigned_to_name: string | null;
}

// ── Helpers ──

async function getProfileName(userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", userId)
    .single();
  return data?.full_name ?? "Unknown";
}

async function getProfileNames(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const unique = [...new Set(userIds)];
  const { data } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", unique);
  const map: Record<string, string> = {};
  data?.forEach((p) => {
    map[p.user_id] = p.full_name ?? "Unknown";
  });
  return map;
}

// ── CRUD Operations ──

export async function createTicket(params: {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  tags: string[];
  userId: string;
}) {
  const { data, error } = await supabase
    .from("tickets")
    .insert({
      title: params.title,
      description: params.description,
      category: params.category,
      priority: params.priority,
      tags: params.tags,
      user_id: params.userId,
      ticket_number: `TEMP-${crypto.randomUUID()}`, // trigger will override
    })
    .select()
    .single();

  if (error) throw error;

  // Insert initial audit entry
  await supabase.from("ticket_audit_trail").insert({
    ticket_id: data.id,
    user_id: params.userId,
    action: "created",
  });

  return data;
}

export async function getTickets(params?: {
  userId?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  search?: string;
}) {
  let query = supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (params?.userId) query = query.eq("user_id", params.userId);
  if (params?.status) query = query.eq("status", params.status);
  if (params?.priority) query = query.eq("priority", params.priority);
  if (params?.category) query = query.eq("category", params.category);
  if (params?.search) {
    query = query.or(`title.ilike.%${params.search}%,ticket_number.ilike.%${params.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Fetch profile names for user_id and assigned_to
  const allUserIds = [
    ...new Set([
      ...(data?.map((t) => t.user_id) ?? []),
      ...(data?.filter((t) => t.assigned_to).map((t) => t.assigned_to!) ?? []),
    ]),
  ];
  const names = await getProfileNames(allUserIds);

  return (data ?? []).map((t) => ({
    ...t,
    user_name: names[t.user_id] ?? "Unknown",
    assigned_to_name: t.assigned_to ? names[t.assigned_to] ?? "Unknown" : null,
  }));
}

export async function getTicketById(ticketId: string): Promise<TicketWithRelations | null> {
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (error || !ticket) return null;

  // Fetch comments, attachments, audit in parallel
  const [commentsRes, attachmentsRes, auditRes] = await Promise.all([
    supabase.from("ticket_comments").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
    supabase.from("ticket_attachments").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
    supabase.from("ticket_audit_trail").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
  ]);

  // Collect all user ids for name resolution
  const allUserIds = [
    ticket.user_id,
    ...(ticket.assigned_to ? [ticket.assigned_to] : []),
    ...(commentsRes.data?.map((c) => c.user_id) ?? []),
    ...(auditRes.data?.map((a) => a.user_id) ?? []),
  ];
  const names = await getProfileNames(allUserIds);

  // Build attachment URLs
  const attachments = (attachmentsRes.data ?? []).map((a) => {
    const { data: urlData } = supabase.storage.from("ticket-attachments").getPublicUrl(a.storage_path);
    return { ...a, url: urlData.publicUrl };
  });

  return {
    ...ticket,
    user_name: names[ticket.user_id] ?? "Unknown",
    assigned_to_name: ticket.assigned_to ? names[ticket.assigned_to] ?? null : null,
    comments: (commentsRes.data ?? []).map((c) => ({ ...c, user_name: names[c.user_id] ?? "Unknown" })),
    attachments,
    audit_trail: (auditRes.data ?? []).map((a) => ({ ...a, user_name: names[a.user_id] ?? "Unknown" })),
  };
}

export async function updateTicket(
  ticketId: string,
  updates: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assigned_to?: string | null;
  }
) {
  const updateData: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assigned_to?: string | null;
    resolved_at?: string;
  } = {};
  if (updates.status !== undefined) {
    updateData.status = updates.status;
    if (updates.status === "resolved") updateData.resolved_at = new Date().toISOString();
  }
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.assigned_to !== undefined) updateData.assigned_to = updates.assigned_to;

  const { data, error } = await supabase
    .from("tickets")
    .update(updateData)
    .eq("id", ticketId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addComment(params: {
  ticketId: string;
  userId: string;
  content: string;
  isInternal?: boolean;
}) {
  const { data, error } = await supabase
    .from("ticket_comments")
    .insert({
      ticket_id: params.ticketId,
      user_id: params.userId,
      content: params.content,
      is_internal: params.isInternal ?? false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── File Uploads ──

export async function uploadAttachment(params: {
  ticketId: string;
  userId: string;
  file: File;
}) {
  const filePath = `${params.userId}/${params.ticketId}/${crypto.randomUUID()}-${params.file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("ticket-attachments")
    .upload(filePath, params.file);

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("ticket_attachments")
    .insert({
      ticket_id: params.ticketId,
      user_id: params.userId,
      file_name: params.file.name,
      file_size: params.file.size,
      file_type: params.file.type,
      storage_path: filePath,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Stats ──

export async function getTicketStats(userId?: string) {
  let query = supabase.from("tickets").select("status");
  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) throw error;

  const tickets = data ?? [];
  return {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };
}

// ── Admin: Get all profiles for assignment ──

export async function getAdminUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, department, phone, avatar_url, created_at, updated_at");

  if (error) throw error;

  // Get roles
  const userIds = data?.map((p) => p.user_id) ?? [];
  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", userIds);

  const roleMap: Record<string, string> = {};
  roles?.forEach((r) => { roleMap[r.user_id] = r.role; });

  return (data ?? []).map((p) => ({
    ...p,
    role: roleMap[p.user_id] ?? "user",
  }));
}

// ── Realtime subscription ──

export function subscribeToTickets(callback: (payload: unknown) => void) {
  return supabase
    .channel("tickets-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, callback)
    .subscribe();
}

export function subscribeToComments(ticketId: string, callback: (payload: unknown) => void) {
  return supabase
    .channel(`comments-${ticketId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_comments", filter: `ticket_id=eq.${ticketId}` }, callback)
    .subscribe();
}
