import { Customer } from '../types';

export interface NormalizedPhoneResult {
  rawPhone: string;
  normalized: string; // e.g. "5491127087938"
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Normaliza cualquier número de teléfono argentino al formato oficial internacional de WhatsApp:
 * 549 + código de área sin 0 + número sin 15.
 * 
 * Reglas aplicadas:
 * 1. Elimina caracteres no numéricos (espacios, guiones, paréntesis, puntos, +).
 * 2. Elimina prefijos "00" o "0".
 * 3. Remueve "15" después del código de área si está presente.
 * 4. Genera el string 549... sin duplicar 54 ni 9.
 */
export function normalizeArgentineWhatsAppNumber(rawPhone?: string): NormalizedPhoneResult {
  if (!rawPhone || !rawPhone.trim()) {
    return {
      rawPhone: rawPhone || '',
      normalized: '',
      isValid: false,
      errorMessage: 'El cliente no tiene registrado ningún número de teléfono.',
    };
  }

  // 1. Quitar todos los caracteres que no sean dígitos
  let digits = rawPhone.replace(/\D/g, '');

  if (!digits) {
    return {
      rawPhone,
      normalized: '',
      isValid: false,
      errorMessage: 'El número ingresado no contiene ningún dígito válido.',
    };
  }

  // 2. Si comienza con 00, eliminar
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // 3. Evaluar prefijo internacional
  let localDigits = digits;
  if (localDigits.startsWith('54')) {
    localDigits = localDigits.slice(2);
    if (localDigits.startsWith('9')) {
      localDigits = localDigits.slice(1);
    }
  }

  // 4. Si comienza con 0, quitar el 0
  if (localDigits.startsWith('0')) {
    localDigits = localDigits.slice(1);
  }

  // 5. Quitar "15" después del código de área
  // Los códigos de área en Argentina son de 2, 3 o 4 dígitos.
  // Números móviles sin 15 tienen 10 dígitos (ej: 1127087938, 2611234567, 2944123456).
  if (localDigits.length === 11 || localDigits.length === 12) {
    if (localDigits.slice(2, 4) === '15') {
      localDigits = localDigits.slice(0, 2) + localDigits.slice(4);
    } else if (localDigits.slice(3, 5) === '15') {
      localDigits = localDigits.slice(0, 3) + localDigits.slice(5);
    } else if (localDigits.slice(4, 6) === '15') {
      localDigits = localDigits.slice(0, 4) + localDigits.slice(6);
    }
  }

  // Construir número final internacional para WhatsApp Argentina (549 + 10 dígitos = 13 dígitos)
  const normalized = `549${localDigits}`;
  const isValid = /^549\d{10}$/.test(normalized);

  if (!isValid) {
    return {
      rawPhone,
      normalized,
      isValid: false,
      errorMessage: `El teléfono "${rawPhone}" no tiene un formato celular válido para WhatsApp. Se esperaba un número con código de área (ej: 11 2708-7938).`,
    };
  }

  return {
    rawPhone,
    normalized,
    isValid: true,
  };
}

/**
 * Genera la URL wa.me o indica si el teléfono es inválido.
 */
export function buildValidatedWhatsAppUrl(
  phone: string | undefined,
  message: string
): { url: string; result: NormalizedPhoneResult } {
  const result = normalizeArgentineWhatsAppNumber(phone);
  if (!result.isValid) {
    return { url: '', result };
  }
  const url = `https://wa.me/${result.normalized}?text=${encodeURIComponent(message)}`;
  return { url, result };
}

/**
 * Normaliza teléfono para cliente y llena los campos telefonoOriginal y telefonoWhatsAppNormalizado
 */
export function enrichCustomerPhoneData<T extends { telefono?: string; telefonoOriginal?: string; telefonoWhatsAppNormalizado?: string }>(
  customer: T
): T {
  const norm = normalizeArgentineWhatsAppNumber(customer.telefono);
  return {
    ...customer,
    telefonoOriginal: customer.telefonoOriginal || customer.telefono || '',
    telefonoWhatsAppNormalizado: norm.isValid ? norm.normalized : '',
  };
}
