import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Auth webhook received:', payload);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Resend API key from database
    const { data: settings, error: settingsError } = await supabaseClient
      .from('resend_settings')
      .select('api_key')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (settingsError || !settings?.api_key) {
      console.error('Resend API key not configured:', settingsError);
      throw new Error('Chave Resend não configurada');
    }

    const resend = new Resend(settings.api_key);

    // Extract data from webhook
    const { event, user, email_data } = payload;
    const { token, token_hash, redirect_to, email_action_type } = email_data || {};

    let emailSubject = '';
    let emailHtml = '';

    // Handle different auth events
    switch (email_action_type) {
      case 'recovery':
        emailSubject = 'Recuperação de Senha - Marca Pra Mim';
        emailHtml = `
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
                  <h1>Recuperação de Senha</h1>
                </div>
                <div class="content">
                  <p>Olá,</p>
                  <p>Você solicitou a recuperação de senha para sua conta no Marca Pra Mim.</p>
                  <p>Clique no botão abaixo para criar uma nova senha:</p>
                  <a href="${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${token_hash}&type=recovery&redirect_to=${redirect_to || ''}" class="button">
                    Redefinir Senha
                  </a>
                  <p>Ou copie e cole este link no seu navegador:</p>
                  <p style="word-break: break-all; color: #6b7280; font-size: 12px;">
                    ${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${token_hash}&type=recovery&redirect_to=${redirect_to || ''}
                  </p>
                  <p style="margin-top: 30px; color: #dc2626; font-weight: 500;">
                    ⚠️ Se você não solicitou esta recuperação, ignore este email.
                  </p>
                </div>
                <div class="footer">
                  <p>© 2025 Marca Pra Mim. Todos os direitos reservados.</p>
                </div>
              </div>
            </body>
          </html>
        `;
        break;

      case 'signup':
        emailSubject = 'Confirme seu email - Marca Pra Mim';
        emailHtml = `
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
                  <h1>Bem-vindo ao Marca Pra Mim!</h1>
                </div>
                <div class="content">
                  <p>Olá,</p>
                  <p>Obrigado por se cadastrar no Marca Pra Mim!</p>
                  <p>Clique no botão abaixo para confirmar seu email:</p>
                  <a href="${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${token_hash}&type=signup&redirect_to=${redirect_to || ''}" class="button">
                    Confirmar Email
                  </a>
                </div>
                <div class="footer">
                  <p>© 2025 Marca Pra Mim. Todos os direitos reservados.</p>
                </div>
              </div>
            </body>
          </html>
        `;
        break;

      default:
        throw new Error(`Email action type not supported: ${email_action_type}`);
    }

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: 'Marca Pra Mim <onboarding@resend.dev>',
      to: [user.email],
      subject: emailSubject,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      throw emailError;
    }

    console.log('Auth email sent successfully to:', user.email);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-auth-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
