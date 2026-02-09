import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('ðŸ”„ [CRON] Iniciando envio de mensagens automÃ¡ticas...');
    const startTime = Date.now();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let totalSent = 0;
    let totalFailed = 0;

    // 1. CONFIRMAÃ‡ÃƒO E LEMBRETE DE AGENDAMENTO
    console.log('ðŸ“… Processando confirmaÃ§Ãµes de agendamento...');
    const confirmationResult = await sendAppointmentConfirmations(supabaseClient);
    totalSent += confirmationResult.sent;
    totalFailed += confirmationResult.failed;

    console.log('ðŸ“… Processando lembretes de agendamento...');
    const reminderResult = await sendAppointmentReminders(supabaseClient);
    totalSent += reminderResult.sent;
    totalFailed += reminderResult.failed;

    // 2. FOLLOW-UP PÃ“S-ATENDIMENTO
    console.log('âœ… Processando follow-up de atendimentos...');
    const postAttendedResult = await sendPostAttendedFollowups(supabaseClient);
    totalSent += postAttendedResult.sent;
    totalFailed += postAttendedResult.failed;

    // 3. FOLLOW-UP DE FALTA
    console.log('âŒ Processando follow-up de faltas...');
    const postMissedResult = await sendPostMissedFollowups(supabaseClient);
    totalSent += postMissedResult.sent;
    totalFailed += postMissedResult.failed;

    // 4. LEMBRETES DE RETORNO
    console.log('ðŸ”„ Processando lembretes de retorno...');
    const returnResult = await sendReturnReminders(supabaseClient);
    totalSent += returnResult.sent;
    totalFailed += returnResult.failed;

    // 5. MENSAGENS DE ANIVERSÃRIO
    console.log('ðŸŽ‚ Processando mensagens de aniversÃ¡rio...');
    const birthdayResult = await sendBirthdayMessages(supabaseClient);
    totalSent += birthdayResult.sent;
    totalFailed += birthdayResult.failed;

    const duration = Date.now() - startTime;

    // Log resultado
    await supabaseClient
      .from('system_logs')
      .insert({
        source: 'send-scheduled-messages',
        log_type: 'cron_execution',
        severity: 'info',
        message: `Mensagens automÃ¡ticas concluÃ­das: ${totalSent} enviadas, ${totalFailed} falhas`,
        metadata: {
          total_sent: totalSent,
          total_failed: totalFailed,
          duration_ms: duration,
          breakdown: {
            confirmations: confirmationResult,
            reminders: reminderResult,
            post_attended: postAttendedResult,
            post_missed: postMissedResult,
            return_reminders: returnResult,
            birthdays: birthdayResult,
          },
        },
      });

    console.log(`âœ… [CRON] Mensagens automÃ¡ticas concluÃ­das: ${totalSent} enviadas, ${totalFailed} falhas (${duration}ms)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        total_sent: totalSent, 
        total_failed: totalFailed,
        duration_ms: duration 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('âŒ Erro no cron de mensagens automÃ¡ticas:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
const DEFAULT_LOCALE = 'pt-BR';

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

function getDateStringInZone(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatDateForCompany(dateStr: string, timeZone: string, locale: string) {
  const date = zonedTimeToUtc(dateStr, '00:00', timeZone);
  return new Intl.DateTimeFormat(locale, { timeZone }).format(date);
}

function formatWeekdayForCompany(dateStr: string, timeZone: string, locale: string) {
  const date = zonedTimeToUtc(dateStr, '00:00', timeZone);
  return new Intl.DateTimeFormat(locale, { timeZone, weekday: 'long' }).format(date);
}

function formatTimeForCompany(timeStr: string) {
  return timeStr.substring(0, 5);
}

function applyTemplate(template: string, data: Record<string, string>) {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, key) => {
    const normalized = key.trim();
    return data[normalized] ?? '';
  });
}

async function getCompanyConnection(supabaseClient: any, companyId: string) {
  const { data: connection } = await supabaseClient
    .from('whatsapp_connections')
    .select('id, is_connected, is_primary')
    .eq('company_id', companyId)
    .order('is_primary', { ascending: false })
    .order('is_connected', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!connection || !connection.is_connected) {
    return null;
  }

  return connection;
}

async function getOrCreateConversation(
  supabaseClient: any,
  companyId: string,
  contactId: string,
  whatsappConnectionId: string
) {
  const { data: existing } = await supabaseClient
    .from('conversations')
    .select('id')
    .eq('contact_id', contactId)
    .eq('whatsapp_connection_id', whatsappConnectionId)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await supabaseClient
    .from('conversations')
    .insert({
      company_id: companyId,
      contact_id: contactId,
      whatsapp_connection_id: whatsappConnectionId,
      status: 'ai',
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw error;
  return created.id;
}

async function sendMessage(
  supabaseClient: any,
  params: { phone: string; message: string; companyId: string; contactId: string }
) {
  const { phone, message, companyId, contactId } = params;
  const connection = await getCompanyConnection(supabaseClient, companyId);
  if (!connection) {
    return { success: false, error: 'whatsapp_not_connected' };
  }

  const conversationId = await getOrCreateConversation(
    supabaseClient,
    companyId,
    contactId,
    connection.id
  );

  const { data, error } = await supabaseClient.functions.invoke('zapi-send-message', {
    body: {
      whatsappConnectionId: connection.id,
      phone,
      message,
      conversationId,
      contactId,
    },
  });

  if (error || !data?.success) {
    return { success: false, error: error?.message || data?.error || 'send_failed' };
  }

  return { success: true };
}

function shouldSkipForLateCreation(appointmentStartUtc: Date, createdAt: string) {
  const created = new Date(createdAt);
  const diffHours = (appointmentStartUtc.getTime() - created.getTime()) / (1000 * 60 * 60);
  return diffHours < 24;
}

async function fetchCompanySettingsMap(supabaseClient: any, companyIds: string[]) {
  const { data } = await supabaseClient
    .from('company_settings')
    .select('company_id, timezone, language, alternative_phone')
    .in('company_id', companyIds);
  return new Map((data || []).map((c: any) => [c.company_id, c]));
}

async function sendAppointmentConfirmations(supabaseClient: any) {
  let sent = 0;
  let failed = 0;

  try {
    const { data: companies } = await supabaseClient
      .from('company_settings')
      .select('company_id, confirmation_hours, reminder_hours, pre_appointment_hours, send_confirmation_messages, timezone, language')
      .eq('send_confirmation_messages', true);

    if (!companies || companies.length === 0) return { sent, failed };

    const companyIds = companies.map((c: any) => c.company_id);
    const { data: companyRows } = await supabaseClient
      .from('companies')
      .select('id, name, owner_whatsapp')
      .in('id', companyIds);
    const companyNameById = new Map((companyRows || []).map((c: any) => [c.id, c.name]));
    const companyPhoneById = new Map((companyRows || []).map((c: any) => [c.id, c.owner_whatsapp]));
    const companySettingsById = await fetchCompanySettingsMap(supabaseClient, companyIds);

    for (const company of companies) {
      const timeZone = company.timezone || DEFAULT_TIMEZONE;
      const locale = company.language || DEFAULT_LOCALE;
      const hoursBeforeInt = company.confirmation_hours ?? company.pre_appointment_hours ?? 72;

      const targetTime = new Date();
      targetTime.setHours(targetTime.getHours() + hoursBeforeInt);
      const targetDate = getDateStringInZone(targetTime, timeZone);

      const { data: appointments } = await supabaseClient
        .from('appointments')
        .select(`
          id,
          company_id,
          contact_id,
          professional_id,
          service_id,
          date,
          start_time,
          created_at,
          contacts!inner(id, name, phone),
          professionals!inner(id, name),
          services!inner(id, name)
        `)
        .eq('company_id', company.company_id)
        .eq('date', targetDate)
        .in('status', ['scheduled', 'confirmed'])
        .is('confirmation_sent_at', null);

      if (!appointments || appointments.length === 0) continue;

      const { data: template } = await supabaseClient
        .from('auto_message_templates')
        .select('content')
        .eq('company_id', company.company_id)
        .eq('message_type', 'appointment_confirmation')
        .eq('is_active', true)
        .single();

      if (!template) continue;

      for (const apt of appointments) {
        try {
          if (apt.created_at) {
            const appointmentStartUtc = zonedTimeToUtc(apt.date, apt.start_time, timeZone);
            if (shouldSkipForLateCreation(appointmentStartUtc, apt.created_at)) {
              continue;
            }
          }

          const settings = companySettingsById.get(company.company_id) || {};
          const companyPhone = settings.alternative_phone || companyPhoneById.get(company.company_id) || '';
          const message = applyTemplate(template.content, {
            client_name: apt.contacts?.name || '',
            company_name: companyNameById.get(company.company_id) || '',
            date: formatDateForCompany(apt.date, timeZone, locale),
            weekday: formatWeekdayForCompany(apt.date, timeZone, locale),
            time: formatTimeForCompany(apt.start_time),
            professional_name: apt.professionals?.name || '',
            service_name: apt.services?.name || '',
            company_phone: companyPhone,
          });

          const sendResult = await sendMessage(supabaseClient, {
            phone: apt.contacts.phone,
            message,
            companyId: company.company_id,
            contactId: apt.contact_id,
          });

          if (sendResult.success) {
            await supabaseClient
              .from('appointments')
              .update({ confirmation_sent: true, confirmation_sent_at: new Date().toISOString() })
              .eq('id', apt.id);

            sent++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error('Erro ao enviar confirmaÃ§Ã£o de agendamento:', err);
          failed++;
        }
      }
    }
  } catch (error) {
    console.error('Erro no processamento de confirmaÃ§Ãµes de agendamento:', error);
  }

  return { sent, failed };
}

async function sendAppointmentReminders(supabaseClient: any) {
  let sent = 0;
  let failed = 0;

  try {
    const { data: companies } = await supabaseClient
      .from('company_settings')
      .select('company_id, reminder_hours, pre_appointment_hours, send_confirmation_messages, timezone, language')
      .eq('send_confirmation_messages', true);

    if (!companies || companies.length === 0) return { sent, failed };

    const companyIds = companies.map((c: any) => c.company_id);
    const { data: companyRows } = await supabaseClient
      .from('companies')
      .select('id, name, owner_whatsapp')
      .in('id', companyIds);
    const companyNameById = new Map((companyRows || []).map((c: any) => [c.id, c.name]));
    const companyPhoneById = new Map((companyRows || []).map((c: any) => [c.id, c.owner_whatsapp]));
    const companySettingsById = await fetchCompanySettingsMap(supabaseClient, companyIds);

    for (const company of companies) {
      const timeZone = company.timezone || DEFAULT_TIMEZONE;
      const locale = company.language || DEFAULT_LOCALE;
      const hoursBeforeInt = company.reminder_hours ?? 24;

      const targetTime = new Date();
      targetTime.setHours(targetTime.getHours() + hoursBeforeInt);
      const targetDate = getDateStringInZone(targetTime, timeZone);

      const { data: appointments } = await supabaseClient
        .from('appointments')
        .select(`
          id,
          company_id,
          contact_id,
          professional_id,
          service_id,
          date,
          start_time,
          created_at,
          contacts!inner(id, name, phone),
          professionals!inner(id, name),
          services!inner(id, name)
        `)
        .eq('company_id', company.company_id)
        .eq('date', targetDate)
        .in('status', ['scheduled', 'confirmed'])
        .is('reminder_sent_at', null);

      if (!appointments || appointments.length === 0) continue;

      const { data: template } = await supabaseClient
        .from('auto_message_templates')
        .select('content')
        .eq('company_id', company.company_id)
        .eq('message_type', 'appointment_reminder')
        .eq('is_active', true)
        .single();

      if (!template) continue;

      for (const apt of appointments) {
        try {
          if (apt.created_at) {
            const appointmentStartUtc = zonedTimeToUtc(apt.date, apt.start_time, timeZone);
            if (shouldSkipForLateCreation(appointmentStartUtc, apt.created_at)) {
              continue;
            }
          }

          const settings = companySettingsById.get(company.company_id) || {};
          const companyPhone = settings.alternative_phone || companyPhoneById.get(company.company_id) || '';
          const message = applyTemplate(template.content, {
            client_name: apt.contacts?.name || '',
            company_name: companyNameById.get(company.company_id) || '',
            date: formatDateForCompany(apt.date, timeZone, locale),
            weekday: formatWeekdayForCompany(apt.date, timeZone, locale),
            time: formatTimeForCompany(apt.start_time),
            professional_name: apt.professionals?.name || '',
            service_name: apt.services?.name || '',
            company_phone: companyPhone,
          });

          const sendResult = await sendMessage(supabaseClient, {
            phone: apt.contacts.phone,
            message,
            companyId: company.company_id,
            contactId: apt.contact_id,
          });

          if (sendResult.success) {
            await supabaseClient
              .from('appointments')
              .update({ reminder_sent_at: new Date().toISOString() })
              .eq('id', apt.id);

            sent++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error('Erro ao enviar lembrete de agendamento:', err);
          failed++;
        }
      }
    }
  } catch (error) {
    console.error('Erro no processamento de lembretes de agendamento:', error);
  }

  return { sent, failed };
}
async function sendPostAttendedFollowups(supabaseClient: any) {
  let sent = 0;
  let failed = 0;

  try {
    const { data: companies } = await supabaseClient
      .from('company_settings')
      .select('company_id, timezone, language');

    if (!companies || companies.length === 0) return { sent, failed };

    const companyIds = companies.map((c: any) => c.company_id);
    const { data: companyRows } = await supabaseClient
      .from('companies')
      .select('id, name, owner_whatsapp')
      .in('id', companyIds);
    const companyNameById = new Map((companyRows || []).map((c: any) => [c.id, c.name]));
    const companyPhoneById = new Map((companyRows || []).map((c: any) => [c.id, c.owner_whatsapp]));

    for (const company of companies) {
      const timeZone = company.timezone || DEFAULT_TIMEZONE;
      const locale = company.language || DEFAULT_LOCALE;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getDateStringInZone(yesterday, timeZone);

      const { data: appointments } = await supabaseClient
        .from('appointments')
        .select(`
          id,
          company_id,
          contact_id,
          date,
          professional_id,
          contacts!inner(id, name, phone),
          professionals!inner(id, name)
        `)
        .eq('company_id', company.company_id)
        .eq('status', 'completed')
        .eq('date', yesterdayStr)
        .is('post_attended_sent_at', null);

      if (!appointments || appointments.length === 0) continue;

      const { data: template } = await supabaseClient
        .from('auto_message_templates')
        .select('content')
        .eq('company_id', company.company_id)
        .eq('message_type', 'post_attended_followup')
        .eq('is_active', true)
        .single();

      if (!template) continue;

      const settings = companySettingsById.get(company.company_id) || {};
      const companyPhone = settings.alternative_phone || companyPhoneById.get(company.company_id) || '';
      for (const apt of appointments) {
        try {
          const message = applyTemplate(template.content, {
            client_name: apt.contacts?.name || '',
            company_name: companyNameById.get(apt.company_id) || '',
            professional_name: apt.professionals?.name || '',
            company_phone: companyPhone,
          });

          const sendResult = await sendMessage(supabaseClient, {
            phone: apt.contacts.phone,
            message,
            companyId: apt.company_id,
            contactId: apt.contact_id,
          });

          if (sendResult.success) {
            await supabaseClient
              .from('appointments')
              .update({ post_attended_sent_at: new Date().toISOString() })
              .eq('id', apt.id);

            sent++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error('Erro ao enviar follow-up atendido:', err);
          failed++;
        }
      }
    }
  } catch (error) {
    console.error('Erro no processamento de follow-ups atendidos:', error);
  }

  return { sent, failed };
}
async function sendPostMissedFollowups(supabaseClient: any) {
  let sent = 0;
  let failed = 0;

  try {
    const { data: companies } = await supabaseClient
      .from('company_settings')
      .select('company_id, timezone, language');

    if (!companies || companies.length === 0) return { sent, failed };

    const companyIds = companies.map((c: any) => c.company_id);
    const { data: companyRows } = await supabaseClient
      .from('companies')
      .select('id, name, owner_whatsapp')
      .in('id', companyIds);
    const companyNameById = new Map((companyRows || []).map((c: any) => [c.id, c.name]));
    const companyPhoneById = new Map((companyRows || []).map((c: any) => [c.id, c.owner_whatsapp]));

    for (const company of companies) {
      const timeZone = company.timezone || DEFAULT_TIMEZONE;
      const locale = company.language || DEFAULT_LOCALE;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getDateStringInZone(yesterday, timeZone);

      const { data: appointments } = await supabaseClient
        .from('appointments')
        .select(`
          id,
          company_id,
          contact_id,
          date,
          start_time,
          contacts!inner(id, name, phone)
        `)
        .eq('company_id', company.company_id)
        .eq('status', 'no_show')
        .eq('date', yesterdayStr)
        .is('post_missed_sent_at', null);

      if (!appointments || appointments.length === 0) continue;

      const { data: template } = await supabaseClient
        .from('auto_message_templates')
        .select('content')
        .eq('company_id', company.company_id)
        .eq('message_type', 'post_missed_followup')
        .eq('is_active', true)
        .single();

      if (!template) continue;

      const settings = companySettingsById.get(company.company_id) || {};
      const companyPhone = settings.alternative_phone || companyPhoneById.get(company.company_id) || '';
      for (const apt of appointments) {
        try {
          const message = applyTemplate(template.content, {
            client_name: apt.contacts?.name || '',
            company_name: companyNameById.get(apt.company_id) || '',
            date: formatDateForCompany(apt.date, timeZone, locale),
            time: formatTimeForCompany(apt.start_time),
            company_phone: companyPhone,
          });

          const sendResult = await sendMessage(supabaseClient, {
            phone: apt.contacts.phone,
            message,
            companyId: apt.company_id,
            contactId: apt.contact_id,
          });

          if (sendResult.success) {
            await supabaseClient
              .from('appointments')
              .update({ post_missed_sent_at: new Date().toISOString() })
              .eq('id', apt.id);

            sent++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error('Erro ao enviar follow-up falta:', err);
          failed++;
        }
      }
    }
  } catch (error) {
    console.error('Erro no processamento de follow-ups de falta:', error);
  }

  return { sent, failed };
}
async function sendReturnReminders(supabaseClient: any) {
  let sent = 0;
  let failed = 0;

  try {
    const { data: companies } = await supabaseClient
      .from('company_settings')
      .select('company_id, scheduled_return_reminder_days, timezone, language');

    if (!companies || companies.length === 0) return { sent, failed };

    const companyIds = companies.map((c: any) => c.company_id);
    const { data: companyRows } = await supabaseClient
      .from('companies')
      .select('id, name, owner_whatsapp')
      .in('id', companyIds);
    const companyNameById = new Map((companyRows || []).map((c: any) => [c.id, c.name]));
    const companyPhoneById = new Map((companyRows || []).map((c: any) => [c.id, c.owner_whatsapp]));
    const companySettingsById = await fetchCompanySettingsMap(supabaseClient, companyIds);

    for (const company of companies) {
      const daysBeforeInt = company.scheduled_return_reminder_days || 7;
      const timeZone = company.timezone || DEFAULT_TIMEZONE;
      const locale = company.language || DEFAULT_LOCALE;

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysBeforeInt);
      const targetDateStr = getDateStringInZone(targetDate, timeZone);

      const { data: returns } = await supabaseClient
        .from('scheduled_returns')
        .select(`
          id,
          company_id,
          contact_id,
          return_date,
          contacts!inner(id, name, phone)
        `)
        .eq('company_id', company.company_id)
        .eq('return_date', targetDateStr)
        .eq('message_sent', false);

      if (!returns || returns.length === 0) continue;

      const { data: template } = await supabaseClient
        .from('auto_message_templates')
        .select('content')
        .eq('company_id', company.company_id)
        .eq('message_type', 'scheduled_return_reminder')
        .eq('is_active', true)
        .single();

      if (!template) continue;

      const settings = companySettingsById.get(company.company_id) || {};
      const companyPhone = settings.alternative_phone || companyPhoneById.get(company.company_id) || '';
      for (const ret of returns) {
        try {
          const message = applyTemplate(template.content, {
            client_name: ret.contacts?.name || '',
            company_name: companyNameById.get(company.company_id) || '',
            date: formatDateForCompany(ret.return_date, timeZone, locale),
            company_phone: companyPhone,
          });

          const sendResult = await sendMessage(supabaseClient, {
            phone: ret.contacts.phone,
            message,
            companyId: company.company_id,
            contactId: ret.contact_id,
          });

          if (sendResult.success) {
            await supabaseClient
              .from('scheduled_returns')
              .update({ 
                message_sent: true,
                message_sent_at: new Date().toISOString()
              })
              .eq('id', ret.id);

            sent++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error('Erro ao enviar lembrete de retorno:', err);
          failed++;
        }
      }
    }
  } catch (error) {
    console.error('Erro no processamento de lembretes de retorno:', error);
  }

  return { sent, failed };
}
async function sendBirthdayMessages(supabaseClient: any) {
  let sent = 0;
  let failed = 0;

  try {
    const { data: companies } = await supabaseClient
      .from('company_settings')
      .select('company_id, send_birthday_messages, timezone, language')
      .eq('send_birthday_messages', true);

    if (!companies || companies.length === 0) return { sent, failed };

    const companyIds = companies.map((c: any) => c.company_id);
    const { data: companyRows } = await supabaseClient
      .from('companies')
      .select('id, name, owner_whatsapp')
      .in('id', companyIds);
    const companyNameById = new Map((companyRows || []).map((c: any) => [c.id, c.name]));
    const companyPhoneById = new Map((companyRows || []).map((c: any) => [c.id, c.owner_whatsapp]));
    const companySettingsById = await fetchCompanySettingsMap(supabaseClient, companyIds);

    for (const company of companies) {
      const timeZone = company.timezone || DEFAULT_TIMEZONE;
      const locale = company.language || DEFAULT_LOCALE;
      const now = new Date();
      const parts = getZonedDateParts(now, timeZone);
      const currentYear = Number(parts.year);
      const monthDay = `${parts.month}-${parts.day}`;

      const { data: contacts } = await supabaseClient
        .from('contacts')
        .select('id, name, phone, birth_date')
        .eq('company_id', company.company_id)
        .not('birth_date', 'is', null);

      if (!contacts || contacts.length === 0) continue;

      const birthdayContacts = contacts.filter((c: any) => {
        if (!c.birth_date) return false;
        const birthMonthDay = c.birth_date.substring(5, 10);
        return birthMonthDay === monthDay;
      });

      if (birthdayContacts.length === 0) continue;

      const { data: template } = await supabaseClient
        .from('auto_message_templates')
        .select('content')
        .eq('company_id', company.company_id)
        .eq('message_type', 'birthday_message')
        .eq('is_active', true)
        .single();

      if (!template) continue;

      const settings = companySettingsById.get(company.company_id) || {};
      const companyPhone = settings.alternative_phone || companyPhoneById.get(company.company_id) || '';
      for (const contact of birthdayContacts) {
        try {
          const { data: alreadySent } = await supabaseClient
            .from('birthday_messages_log')
            .select('id')
            .eq('company_id', company.company_id)
            .eq('contact_id', contact.id)
            .eq('year', currentYear)
            .single();

          if (alreadySent) {
            console.log(`Birthday already sent to ${contact.name} this year`);
            continue;
          }

          const message = applyTemplate(template.content, {
            client_name: contact.name || '',
            company_name: companyNameById.get(company.company_id) || '',
            company_phone: companyPhone,
          });

          const sendResult = await sendMessage(supabaseClient, {
            phone: contact.phone,
            message,
            companyId: company.company_id,
            contactId: contact.id,
          });

          if (sendResult.success) {
            await supabaseClient
              .from('birthday_messages_log')
              .insert({
                company_id: company.company_id,
                contact_id: contact.id,
                year: currentYear,
                sent_at: new Date().toISOString()
              });

            sent++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error('Erro ao enviar mensagem de aniversÃ¡rio:', err);
          failed++;
        }
      }
    }
  } catch (error) {
    console.error('Erro no processamento de mensagens de aniversÃ¡rio:', error);
  }

  return { sent, failed };
}

