import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CompanyUser {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string | null;
  role: string;
  is_active: boolean;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  invited_by_name: string;
  created_at: string;
  expires_at: string;
  status: string;
}

export function useCompanyUsers() {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["company-users"],
    queryFn: async () => {
      // Get current user's company
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) {
        console.error("Company ID not found for user");
        throw new Error("Empresa não encontrada");
      }

      // Get all users from this company
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, whatsapp, is_active")
        .eq("company_id", profile.company_id);

      if (profilesError) {
        console.error("Error fetching company users:", profilesError);
        throw profilesError;
      }

      if (!profiles || profiles.length === 0) {
        return [];
      }

      // Get roles for all users
      const userIds = profiles.map(p => p.id);
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      if (rolesError) {
        console.error("Error fetching user roles:", rolesError);
        throw rolesError;
      }

      console.log("Fetched profiles:", profiles);
      console.log("Fetched roles:", roles);

      // Combine profiles with their roles
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      return profiles.map((p) => ({
        id: p.id,
        full_name: p.full_name || p.email,
        email: p.email,
        whatsapp: p.whatsapp,
        role: rolesMap.get(p.id) || "attendant",
        is_active: p.is_active ?? true,
      })) as CompanyUser[];
    },
  });

  const { data: pendingInvites } = useQuery({
    queryKey: ["pending-invites"],
    queryFn: async () => {
      // Get current user's company
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from("user_invites" as any)
        .select(`
          id,
          email,
          role,
          created_at,
          expires_at,
          status,
          invited_by:profiles!user_invites_invited_by_fkey(full_name)
        `)
        .eq("company_id", profile.company_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) return [];

      return (data || []).map((invite: any) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        invited_by_name: invite.invited_by?.full_name || "Desconhecido",
        created_at: invite.created_at,
        expires_at: invite.expires_at,
        status: invite.status,
      })) as PendingInvite[];
    },
  });

  const inviteUser = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      // Get current user's company
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id, id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // Create invite in database
      const { error: inviteError } = await supabase
        .from("user_invites" as any)
        .insert({
          company_id: profile.company_id,
          email,
          role,
          invited_by: profile.id,
        });

      if (inviteError) {
        if (inviteError.code === '23505') {
          throw new Error("Já existe um convite pendente para este email");
        }
        throw inviteError;
      }

      // Call edge function to send email
      const { error: emailError } = await supabase.functions.invoke('send-user-invite', {
        body: {
          email,
          role,
          companyId: profile.company_id,
          invitedBy: profile.id,
        },
      });

      if (emailError) {
        console.error('Error sending invite email:', emailError);
        // Don't throw - invite was created, just email failed
        toast.warning("Convite criado, mas houve erro ao enviar o email");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
      toast.success("Convite enviado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ 
      userId, 
      newRole, 
      password 
    }: { 
      userId: string; 
      newRole: string; 
      password: string;
    }) => {
      // Validate password
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.email) {
        throw new Error("Usuário não autenticado");
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: session.session.user.email,
        password: password,
      });

      if (authError) {
        throw new Error("Senha incorreta");
      }

      // Get current user's company
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", session.session.user.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // Update user role
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole as any })
        .eq("user_id", userId)
        .eq("company_id", profile.company_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
      toast.success("Permissão atualizada");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleUserStatus = useMutation({
    mutationFn: async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", userId)
        .single();

      if (!profile) throw new Error("Usuário não encontrado");

      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !profile.is_active })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
      toast.success("Status atualizado");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      // Get current user's company
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!currentProfile?.company_id) throw new Error("Empresa não encontrada");

      // Validar que não é o owner
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .single();

      if (!profile) throw new Error("Usuário não encontrado");

      const { data: company } = await supabase
        .from("companies")
        .select("owner_email")
        .eq("id", currentProfile.company_id)
        .single();

      if (company?.owner_email === profile.email) {
        throw new Error("Não é possível excluir o proprietário da empresa");
      }

      // Excluir de user_roles
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (roleError) throw roleError;

      // Excluir de profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
      toast.success("Usuário excluído com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const cancelInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("user_invites" as any)
        .delete()
        .eq("id", inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
      toast.success("Convite cancelado");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateUserData = useMutation({
    mutationFn: async ({ 
      userId, 
      full_name, 
      email, 
      whatsapp 
    }: { 
      userId: string; 
      full_name: string; 
      email: string; 
      whatsapp?: string 
    }) => {
      // Get the old email before updating
      const { data: oldProfile } = await supabase
        .from("profiles")
        .select("email, company_id")
        .eq("id", userId)
        .single();

      if (!oldProfile) throw new Error("Usuário não encontrado");

      // Update profile data
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          full_name, 
          email, 
          whatsapp: whatsapp || null 
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // If email changed and user is the owner, update company.owner_email
      if (oldProfile.email !== email && oldProfile.company_id) {
        const { data: company } = await supabase
          .from("companies")
          .select("owner_email")
          .eq("id", oldProfile.company_id)
          .single();

        if (company?.owner_email === oldProfile.email) {
          const { error: companyError } = await supabase
            .from("companies")
            .update({ owner_email: email })
            .eq("id", oldProfile.company_id);

          if (companyError) throw companyError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
      toast.success("Dados atualizados com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["company-users"] });
    queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
  };

  return {
    users,
    isLoading,
    pendingInvites,
    inviteUser,
    updateUserRole,
    updateUserData,
    toggleUserStatus,
    deleteUser,
    cancelInvite,
    resendInvite: inviteUser,
    refetch,
  };
}
