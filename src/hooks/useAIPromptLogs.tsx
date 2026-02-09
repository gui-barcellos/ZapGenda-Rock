import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FunctionCallLog {
  name: string;
  args: any;
  result: any;
  timestamp?: string;
}

export interface AIPromptLog {
  id: string;
  company_id: string;
  contact_id: string | null;
  conversation_id: string | null;
  full_prompt: string;
  ai_response: string | null;
  tokens_input: number;
  tokens_output: number;
  tokens_total: number;
  model_used: string | null;
  response_time_ms: number | null;
  ai_config_snapshot: any;
  message_count: number;
  created_at: string;
  // Novos campos para auditoria completa
  is_first_message: boolean;
  previous_response_id: string | null;
  response_id_generated: string | null;
  function_calls: FunctionCallLog[];
  conversation_stage: string | null;
  loop_iterations: number;
  user_message: string | null;
}

export const useAIPromptLogs = (companyId?: string, limit: number = 20) => {
  return useQuery({
    queryKey: ["ai-prompt-logs", companyId, limit],
    queryFn: async () => {
      let query = supabase
        .from("ai_prompt_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (companyId) {
        query = query.eq("company_id", companyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Cast function_calls from Json to FunctionCallLog[]
      return (data || []).map(log => ({
        ...log,
        function_calls: (log.function_calls || []) as unknown as FunctionCallLog[],
      })) as AIPromptLog[];
    },
    enabled: !!companyId,
  });
};

export const useLatestPromptLog = (companyId?: string) => {
  return useQuery({
    queryKey: ["latest-ai-prompt-log", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from("ai_prompt_logs")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;
      
      // Cast function_calls from Json to FunctionCallLog[]
      return {
        ...data,
        function_calls: (data.function_calls || []) as unknown as FunctionCallLog[],
      } as AIPromptLog;
    },
    enabled: !!companyId,
  });
};
