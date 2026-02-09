import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    // Create Supabase client with Service Role Key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { companyId, password, userEmail } = await req.json();
    console.log('Deleting company:', companyId);

    // 1. Validate superuser password
    const { error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: userEmail,
      password: password,
    });

    if (authError) {
      console.error('Authentication failed:', authError);
      throw new Error('Senha incorreta');
    }

    console.log('Password validated for:', userEmail);

    // 2. Get all users associated with this company
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('company_id', companyId);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} users to delete`);

    // 3. Delete in cascade for each user
    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        const userId = profile.id;

        // 3.1. Delete user_roles
        const { error: rolesError } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        if (rolesError) {
          console.error('Error deleting roles for user:', userId, rolesError);
        }

        // 3.2. Delete profiles
        const { error: profileDeleteError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (profileDeleteError) {
          console.error('Error deleting profile:', userId, profileDeleteError);
        }

        // 3.3. Delete auth user
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authDeleteError) {
          console.error('Error deleting auth user:', userId, authDeleteError);
        } else {
          console.log('Deleted auth user:', userId);
        }
      }
    }

    // 4. Delete company_subscriptions
    const { error: subscriptionError } = await supabaseAdmin
      .from('company_subscriptions')
      .delete()
      .eq('company_id', companyId);

    if (subscriptionError) {
      console.error('Error deleting subscription:', subscriptionError);
    } else {
      console.log('Deleted subscription for company:', companyId);
    }

    // 5. Delete company (this will cascade to related tables with foreign keys)
    const { error: companyError } = await supabaseAdmin
      .from('companies')
      .delete()
      .eq('id', companyId);

    if (companyError) {
      console.error('Error deleting company:', companyError);
      throw companyError;
    }

    console.log('Company deleted successfully:', companyId);

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in delete-company function:', error);
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
