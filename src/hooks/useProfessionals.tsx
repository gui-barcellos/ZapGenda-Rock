import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Professional {
  id: string;
  name: string;
  specialty: string | null;
  color: string;
  photo_url: string | null;
  is_active: boolean;
}

interface CreateProfessionalParams {
  name: string;
  specialty?: string;
  isActive?: boolean;
}

export function useProfessionals() {
  const queryClient = useQueryClient();

  const { data: professionals, isLoading } = useQuery({
    queryKey: ["professionals"],
    queryFn: async () => {
      // Get current user's company
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("name");

      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        photo_url: d.photo_url || null
      })) as Professional[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - dados mudam raramente
    gcTime: 10 * 60 * 1000, // 10 minutos em cache
  });

  const createProfessional = useMutation({
    mutationFn: async (params: CreateProfessionalParams) => {
      // Get current user's company
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // Create professional
      const { error } = await supabase
        .from("professionals")
        .insert({
          company_id: profile.company_id,
          name: params.name,
          specialty: params.specialty || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals"] });
      toast.success("Profissional adicionado");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateProfessional = useMutation({
    mutationFn: async ({ 
      id, 
      isActive,
      ...params 
    }: CreateProfessionalParams & { id: string }) => {
      const updateData: any = {
        name: params.name,
        specialty: params.specialty || null,
      };
      
      if (isActive !== undefined) {
        updateData.is_active = isActive;
      }

      const { error } = await supabase
        .from("professionals")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals"] });
      toast.success("Profissional atualizado");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleProfessional = useMutation({
    mutationFn: async (id: string) => {
      // Get current status
      const { data: professional } = await supabase
        .from("professionals")
        .select("is_active")
        .eq("id", id)
        .single();

      if (!professional) throw new Error("Profissional não encontrado");

      // Se estiver desativando, verificar se é o único profissional de algum serviço
      if (professional.is_active) {
        const { data: serviceProfessionals } = await supabase
          .from("service_professionals")
          .select("service_id")
          .eq("professional_id", id);

        const serviceIds = serviceProfessionals?.map(sp => sp.service_id) || [];

        // Para cada serviço, verificar se este é o único profissional ativo
        for (const serviceId of serviceIds) {
          const { data: otherProfessionals } = await supabase
            .from("service_professionals")
            .select("professional_id, professional:professionals!inner(is_active)")
            .eq("service_id", serviceId)
            .neq("professional_id", id);

          const hasOtherActiveProfessionals = otherProfessionals?.some(
            (sp: any) => sp.professional?.is_active
          );

          // Se for o único ativo, desativar o serviço
          if (!hasOtherActiveProfessionals) {
            await supabase
              .from("services")
              .update({ is_active: false })
              .eq("id", serviceId);
          }
        }

        if (serviceIds.length > 0) {
          // Buscar nomes dos serviços afetados
          const { data: services } = await supabase
            .from("services")
            .select("name")
            .in("id", serviceIds);

          const serviceNames = services?.map(s => s.name).join(", ") || "";
          if (serviceNames) {
            toast.warning(`Serviços desativados: ${serviceNames}`);
          }
        }
      }

      // Toggle status
      const { error } = await supabase
        .from("professionals")
        .update({ is_active: !professional.is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Status atualizado");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteProfessional = useMutation({
    mutationFn: async (professionalId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // Excluir vínculos de serviços primeiro
      await supabase
        .from("service_professionals")
        .delete()
        .eq("professional_id", professionalId)
        .eq("company_id", profile.company_id);

      // Excluir disponibilidades
      await supabase
        .from("availability")
        .delete()
        .eq("professional_id", professionalId)
        .eq("company_id", profile.company_id);

      // Excluir bloqueios
      await supabase
        .from("blocked_slots")
        .delete()
        .eq("professional_id", professionalId)
        .eq("company_id", profile.company_id);

      // Excluir o profissional
      const { error } = await supabase
        .from("professionals")
        .delete()
        .eq("id", professionalId)
        .eq("company_id", profile.company_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professionals"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Profissional excluído com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["professionals"] });
  };

  return {
    professionals,
    isLoading,
    createProfessional,
    updateProfessional,
    toggleProfessional,
    deleteProfessional,
    refetch,
  };
}
