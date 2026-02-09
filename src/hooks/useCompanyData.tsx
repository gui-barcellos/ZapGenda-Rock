import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BusinessHour {
  day: number;
  start: string;
  end: string;
  is_active: boolean;
}

interface SocialMedia {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
  website?: string;
}

interface CompanyData {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  address: string | null;
  has_physical_address: boolean;
  google_maps_link: string | null;
  timezone: string;
  language: string;
  business_hours: BusinessHour[];
  confirmation_hours: number;
  reminder_hours: number;
  payment_methods: string | null;
  alternative_phone: string | null;
  email: string | null;
  social_media: SocialMedia | null;
}

interface UpdateCompanyDataParams {
  name?: string;
  primary_color?: string;
  address?: string;
  has_physical_address?: boolean;
  google_maps_link?: string;
  timezone?: string;
  language?: string;
  confirmation_hours?: number;
  reminder_hours?: number;
  business_hours?: BusinessHour[];
  payment_methods?: string;
  alternative_phone?: string;
  email?: string;
  social_media?: SocialMedia;
}

export function useCompanyData() {
  const queryClient = useQueryClient();

  const { data: companyData, isLoading } = useQuery({
    queryKey: ["company-data"],
    queryFn: async () => {
      // Get current user's company
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // Get company data
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id, name")
        .eq("id", profile.company_id)
        .single();

      if (companyError) throw companyError;

      // Get company settings
      const { data: settings } = await supabase
        .from("company_settings")
        .select(`
          logo_url, 
          primary_color,
          address,
          has_physical_address,
          google_maps_link,
          timezone,
          language,
          business_hours,
          confirmation_hours,
          reminder_hours,
          payment_methods,
          alternative_phone,
          email,
          social_media
        `)
        .eq("company_id", profile.company_id)
        .maybeSingle();

      return {
        id: company.id,
        name: company.name,
        logo_url: settings?.logo_url || null,
        primary_color: settings?.primary_color || null,
        address: settings?.address || null,
        has_physical_address: settings?.has_physical_address ?? true,
        google_maps_link: settings?.google_maps_link || null,
        timezone: settings?.timezone || "America/Sao_Paulo",
        language: settings?.language || "pt-BR",
        business_hours: (settings?.business_hours as unknown as BusinessHour[]) || [],
        confirmation_hours: settings?.confirmation_hours ?? 72,
        reminder_hours: settings?.reminder_hours ?? 24,
        payment_methods: settings?.payment_methods || null,
        alternative_phone: settings?.alternative_phone || null,
        email: settings?.email || null,
        social_media: settings?.social_media as SocialMedia | null,
      } as CompanyData;
    },
  });

  const updateCompanyData = useMutation({
    mutationFn: async (params: UpdateCompanyDataParams) => {
      if (!companyData?.id) throw new Error("Empresa não encontrada");

      // Update company name if provided
      if (params.name !== undefined) {
        const { error: companyError } = await supabase
          .from("companies")
          .update({ name: params.name })
          .eq("id", companyData.id);

        if (companyError) throw companyError;
      }

      // Upsert company settings com novos campos
      if (params.primary_color !== undefined || 
          params.address !== undefined || 
          params.has_physical_address !== undefined ||
          params.google_maps_link !== undefined ||
          params.timezone !== undefined ||
          params.language !== undefined ||
          params.confirmation_hours !== undefined ||
          params.reminder_hours !== undefined ||
          params.business_hours !== undefined ||
          params.payment_methods !== undefined ||
          params.alternative_phone !== undefined ||
          params.email !== undefined ||
          params.social_media !== undefined) {
        
        const updateData: any = { company_id: companyData.id };
        
        if (params.primary_color !== undefined) updateData.primary_color = params.primary_color;
        if (params.address !== undefined) updateData.address = params.address;
        if (params.has_physical_address !== undefined) updateData.has_physical_address = params.has_physical_address;
        if (params.google_maps_link !== undefined) updateData.google_maps_link = params.google_maps_link;
        if (params.timezone !== undefined) updateData.timezone = params.timezone;
        if (params.language !== undefined) updateData.language = params.language;
        if (params.confirmation_hours !== undefined) updateData.confirmation_hours = params.confirmation_hours;
        if (params.reminder_hours !== undefined) updateData.reminder_hours = params.reminder_hours;
        if (params.business_hours !== undefined) updateData.business_hours = params.business_hours;
        if (params.payment_methods !== undefined) updateData.payment_methods = params.payment_methods;
        if (params.alternative_phone !== undefined) updateData.alternative_phone = params.alternative_phone;
        if (params.email !== undefined) updateData.email = params.email;
        if (params.social_media !== undefined) updateData.social_media = params.social_media;
        
        const { error: settingsError } = await supabase
          .from("company_settings")
          .upsert(updateData, { onConflict: 'company_id' });

        if (settingsError) throw settingsError;
      }
      
      return params;
    },
    onSuccess: async (params) => {
      // Optimistic update: apply changes immediately to cache
      queryClient.setQueryData(["company-data"], (oldData: CompanyData | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          name: params.name ?? oldData.name,
          address: params.address ?? oldData.address,
          has_physical_address: params.has_physical_address ?? oldData.has_physical_address,
          google_maps_link: params.google_maps_link ?? oldData.google_maps_link,
          timezone: params.timezone ?? oldData.timezone,
          language: params.language ?? oldData.language,
          business_hours: params.business_hours ?? oldData.business_hours,
          confirmation_hours: params.confirmation_hours ?? oldData.confirmation_hours,
          reminder_hours: params.reminder_hours ?? oldData.reminder_hours,
          primary_color: params.primary_color ?? oldData.primary_color,
          payment_methods: params.payment_methods ?? oldData.payment_methods,
          alternative_phone: params.alternative_phone ?? oldData.alternative_phone,
          email: params.email ?? oldData.email,
          social_media: params.social_media ?? oldData.social_media,
        };
      });

      // Update browser title immediately if name changed
      if (params.name) {
        document.title = `${params.name} - Gestão de Agenda`;
      }
      
      // Apply color immediately
      if (params.primary_color) {
        const hex = params.primary_color.replace(/^#/, '');
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }
        h = Math.round(h * 360);
        s = Math.round(s * 100);
        l = Math.round(l * 100);
        const hslValue = `${h} ${s}% ${l}%`;
        document.documentElement.style.setProperty('--primary', hslValue);
        document.documentElement.style.setProperty('--ring', hslValue);
        document.documentElement.style.setProperty('--sidebar-primary', hslValue);
      }

      // Invalidate and refetch to sync with server
      await queryClient.invalidateQueries({ queryKey: ["company-data"] });
      await queryClient.refetchQueries({ 
        queryKey: ["company-data"], 
        exact: true,
        type: 'active'
      });
      
      toast.success("Dados da empresa atualizados");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      if (!companyData?.id) throw new Error("Empresa não encontrada");

      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error("Arquivo deve ser uma imagem");
      }
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("Arquivo deve ter no máximo 2MB");
      }

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${companyData.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      // Upsert company_settings with new logo URL
      const { error: updateError } = await supabase
        .from('company_settings')
        .upsert({ 
          company_id: companyData.id,
          logo_url: publicUrl 
        }, {
          onConflict: 'company_id'
        });

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["company-data"] });
      await queryClient.refetchQueries({ queryKey: ["company-data"] });
      toast.success("Logo atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeLogo = useMutation({
    mutationFn: async () => {
      if (!companyData?.id) throw new Error("Empresa não encontrada");

      // Update company_settings to remove logo URL
      const { error } = await supabase
        .from('company_settings')
        .update({ logo_url: null })
        .eq('company_id', companyData.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-data"] });
      toast.success("Logo removido");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    companyData,
    isLoading,
    updateCompanyData,
    uploadLogo,
    removeLogo,
  };
}
