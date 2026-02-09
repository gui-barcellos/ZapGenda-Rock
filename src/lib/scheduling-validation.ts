import { SchedulingRules } from "@/hooks/useSchedulingRules";
import { addDays, addMonths, startOfMonth, endOfMonth, isAfter, isBefore, differenceInHours, differenceInDays } from "date-fns";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAppointmentDate(
  appointmentDate: Date,
  rules: SchedulingRules,
  isAI: boolean
): ValidationResult {
  const now = new Date();
  
  // Selecionar regras corretas baseado em quem está agendando
  const minAdvanceHours = isAI ? rules.min_advance_hours_ai : rules.min_advance_hours_manual;
  const maxAdvanceDays = isAI ? rules.max_advance_days_ai : rules.max_advance_days_manual;
  
  // Validar antecedência mínima
  const hoursDiff = differenceInHours(appointmentDate, now);
  if (hoursDiff < minAdvanceHours) {
    return {
      valid: false,
      error: `Agendamento deve ser feito com pelo menos ${minAdvanceHours} hora(s) de antecedência`
    };
  }
  
  // Validar modo de agendamento
  if (rules.scheduling_mode === 'rolling') {
    // Modo janela deslizante: verificar se está dentro do limite de dias
    const daysDiff = differenceInDays(appointmentDate, now);
    if (daysDiff > maxAdvanceDays) {
      return {
        valid: false,
        error: `Agendamento não pode ser feito com mais de ${maxAdvanceDays} dias de antecedência`
      };
    }
  } else if (rules.scheduling_mode === 'monthly') {
    // Modo mensal: verificar se o mês está aberto
    const currentMonth = startOfMonth(now);
    const appointmentMonth = startOfMonth(appointmentDate);
    const currentDay = now.getDate();
    let isMonthOpen = false;
    
    if (rules.opening_type === 'date_range') {
      // Data Definida: verificar se hoje está dentro do período de abertura
      const isInOpeningPeriod = currentDay >= rules.opening_start_day && currentDay <= rules.opening_end_day;
      
      // Calcular quais meses estão abertos
      const openMonths: Date[] = [];
      if (isInOpeningPeriod) {
        // Se estamos no período de abertura, o próximo mês e os seguintes estão disponíveis
        for (let i = 0; i <= rules.months_ahead_visible; i++) {
          openMonths.push(addMonths(currentMonth, i));
        }
      } else {
        // Fora do período, apenas meses já abertos
        for (let i = 0; i < rules.months_ahead_visible; i++) {
          openMonths.push(addMonths(currentMonth, i));
        }
      }
      
      isMonthOpen = openMonths.some(
        openMonth => openMonth.getTime() === appointmentMonth.getTime()
      );
      
      if (!isMonthOpen) {
        return {
          valid: false,
          error: `Este mês ainda não está disponível. Agenda abre entre os dias ${rules.opening_start_day} e ${rules.opening_end_day}`
        };
      }
    } else if (rules.opening_type === 'week_defined') {
      // Semana Definida: verificar se hoje está na semana de abertura
      let weekStart = 1;
      let weekEnd = 7;
      
      switch (rules.opening_week) {
        case 'first':
          weekStart = 1;
          weekEnd = 7;
          break;
        case 'second':
          weekStart = 8;
          weekEnd = 14;
          break;
        case 'third':
          weekStart = 15;
          weekEnd = 21;
          break;
        case 'fourth':
          weekStart = 22;
          weekEnd = 28;
          break;
        case 'last':
          // Últimos 7 dias do mês
          const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          weekStart = lastDayOfMonth - 6;
          weekEnd = lastDayOfMonth;
          break;
      }
      
      const isInOpeningWeek = currentDay >= weekStart && currentDay <= weekEnd;
      
      // Calcular quais meses estão abertos
      const openMonths: Date[] = [];
      if (isInOpeningWeek) {
        for (let i = 0; i <= rules.months_ahead_visible; i++) {
          openMonths.push(addMonths(currentMonth, i));
        }
      } else {
        for (let i = 0; i < rules.months_ahead_visible; i++) {
          openMonths.push(addMonths(currentMonth, i));
        }
      }
      
      isMonthOpen = openMonths.some(
        openMonth => openMonth.getTime() === appointmentMonth.getTime()
      );
      
      if (!isMonthOpen) {
        const weekNames = {
          first: '1ª semana',
          second: '2ª semana',
          third: '3ª semana',
          fourth: '4ª semana',
          last: 'última semana'
        };
        return {
          valid: false,
          error: `Este mês ainda não está disponível. Agenda abre na ${weekNames[rules.opening_week || 'first']} do mês`
        };
      }
    }
  }
  
  return { valid: true };
}

export function getAvailableMonths(rules: SchedulingRules): Date[] {
  const now = new Date();
  const currentMonth = startOfMonth(now);
  const currentDay = now.getDate();
  const openMonths: Date[] = [];
  
  if (rules.scheduling_mode === 'rolling') {
    // No modo rolling, todos os meses dentro do range estão disponíveis
    const maxDate = addDays(now, rules.max_advance_days_manual);
    let month = currentMonth;
    
    while (isBefore(month, maxDate) || month.getTime() === startOfMonth(maxDate).getTime()) {
      openMonths.push(month);
      month = addMonths(month, 1);
    }
  } else {
    // No modo mensal, apenas os meses configurados estão disponíveis
    if (currentDay >= rules.open_next_month_on_day) {
      for (let i = 0; i <= rules.months_ahead_visible; i++) {
        openMonths.push(addMonths(currentMonth, i));
      }
    } else {
      for (let i = 0; i < rules.months_ahead_visible; i++) {
        openMonths.push(addMonths(currentMonth, i));
      }
    }
  }
  
  return openMonths;
}
