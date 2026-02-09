import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Availability {
  id: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface BlockedSlot {
  id: string;
  professional_id: string | null;
  date: string;
  reason: string | null;
  is_general_block: boolean;
  general_block_group_id: string | null;
  professionals?: { name: string };
}

interface ScheduleUpdate {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export function useAvailability(professionalId?: string) {
  const queryClient = useQueryClient();

  const { data: availability, isLoading } = useQuery({
    queryKey: ["availability", professionalId],
    queryFn: async () => {
      if (!professionalId) return [];

      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .eq("professional_id", professionalId)
        .order("day_of_week");

      if (error) throw error;
      return data as Availability[];
    },
    enabled: !!professionalId,
  });

  const { data: blockedSlots } = useQuery({
    queryKey: ["blocked-slots", professionalId],
    queryFn: async () => {
      if (!professionalId) return [];

      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from("blocked_slots")
        .select("*, professionals(name)")
        .eq("company_id", profile.company_id)
        .eq("professional_id", professionalId)
        .gte("date", new Date().toISOString().split('T')[0])
        .order("date");

      if (error) throw error;
      return data as BlockedSlot[];
    },
    enabled: !!professionalId,
  });

  const { data: generalBlockedSlots } = useQuery({
    queryKey: ["general-blocked-slots"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      const { data, error } = await supabase
        .from("blocked_slots")
        .select("*")
        .eq("company_id", profile?.company_id)
        .eq("is_general_block", true)
        .gte("date", new Date().toISOString().split('T')[0])
        .order("date");

      if (error) throw error;

      // Agrupar por general_block_group_id + date para mostrar apenas 1 por grupo
      const uniqueBlocks = data.reduce((acc, block) => {
        const key = `${block.date}-${block.general_block_group_id}`;
        if (!acc[key]) {
          acc[key] = block;
        }
        return acc;
      }, {} as Record<string, any>);

      return Object.values(uniqueBlocks) as BlockedSlot[];
    },
  });

  const bulkUpdateAvailability = useMutation({
    mutationFn: async ({
      professionalId,
      schedules,
    }: {
      professionalId: string;
      schedules: ScheduleUpdate[];
    }) => {
      // Get company_id from user profile
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // Delete existing schedules for this professional
      await supabase
        .from("availability")
        .delete()
        .eq("professional_id", professionalId);

      // Insert new schedules (only active ones)
      const activeSchedules = schedules.filter(s => s.is_active);
      
      if (activeSchedules.length > 0) {
        const { error } = await supabase
          .from("availability")
          .insert(
            activeSchedules.map(s => ({
              professional_id: professionalId,
              company_id: profile.company_id,
              day_of_week: s.day_of_week,
              start_time: s.start_time,
              end_time: s.end_time,
              is_active: true,
            }))
          );

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["availability", variables.professionalId] });
      toast.success("Horários atualizados");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createBlockedSlot = useMutation({
    mutationFn: async ({
      professionalId,
      date,
      reason,
    }: {
      professionalId: string;
      date: string;
      reason?: string;
    }) => {
      // Get company_id from user profile
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { error } = await supabase
        .from("blocked_slots")
        .insert({
          professional_id: professionalId,
          company_id: profile.company_id,
          date,
          reason: reason || null,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error("Já existe um bloqueio para esta data");
        }
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["blocked-slots", variables.professionalId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteBlockedSlot = useMutation({
    mutationFn: async (id: string) => {
      // Sempre deletar apenas pelo ID fornecido (remoção seletiva)
      const { error } = await supabase
        .from("blocked_slots")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-slots"] });
      queryClient.invalidateQueries({ queryKey: ["general-blocked-slots"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createGeneralBlockedSlot = useMutation({
    mutationFn: async ({
      dates,
      reason,
      groupId,
    }: {
      dates: string[];
      reason?: string;
      groupId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // Buscar TODOS os profissionais (ativos e inativos)
      const { data: professionals, error: profError } = await supabase
        .from("professionals")
        .select("id")
        .eq("company_id", profile.company_id);

      if (profError) throw profError;

      if (!professionals || professionals.length === 0) {
        throw new Error("Nenhum profissional encontrado");
      }

      // Criar bloqueio para CADA profissional e CADA data
      const blocksToInsert = professionals.flatMap(prof =>
        dates.map(date => ({
          company_id: profile.company_id,
          professional_id: prof.id,
          date,
          reason: reason || null,
          is_general_block: true,
          general_block_group_id: groupId,
        }))
      );

      const { error } = await supabase
        .from("blocked_slots")
        .insert(blocksToInsert);

      if (error) {
        if (error.code === '23505') {
          throw new Error("Já existe um bloqueio para uma ou mais datas");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-slots"] });
      queryClient.invalidateQueries({ queryKey: ["general-blocked-slots"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const syncGeneralBlocks = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // 1. Buscar todos os bloqueios gerais futuros
      const { data: generalBlocks, error: blocksError } = await supabase
        .from("blocked_slots")
        .select("date, reason, general_block_group_id")
        .eq("company_id", profile.company_id)
        .eq("is_general_block", true)
        .gte("date", new Date().toISOString().split('T')[0]);

      if (blocksError) throw blocksError;
      if (!generalBlocks || generalBlocks.length === 0) return 0;

      // 2. Buscar TODOS os profissionais (ativos e inativos)
      const { data: professionals, error: profError } = await supabase
        .from("professionals")
        .select("id")
        .eq("company_id", profile.company_id);

      if (profError) throw profError;
      if (!professionals || professionals.length === 0) return 0;

      // 3. Para cada profissional, verificar bloqueios faltantes
      const blocksToInsert = [];

      for (const prof of professionals) {
        for (const block of generalBlocks) {
          const { data: existing } = await supabase
            .from("blocked_slots")
            .select("id")
            .eq("professional_id", prof.id)
            .eq("date", block.date)
            .eq("general_block_group_id", block.general_block_group_id)
            .maybeSingle();

          if (!existing) {
            blocksToInsert.push({
              company_id: profile.company_id,
              professional_id: prof.id,
              date: block.date,
              reason: block.reason,
              is_general_block: true,
              general_block_group_id: block.general_block_group_id,
            });
          }
        }
      }

      // 4. Inserir bloqueios faltantes
      if (blocksToInsert.length > 0) {
        const { error } = await supabase
          .from("blocked_slots")
          .insert(blocksToInsert);

        if (error) throw error;
      }

      return blocksToInsert.length;
    },
    onSuccess: (count) => {
      if (count && count > 0) {
        toast.success(`${count} bloqueios sincronizados com sucesso`);
      } else {
        toast.success("Todos os profissionais já estão sincronizados");
      }
      queryClient.invalidateQueries({ queryKey: ["blocked-slots"] });
      queryClient.invalidateQueries({ queryKey: ["general-blocked-slots"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });

  return {
    availability,
    isLoading,
    blockedSlots,
    generalBlockedSlots,
    bulkUpdateAvailability,
    createBlockedSlot,
    createGeneralBlockedSlot,
    deleteBlockedSlot,
    syncGeneralBlocks,
  };
}
