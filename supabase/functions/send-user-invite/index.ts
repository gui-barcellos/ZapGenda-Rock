import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  email: string;
  role: string;
  companyId: string;
  invitedBy: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, role, companyId, invitedBy }: InviteRequest = await req.json();

    console.log('Sending invite to:', email, 'for company:', companyId);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get Resend API key from database
    const { data: settings, error: settingsError } = await supabaseClient
      .from('resend_settings')
      .select('api_key')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (settingsError || !settings?.api_key) {
      console.error('Resend API key not configured:', settingsError);
      throw new Error('Chave Resend não configurada. Configure em Configurações do SuperUser.');
    }

    const resend = new Resend(settings.api_key);

    // 2. Get company data
    const { data: company, error: companyError } = await supabaseClient
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    if (companyError) {
      console.error('Error fetching company:', companyError);
      throw new Error('Empresa não encontrada');
    }

    // 3. Get invite token (already created by the frontend via user_invites table)
    const { data: invite, error: inviteError } = await supabaseClient
      .from('user_invites')
      .select('invite_token')
      .eq('company_id', companyId)
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      console.error('Error fetching invite:', inviteError);
      throw new Error('Convite não encontrado');
    }

    // 4. Build invite link
    const appUrl = Deno.env.get('APP_URL')
      || Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovableproject.com')
      || '';
    const inviteLink = `${appUrl}/accept-invite?token=${invite.invite_token}`;

    // 5. Send email
    const roleLabel = role === 'admin' ? 'Administrador' : 'Atendente';

    const { error: emailError } = await resend.emails.send({
      from: 'Marca Pra Mim <onboarding@resend.dev>',
      to: [email],
      subject: `Convite para ${company.name} - Marca Pra Mim`,
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
              .info-box { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Você foi convidado!</h1>
              </div>
              <div class="content">
                <p>Olá,</p>
                <p>Você foi convidado para fazer parte da equipe da <strong>${company.name}</strong> no Marca Pra Mim.</p>
                
                <div class="info-box">
                  <strong>Sua função:</strong> ${roleLabel}
                </div>
                
                <p>Clique no botão abaixo para criar sua conta e começar:</p>
                
                <a href="${inviteLink}" class="button">
                  Aceitar Convite
                </a>
                
                <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                  Este convite é pessoal e intransferível. Se você não esperava este email, pode ignorá-lo com segurança.
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
      console.error('Error sending email:', emailError);
      throw new Error(`Erro ao enviar email: ${emailError.message}`);
    }

    console.log('Invite email sent successfully to:', email);

    return new Response(
      JSON.stringify({ success: true, message: 'Convite enviado com sucesso' }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in send-user-invite:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao enviar convite' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
