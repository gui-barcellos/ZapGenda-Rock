import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ServiceProfessional {
  id: string;
  service_id: string;
  professional_id: string;
  professional?: {
    id: string;
    name: string;
    specialty: string | null;
  };
}

export function useServiceProfessionals(serviceId?: string) {
  const queryClient = useQueryClient();

  const { data: serviceProfessionals, isLoading } = useQuery({
    queryKey: ["service-professionals", serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      const { data, error } = await supabase
        .from("service_professionals")
        .select(`
          id,
          service_id,
          professional_id,
          professional:professionals (
            id,
            name,
            specialty
          )
        `)
        .eq("service_id", serviceId);
      if (error) throw error;
      return data as ServiceProfessional[];
    },
    enabled: !!serviceId,
  });

  const linkProfessionals = useMutation({
    mutationFn: async ({
      serviceId,
      professionalIds,
    }: {
      serviceId: string;
      professionalIds: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // Deletar vínculos antigos
      await supabase
        .from("service_professionals")
        .delete()
        .eq("service_id", serviceId);

      // Se não há profissionais, desativar o serviço
      if (professionalIds.length === 0) {
        await supabase
          .from("services")
          .update({ is_active: false })
          .eq("id", serviceId);
        
        toast.warning("Serviço desativado (sem profissionais vinculados)");
        return;
      }

      // Inserir novos vínculos
      const inserts = professionalIds.map(profId => ({
        service_id: serviceId,
        professional_id: profId,
        company_id: profile.company_id,
      }));

      const { error } = await supabase
        .from("service_professionals")
        .insert(inserts);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-professionals"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    serviceProfessionals,
    isLoading,
    linkProfessionals,
  };
}
