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
    const { 
      companyId, 
      serviceId, 
      professionalId, 
      startDate: providedStartDate,
      endDate: providedEndDate,
      limit = 10 
    } = await req.json();

    if (!companyId || !serviceId) {
      return new Response(
        JSON.stringify({ error: 'companyId e serviceId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch service details
    const { data: service, error: serviceError } = await supabaseClient
      .from('services')
      .select('duration, name')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return new Response(
        JSON.stringify({ error: 'Serviço não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch company settings with scheduling rules
    const { data: companySettings } = await supabaseClient
      .from('company_settings')
      .select(`
        business_hours,
        scheduling_mode,
        min_advance_hours_ai,
        max_advance_days_ai,
        opening_type,
        opening_start_day,
        opening_end_day,
        opening_week,
        months_ahead_visible,
        open_next_month_on_day
      `)
      .eq('company_id', companyId)
      .single();

    const businessHours = companySettings?.business_hours || [];
    const schedulingMode = companySettings?.scheduling_mode || 'rolling';
    const minAdvanceHoursAI = companySettings?.min_advance_hours_ai || 2;
    const maxAdvanceDaysAI = companySettings?.max_advance_days_ai || 30;
    const openingType = companySettings?.opening_type || 'date_range';
    const openingStartDay = companySettings?.opening_start_day || 1;
    const openingEndDay = companySettings?.opening_end_day || 10;
    const openingWeek = companySettings?.opening_week || 'first';
    const monthsAheadVisible = companySettings?.months_ahead_visible || 2;
    const openNextMonthOnDay = companySettings?.open_next_month_on_day || 15;

    console.log('📅 Scheduling config:', { schedulingMode, minAdvanceHoursAI, maxAdvanceDaysAI });

    // ==================== CALCULAR DATAS AUTOMATICAMENTE BASEADO NAS REGRAS ====================
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    let startDate: string;
    let endDate: string;

    if (providedStartDate) {
      // Se data fornecida, usar como startDate
      startDate = providedStartDate;
      endDate = providedEndDate || addDays(startDate, 7);
    } else {
      // CALCULAR AUTOMATICAMENTE baseado nas regras
      if (schedulingMode === 'rolling') {
        // Janela Deslizante: hoje até hoje + maxAdvanceDaysAI
        startDate = today;
        endDate = addDays(today, maxAdvanceDaysAI);
        console.log(`📅 Modo JANELA DESLIZANTE: ${startDate} até ${endDate}`);
      } else {
        // Abertura Mensal: calcular meses abertos
        const currentDay = now.getDate();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let isOpeningPeriod = false;
        
        if (openingType === 'date_range') {
          isOpeningPeriod = currentDay >= openingStartDay && currentDay <= openingEndDay;
        } else if (openingType === 'week_defined') {
          let weekStart = 1, weekEnd = 7;
          switch (openingWeek) {
            case 'first': weekStart = 1; weekEnd = 7; break;
            case 'second': weekStart = 8; weekEnd = 14; break;
            case 'third': weekStart = 15; weekEnd = 21; break;
            case 'fourth': weekStart = 22; weekEnd = 28; break;
            case 'last':
              const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
              weekStart = lastDay - 6;
              weekEnd = lastDay;
              break;
          }
          isOpeningPeriod = currentDay >= weekStart && currentDay <= weekEnd;
        }

        // Calcular meses disponíveis
        const monthsToAdd = isOpeningPeriod ? monthsAheadVisible : monthsAheadVisible - 1;
        const lastAvailableMonth = new Date(currentYear, currentMonth + monthsToAdd, 1);
        const lastDayOfLastMonth = new Date(lastAvailableMonth.getFullYear(), lastAvailableMonth.getMonth() + 1, 0);

        startDate = today;
        endDate = lastDayOfLastMonth.toISOString().split('T')[0];
        console.log(`📅 Modo ABERTURA MENSAL: ${startDate} até ${endDate} (período aberto: ${isOpeningPeriod})`);
      }
    }

    // Determine which professionals offer this service
    let professionalIds: string[] = [];
    
    if (professionalId) {
      professionalIds = [professionalId];
    } else {
      const { data: serviceProfessionals } = await supabaseClient
        .from('service_professionals')
        .select('professional_id, professionals(name)')
        .eq('service_id', serviceId)
        .eq('company_id', companyId);
      
      professionalIds = serviceProfessionals?.map(sp => sp.professional_id) || [];
    }

    if (professionalIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          availableSlots: [],
          message: 'Nenhum profissional disponível para este serviço',
          serviceName: service.name,
          serviceDuration: service.duration
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch availability schedules for professionals
    const { data: availabilities } = await supabaseClient
      .from('availability')
      .select('professional_id, day_of_week, start_time, end_time')
      .in('professional_id', professionalIds)
      .eq('is_active', true);

    // Fetch existing appointments in date range
    const { data: existingAppointments } = await supabaseClient
      .from('appointments')
      .select('professional_id, date, start_time, end_time')
      .in('professional_id', professionalIds)
      .gte('date', startDate)
      .lte('date', endDate)
      .in('status', ['scheduled', 'confirmed']);

    // Fetch blocked slots in date range
    const { data: blockedSlots } = await supabaseClient
      .from('blocked_slots')
      .select('professional_id, date, start_time, end_time, is_general_block')
      .gte('date', startDate)
      .lte('date', endDate);

    // Generate available slots WITH business_hours intersection and min_advance_hours
    const availableSlots = generateAvailableSlots({
      availabilities: availabilities || [],
      businessHours,
      existingAppointments: existingAppointments || [],
      blockedSlots: blockedSlots || [],
      professionalIds,
      serviceDuration: service.duration,
      startDate,
      endDate,
      limit,
      companyId,
      minAdvanceHours: minAdvanceHoursAI
    });

    // Fetch professional names for slots
    const { data: professionals } = await supabaseClient
      .from('professionals')
      .select('id, name')
      .in('id', professionalIds);

    const professionalMap = new Map(professionals?.map(p => [p.id, p.name]) || []);

    // Enrich slots with professional names
    const enrichedSlots = availableSlots.map(slot => ({
      ...slot,
      professionalName: professionalMap.get(slot.professionalId) || 'Profissional'
    }));

    return new Response(
      JSON.stringify({ 
        availableSlots: enrichedSlots,
        serviceName: service.name,
        serviceDuration: service.duration,
        count: enrichedSlots.length,
        dateRange: { startDate, endDate },
        schedulingMode
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-availability:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao consultar disponibilidade';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper: Add days to date string (YYYY-MM-DD)
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

// Helper: Convert time (HH:MM) to minutes
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper: Get local weekday from date string (YYYY-MM-DD)
function getLocalWeekday(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

// Helper: Format time from minutes
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// Main function: Generate available slots
function generateAvailableSlots(params: any) {
  const {
    availabilities,
    businessHours,
    existingAppointments,
    blockedSlots,
    professionalIds,
    serviceDuration,
    startDate,
    endDate,
    limit,
    companyId,
    minAdvanceHours = 2
  } = params;

  const slots: any[] = [];
  const slotInterval = 30; // 30 minute intervals

  // Create date range
  const currentDate = new Date(startDate + 'T00:00:00');
  const finalDate = new Date(endDate + 'T00:00:00');

  // Calculate minimum allowed time based on minAdvanceHours
  const now = new Date();
  const minAllowedTime = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000);

  while (currentDate <= finalDate && slots.length < limit) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const weekday = getLocalWeekday(dateStr);

    // Buscar horário da empresa para este dia
    const companyHours = businessHours.find(
      (bh: any) => bh.day === weekday && bh.is_active
    );

    // Se empresa fechada neste dia, pular
    if (!companyHours) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    const companyStart = timeToMinutes(companyHours.start);
    const companyEnd = timeToMinutes(companyHours.end);

    // For each professional
    for (const professionalId of professionalIds) {
      if (slots.length >= limit) break;

      // Get availability for this professional on this weekday
      const availability = availabilities.find(
        (a: any) => a.professional_id === professionalId && a.day_of_week === weekday
      );

      if (!availability) continue;

      const profStart = timeToMinutes(availability.start_time);
      const profEnd = timeToMinutes(availability.end_time);

      // CALCULAR INTERSEÇÃO
      const effectiveStart = Math.max(companyStart, profStart);
      const effectiveEnd = Math.min(companyEnd, profEnd);

      if (effectiveStart >= effectiveEnd) continue;

      // Generate slots dentro do range efetivo
      for (let minutes = effectiveStart; minutes + serviceDuration <= effectiveEnd; minutes += slotInterval) {
        if (slots.length >= limit) break;

        const slotStart = minutesToTime(minutes);
        const slotEnd = minutesToTime(minutes + serviceDuration);

        // Check if slot is blocked
        const isBlocked = blockedSlots.some((block: any) => {
          if (block.date !== dateStr) return false;
          
          if (block.is_general_block) {
            if (!block.start_time || !block.end_time) return true;
            const blockStart = timeToMinutes(block.start_time);
            const blockEnd = timeToMinutes(block.end_time);
            return minutes < blockEnd && (minutes + serviceDuration) > blockStart;
          }
          
          if (block.professional_id !== professionalId) return false;
          if (!block.start_time || !block.end_time) return true;
          const blockStart = timeToMinutes(block.start_time);
          const blockEnd = timeToMinutes(block.end_time);
          return minutes < blockEnd && (minutes + serviceDuration) > blockStart;
        });

        if (isBlocked) continue;

        // Check if slot conflicts with existing appointment
        const hasConflict = existingAppointments.some((apt: any) => {
          if (apt.professional_id !== professionalId || apt.date !== dateStr) return false;
          const aptStart = timeToMinutes(apt.start_time);
          const aptEnd = timeToMinutes(apt.end_time);
          return minutes < aptEnd && (minutes + serviceDuration) > aptStart;
        });

        if (hasConflict) continue;

        // Skip slots that don't meet minimum advance time
        const slotDateTime = new Date(`${dateStr}T${slotStart}:00`);
        if (slotDateTime < minAllowedTime) continue;

        // Add available slot
        slots.push({
          date: dateStr,
          startTime: slotStart,
          endTime: slotEnd,
          professionalId: professionalId,
          weekday: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][weekday]
        });
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return slots;
}
