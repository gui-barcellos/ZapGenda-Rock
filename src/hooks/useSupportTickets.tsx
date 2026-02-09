import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export type TicketStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "technical" | "billing" | "feature_request" | "other";

export interface SupportTicket {
  id: string;
  company_id: string;
  user_id: string;
  subject: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  category?: TicketCategory;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  is_internal?: boolean;
  is_ai_response?: boolean;
  created_at: string;
}

export const useCompanySupportTickets = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["company-support-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SupportTicket[];
    },
    enabled: !!user,
  });
};

export const useAllSupportTickets = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["all-support-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select(`
          *,
          companies(name),
          profiles!support_tickets_user_id_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticket: {
      subject: string;
      description: string;
      priority: TicketPriority;
      category: TicketCategory;
    }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .single();

      const { data, error } = await supabase
        .from("support_tickets")
        .insert([
          {
            ...ticket,
            company_id: profile?.company_id,
            user_id: (await supabase.auth.getUser()).data.user?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["all-support-tickets"] });
      toast.success("Ticket criado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar ticket");
    },
  });
};

export const useUpdateTicketStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      status,
      assignedTo,
    }: {
      ticketId: string;
      status: TicketStatus;
      assignedTo?: string;
    }) => {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (assignedTo !== undefined) {
        updateData.assigned_to = assignedTo;
      }

      if (status === "resolved" || status === "closed") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("support_tickets")
        .update(updateData)
        .eq("id", ticketId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["all-support-tickets"] });
      toast.success("Status atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });
};

export const useTicketMessages = (ticketId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<TicketMessage[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["ticket-messages", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];

      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as TicketMessage[];
    },
    enabled: !!ticketId && !!user,
  });

  useEffect(() => {
    if (data) {
      setMessages(data);
    }
  }, [data]);

  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket-messages-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_ticket_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as TicketMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  return { messages, isLoading };
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      content,
      isInternal = false,
    }: {
      ticketId: string;
      content: string;
      isInternal?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("support_ticket_messages")
        .insert([
          {
            ticket_id: ticketId,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            content,
            is_internal: isInternal,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Update ticket's updated_at
      await supabase
        .from("support_tickets")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["company-support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["all-support-tickets"] });
    },
    onError: () => {
      toast.error("Erro ao enviar mensagem");
    },
  });
};