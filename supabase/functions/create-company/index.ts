import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase secrets nÃ£o configurados.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticaÃ§Ã£o ausente.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
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
      return new Response(
        JSON.stringify({ error: 'UsuÃ¡rio nÃ£o autenticado.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create Supabase client with Service Role Key for admin operations
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: roleRow, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'superuser')
      .maybeSingle();

    if (roleError || !roleRow) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas superuser pode criar empresas.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { companyData } = await req.json();
    console.log('Creating company:', companyData.name);

    // 1. Create company
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: companyData.name,
        workspace_id: companyData.workspace_id,
        owner_name: companyData.owner_name,
        owner_email: companyData.owner_email,
        owner_whatsapp: companyData.owner_whatsapp,
        owner_cpf: companyData.owner_cpf,
        status: companyData.status,
        trial_start_date: companyData.trial_start_date || null,
        trial_end_date: companyData.trial_end_date || null,
        payment_due_day: companyData.payment_due_day || null,
        free_days_granted: companyData.free_days_granted || 0,
      })
      .select()
      .single();

    if (companyError) {
      console.error('Error creating company:', companyError);
      throw companyError;
    }

    console.log('Company created:', company.id);

    // 2. Create subscription
    const { error: subscriptionError } = await supabaseAdmin
      .from('company_subscriptions')
      .insert({
        company_id: company.id,
        max_users: 2,
        max_professionals: 3,
        max_contacts: 1000,
        max_whatsapp_numbers: 1,
        current_users: 0,
        current_professionals: 0,
        current_contacts: 0,
        current_whatsapp_numbers: 0,
      });

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      throw subscriptionError;
    }

    console.log('Subscription created for company:', company.id);

    // 3. Create admin user with random password (user will set their own via email)
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: companyData.owner_email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: companyData.owner_name,
      },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      if (authError.message.includes('already been registered')) {
        throw new Error('Este email já está cadastrado no sistema. Se você deletou uma empresa recentemente, aguarde alguns instantes e tente novamente.');
      }
      throw authError;
    }

    console.log('Auth user created:', authUser.user.id);

    // 4. Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        company_id: company.id,
        full_name: companyData.owner_name,
        email: companyData.owner_email,
        whatsapp: companyData.owner_whatsapp,
        must_change_password: true,
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      throw profileError;
    }

    console.log('Profile created for user:', authUser.user.id);

    // 5. Create role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        company_id: company.id,
        role: 'admin',
      });

    if (roleError) {
      console.error('Error creating role:', roleError);
      throw roleError;
    }

    console.log('Role created for user:', authUser.user.id);

    // 6. Send password setup email via Resend
    let emailSent = false;
    try {
      const { data: settings, error: settingsError } = await supabaseAdmin
        .from('resend_settings')
        .select('api_key')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (settingsError || !settings?.api_key) {
        console.error('Resend API key not configured:', settingsError);
      } else {
        const appUrl = Deno.env.get('APP_URL')
          || Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovableproject.com')
          || '';

        const redirectTo = appUrl ? `${appUrl}/auth/reset` : undefined;
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: companyData.owner_email,
          options: redirectTo ? { redirectTo } : undefined,
        });

        let actionLink = linkData?.action_link ?? null;

        if (linkError || !actionLink) {
          console.error('Error generating recovery link:', { linkError, linkData, appUrl });
          // Fallback to invite link if recovery link is not generated
          const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email: companyData.owner_email,
            options: redirectTo ? { redirectTo } : undefined,
          });

          if (inviteError || !inviteData?.action_link) {
            console.error('Error generating invite link:', { inviteError, inviteData, appUrl });
          } else {
            actionLink = inviteData.action_link;
          }
        }

        if (actionLink) {
          const resend = new Resend(settings.api_key);
          const { error: emailError } = await resend.emails.send({
            from: 'Marca Pra Mim <onboarding@resend.dev>',
            to: [companyData.owner_email],
            subject: `Defina sua senha - ${companyData.name}`,
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
                      <h1>Bem-vindo ao Marca Pra Mim</h1>
                    </div>
                    <div class="content">
                      <p>Olá, ${companyData.owner_name}!</p>
                      <p>Sua empresa <strong>${companyData.name}</strong> já foi criada.</p>
                      <p>Clique no botão abaixo para definir sua senha de acesso:</p>
                      <a href="${actionLink}" class="button">Definir senha</a>
                      <p style="color: #6b7280; font-size: 12px;">
                        Se você não esperava este e-mail, ignore com segurança.
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
            console.error('Error sending password email:', emailError);
          } else {
            emailSent = true;
          }
        }
      }
    } catch (emailError) {
      console.error('Password email flow failed:', emailError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        company_id: company.id,
        email_sent: emailSent
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-company function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
