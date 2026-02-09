import { SchedulingTag } from "@/hooks/useSchedulingTags";

interface Appointment {
  status: string;
  [key: string]: any;
}

// Mapear status do appointment para nome da tag
const statusToTagMap: Record<string, string> = {
  'scheduled': 'Aguardando Confirmação',
  'confirmed': 'Confirmou',
  'completed': 'Compareceu',
  'cancelled': 'Cancelou',
  'no_show': 'Não Compareceu',
};

export function getAppointmentTag(
  appointment: Appointment,
  tags: SchedulingTag[]
): SchedulingTag | undefined {
  const tagName = statusToTagMap[appointment.status];
  return tags.find(t => t.name === tagName);
}

// Cor padrão caso tag não seja encontrada
export function getAppointmentColor(
  appointment: Appointment,
  tags: SchedulingTag[]
): string {
  const tag = getAppointmentTag(appointment, tags);
  return tag?.color || '#3b82f6'; // azul padrão
}
