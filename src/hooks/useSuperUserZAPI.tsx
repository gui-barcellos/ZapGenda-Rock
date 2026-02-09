import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WhatsAppConnection {
  id: string;
  company_id: string;
  name: string | null;
  phone: string | null;
  z_api_token: string;
  z_api_instance_id: string;
  is_connected: boolean;
  is_primary: boolean;
}

interface ValidationResult {
  connected: boolean;
  phone?: string;
  qrcode?: string;
  status?: any;
  statusCode?: number;
  error?: string;
  hints?: string[];
  debug?: {
    statusEndpoint?: {
      url: string;
      statusCode: number;
      responseHeaders: Record<string, string>;
      responseBody: string;
    };
    phoneEndpoint?: {
      url: string;
      statusCode: number;
      responseHeaders: Record<string, string>;
      responseBody: string;
    };
  };
}

export const useCompanyZAPIConnection = (companyId: string) => {
  return useQuery({
    queryKey: ["company-zapi-connection", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_connections")
        .select("*")
        .eq("company_id", companyId)
        .order("is_primary", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as WhatsAppConnection | null;
    },
  });
};

export const useAllCompaniesZAPIStatus = () => {
  return useQuery({
    queryKey: ["all-companies-zapi-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_connections")
        .select("company_id, is_connected, phone, name")
        .eq("is_primary", true);

      if (error) throw error;
      
      // Retorna um mapa de company_id para status
      const statusMap: Record<string, { isConnected: boolean; phone: string | null; name: string | null }> = {};
      data.forEach((conn) => {
        statusMap[conn.company_id] = {
          isConnected: conn.is_connected,
          phone: conn.phone,
          name: conn.name,
        };
      });
      
      return statusMap;
    },
  });
};

export const useSuperUserZAPI = () => {
  const queryClient = useQueryClient();

  const createConnection = useMutation({
    mutationFn: async ({
      companyId,
      data,
    }: {
      companyId: string;
      data: Partial<{
        name: string;
        z_api_instance_id: string;
        z_api_token: string;
        phone: string | null;
        is_connected: boolean;
        is_primary: boolean;
      }>;
    }) => {
      const { data: result, error } = await supabase
        .from("whatsapp_connections")
        .insert([
          {
            company_id: companyId,
            name: data.name,
            z_api_instance_id: data.z_api_instance_id,
            z_api_token: data.z_api_token,
            phone: data.phone,
            is_connected: data.is_connected,
            is_primary: data.is_primary,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-zapi-connection"] });
      queryClient.invalidateQueries({ queryKey: ["all-companies-zapi-status"] });
      toast.success("Conexão Z-API configurada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao configurar Z-API: ${error.message}`);
    },
  });

  const updateConnection = useMutation({
    mutationFn: async ({
      id,
      companyId,
      data,
    }: {
      id: string;
      companyId: string;
      data: Partial<{
        name: string;
        z_api_instance_id: string;
        z_api_token: string;
        phone: string | null;
        is_connected: boolean;
        is_primary: boolean;
      }>;
    }) => {
      const { data: result, error } = await supabase
        .from("whatsapp_connections")
        .update({
          name: data.name,
          z_api_instance_id: data.z_api_instance_id,
          z_api_token: data.z_api_token,
          phone: data.phone,
          is_connected: data.is_connected,
          is_primary: data.is_primary,
        })
        .eq("id", id)
        .eq("company_id", companyId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-zapi-connection"] });
      queryClient.invalidateQueries({ queryKey: ["all-companies-zapi-status"] });
      toast.success("Conexão Z-API atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar Z-API: ${error.message}`);
    },
  });

  return {
    createConnection,
    updateConnection,
  };
};

export const useValidateZAPIConnection = () => {
  return useMutation<ValidationResult, Error, {
    instanceId: string;
    token: string;
    clientToken?: string;
    verbose?: boolean;
    ignoreClientToken?: boolean;
  }>({
    mutationFn: async ({ 
      instanceId, 
      token, 
      clientToken,
      verbose = false,
      ignoreClientToken = false
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
      return data as ValidationResult;
    },
  });
};
