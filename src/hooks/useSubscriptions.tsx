import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Types
export interface SubscriptionFilters {
  status?: string;
  search?: string;
}

export interface ResourceLimits {
  max_users: number;
  max_professionals: number;
  max_contacts: number;
  max_whatsapp_numbers: number;
}

export interface EditLimitsData {
  max_users?: number;
  max_professionals?: number;
  max_contacts?: number;
  max_whatsapp_numbers?: number;
  max_ai_tokens?: number;
  effective_date?: Date;
  reason?: string;
}

export interface ResourcePrice {
  id: string;
  resource_type: string;
  monthly_price: number;
  updated_at?: string;
  updated_by?: string;
}

export interface PlanTemplate {
  id?: string;
  name: string;
  description?: string;
  base_price?: number;
  max_users: number;
  max_professionals: number;
  max_contacts: number;
  max_whatsapp_numbers: number;
  is_active: boolean;
}

// Helper: Calculate monthly revenue
const calculateMonthlyRevenue = (subscription: any, prices: ResourcePrice[]) => {
  const priceMap = prices.reduce((acc, p) => {
    acc[p.resource_type] = p.monthly_price;
    return acc;
  }, {} as Record<string, number>);

  const basePlan = priceMap['base_plan'] || 0;
  const extraUsers = Math.max(0, subscription.current_users - 2) * (priceMap['user'] || 0);
  const extraProfs = Math.max(0, subscription.current_professionals - 3) * (priceMap['professional'] || 0);
  const extraWhatsApp = Math.max(0, subscription.current_whatsapp_numbers - 1) * (priceMap['whatsapp'] || 0);
  const contactPacks = Math.floor(subscription.current_contacts / 1000) * (priceMap['contacts_1k'] || 0);
  
  // Calculate AI token packs (5M tokens per pack, beyond the base 5M)
  const aiTokenPacks = Math.max(0, Math.floor((subscription.max_ai_tokens - 5000000) / 5000000)) * (priceMap['ai_tokens_5m'] || 0);

  return basePlan + extraUsers + extraProfs + extraWhatsApp + contactPacks + aiTokenPacks;
};

// Hook: List all subscriptions with filters
export const useSubscriptions = (filters?: SubscriptionFilters) => {
  return useQuery({
    queryKey: ['subscriptions', filters],
    queryFn: async () => {
      let query = supabase
        .from('company_subscriptions')
        .select(`
          *,
          companies (
            id,
            name,
            status,
            workspace_id
          )
        `)
        .order('created_at', { ascending: false });

      const { data: subscriptions, error } = await query;
      if (error) throw error;

      // Get prices for revenue calculation
      const { data: prices } = await supabase
        .from('resource_prices')
        .select('*');

      const pricesArray = prices || [];

      return subscriptions?.map(sub => ({
        ...sub,
        usage_percentage: {
          users: sub.max_users > 0 ? (sub.current_users / sub.max_users) * 100 : 0,
          professionals: sub.max_professionals > 0 ? (sub.current_professionals / sub.max_professionals) * 100 : 0,
          contacts: sub.max_contacts > 0 ? (sub.current_contacts / sub.max_contacts) * 100 : 0,
          whatsapp: sub.max_whatsapp_numbers > 0 ? (sub.current_whatsapp_numbers / sub.max_whatsapp_numbers) * 100 : 0,
        },
        monthly_revenue: calculateMonthlyRevenue(sub, pricesArray),
      })).filter(sub => {
        if (filters?.status && filters.status !== 'all' && sub.companies?.status !== filters.status) {
          return false;
        }
        if (filters?.search && !sub.companies?.name.toLowerCase().includes(filters.search.toLowerCase())) {
          return false;
        }
        return true;
      }) || [];
    }
  });
};

