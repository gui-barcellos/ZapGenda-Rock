import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditLogFilters {
  companyId?: string;
  limit?: number;
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  const { companyId, limit = 200 } = filters;

  return useQuery({
    queryKey: ["audit-logs", companyId, limit],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select(`
          id,
          company_id,
          actor_user_id,
          actor_type,
          action,
          entity_type,
          entity_id,
          payload_before,
          payload_after,
          reason,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (companyId) {
        query = query.eq("company_id", companyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}
