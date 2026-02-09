import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  color: string;
  is_active: boolean;
  description?: string;
  professionals?: Array<{
    id: string;
    name: string;
    specialty: string | null;
  }>;
}

interface CreateServiceParams {
  name: string;
  duration: number;
  price: number;
  color?: string;
  description?: string;
  isActive?: boolean;
}

export function useServices() {
  const queryClient = useQueryClient();

  const { data: services, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      // Get current user's company
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { data, error } = await supabase
        .from("services")
        .select(`
          *,
          service_professionals (
            professional:professionals (
              id,
              name,
              specialty
            )
          )
        `)
        .eq("company_id", profile.company_id)
        .order("name");

      if (error) throw error;
      
      // Transform data to include professionals array
      const servicesWithProfessionals = data?.map((service: any) => ({
        ...service,
        professionals: service.service_professionals?.map((sp: any) => sp.professional) || []
      })) || [];
      
      return servicesWithProfessionals as Service[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - dados mudam raramente
    gcTime: 10 * 60 * 1000, // 10 minutos em cache
  });

  const createService = useMutation({
    mutationFn: async (params: CreateServiceParams) => {
      // Get current user's company
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // Validate
      if (params.duration <= 0) {
        throw new Error("Duração deve ser maior que zero");
      }
      if (params.price < 0) {
        throw new Error("Preço não pode ser negativo");
      }

      const { error } = await supabase
        .from("services")
        .insert({
          company_id: profile.company_id,
          name: params.name,
          duration: params.duration,
          price: params.price,
          color: params.color || "#10b981",
          description: params.description,
          is_active: params.isActive ?? true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Serviço adicionado");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, ...params }: CreateServiceParams & { id: string }) => {
      // Validate
      if (params.duration <= 0) {
        throw new Error("Duração deve ser maior que zero");
      }
      if (params.price < 0) {
        throw new Error("Preço não pode ser negativo");
      }

      const { error } = await supabase
        .from("services")
        .update({
          name: params.name,
          duration: params.duration,
          price: params.price,
          color: params.color || "#10b981",
          description: params.description,
          is_active: params.isActive ?? true,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Serviço atualizado");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleService = useMutation({
    mutationFn: async (id: string) => {
      // Get current status and check for professionals
      const { data: service } = await supabase
        .from("services")
        .select("is_active")
        .eq("id", id)
        .single();

      if (!service) throw new Error("Serviço não encontrado");

      // Se estiver tentando ativar, verificar se tem profissionais
      if (!service.is_active) {
        const { data: serviceProfessionals } = await supabase
          .from("service_professionals")
          .select("id")
          .eq("service_id", id);

        if (!serviceProfessionals || serviceProfessionals.length === 0) {
          throw new Error("Não é possível ativar um serviço sem profissionais vinculados");
        }
      }

      // Toggle status
      const { error } = await supabase
        .from("services")
        .update({ is_active: !service.is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Status atualizado");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["services"] });
  };

  return {
    services,
    isLoading,
    createService,
    updateService,
    toggleService,
    deleteService: toggleService,
    refetch,
  };
}
