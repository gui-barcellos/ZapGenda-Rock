import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidatePayload {
  action: "validate";
  token: string;
}

interface AcceptPayload {
  action: "accept";
  token: string;
  fullName: string;
  password: string;
  whatsapp?: string;
}

type InvitePayload = ValidatePayload | AcceptPayload;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase não configurado corretamente.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload: InvitePayload = await req.json();
    const token = payload.token?.trim();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token do convite é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("user_invites")
      .select("id, email, role, company_id, status, expires_at, invited_by, companies(name)")
      .eq("invite_token", token)
      .maybeSingle();

    if (inviteError) {
      console.error("Error fetching invite:", inviteError);
      throw new Error("Não foi possível validar o convite.");
    }

    if (!invite) {
      return new Response(JSON.stringify({ error: "Convite não encontrado." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isExpired = !!invite.expires_at && new Date(invite.expires_at).getTime() < Date.now();

    if (payload.action === "validate") {
      let status = invite.status;
      if (status === "pending" && isExpired) {
        status = "expired";
      }

      return new Response(
        JSON.stringify({
          valid: status === "pending" && !isExpired,
          invite: {
            email: invite.email,
            role: invite.role,
            companyName: invite.companies?.name ?? "Empresa",
            status,
            expiresAt: invite.expires_at,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (invite.status !== "pending") {
      return new Response(JSON.stringify({ error: "Este convite já foi utilizado ou cancelado." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isExpired) {
      await supabaseAdmin
        .from("user_invites")
        .update({ status: "expired" })
        .eq("id", invite.id);

      return new Response(JSON.stringify({ error: "Este convite expirou." }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullName = payload.fullName?.trim();
    const password = payload.password;
    const whatsapp = payload.whatsapp?.trim() || null;

    if (!fullName || !password) {
      return new Response(JSON.stringify({ error: "Nome e senha são obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "A senha precisa ter pelo menos 8 caracteres." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createUserError || !createdUser.user) {
      console.error("Error creating invited user:", createUserError);
      const message = createUserError?.message?.includes("already been registered")
        ? "Este email já está cadastrado. Faça login ou recupere sua senha para acessar."
        : createUserError?.message || "Não foi possível criar sua conta.";

      return new Response(JSON.stringify({ error: message }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = createdUser.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      company_id: invite.company_id,
      full_name: fullName,
      email: invite.email,
      whatsapp,
      must_change_password: false,
      is_active: true,
    });

    if (profileError) {
      console.error("Error creating invite profile:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Não foi possível criar o perfil do usuário.");
    }

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      company_id: invite.company_id,
      role: invite.role,
    });

    if (roleError) {
      console.error("Error creating invite role:", roleError);
      await supabaseAdmin.from("profiles").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Não foi possível vincular o usuário à empresa.");
    }

    const { error: updateInviteError } = await supabaseAdmin
      .from("user_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    if (updateInviteError) {
      console.error("Error updating invite status:", updateInviteError);
      throw new Error("Conta criada, mas não foi possível finalizar o convite.");
    }

    return new Response(
      JSON.stringify({
        success: true,
        email: invite.email,
        companyName: invite.companies?.name ?? "Empresa",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in accept-user-invite:", error);
    const message = error instanceof Error ? error.message : "Erro ao aceitar convite.";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
