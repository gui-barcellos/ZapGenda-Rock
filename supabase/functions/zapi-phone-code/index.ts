import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      throw new Error("Usuario nao autenticado");
    }

    const { connection_id, phone } = await req.json();
    if (!connection_id || !phone) {
      throw new Error("connection_id e phone sao obrigatorios");
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", userData.user.id)
      .single();

    if (!profile?.company_id) {
      throw new Error("Empresa nao encontrada");
    }

    const { data: connection } = await supabaseAdmin
      .from("whatsapp_connections")
      .select("id, company_id, z_api_instance_id, z_api_token")
      .eq("id", connection_id)
      .eq("company_id", profile.company_id)
      .single();

    if (!connection) {
      throw new Error("Conexao nao encontrada");
    }

    const { data: zapiSettings } = await supabaseAdmin
      .from("zapi_settings")
      .select("client_token")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    const clientToken = zapiSettings?.client_token || null;

    const url = `https://api.z-api.io/instances/${connection.z_api_instance_id}/token/${connection.z_api_token}/phone-code/${encodeURIComponent(phone)}`;

    const response = await fetch(url, {
      headers: clientToken ? { "Client-Token": clientToken } : undefined,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "Erro ao solicitar codigo");
    }

    return new Response(
      JSON.stringify({ code: data?.value || data?.code || data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
