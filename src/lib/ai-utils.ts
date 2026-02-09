/**
 * Verifica se a IA está ativa para uma conversa específica
 * @param aiDisabledUntil - Timestamp até quando a IA está desativada temporariamente
 * @param contactTags - Tags do contato
 * @returns true se IA está ativa, false se está desativada
 */
export const isAIActive = (
  aiDisabledUntil: string | null,
  contactTags: string[] | null
): boolean => {
  // Se contato tem tag "IA Desativada", IA está permanentemente desativada
  if (contactTags?.includes("IA Desativada")) {
    return false;
  }

  // Se não há temporizador, IA está ativa
  if (!aiDisabledUntil) {
    return true;
  }

  // Verificar se temporizador expirou
  const now = new Date();
  const disabledUntil = new Date(aiDisabledUntil);
  
  return now >= disabledUntil; // IA volta a ficar ativa após tempo expirar
};
