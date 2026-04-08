import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import {
  getTickets,
  getTicketById,
  getTicketStats,
  createTicket,
  updateTicket,
  addComment,
  uploadAttachment,
  getAdminUsers,
} from "@/services/ticket-service";
import type { TicketStatus, TicketPriority, TicketCategory } from "@/types";

export function useTickets(params?: {
  userId?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  search?: string;
}) {
  return useQuery({
    queryKey: ["tickets", params],
    queryFn: () => getTickets(params),
  });
}

export function useTicket(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => getTicketById(ticketId!),
    enabled: !!ticketId,
  });
}

export function useTicketStats(userId?: string) {
  return useQuery({
    queryKey: ["ticketStats", userId],
    queryFn: () => getTicketStats(userId),
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticketStats"] });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, ...updates }: { ticketId: string; status?: TicketStatus; priority?: TicketPriority; assigned_to?: string | null }) =>
      updateTicket(ticketId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticketStats"] });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addComment,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.ticketId] });
    },
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadAttachment,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.ticketId] });
    },
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["adminUsers"],
    queryFn: getAdminUsers,
  });
}