// Hook: Get subscription details
export const useSubscriptionDetails = (companyId?: string) => {
  return useQuery({
    queryKey: ['subscription-details', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('company_subscriptions')
        .select(`
          *,
          companies (
            id,
            name,
            status,
            workspace_id,
            owner_name,
            owner_email
          )
        `)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId
  });
};

// Hook: Update subscription limits
export const useUpdateLimits = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ companyId, limits }: { companyId: string; limits: EditLimitsData }) => {
      // 1. Register change in subscription_changes
      const { error: changeError } = await supabase
        .from('subscription_changes')
        .insert([{
          change_type: 'limit_change',
          resource_type: 'multiple',
          quantity_change: 0,
          requested_by: user?.id,
          scheduled_for: limits.effective_date ? limits.effective_date.toISOString().split('T')[0] : null,
        }]);

      if (changeError) throw changeError;

      // 2. Update company_subscriptions
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      
      if (limits.max_users !== undefined) updateData.max_users = limits.max_users;
      if (limits.max_professionals !== undefined) updateData.max_professionals = limits.max_professionals;
      if (limits.max_contacts !== undefined) updateData.max_contacts = limits.max_contacts;
      if (limits.max_whatsapp_numbers !== undefined) updateData.max_whatsapp_numbers = limits.max_whatsapp_numbers;
      if (limits.max_ai_tokens !== undefined) updateData.max_ai_tokens = limits.max_ai_tokens;

      const { error: updateError } = await supabase
        .from('company_subscriptions')
        .update(updateData)
        .eq('company_id', companyId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-details'] });
      toast.success('Limites atualizados com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar limites: ' + error.message);
    }
  });
};

// Hook: Get subscription history
export const useSubscriptionHistory = (companyId?: string) => {
  return useQuery({
    queryKey: ['subscription-history', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('subscription_changes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(d => d.requested_by).filter(Boolean))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        const profileMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as Record<string, any>);
        
        return data.map(change => ({
          ...change,
          profiles: change.requested_by ? profileMap[change.requested_by] : null,
        } as any));
      }
      
      return (data || []) as any[];
    },
    enabled: !!companyId
  });
};

// Hook: Get resource prices
export const useResourcePrices = () => {
  return useQuery({
    queryKey: ['resource-prices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_prices')
        .select('*')
        .order('resource_type');

      if (error) throw error;
      return data || [];
    }
  });
};

// Hook: Update resource prices
export const useUpdateResourcePrices = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (prices: ResourcePrice[]) => {
      const updates = prices.map(price =>
        supabase
          .from('resource_prices')
          .update({
            monthly_price: price.monthly_price,
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq('resource_type', price.resource_type)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-prices'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Preços atualizados com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar preços: ' + error.message);
    }
  });
};

// Hook: Get plan templates
export const usePlanTemplates = () => {
  return useQuery({
    queryKey: ['plan-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });
};

// Hook: Create plan template
export const useCreatePlanTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: PlanTemplate) => {
      const { data, error } = await supabase
        .from('plan_templates')
        .insert({
          name: template.name,
          is_active: template.is_active,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-templates'] });
      toast.success('Template criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar template: ' + error.message);
    }
  });
};

// Hook: Update plan template
export const useUpdatePlanTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, template }: { id: string; template: Partial<PlanTemplate> }) => {
      const { error } = await supabase
        .from('plan_templates')
        .update(template)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-templates'] });
      toast.success('Template atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar template: ' + error.message);
    }
  });
};

// Hook: Apply plan template to company
export const useApplyPlanTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      companyId, 
      limits, 
      applyImmediately 
    }: { 
      companyId: string; 
      limits: ResourceLimits; 
      applyImmediately: boolean 
    }) => {
      // Register change
      const { error: changeError } = await supabase
        .from('subscription_changes')
        .insert([{
          change_type: 'plan_change',
          resource_type: 'multiple',
          quantity_change: 0,
          requested_by: user?.id,
          scheduled_for: applyImmediately ? null : new Date().toISOString().split('T')[0],
        }]);

      if (changeError) throw changeError;

      // Update subscription
      if (applyImmediately) {
        const { error: updateError } = await supabase
          .from('company_subscriptions')
          .update({
            max_users: limits.max_users,
            max_professionals: limits.max_professionals,
            max_contacts: limits.max_contacts,
            max_whatsapp_numbers: limits.max_whatsapp_numbers,
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId);

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-details'] });
      toast.success('Plano aplicado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao aplicar plano: ' + error.message);
    }
  });
};
