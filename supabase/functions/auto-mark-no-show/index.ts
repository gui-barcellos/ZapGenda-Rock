import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getZonedDateParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone);
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUTC - date.getTime();
}

function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = getTimeZoneOffset(utcDate, timeZone);
  return new Date(utcDate.getTime() - offset);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🚀 Starting auto-mark no-show process...');

    // 1. Fetch companies with auto-mark enabled
    const { data: companies, error: companiesError } = await supabase
      .from('company_settings')
      .select('company_id, auto_mark_no_show_hours, timezone')
      .eq('auto_mark_no_show_enabled', true);

    if (companiesError) {
      console.error('❌ Error fetching companies:', companiesError);
      throw companiesError;
    }

    console.log(`📋 Processing ${companies?.length || 0} companies with auto-mark enabled`);

    let totalMarked = 0;

    // 2. Process each company
    for (const company of companies || []) {
      const now = new Date();
      const timeZone = company.timezone || 'America/Sao_Paulo';
      const extraHours = company.auto_mark_no_show_hours || 0;
      
      console.log(`🏢 Processing company: ${company.company_id}, hours threshold: ${extraHours}`);
      
      // 3. Fetch eligible appointments (status 'scheduled' or 'confirmed')
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('id, date, end_time')
        .eq('company_id', company.company_id)
        .in('status', ['scheduled', 'confirmed']);

      if (apptError) {
        console.error(`❌ Error fetching appointments for company ${company.company_id}:`, apptError);
        continue;
      }

      console.log(`  📅 Found ${appointments?.length || 0} scheduled/confirmed appointments`);

      const appointmentsToMark: string[] = [];

      // 4. Check each appointment
      for (const apt of appointments || []) {
        try {
          const appointmentEndUtc = zonedTimeToUtc(apt.date, apt.end_time, timeZone);
          const thresholdTime = new Date(appointmentEndUtc);
          thresholdTime.setHours(thresholdTime.getHours() + extraHours);

          // If current time >= threshold time, mark as no_show
          if (now >= thresholdTime) {
            appointmentsToMark.push(apt.id);
            console.log(`  ⏰ Appointment ${apt.id} eligible: ${apt.date} ${apt.end_time} + ${extraHours}h = ${thresholdTime.toISOString()}`);
          }
        } catch (error) {
          console.error(`  ⚠️ Error processing appointment ${apt.id}:`, error);
        }
      }

      // 5. Update appointments to 'no_show' status
      if (appointmentsToMark.length > 0) {
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ 
            status: 'no_show',
            updated_at: new Date().toISOString()
          })
          .in('id', appointmentsToMark);

        if (updateError) {
          console.error(`❌ Error updating appointments for company ${company.company_id}:`, updateError);
        } else {
          totalMarked += appointmentsToMark.length;
          console.log(`  ✅ Successfully marked ${appointmentsToMark.length} appointments as no_show`);
        }
      } else {
        console.log(`  ℹ️ No appointments to mark for company ${company.company_id}`);
      }
    }

    const message = `✅ Auto-mark completed: ${totalMarked} appointments marked as "Não Compareceu"`;
    console.log(message);

    return new Response(
      JSON.stringify({
        success: true,
        message,
        totalMarked,
        companiesProcessed: companies?.length || 0,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error in auto-mark-no-show function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});


