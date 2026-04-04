import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId } = await req.json();
    if (!companyId) {
      return new Response(JSON.stringify({ error: "companyId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Supabase secrets não configurados" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Token de autenticação ausente" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: roleRow, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "superuser")
      .maybeSingle();

    if (roleError || !roleRow) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("resend_settings")
      .select("api_key")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (settingsError || !settings?.api_key) {
      throw new Error("Chave Resend não configurada");
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("name, owner_email, owner_name")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      throw new Error("Empresa não encontrada");
    }

    const appUrl = Deno.env.get("APP_URL")
      || Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovableproject.com")
      || "";

    const redirectTo = appUrl ? `${appUrl}/auth/reset` : undefined;
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: company.owner_email,
      options: redirectTo ? { redirectTo } : undefined,
    });

    let actionLink = linkData?.action_link ?? null;

    if (linkError || !actionLink) {
      console.error("Erro ao gerar link de recovery:", { linkError, linkData, appUrl });
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email: company.owner_email,
        options: redirectTo ? { redirectTo } : undefined,
      });

      if (inviteError || !inviteData?.action_link) {
        console.error("Erro ao gerar link de invite:", { inviteError, inviteData, appUrl });
      } else {
        actionLink = inviteData.action_link;
      }
    }

    if (!actionLink) {
      throw new Error("Erro ao gerar link de senha");
    }

    const resend = new Resend(settings.api_key);
    const { error: emailError } = await resend.emails.send({
      from: "Marca Pra Mim <onboarding@resend.dev>",
      to: [company.owner_email],
      subject: `Defina sua senha - ${company.name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(to right, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Defina sua senha</h1>
              </div>
              <div class="content">
                <p>Olá, ${company.owner_name || "Responsável"}!</p>
                <p>Use o botão abaixo para definir uma nova senha de acesso ao ${company.name}.</p>
                <a href="${actionLink}" class="button">Definir senha</a>
                <p style="color: #6b7280; font-size: 12px;">
                  Se você não solicitou este e-mail, ignore com segurança.
                </p>
              </div>
              <div class="footer">
                <p>© 2025 Marca Pra Mim. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (emailError) {
      throw new Error(`Erro ao enviar email: ${emailError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Erro ao enviar email" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
