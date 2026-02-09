import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CompanyFilters {
  status?: string;
  search?: string;
  affiliateId?: string;
}

export interface CompanyFormData {
  name: string;
  workspace_id: string;
  owner_name: string;
  owner_email: string;
  owner_whatsapp: string;
  owner_cpf: string;
  status: 'trial' | 'active' | 'suspended' | 'cancelled';
  trial_start_date?: string;
  trial_end_date?: string;
  payment_due_day?: number;
  free_days_granted?: number;
}

export const useCompanies = (filters?: CompanyFilters) => {
  return useQuery({
    queryKey: ['companies', filters],
    queryFn: async () => {
      let query = supabase
        .from('companies')
        .select(`
          *,
          company_subscriptions (
            current_users,
            current_professionals,
            current_contacts,
            current_whatsapp_numbers,
            max_users,
            max_professionals,
            max_contacts,
            max_whatsapp_numbers
          ),
          affiliate_companies (
            affiliate_id,
            status,
            affiliates (
              id,
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,workspace_id.ilike.%${filters.search}%,owner_name.ilike.%${filters.search}%`);
      }
      if (filters?.affiliateId && filters.affiliateId !== 'all') {
        if (filters.affiliateId === 'none') {
          const { data: affiliateCompanies, error: affiliateError } = await supabase
            .from('affiliate_companies')
            .select('company_id');

          if (affiliateError) throw affiliateError;

          const affiliateCompanyIds = (affiliateCompanies || []).map((row) => row.company_id);
          if (affiliateCompanyIds.length > 0) {
            query = query.not('id', 'in', `(${affiliateCompanyIds.join(',')})`);
          }
        } else {
          const { data: affiliateCompanies, error: affiliateError } = await supabase
            .from('affiliate_companies')
            .select('company_id')
            .eq('affiliate_id', filters.affiliateId);

          if (affiliateError) throw affiliateError;

          const affiliateCompanyIds = (affiliateCompanies || []).map((row) => row.company_id);
          if (affiliateCompanyIds.length === 0) {
            return [];
          }
          query = query.in('id', affiliateCompanyIds);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });
};

export const useCompanyDetails = (id: string) => {
  return useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          company_subscriptions (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateCompany = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CompanyFormData) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

      // Call edge function to create company with Service Role Key
      const { data: result, error } = await supabase.functions.invoke('create-company', {
        body: { companyData: data },
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
              ...(anonKey ? { apikey: anonKey } : {}),
            }
          : undefined,
      });

      if (error) {
        const anyError = error as any;
        const body = anyError?.context?.body;
        if (body) {
          try {
            const parsed = typeof body === "string" ? JSON.parse(body) : body;
            if (parsed?.error) {
              throw new Error(parsed.error);
            }
          } catch {
            // Fall through to default error handling
          }
        }
        throw error;
      }
      if (!result.success) throw new Error('Failed to create company');

      return result;
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast({
        title: "Empresa criada com sucesso!",
        description: result?.email_sent
          ? "Email enviado para o administrador definir a senha."
          : "Empresa criada. Envie o convite para o administrador definir a senha.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar empresa",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useSendAdminPasswordReset = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (companyId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

      const { data, error } = await supabase.functions.invoke('send-admin-password-reset', {
        body: { companyId },
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
              ...(anonKey ? { apikey: anonKey } : {}),
            }
          : undefined,
      });

      if (error) {
        const anyError = error as any;
        const body = anyError?.context?.body;
        if (body) {
          try {
            const parsed = typeof body === "string" ? JSON.parse(body) : body;
            if (parsed?.error) {
              throw new Error(parsed.error);
            }
          } catch {
            // fall through
          }
        }
        throw error;
      }
      if (!data?.success) throw new Error('Falha ao enviar email');
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Email enviado",
        description: "Enviamos o link de definição de senha para o responsável.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar email",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateCompany = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CompanyFormData> }) => {
      const { error } = await supabase
        .from('companies')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast({
        title: "Empresa atualizada!",
        description: "As informações foram atualizadas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar empresa",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateCompanyStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('companies')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      const statusText = {
        active: 'ativada',
        suspended: 'suspensa',
        cancelled: 'cancelada',
        trial: 'em trial',
      }[variables.status] || 'atualizada';
      
      toast({
        title: "Status atualizado!",
        description: `Empresa ${statusText} com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteCompany = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      // Get current user email
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.email) {
        throw new Error("Usuário não autenticado");
      }

      // Call edge function to delete company completely
      const { data, error } = await supabase.functions.invoke('delete-company', {
        body: { 
          companyId: id,
          password: password,
          userEmail: session.session.user.email
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error('Falha ao deletar empresa');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast({
        title: "Empresa excluída!",
        description: "A empresa e todos os dados relacionados foram removidos.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir empresa",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
