import { CustomerWithBalance, Movement, WhatsAppTemplates } from '../types';

/**
 * Formatea un número a Pesos Argentinos ($ ARS) con separador de miles.
 */
export function formatCurrency(amount: number): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const formatted = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absVal);

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Formatea fechas a formato legible argentino (ej: 28/07/2026 o 28/07/2026 14:30)
 */
export function formatDate(isoDate: string, includeTime: boolean = false): string {
  if (!isoDate) return '-';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    if (!includeTime) {
      return `${day}/${month}/${year}`;
    }

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return isoDate;
  }
}

/**
 * Calcula la diferencia en días desde una fecha ISO hasta hoy.
 */
export function getDaysAgo(isoDate?: string): number {
  if (!isoDate) return 999;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return 999;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - d.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Normaliza número de teléfono para link de WhatsApp de Argentina (+54)
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (!cleaned.startsWith('54')) {
    cleaned = '549' + cleaned; // Formato internacional recomendado para WA Arg
  }
  return cleaned;
}

/**
 * Plantillas por defecto para mensajes de WhatsApp
 */
export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplates = {
  informarSaldo:
    'Hola, ¿cómo estás? Te paso el estado de tu cuenta. Actualmente tenés un saldo pendiente de $MONTO. Cualquier consulta estamos a disposición. Muchas gracias.',
  solicitarPedido:
    'Hola, ¿cómo estás? Estamos organizando el reparto. Cuando puedas, ¿nos pasás tu pedido? Muchas gracias.',
};

/**
 * Construye la URL de WhatsApp aplicando plantillas personalizables.
 */
export function buildCustomWhatsAppUrl(
  type: 'SALDO' | 'PEDIDO',
  customer: CustomerWithBalance,
  templates: WhatsAppTemplates = DEFAULT_WHATSAPP_TEMPLATES
): string {
  const cleanPhone = cleanPhoneNumber(customer.telefono);
  const nombreCliente = customer.alias || customer.nombre;
  const montoFormateado = formatCurrency(customer.saldoActual);

  let rawTemplate =
    type === 'SALDO'
      ? templates.informarSaldo || DEFAULT_WHATSAPP_TEMPLATES.informarSaldo
      : templates.solicitarPedido || DEFAULT_WHATSAPP_TEMPLATES.solicitarPedido;

  // Reemplazar placeholders $XXX, $MONTO, $CLIENTE
  let message = rawTemplate
    .replace(/\$MONTO/g, montoFormateado)
    .replace(/\$XXX/g, montoFormateado)
    .replace(/\$CLIENTE/g, nombreCliente);

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Función compatible con código previo para mensaje de cobro por WhatsApp
 */
export function buildWhatsAppDebtMessageUrl(
  customer: CustomerWithBalance,
  movements: Movement[] = []
): string {
  return buildCustomWhatsAppUrl('SALDO', customer, DEFAULT_WHATSAPP_TEMPLATES);
}

/**
 * Mapeo de resultados de visitas a etiquetas amigables e íconos/colores
 */
export const VISIT_RESULT_LABELS: Record<string, { label: string; color: string }> = {
  COMPRO_MERCADERIA: { label: 'Compró mercadería', color: 'bg-emerald-100 text-emerald-800' },
  NO_QUISO_MERCADERIA: { label: 'No quiso (tenía stock)', color: 'bg-amber-100 text-amber-800' },
  LOCAL_CERRADO: { label: 'Local cerrado', color: 'bg-red-100 text-red-800' },
  NO_RESPONDIO: { label: 'No respondió', color: 'bg-slate-100 text-slate-800' },
  DE_VACACIONES: { label: 'Estaba de vacaciones', color: 'bg-purple-100 text-purple-800' },
  PEDIDO_PERSONAL: { label: 'Tomó pedido en el local', color: 'bg-blue-100 text-blue-800' },
  OTRO: { label: 'Otro resultado', color: 'bg-gray-100 text-gray-800' },
};

/**
 * Categorías traducidas y amigables
 */
export const CATEGORY_LABELS: Record<string, string> = {
  CARNICERIA: 'Carnicería',
  FIAMBRERIA: 'Fiambrería / Chacinados',
  RESTAURANTE_SUPER: 'Restaurante / Supermercado',
  REVENDEDOR: 'Revendedor / Distribuidor',
  PARTICULAR: 'Cliente Particular',
};

export const FREQUENCY_LABELS: Record<string, string> = {
  DIARIA: 'Diaria',
  SEMANAL: 'Semanal',
  BISEMANAL: 'Bi-semanal',
  QUINCENAL: 'Quincenal',
};

export const ROLE_LABELS: Record<string, { title: string; badge: string; color: string; desc: string }> = {
  DUENO: {
    title: 'Dueño / Dirección',
    badge: '👑 Dueño',
    color: 'bg-amber-500 text-slate-950 font-black',
    desc: 'Acceso total a indicadores gerenciales, finanzas, riesgo y auditoría completa',
  },
  ADMINISTRADOR: {
    title: 'Administrador',
    badge: '🛠️ Administrador',
    color: 'bg-blue-600 text-white font-black',
    desc: 'Gestión operativa total, cuentas corrientes, configuración y plantillas',
  },
  REPARTIDOR: {
    title: 'Repartidor en Camión',
    badge: '🚚 Repartidor',
    color: 'bg-emerald-600 text-white font-black',
    desc: 'Modo ultra rápido optimizado para usar con una mano arriba del camión',
  },
  COBRANZAS: {
    title: 'Cobranzas en Ruta',
    badge: '💵 Cobranzas',
    color: 'bg-indigo-600 text-white font-black',
    desc: 'Enfocado en rutas de cobro, cobranzas de saldos y mensajes de cobranza',
  },
  SOLO_LECTURA: {
    title: 'Solo Lectura',
    badge: '👁️ Solo Lectura',
    color: 'bg-slate-600 text-white font-black',
    desc: 'Consulta de saldos, fichas e historiales sin permisos de edición',
  },
};
