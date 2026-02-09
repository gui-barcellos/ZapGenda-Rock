/**
 * Normaliza telefone para formato com DDI brasileiro (55XXXXXXXXXXX)
 * - Remove todos os caracteres não-numéricos
 * - Adiciona código do país 55 se não existir
 * - Retorna sempre no formato: 552498877322
 */
export function normalizePhoneWithCountryCode(phone: string): string {
  // Remove tudo exceto números
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Se já começa com 55 e tem 12-13 dígitos, retorna como está
  if (cleanPhone.startsWith('55') && (cleanPhone.length === 12 || cleanPhone.length === 13)) {
    return cleanPhone;
  }
  
  // Se tem 10-11 dígitos sem 55, adiciona 55 no início
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    return '55' + cleanPhone;
  }
  
  // Retorna limpo (caso não se encaixe nos padrões)
  return cleanPhone;
}

/**
 * Formata telefone para exibição visual: (DD) 9XXXX-XXXX
 * - Remove o prefixo 55 se existir
 * - Formata como: (24) 98877-7322
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';
  
  // Remove tudo exceto números
  let cleanPhone = phone.replace(/\D/g, '');
  
  // Remove prefixo 55 se existir
  if (cleanPhone.startsWith('55') && (cleanPhone.length === 12 || cleanPhone.length === 13)) {
    cleanPhone = cleanPhone.substring(2);
  }
  
  // Se não tem dígitos suficientes, retorna como está
  if (cleanPhone.length < 10) {
    return phone;
  }
  
  // Formata como (DD) XXXXX-XXXX ou (DD) XXXX-XXXX
  const ddd = cleanPhone.substring(0, 2);
  
  if (cleanPhone.length === 11) {
    // Celular: (DD) 9XXXX-XXXX
    const part1 = cleanPhone.substring(2, 7);
    const part2 = cleanPhone.substring(7, 11);
    return `(${ddd}) ${part1}-${part2}`;
  } else if (cleanPhone.length === 10) {
    // Fixo: (DD) XXXX-XXXX
    const part1 = cleanPhone.substring(2, 6);
    const part2 = cleanPhone.substring(6, 10);
    return `(${ddd}) ${part1}-${part2}`;
  }
  
  return phone;
}

/**
 * Valida se é um telefone brasileiro válido
 * - Aceita 10 dígitos (fixo) ou 11 dígitos (celular)
 * - Com ou sem código do país (55)
 */
export function isValidBrazilianPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Com código do país: 55 + 10-11 dígitos
  if (cleanPhone.startsWith('55')) {
    return cleanPhone.length === 12 || cleanPhone.length === 13;
  }
  
  // Sem código do país: 10-11 dígitos
  return cleanPhone.length === 10 || cleanPhone.length === 11;
}

/**
 * Detecta se um input é um número de telefone
 * - Remove caracteres especiais (espaços, parênteses, hífens, pontos)
 * - Verifica se sobram apenas dígitos
 * - Checa se tem 10-13 dígitos (DDD + número, com ou sem 55)
 */
export function isPhoneInput(input: string): boolean {
  if (!input) return false;
  
  // Remove todos os caracteres não-numéricos
  const cleanInput = input.replace(/\D/g, '');
  
  // Verifica se tem entre 10-13 dígitos
  return /^\d{10,13}$/.test(cleanInput);
}
