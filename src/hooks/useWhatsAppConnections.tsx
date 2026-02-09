import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

interface WhatsAppConnection {
  id: string;
  company_id: string;
  name: string | null;
  phone: string | null;
  z_api_token: string;
  z_api_instance_id: string;
  z_api_client_token: string;
  is_connected: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export const useWhatsAppConnections = () => {
  return useQuery({
    queryKey: ["whatsapp-connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_connections")
        .select("*")
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WhatsAppConnection[];
    },
  });
};

export const useCreateWhatsAppConnection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connection: Partial<Omit<WhatsAppConnection, "id" | "created_at" | "updated_at" | "company_id" | "is_connected">>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // Validar conexão Z-API antes de criar
      const { data: validationData, error: validationError } = await supabase.functions.invoke(
        "zapi-validate-connection",
        {
          body: {
            instanceId: connection.z_api_instance_id!,
            token: connection.z_api_token!,
            clientToken: connection.z_api_client_token!,
          },
        }
      );

      if (validationError) {
        throw new Error(`Erro ao validar conexão: ${validationError.message}`);
      }

      if (!validationData?.connected) {
        throw new Error("Instância Z-API não está conectada. Por favor, escaneie o QR Code no painel da Z-API.");
      }

      // Criar conexão no banco com status conectado e número obtido
      const { data, error } = await supabase
        .from("whatsapp_connections")
        .insert([{
          name: connection.name || null,
          phone: validationData.phone || connection.phone || null,
          z_api_token: connection.z_api_token!,
          z_api_instance_id: connection.z_api_instance_id!,
          z_api_client_token: connection.z_api_client_token!,
          is_primary: connection.is_primary || false,
          is_connected: true,
          company_id: profile.company_id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
      toast.success("Conexão WhatsApp criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar conexão: ${error.message}`);
    },
  });
};

export const useUpdateWhatsAppConnection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WhatsAppConnection> & { id: string }) => {
      const { data, error } = await supabase
        .from("whatsapp_connections")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
      toast.success("Conexão atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar conexão: ${error.message}`);
    },
  });
};

export const useDeleteWhatsAppConnection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_connections")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connections"] });
      toast.success("Conexão removida com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover conexão: ${error.message}`);
    },
  });
};

/**
 * Hook para validar conexão Z-API em tempo real
 * IMPORTANTE: Esta é a fonte da verdade para o status da conexão.
 * Sempre use este hook para verificar se WhatsApp está realmente conectado.
 */
export const useValidateZAPIConnection = () => {
  return useMutation({
    mutationFn: async ({ 
      instanceId, 
      token, 
      clientToken,
      verbose = false,
      ignoreClientToken = false
    }: { 
      instanceId: string; 
      token: string; 
      clientToken?: string;
      verbose?: boolean;
      ignoreClientToken?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('zapi-validate-connection', {
        body: { 
          instanceId: instanceId.trim(), 
          token: token.trim(), 
          clientToken: clientToken?.trim(),
          verbose,
          ignoreClientToken
        }
      });

      if (error) throw error;
      return data;
    },
  });
};

/**
 * ⚠️ TEMPORARIAMENTE DESABILITADO
 * Aguardando definição de integração automática com Z-API
 * Mantido para referência futura
 */
/*
export const useDisconnectWhatsApp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('zapi-disconnect');

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Falha ao desconectar');

      return data;
    },
    onSuccess: () => {
      toast.success('WhatsApp desconectado com sucesso');
      queryClient.invalidateQueries({ queryKey: ["company-whatsapp-connection"] });
    },
    onError: (error: Error) => {
      console.error('Error disconnecting WhatsApp:', error);
      toast.error(error.message || 'Erro ao desconectar WhatsApp');
    },
  });
};
*/

export const useCompanyWhatsAppConnection = () => {
  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["company-whatsapp-connection", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return null;

      const { data, error } = await supabase
        .from("whatsapp_connections")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("is_primary", true)
        .single();

      if (error) throw error;
      return data as WhatsAppConnection;
    },
    enabled: !!user?.id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!query.data?.id) return;

    console.log('🔴 WhatsApp Realtime: Subscribed to connection', query.data.id);

    const channel = supabase
      .channel(`whatsapp-connection-${query.data.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_connections',
          filter: `id=eq.${query.data.id}`,
        },
        (payload) => {
          console.log('🟢 WhatsApp Realtime: Connection updated', payload.new);
          queryClient.setQueryData(
            ["company-whatsapp-connection", user?.id],
            payload.new
          );
        }
      )
      .subscribe();

    return () => {
      console.log('🔴 WhatsApp Realtime: Unsubscribed');
      supabase.removeChannel(channel);
    };
  }, [query.data?.id, user?.id, queryClient]);

  return query;
};
