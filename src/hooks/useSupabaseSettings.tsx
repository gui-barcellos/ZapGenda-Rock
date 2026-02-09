import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SupabaseSettingsRow {
  project_id: string;
  project_url: string;
  publishable_key: string;
  access_token?: string | null;
}

export function useSupabaseSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["supabase-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supabase_settings")
        .select("project_id, project_url, publishable_key, access_token")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SupabaseSettingsRow | null;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async ({
      projectId,
      projectUrl,
      publishableKey,
      accessToken,
      password,
    }: {
      projectId: string;
      projectUrl: string;
      publishableKey: string;
      accessToken?: string;
      password: string;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.email) {
        throw new Error("Usuario nao autenticado");
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: session.session.user.email,
        password: password,
      });

      if (authError) {
        throw new Error("Senha incorreta");
      }

      if (!projectUrl.startsWith("https://") || !projectUrl.includes(".supabase.co")) {
        throw new Error("Project URL invalida. Use https://...supabase.co");
      }

      const { data: existingRow } = await supabase
        .from("supabase_settings")
        .select("access_token")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const storedToken = existingRow?.access_token ?? null;
      const normalizedToken = accessToken && accessToken.trim().length > 0 ? accessToken.trim() : storedToken;

      await supabase.from("supabase_settings").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const { error } = await supabase.from("supabase_settings").insert({
        project_id: projectId,
        project_url: projectUrl,
        publishable_key: publishableKey,
        access_token: normalizedToken,
        updated_by: session.session.user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-settings"] });
      toast.success("Configuracao do Supabase atualizada");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    settings,
    isLoading,
    updateSettings,
  };
}
