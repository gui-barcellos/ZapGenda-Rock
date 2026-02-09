import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const useAIUsage = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ai-usage', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not found');

      // Get user profile to find company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.company_id) throw new Error('Company ID not found');

      // Get subscription info
      const { data: subscription, error: subError } = await supabase
        .from('company_subscriptions')
        .select('current_ai_tokens, max_ai_tokens')
        .eq('company_id', profile.company_id)
        .single();

      if (subError) throw subError;

      // Get token usage by operation type
      const { data: usageByType, error: typeError } = await supabase
        .from('ai_token_usage')
        .select('operation_type, tokens_used')
        .eq('company_id', profile.company_id);

      if (typeError) throw typeError;

      const tokensByType = usageByType?.reduce((acc, item) => {
        const type = item.operation_type || 'other';
        acc[type] = (acc[type] || 0) + item.tokens_used;
        return acc;
      }, {} as Record<string, number>) || {};

      // Get audio transcription count
      const { count: audioCount, error: audioError } = await supabase
        .from('audio_transcription_usage')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id);

      if (audioError) throw audioError;

      // Get daily usage for last 30 days
      const days = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const start = new Date(date.setHours(0, 0, 0, 0)).toISOString();
        const end = new Date(date.setHours(23, 59, 59, 999)).toISOString();

        const { data } = await supabase
          .from('ai_token_usage')
          .select('tokens_used')
          .eq('company_id', profile.company_id)
          .gte('created_at', start)
          .lte('created_at', end);

        const total = data?.reduce((sum, t) => sum + t.tokens_used, 0) || 0;
        
        days.push({
          date: format(date, 'dd/MM', { locale: ptBR }),
          tokens: total,
        });
      }

      return {
        subscription,
        usageByType: tokensByType,
        audioTranscriptionCount: audioCount || 0,
        dailyUsage: days,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refetch every minute
  });
};
