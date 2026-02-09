import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface InvoiceFilters {
  status?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface Invoice {
  id: string;
  company_id: string;
  amount_total: number;
  amount_paid: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  billing_reason: string | null;
  attempt_count: number;
  stripe_invoice_id: string | null;
  stripe_charge_id: string | null;
  invoice_pdf_url: string | null;
  companies?: {
    id: string;
    name: string;
    status: string;
    workspace_id: string;
  };
}

// Hook: List all invoices with filters
export const useInvoices = (filters?: InvoiceFilters) => {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
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

      // Apply date filters
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      const { data: invoices, error } = await query;
      if (error) throw error;

      return invoices?.filter(invoice => {
        if (filters?.status && filters.status !== 'all' && invoice.status !== filters.status) {
          return false;
        }
        if (filters?.search && invoice.companies?.name && !invoice.companies.name.toLowerCase().includes(filters.search.toLowerCase())) {
          return false;
        }
        return true;
      }) || [];
    }
  });
};

// Hook: Get invoice details
export const useInvoiceDetails = (invoiceId?: string) => {
  return useQuery({
    queryKey: ['invoice-details', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          companies (
            id,
            name,
            status,
            workspace_id,
            owner_name,
            owner_email,
            owner_whatsapp
          )
        `)
        .eq('id', invoiceId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId
  });
};

// Hook: Update invoice status
export const useUpdateInvoiceStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invoiceId, status, paidAt }: { 
      invoiceId: string; 
      status: string;
      paidAt?: Date;
    }) => {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'paid' && paidAt) {
        updateData.paid_at = paidAt.toISOString();
        updateData.amount_paid = null; // Will be set from amount_total
      }

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (error) throw error;

      // Update amount_paid if marked as paid
      if (status === 'paid') {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('amount_total')
          .eq('id', invoiceId)
          .single();

        if (invoice) {
          await supabase
            .from('invoices')
            .update({ amount_paid: invoice.amount_total })
            .eq('id', invoiceId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-details'] });
      toast.success('Status da fatura atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar fatura: ' + error.message);
    }
  });
};

// Hook: Get invoice statistics
export const useInvoiceStats = (filters?: InvoiceFilters) => {
  return useQuery({
    queryKey: ['invoice-stats', filters],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*');

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      const { data: invoices, error } = await query;
      if (error) throw error;

      const stats = {
        total: invoices?.length || 0,
        paid: invoices?.filter(i => i.status === 'paid').length || 0,
        pending: invoices?.filter(i => i.status === 'pending').length || 0,
        overdue: invoices?.filter(i => i.status === 'overdue').length || 0,
        totalRevenue: invoices?.reduce((sum, i) => sum + (i.status === 'paid' ? Number(i.amount_paid || i.amount_total) : 0), 0) || 0,
        pendingRevenue: invoices?.reduce((sum, i) => sum + (i.status === 'pending' ? Number(i.amount_total) : 0), 0) || 0,
      };

      return stats;
    }
  });
};

// Hook: Generate invoice manually
export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      companyId, 
      amountTotal,
      dueDate,
      billingReason 
    }: { 
      companyId: string; 
      amountTotal: number;
      dueDate?: Date;
      billingReason?: string;
    }) => {
      const { error } = await supabase
        .from('invoices')
        .insert({
          company_id: companyId,
          amount_total: amountTotal,
          amount_paid: 0,
          status: 'pending',
          due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
          billing_reason: billingReason || 'manual',
          attempt_count: 0,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Fatura criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar fatura: ' + error.message);
    }
  });
};
