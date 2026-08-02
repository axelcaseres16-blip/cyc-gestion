import {
  Customer,
  CustomerWithBalance,
  Movement,
  CustomerVisit,
  WhatsAppTemplates,
  ActivityLogEntry,
  SmartReminder,
  TimelineItem,
  ProximaVisitaOp,
  ProximaVisitaInfo,
  WhatsAppPostSaleBehavior,
  PaymentStatus,
  PendingSale,
  PaymentMethod,
  AppUser,
} from '../types';
import { calculateCustomerRisk } from './riskCalculator';
import { DEFAULT_WHATSAPP_TEMPLATES, formatDate, formatCurrency, VISIT_RESULT_LABELS, cleanPhoneNumber } from './formatters';
import { recordAuditLog } from './auditLogger';

const CUSTOMERS_KEY = 'cyc_gestion_customers_v2';
const MOVEMENTS_KEY = 'cyc_gestion_movements_v2';
const VISITS_KEY = 'cyc_gestion_visits_v1';
const TEMPLATES_KEY = 'cyc_gestion_templates_v1';
const ACTIVITY_KEY = 'cyc_gestion_activity_v1';
const PENDING_SALES_KEY = 'cyc_gestion_pending_sales_v1';
const WA_BEHAVIOR_KEY = 'cyc_gestion_wa_behavior_v1';
const SIMULATED_OFFLINE_KEY = 'cyc_gestion_simulated_offline_v1';
const SALE_DRAFT_KEY = 'cyc_gestion_sale_draft_v1';
const AUTO_BACKUP_SNAPSHOT_KEY = 'cyc_auto_backup_snapshots_v1';

/**
 * Guarda un respaldo snapshot automático e inmediato en localStorage
 */
export function autoSaveSnapshot(): void {
  try {
    const snapshot = {
      timestamp: new Date().toISOString(),
      customers: getStoredCustomers(),
      movements: getStoredMovements(),
      visits: getStoredVisits(),
    };
    localStorage.setItem(AUTO_BACKUP_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.error('Error al guardar snapshot automático:', err);
  }
}

/**
 * Obtiene el último snapshot guardado automáticamente
 */
export function getLastAutoSnapshot(): { timestamp: string; customersCount: number; movementsCount: number } | null {
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_SNAPSHOT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      timestamp: data.timestamp || new Date().toISOString(),
      customersCount: Array.isArray(data.customers) ? data.customers.length : 0,
      movementsCount: Array.isArray(data.movements) ? data.movements.length : 0,
    };
  } catch {
    return null;
  }
}

export interface SaleDraftData {
  customerId?: string;
  montoTotal?: string;
  estadoPago?: PaymentStatus;
  montoAbonado?: string;
  medioPago?: PaymentMethod;
  fotoUrl?: string;
  updatedAt?: string;
}

export function saveSaleDraft(draft: SaleDraftData): void {
  try {
    if (!draft.customerId && !draft.montoTotal && !draft.fotoUrl) {
      localStorage.removeItem(SALE_DRAFT_KEY);
      return;
    }
    const current = getSaleDraft() || {};
    const updated = { ...current, ...draft, updatedAt: new Date().toISOString() };
    localStorage.setItem(SALE_DRAFT_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error guardando borrador de venta:', err);
  }
}

export function getSaleDraft(): SaleDraftData | null {
  try {
    const raw = localStorage.getItem(SALE_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export function clearSaleDraft(): void {
  try {
    localStorage.removeItem(SALE_DRAFT_KEY);
  } catch (err) {
    console.error('Error limpiando borrador de venta:', err);
  }
}

// Datos de demostración iniciales ultra realistas para C&C Gestión (Distribuidora de achuras y carnes)
const MOCK_INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cli_lopez',
    nombre: 'Horacio López',
    alias: 'Carnicería López',
    cuitDni: '20-30123456-7',
    telefono: '1144556677',
    direccion: 'Av. Rivadavia 8500',
    localidad: 'Morón',
    referenciaUbicacion: 'Esquina Alvarado',
    zonaRuta: 'Ruta 1 - Morón / Haedo',
    frecuenciaVisita: 'SEMANAL',
    categoria: 'CARNICERIA',
    estado: 'ACTIVO',
    limiteCredito: 1000000,
    diasTopeCredito: 14,
    listaPrecioTipo: 'PERSONALIZADA',
    preciosPersonalizados: {
      prod_higado: 5005,
      prod_chinchulin: 6000,
      prod_centro: 7000,
    },
    observaciones: 'Cliente para prueba oficial de Boleta Virtual.',
    proximaVisita: {
      fecha: new Date().toISOString().split('T')[0],
      motivo: 'Entrega de mercadería',
      option: 'PROXIMO_REPARTO',
    },
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z',
  },
  {
    id: 'cli_1',
    nombre: 'Juan Carlos Rodríguez',
    alias: 'Carnicería Don Juan',
    cuitDni: '20-28492019-3',
    telefono: '1154839201',
    direccion: 'Av. San Martín 1420',
    localidad: 'Morón',
    referenciaUbicacion: 'Esquina Belgrano, persiana verde',
    zonaRuta: 'Ruta 1 - Morón / Haedo',
    frecuenciaVisita: 'BISEMANAL',
    categoria: 'CARNICERIA',
    estado: 'ACTIVO',
    limiteCredito: 1500000,
    diasTopeCredito: 14,
    observaciones: 'Recibe mercadería de 7:00 a 10:00 hs únicamente. Prefiere hígados y mollejas vacunas.',
    proximaVisita: {
      fecha: new Date().toISOString().split('T')[0],
      motivo: 'Confirmar pedido semanal y cobro de saldo',
      option: 'PROXIMO_REPARTO',
    },
    ultimaVisita: {
      fecha: '2026-07-26T10:30:00.000Z',
      resultadoTexto: 'Compró mercadería',
      usuario: 'Repartidor Carlos',
    },
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-07-28T10:00:00.000Z',
  },
  {
    id: 'cli_2',
    nombre: 'Chacinados y Chinchulines El Parrillón SRL',
    alias: 'El Parrillón de Ramos',
    cuitDni: '30-71829304-8',
    telefono: '1162948102',
    direccion: 'Rivadavia 12450',
    localidad: 'Ramos Mejía',
    referenciaUbicacion: 'Frente a la estación de trenes',
    zonaRuta: 'Ruta 2 - Ramos / San Justo',
    frecuenciaVisita: 'SEMANAL',
    categoria: 'RESTAURANTE_SUPER',
    estado: 'ACTIVO',
    limiteCredito: 2500000,
    diasTopeCredito: 10,
    observaciones: 'Paga con transferencia. Solicita boleta en mano al repartidor.',
    proximaVisita: {
      fecha: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      motivo: 'Reparto de mollejas y chinchulín',
      option: 'ESTA_SEMANA',
    },
    ultimaVisita: {
      fecha: '2026-07-25T11:45:00.000Z',
      resultadoTexto: 'Compró mercadería',
      usuario: 'Repartidor Miguel',
    },
    createdAt: '2026-02-01T09:00:00.000Z',
    updatedAt: '2026-07-25T11:45:00.000Z',
  },
  {
    id: 'cli_3',
    nombre: 'Roberto Gómez',
    alias: 'Granja y Carnes Gómez',
    cuitDni: '20-19284019-4',
    telefono: '1138492018',
    direccion: 'Calle Florida 890',
    localidad: 'San Justo',
    referenciaUbicacion: 'A media cuadra de la plaza',
    zonaRuta: 'Ruta 2 - Ramos / San Justo',
    frecuenciaVisita: 'DIARIA',
    categoria: 'CARNICERIA',
    estado: 'SUSPENDIDO',
    limiteCredito: 800000,
    diasTopeCredito: 7,
    observaciones: 'SUSPENDIDO TEMPORALMENTE. Se rehusó a saldar boleta vencida de junio.',
    proximaVisita: {
      fecha: new Date().toISOString().split('T')[0],
      motivo: 'Gestionar cobranza previa a reactivación',
      option: 'PROXIMO_REPARTO',
    },
    ultimaVisita: {
      fecha: '2026-07-27T09:15:00.000Z',
      resultadoTexto: 'No respondió',
      usuario: 'Repartidor Miguel',
    },
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-07-27T09:15:00.000Z',
  },
  {
    id: 'cli_4',
    nombre: 'Supermercado Los Hermanos',
    alias: 'Super Los Hermanos',
    cuitDni: '30-68392019-2',
    telefono: '1148201928',
    direccion: 'Av. Gaona 3410',
    localidad: 'Haedo',
    referenciaUbicacion: 'Cerca del Metrobús',
    zonaRuta: 'Ruta 1 - Morón / Haedo',
    frecuenciaVisita: 'BISEMANAL',
    categoria: 'RESTAURANTE_SUPER',
    estado: 'ACTIVO',
    limiteCredito: 3000000,
    diasTopeCredito: 14,
    observaciones: 'Buen pagador. Pide 5 cajones de matambre y 10 de chinchulines por entrega.',
    proximaVisita: {
      fecha: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      motivo: 'Entrega programada jueves',
      option: 'ESTA_SEMANA',
    },
    ultimaVisita: {
      fecha: '2026-07-28T09:30:00.000Z',
      resultadoTexto: 'Compró mercadería',
      usuario: 'Repartidor Carlos',
    },
    createdAt: '2026-03-10T12:00:00.000Z',
    updatedAt: '2026-07-28T09:30:00.000Z',
  },
  {
    id: 'cli_5',
    nombre: 'Esteban Martínez',
    alias: 'Fiambrería y Chacinados Esteban',
    cuitDni: '20-31029384-5',
    telefono: '1173920192',
    direccion: 'Av. Mayo 560',
    localidad: 'Ramos Mejía',
    referenciaUbicacion: 'Local al lado de la farmacia',
    zonaRuta: 'Ruta 2 - Ramos / San Justo',
    frecuenciaVisita: 'QUINCENAL',
    categoria: 'FIAMBRERIA',
    estado: 'ACTIVO',
    limiteCredito: 600000,
    diasTopeCredito: 14,
    observaciones: 'Cliente chico pero muy constante. Paga siempre en efectivo.',
    proximaVisita: {
      fecha: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      motivo: 'Paso a ofrecer chacinados frescos',
      option: 'ESTA_SEMANA',
    },
    ultimaVisita: {
      fecha: '2026-07-26T08:30:00.000Z',
      resultadoTexto: 'Compró mercadería',
      usuario: 'Repartidor Miguel',
    },
    createdAt: '2026-04-05T14:00:00.000Z',
    updatedAt: '2026-07-26T08:30:00.000Z',
  },
];

// SVG generator sample
function generateBoletaSampleImage(numero: string, cliente: string, monto: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
    <rect width="600" height="800" fill="#fdfbf7" rx="12"/>
    <rect x="20" y="20" width="560" height="760" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6,6"/>
    <text x="300" y="70" font-family="monospace" font-size="28" font-weight="bold" fill="#0f172a" text-anchor="middle">C&amp;C DISTRIBUIDORA DE ACHURAS</text>
    <text x="300" y="100" font-family="sans-serif" font-size="16" fill="#64748b" text-anchor="middle">Boleta de Entrega N° ${numero}</text>
    <line x1="50" y1="120" x2="550" y2="120" stroke="#94a3b8" stroke-width="2"/>
    
    <text x="60" y="160" font-family="sans-serif" font-size="16" font-weight="bold" fill="#1e293b">CLIENTE: ${cliente}</text>
    <text x="60" y="190" font-family="sans-serif" font-size="14" fill="#475569">FECHA: 2026-07-26</text>
    
    <rect x="50" y="220" width="500" height="360" fill="#ffffff" stroke="#e2e8f0" rx="8"/>
    <text x="70" y="260" font-family="monospace" font-size="15" fill="#334155">• 3 Cajones Chinchulín Vacuno (60 kg) .... $ 320.000</text>
    <text x="70" y="300" font-family="monospace" font-size="15" fill="#334155">• 2 Cajones Mollejas de Garganta (30 kg) . $ 280.000</text>
    <text x="70" y="340" font-family="monospace" font-size="15" fill="#334155">• 4 Bolsas Hígado Fresco Selección ...... $ 150.000</text>
    <text x="70" y="380" font-family="monospace" font-size="15" fill="#334155">• 2 Cajas Matambre Vacuno ............... $ 190.000</text>

    <line x1="50" y1="600" x2="550" y2="600" stroke="#0f172a" stroke-width="3"/>
    <text x="350" y="640" font-family="sans-serif" font-size="22" font-weight="bold" fill="#0f172a">TOTAL: ${monto}</text>
    
    <rect x="70" y="680" width="180" height="60" fill="none" stroke="#dc2626" stroke-width="2" rx="6" transform="rotate(-5 160 710)"/>
    <text x="160" y="715" font-family="sans-serif" font-size="16" font-weight="bold" fill="#dc2626" text-anchor="middle" transform="rotate(-5 160 710)">ENTREGADO EN RUTA</text>

    <text x="450" y="730" font-family="sans-serif" font-size="12" fill="#94a3b8">Firma Chofer: Carlos C.</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

const MOCK_INITIAL_MOVEMENTS: Movement[] = [
  // Cliente 1
  {
    id: 'mov_1_1',
    customerId: 'cli_1',
    tipo: 'SALDO_INICIAL',
    fecha: '2026-06-01T08:00:00.000Z',
    monto: 350000,
    esDebito: true,
    descripcion: 'Saldo inicial de arranque de sistema',
    registradoPor: 'Administración',
    createdAt: '2026-06-01T08:00:00.000Z',
  },
  {
    id: 'mov_1_2',
    customerId: 'cli_1',
    tipo: 'BOLETA',
    fecha: '2026-07-10T09:30:00.000Z',
    numeroBoleta: 'B-00841',
    monto: 540000,
    esDebito: true,
    fotoUrl: generateBoletaSampleImage('B-00841', 'Carnicería Don Juan', '$ 540.000'),
    descripcion: '3 cajones achuras surtidas, 2 cajones mollejas',
    registradoPor: 'Repartidor Carlos',
    createdAt: '2026-07-10T09:30:00.000Z',
  },
  {
    id: 'mov_1_3',
    customerId: 'cli_1',
    tipo: 'PAGO',
    fecha: '2026-07-14T11:00:00.000Z',
    monto: 400000,
    esDebito: false,
    metodoPago: 'EFECTIVO',
    comprobantePago: 'Cobro en mano chofer',
    descripcion: 'Pago parcial entregado en local al chofer',
    registradoPor: 'Repartidor Carlos',
    createdAt: '2026-07-14T11:00:00.000Z',
  },
  {
    id: 'mov_1_4',
    customerId: 'cli_1',
    tipo: 'BOLETA',
    fecha: '2026-07-20T10:15:00.000Z',
    numeroBoleta: 'B-00912',
    monto: 680000,
    esDebito: true,
    fotoUrl: generateBoletaSampleImage('B-00912', 'Carnicería Don Juan', '$ 680.000'),
    descripcion: '4 cajones chinchulín, 3 riñones, 2 bolsas hígado',
    registradoPor: 'Repartidor Carlos',
    createdAt: '2026-07-20T10:15:00.000Z',
  },

  // Cliente 2
  {
    id: 'mov_2_1',
    customerId: 'cli_2',
    tipo: 'SALDO_INICIAL',
    fecha: '2026-06-01T08:00:00.000Z',
    monto: 1200000,
    esDebito: true,
    descripcion: 'Saldo inicial de apertura',
    registradoPor: 'Administración',
    createdAt: '2026-06-01T08:00:00.000Z',
  },
  {
    id: 'mov_2_2',
    customerId: 'cli_2',
    tipo: 'PAGO',
    fecha: '2026-07-15T15:00:00.000Z',
    monto: 1000000,
    esDebito: false,
    metodoPago: 'TRANSFERENCIA',
    comprobantePago: 'TRF-98230192',
    descripcion: 'Transferencia bancaria Banco Galicia',
    registradoPor: 'Administración',
    createdAt: '2026-07-15T15:00:00.000Z',
  },
  {
    id: 'mov_2_3',
    customerId: 'cli_2',
    tipo: 'BOLETA',
    fecha: '2026-07-25T11:45:00.000Z',
    numeroBoleta: 'B-00955',
    monto: 920000,
    esDebito: true,
    fotoUrl: generateBoletaSampleImage('B-00955', 'El Parrillón de Ramos', '$ 920.000'),
    descripcion: '5 cajones mollejas especiales, 4 chinchulín, 3 matambres',
    registradoPor: 'Repartidor Miguel',
    createdAt: '2026-07-25T11:45:00.000Z',
  },

  // Cliente 3 (Riesgoso)
  {
    id: 'mov_3_1',
    customerId: 'cli_3',
    tipo: 'SALDO_INICIAL',
    fecha: '2026-05-10T08:00:00.000Z',
    monto: 950000,
    esDebito: true,
    descripcion: 'Saldo acumulado histórico sin cancelar',
    registradoPor: 'Administración',
    createdAt: '2026-05-10T08:00:00.000Z',
  },
  {
    id: 'mov_3_2',
    customerId: 'cli_3',
    tipo: 'BOLETA',
    fecha: '2026-06-12T09:00:00.000Z',
    numeroBoleta: 'B-00710',
    monto: 420000,
    esDebito: true,
    fotoUrl: generateBoletaSampleImage('B-00710', 'Granja y Carnes Gómez', '$ 420.000'),
    descripcion: 'Entrega en local previo a la suspensión',
    registradoPor: 'Repartidor Miguel',
    createdAt: '2026-06-12T09:00:00.000Z',
  },

  // Cliente 4
  {
    id: 'mov_4_1',
    customerId: 'cli_4',
    tipo: 'BOLETA',
    fecha: '2026-07-27T16:00:00.000Z',
    numeroBoleta: 'B-00980',
    monto: 1100000,
    esDebito: true,
    fotoUrl: generateBoletaSampleImage('B-00980', 'Super Los Hermanos', '$ 1.100.000'),
    descripcion: 'Mercadería semanal completa achuras y cortes vacunos',
    registradoPor: 'Repartidor Carlos',
    createdAt: '2026-07-27T16:00:00.000Z',
  },
  {
    id: 'mov_4_2',
    customerId: 'cli_4',
    tipo: 'PAGO',
    fecha: '2026-07-28T09:30:00.000Z',
    monto: 800000,
    esDebito: false,
    metodoPago: 'TRANSFERENCIA',
    comprobantePago: 'TRF-11029384',
    descripcion: 'Abono rápido por transferencia matutina',
    registradoPor: 'Administración',
    createdAt: '2026-07-28T09:30:00.000Z',
  },

  // Cliente 5
  {
    id: 'mov_5_1',
    customerId: 'cli_5',
    tipo: 'BOLETA',
    fecha: '2026-07-26T08:30:00.000Z',
    numeroBoleta: 'B-00962',
    monto: 280000,
    esDebito: true,
    fotoUrl: generateBoletaSampleImage('B-00962', 'Fiambrería Esteban', '$ 280.000'),
    descripcion: '2 cajones chacinados frescos y mollejas de cerdo',
    registradoPor: 'Repartidor Miguel',
    createdAt: '2026-07-26T08:30:00.000Z',
  },
  {
    id: 'mov_5_2',
    customerId: 'cli_5',
    tipo: 'PAGO',
    fecha: '2026-07-26T08:35:00.000Z',
    monto: 280000,
    esDebito: false,
    metodoPago: 'EFECTIVO',
    comprobantePago: 'Efectivo contra-entrega',
    descripcion: 'Pago total en efectivo en el momento',
    registradoPor: 'Repartidor Miguel',
    createdAt: '2026-07-26T08:35:00.000Z',
  },
];

const MOCK_INITIAL_VISITS: CustomerVisit[] = [
  {
    id: 'vis_1',
    customerId: 'cli_1',
    fechaHora: '2026-07-26T10:30:00.000Z',
    usuario: 'Repartidor Carlos',
    resultado: 'COMPRO_MERCADERIA',
    resultadoTexto: 'Compró mercadería',
    observacion: 'Entregada boleta B-00912. Pidió que volvamos hoy para cobro.',
    proximaVisitaOption: 'PROXIMO_REPARTO',
    proximaVisitaFecha: new Date().toISOString().split('T')[0],
    createdAt: '2026-07-26T10:30:00.000Z',
  },
  {
    id: 'vis_2',
    customerId: 'cli_3',
    fechaHora: '2026-07-27T09:15:00.000Z',
    usuario: 'Repartidor Miguel',
    resultado: 'NO_RESPONDIO',
    resultadoTexto: 'No respondió',
    observacion: 'Se tocó timbre en el local pero estaba cerrado con persiana a media asta.',
    proximaVisitaOption: 'PROXIMO_REPARTO',
    proximaVisitaFecha: new Date().toISOString().split('T')[0],
    createdAt: '2026-07-27T09:15:00.000Z',
  },
  {
    id: 'vis_3',
    customerId: 'cli_5',
    fechaHora: '2026-07-26T08:30:00.000Z',
    usuario: 'Repartidor Miguel',
    resultado: 'COMPRO_MERCADERIA',
    resultadoTexto: 'Compró mercadería',
    observacion: 'Pagó al contado $280.000 en efectivo.',
    proximaVisitaOption: 'ESTA_SEMANA',
    proximaVisitaFecha: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    createdAt: '2026-07-26T08:30:00.000Z',
  },
];

const MOCK_INITIAL_ACTIVITY: ActivityLogEntry[] = [
  {
    id: 'act_1',
    fechaHora: '2026-07-28T08:15:00.000Z',
    usuario: 'Axel (Administrador)',
    accion: 'registró una boleta N° B-00980 para Super Los Hermanos',
    tipoAccion: 'BOLETA',
    customerId: 'cli_4',
    customerName: 'Super Los Hermanos',
  },
  {
    id: 'act_2',
    fechaHora: '2026-07-28T09:02:00.000Z',
    usuario: 'Juan (Repartidor)',
    accion: 'registró una visita a Granja y Carnes Gómez (No respondió)',
    tipoAccion: 'VISITA',
    customerId: 'cli_3',
    customerName: 'Granja y Carnes Gómez',
  },
  {
    id: 'act_3',
    fechaHora: '2026-07-28T09:45:00.000Z',
    usuario: 'Pedro (Repartidor)',
    accion: 'envió WhatsApp solicitando pedido a Carnicería Don Juan',
    tipoAccion: 'WHATSAPP',
    customerId: 'cli_1',
    customerName: 'Carnicería Don Juan',
  },
  {
    id: 'act_4',
    fechaHora: '2026-07-28T10:20:00.000Z',
    usuario: 'Axel (Administrador)',
    accion: 'registró un pago de $800.000 por transferencia de Super Los Hermanos',
    tipoAccion: 'PAGO',
    customerId: 'cli_4',
    customerName: 'Super Los Hermanos',
  },
];

// LocalStorage helpers
export function getStoredCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    if (!raw) {
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(MOCK_INITIAL_CUSTOMERS));
      return MOCK_INITIAL_CUSTOMERS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error leyendo clientes de localStorage', err);
    return MOCK_INITIAL_CUSTOMERS;
  }
}

export function saveCustomers(customers: Customer[]): void {
  try {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
  } catch (err) {
    console.error('Error guardando clientes en localStorage', err);
  }
}

export function getStoredMovements(): Movement[] {
  try {
    const raw = localStorage.getItem(MOVEMENTS_KEY);
    if (!raw) {
      localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(MOCK_INITIAL_MOVEMENTS));
      return MOCK_INITIAL_MOVEMENTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error leyendo movimientos de localStorage', err);
    return MOCK_INITIAL_MOVEMENTS;
  }
}

export function saveMovements(movements: Movement[]): void {
  try {
    localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));
  } catch (err) {
    console.error('Error guardando movimientos en localStorage', err);
  }
}

export function getStoredVisits(): CustomerVisit[] {
  try {
    const raw = localStorage.getItem(VISITS_KEY);
    if (!raw) {
      localStorage.setItem(VISITS_KEY, JSON.stringify(MOCK_INITIAL_VISITS));
      return MOCK_INITIAL_VISITS;
    }
    return JSON.parse(raw);
  } catch (err) {
    return MOCK_INITIAL_VISITS;
  }
}

export function saveVisits(visits: CustomerVisit[]): void {
  try {
    localStorage.setItem(VISITS_KEY, JSON.stringify(visits));
  } catch (err) {
    console.error('Error guardando visitas', err);
  }
}

export function getWhatsAppTemplates(): WhatsAppTemplates {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) return DEFAULT_WHATSAPP_TEMPLATES;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_WHATSAPP_TEMPLATES;
  }
}

export function saveWhatsAppTemplates(templates: WhatsAppTemplates): void {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error('Error guardando plantillas', err);
  }
}

// Configuración de comportamiento de WhatsApp post-venta
export function getWhatsAppBehavior(): WhatsAppPostSaleBehavior {
  try {
    const raw = localStorage.getItem(WA_BEHAVIOR_KEY);
    if (!raw) return 'ALWAYS_AUTO'; // "Enviar siempre automáticamente" por defecto
    return raw as WhatsAppPostSaleBehavior;
  } catch {
    return 'ALWAYS_AUTO';
  }
}

export function saveWhatsAppBehavior(behavior: WhatsAppPostSaleBehavior): void {
  try {
    localStorage.setItem(WA_BEHAVIOR_KEY, behavior);
  } catch (err) {
    console.error('Error guardando preferencia de WhatsApp', err);
  }
}

// Modo Offline Simulado para testing
export function isSimulatedOffline(): boolean {
  try {
    return localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSimulatedOffline(offline: boolean): void {
  try {
    localStorage.setItem(SIMULATED_OFFLINE_KEY, offline ? 'true' : 'false');
  } catch (err) {
    console.error('Error guardando estado offline simulado', err);
  }
}

// Ventas Pendientes de Sincronización
export function getPendingSales(): PendingSale[] {
  try {
    const raw = localStorage.getItem(PENDING_SALES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function savePendingSales(pending: PendingSale[]): void {
  try {
    localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(pending));
  } catch (err) {
    console.error('Error guardando ventas pendientes', err);
  }
}

export function syncPendingSales(): number {
  const pending = getPendingSales();
  if (pending.length === 0) return 0;

  // Marcar todas como sincronizadas
  const syncedCount = pending.filter((p) => !p.sincronizado).length;
  const updated = pending.map((p) => ({ ...p, sincronizado: true }));
  savePendingSales(updated);
  return syncedCount;
}

export function clearSyncedPendingSales(): void {
  const pending = getPendingSales().filter((p) => !p.sincronizado);
  savePendingSales(pending);
}

export interface FinalizeSaleParams {
  customer: CustomerWithBalance;
  montoTotal: number;
  estadoPago: PaymentStatus;
  montoAbonado: number;
  medioPago?: PaymentMethod;
  fotoUrl: string; // OBLIGATORIA
  usuarioActual: string;
}

export interface FinalizeSaleResult {
  success: boolean;
  boletaMovement: Movement;
  pagoMovement?: Movement;
  whatsappMessage: string;
  whatsappUrl: string;
  nuevoSaldo: number;
  isOffline: boolean;
  pendingSaleObj?: PendingSale;
}

/**
 * FLUJO ATÓMICO: "FINALIZAR VENTA"
 * Ejecuta todas las acciones en un solo paso:
 * 1. Guarda la boleta
 * 2. Registra el pago (si existió)
 * 3. Actualiza saldo
 * 4. Asocia la foto obligatoria
 * 5. Registra visita comercial
 * 6. Guarda log de auditoría
 * 7. Prepara mensaje e integración directa con WhatsApp
 * 8. Maneja cola offline si no hay señal
 */
export function finalizeCompleteSaleTransaction(params: FinalizeSaleParams): FinalizeSaleResult {
  const {
    customer,
    montoTotal,
    estadoPago,
    montoAbonado,
    medioPago,
    fotoUrl,
    usuarioActual,
  } = params;

  if (!fotoUrl) {
    throw new Error('Para finalizar la venta es obligatorio guardar una fotografía de la boleta.');
  }

  const saldoRestante = montoTotal - montoAbonado;
  const nuevoSaldo = customer.saldoActual + saldoRestante;
  const numBoleta = `B-${String(Date.now()).slice(-5)}`;
  const fechaIso = new Date().toISOString();
  const fechaLegible = formatDate(fechaIso);

  // Mapeo textual de estado para el mensaje
  let estadoText = 'Debe';
  if (estadoPago === 'EFECTIVO') estadoText = 'Pagó efectivo';
  if (estadoPago === 'TRANSFERENCIA') estadoText = 'Pagó transferencia';
  if (estadoPago === 'PARCIAL') estadoText = `Pago parcial (${formatCurrency(montoAbonado)})`;

  // 1. Crear Movimiento de Boleta
  const boletaMovement = addMovement(
    {
      customerId: customer.id,
      tipo: 'BOLETA',
      fecha: fechaIso,
      numeroBoleta: numBoleta,
      monto: montoTotal,
      esDebito: true,
      fotoUrl,
      descripcion: `Venta en reparto (${estadoText})`,
      registradoPor: usuarioActual,
    },
    usuarioActual
  );

  // 2. Crear Movimiento de Pago si abonó algo
  let pagoMovement: Movement | undefined = undefined;
  if (montoAbonado > 0) {
    pagoMovement = addMovement(
      {
        customerId: customer.id,
        tipo: 'PAGO',
        fecha: fechaIso,
        monto: montoAbonado,
        esDebito: false,
        metodoPago: medioPago || (estadoPago === 'TRANSFERENCIA' ? 'TRANSFERENCIA' : 'EFECTIVO'),
        comprobantePago: 'Cobro contra-entrega reparto',
        descripcion:
          estadoPago === 'PARCIAL'
            ? `Pago parcial sobre boleta N° ${numBoleta}`
            : `Pago total de boleta N° ${numBoleta}`,
        registradoPor: usuarioActual,
      },
      usuarioActual
    );
  }

  // 3. Registrar visita de reparto realizada
  addVisit(
    {
      customerId: customer.id,
      fechaHora: fechaIso,
      usuario: usuarioActual,
      resultado: 'COMPRO_MERCADERIA',
      resultadoTexto: 'Compró mercadería (Venta Finalizada)',
      observacion: `Boleta N° ${numBoleta} por ${formatCurrency(montoTotal)}. Estado: ${estadoText}.`,
      proximaVisitaOption: 'PROXIMO_REPARTO',
    },
    usuarioActual
  );

  // Check Offline
  const isOffline = !navigator.onLine || isSimulatedOffline();

  // Objeto de Venta Pendiente
  const pendingObj: PendingSale = {
    id: 'pend_' + Date.now(),
    customerId: customer.id,
    customerName: customer.alias || customer.nombre,
    montoTotal,
    estadoPago,
    montoAbonado,
    medioPago,
    saldoRestante,
    saldoAnterior: customer.saldoActual,
    nuevoSaldo,
    fotoUrl,
    fechaHora: fechaIso,
    usuario: usuarioActual,
    whatsappStatus: isOffline ? 'PENDIENTE' : 'ENVIADO',
    sincronizado: !isOffline,
  };

  const pendingSales = getPendingSales();
  pendingSales.unshift(pendingObj);
  savePendingSales(pendingSales);

  // 4. Construir Mensaje de WhatsApp exacto solicitado
  let waMessage = `📄 *Nueva boleta registrada*\n\n`;
  waMessage += `*Cliente:*\n${customer.alias || customer.nombre}\n\n`;
  waMessage += `*Fecha:*\n${fechaLegible}\n\n`;
  waMessage += `*Estado:*\n${estadoText}\n\n`;
  waMessage += `*Total:*\n${formatCurrency(montoTotal)}\n\n`;
  if (montoAbonado > 0) {
    waMessage += `*Abonado:*\n${formatCurrency(montoAbonado)}\n\n`;
  }
  waMessage += `*Saldo actualizado:*\n${formatCurrency(nuevoSaldo)}`;

  const cleanPhone = cleanPhoneNumber(customer.telefono);
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`;

  return {
    success: true,
    boletaMovement,
    pagoMovement,
    whatsappMessage: waMessage,
    whatsappUrl,
    nuevoSaldo,
    isOffline,
    pendingSaleObj: pendingObj,
  };
}

export function getActivityLogs(): ActivityLogEntry[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    if (!raw) {
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(MOCK_INITIAL_ACTIVITY));
      return MOCK_INITIAL_ACTIVITY;
    }
    return JSON.parse(raw);
  } catch {
    return MOCK_INITIAL_ACTIVITY;
  }
}

export function addActivityLog(
  usuario: string,
  accion: string,
  tipoAccion: ActivityLogEntry['tipoAccion'],
  customerId?: string,
  customerName?: string,
  detalles?: string
): ActivityLogEntry {
  const logs = getActivityLogs();
  const newLog: ActivityLogEntry = {
    id: 'act_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    fechaHora: new Date().toISOString(),
    usuario,
    accion,
    tipoAccion,
    customerId,
    customerName,
    detalles,
  };

  logs.unshift(newLog);
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Error guardando log de actividad', err);
  }
  return newLog;
}

export function getCustomersWithBalances(): CustomerWithBalance[] {
  const customers = getStoredCustomers();
  const movements = getStoredMovements();

  return customers.map((c) => {
    const riskData = calculateCustomerRisk(c, movements);
    return {
      ...c,
      ...riskData,
    };
  });
}

export function addCustomer(
  newCustData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>,
  initialBalance: number = 0,
  usuarioActual: string = 'Administrador'
): Customer {
  const customers = getStoredCustomers();
  const newCust: Customer = {
    ...newCustData,
    id: 'cli_' + Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  customers.unshift(newCust);
  saveCustomers(customers);

  addActivityLog(
    usuarioActual,
    `creó el nuevo cliente ${newCust.alias || newCust.nombre}`,
    'CLIENTE',
    newCust.id,
    newCust.alias || newCust.nombre
  );

  if (initialBalance > 0) {
    addMovement({
      customerId: newCust.id,
      tipo: 'SALDO_INICIAL',
      fecha: new Date().toISOString(),
      monto: Math.abs(initialBalance),
      esDebito: true,
      descripcion: 'Saldo inicial de arranque de cuenta',
      registradoPor: usuarioActual,
    });
  }

  return newCust;
}

export function updateCustomer(
  id: string,
  updatedFields: Partial<Customer>,
  usuarioActual: string = 'Administrador'
): void {
  const customers = getStoredCustomers();
  const index = customers.findIndex((c) => c.id === id);
  if (index !== -1) {
    const oldName = customers[index].alias || customers[index].nombre;
    customers[index] = {
      ...customers[index],
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };
    saveCustomers(customers);

    addActivityLog(
      usuarioActual,
      `actualizó la información del cliente ${oldName}`,
      'CLIENTE',
      id,
      oldName
    );
  }
}

export function addMovement(
  newMovData: Omit<Movement, 'id' | 'createdAt'>,
  usuarioActual: string = 'Administrador'
): Movement {
  const movements = getStoredMovements();
  const newMov: Movement = {
    ...newMovData,
    id: 'mov_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    createdAt: new Date().toISOString(),
  };

  movements.unshift(newMov);
  saveMovements(movements);

  const customers = getStoredCustomers();
  const cust = customers.find((c) => c.id === newMov.customerId);
  const custName = cust ? cust.alias || cust.nombre : 'Cliente';

  let verb = 'registró un movimiento';
  if (newMov.tipo === 'BOLETA') {
    verb = `registró la boleta N° ${newMov.numeroBoleta || 'S/N'} por ${formatCurrency(newMov.monto)}`;
  } else if (newMov.tipo === 'PAGO') {
    verb = `registró un pago de ${formatCurrency(newMov.monto)} (${newMov.metodoPago || 'Efectivo'})`;
  } else if (newMov.tipo === 'AJUSTE') {
    verb = `registró un ajuste de saldo por ${formatCurrency(newMov.monto)}`;
  }

  addActivityLog(
    usuarioActual,
    `${verb} para ${custName}`,
    newMov.tipo === 'BOLETA' ? 'BOLETA' : newMov.tipo === 'PAGO' ? 'PAGO' : 'AJUSTE',
    newMov.customerId,
    custName
  );

  recordAuditLog({
    usuario: usuarioActual,
    rol: 'ADMINISTRADOR',
    accion: verb,
    tipoAccion: newMov.tipo === 'BOLETA' ? 'VENTA' : newMov.tipo === 'PAGO' ? 'PAGO' : 'AJUSTE',
    customerId: newMov.customerId,
    customerName: custName,
    detalles: `Monto: ${formatCurrency(newMov.monto)}. Desc: ${newMov.descripcion}`,
  });

  autoSaveSnapshot();

  return newMov;
}

/**
 * ANULACIÓN SEGURA E INMUTABLE
 * Nunca elimina un movimiento histórico. Genera un movimiento inverso y registra auditoría.
 */
export function anularMovement(
  movementId: string,
  user: AppUser,
  motivo: string
): Movement {
  const movements = getStoredMovements();
  const index = movements.findIndex((m) => m.id === movementId);

  if (index === -1) {
    throw new Error('El movimiento especificado no existe.');
  }

  const target = movements[index];
  if (target.isAnulado) {
    throw new Error('El movimiento ya se encuentra anulado.');
  }

  const nowIso = new Date().toISOString();

  // 1. Marcar movimiento original como anulado
  movements[index] = {
    ...target,
    isAnulado: true,
    anuladoPor: `${user.nombre} (${user.role})`,
    anuladoAt: nowIso,
    motivoAnulacion: motivo,
  };

  // 2. Crear movimiento inverso compensatorio
  const reversalMov: Movement = {
    id: 'mov_rev_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    customerId: target.customerId,
    tipo: 'AJUSTE',
    fecha: nowIso,
    monto: target.monto,
    esDebito: !target.esDebito, // Invertir efecto contable
    descripcion: `ANULACIÓN REVERTIDA: ${target.tipo} (${target.numeroBoleta || 'S/N'}). Motivo: ${motivo}`,
    registradoPor: `${user.nombre} (${user.role})`,
    createdAt: nowIso,
  };

  movements.unshift(reversalMov);
  saveMovements(movements);

  const customers = getStoredCustomers();
  const cust = customers.find((c) => c.id === target.customerId);
  const custName = cust ? cust.alias || cust.nombre : 'Cliente';

  // 3. Registrar en Auditoría e Historial
  addActivityLog(
    user.nombre,
    `ANULÓ el movimiento N° ${target.numeroBoleta || target.id} de ${custName}`,
    'AJUSTE',
    target.customerId,
    custName,
    `Motivo: ${motivo}`
  );

  recordAuditLog({
    usuario: user.nombre,
    username: user.username,
    rol: user.role,
    accion: `Anuló ${target.tipo} N° ${target.numeroBoleta || target.id}`,
    tipoAccion: 'ANULACION',
    customerId: target.customerId,
    customerName: custName,
    resultado: 'EXITO',
    detalles: `Reversión contable generada. Motivo: ${motivo}`,
  });

  autoSaveSnapshot();

  return reversalMov;
}

export function addVisit(
  visitData: Omit<CustomerVisit, 'id' | 'createdAt'>,
  usuarioActual: string = 'Repartidor'
): CustomerVisit {
  const visits = getStoredVisits();
  const newVisit: CustomerVisit = {
    ...visitData,
    id: 'vis_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    createdAt: new Date().toISOString(),
  };

  visits.unshift(newVisit);
  saveVisits(visits);

  // Actualizar la última visita y próxima visita en el cliente
  const customers = getStoredCustomers();
  const index = customers.findIndex((c) => c.id === newVisit.customerId);
  if (index !== -1) {
    const cust = customers[index];

    let proximaInfo: ProximaVisitaInfo | undefined = undefined;
    if (newVisit.proximaVisitaOption && newVisit.proximaVisitaOption !== 'NO_VOLVER') {
      let fechaTarget = newVisit.proximaVisitaFecha;
      const today = new Date();

      if (newVisit.proximaVisitaOption === 'PROXIMO_REPARTO') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        fechaTarget = tomorrow.toISOString().split('T')[0];
      } else if (newVisit.proximaVisitaOption === 'ESTA_SEMANA') {
        const inThreeDays = new Date(today);
        inThreeDays.setDate(inThreeDays.getDate() + 3);
        fechaTarget = inThreeDays.toISOString().split('T')[0];
      }

      proximaInfo = {
        fecha: fechaTarget || today.toISOString().split('T')[0],
        motivo: `Pactado en visita anterior (${newVisit.resultadoTexto})`,
        option: newVisit.proximaVisitaOption,
      };
    }

    customers[index] = {
      ...cust,
      ultimaVisita: {
        fecha: newVisit.fechaHora,
        resultadoTexto: newVisit.resultadoTexto,
        usuario: newVisit.usuario,
      },
      proximaVisita: proximaInfo,
      updatedAt: new Date().toISOString(),
    };
    saveCustomers(customers);

    addActivityLog(
      usuarioActual,
      `registró una visita a ${cust.alias || cust.nombre} (${newVisit.resultadoTexto})`,
      'VISITA',
      cust.id,
      cust.alias || cust.nombre,
      newVisit.observacion
    );
  }

  return newVisit;
}

/**
 * Genera recordatorios inteligentes automáticos para el usuario
 */
export function getSmartReminders(
  customers: CustomerWithBalance[],
  movements: Movement[],
  visits: CustomerVisit[]
): SmartReminder[] {
  const reminders: SmartReminder[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  customers.forEach((c) => {
    const custName = c.alias || c.nombre;

    // 1. Cliente pidió que vuelvan hoy o está atrasado
    if (c.proximaVisita && c.proximaVisita.fecha <= todayStr) {
      reminders.push({
        id: `rem_vis_${c.id}`,
        customerId: c.id,
        customerName: custName,
        tipo: 'VOLVER_HOY',
        mensaje: `Programado para volver a visitar hoy (${c.proximaVisita.motivo})`,
        prioridad: 'alta',
      });
    }

    // 2. Hace más de 15 días que no compra
    if (c.evaluacionRiesgo.lastPurchaseDays >= 15 && c.estado === 'ACTIVO') {
      reminders.push({
        id: `rem_pur_${c.id}`,
        customerId: c.id,
        customerName: custName,
        tipo: 'SIN_COMPRA_15D',
        mensaje: `Hace ${c.evaluacionRiesgo.lastPurchaseDays} días que no realiza pedidos de mercadería.`,
        prioridad: 'media',
      });
    }

    // 3. Hace más de 20 días que no paga y tiene deuda
    if (c.saldoActual > 0 && c.evaluacionRiesgo.lastPaymentDays >= 20) {
      reminders.push({
        id: `rem_pay_${c.id}`,
        customerId: c.id,
        customerName: custName,
        tipo: 'SIN_PAGO_20D',
        mensaje: `Tiene saldo adeudado de ${formatCurrency(c.saldoActual)} y no registra pagos hace ${c.evaluacionRiesgo.lastPaymentDays} días.`,
        prioridad: 'alta',
      });
    }

    // 4. Deuda Alta / Excedida
    if (c.saldoActual > 0 && (c.saldoActual >= c.limiteCredito * 0.8 || c.saldoActual > 700000)) {
      reminders.push({
        id: `rem_debt_${c.id}`,
        customerId: c.id,
        customerName: custName,
        tipo: 'DEUDA_ALTA',
        mensaje: `Posee una deuda importante de ${formatCurrency(c.saldoActual)}.`,
        prioridad: 'alta',
      });
    }
  });

  return reminders;
}

/**
 * Obtiene la Línea de Tiempo Comercial Única del Cliente
 */
export function getCustomerTimeline(
  customerId: string,
  movements: Movement[],
  visits: CustomerVisit[],
  activityLogs: ActivityLogEntry[]
): TimelineItem[] {
  const timeline: TimelineItem[] = [];

  // Movimientos financieros (Boletas, Pagos, Ajustes)
  movements
    .filter((m) => m.customerId === customerId)
    .forEach((m) => {
      let titulo = 'Movimiento';
      if (m.tipo === 'BOLETA') titulo = `Boleta Entregada N° ${m.numeroBoleta || 'S/N'}`;
      if (m.tipo === 'PAGO') titulo = `Pago Recibido (${m.metodoPago || 'Efectivo'})`;
      if (m.tipo === 'AJUSTE') titulo = 'Ajuste de Saldo';
      if (m.tipo === 'SALDO_INICIAL') titulo = 'Saldo Inicial Registrado';

      timeline.push({
        id: m.id,
        tipoItem: m.tipo === 'BOLETA' ? 'BOLETA' : m.tipo === 'PAGO' ? 'PAGO' : 'AJUSTE',
        fechaHora: m.fecha,
        titulo,
        subtitulo: m.descripcion,
        monto: m.monto,
        esDebito: m.esDebito,
        usuario: m.registradoPor,
        fotoUrl: m.fotoUrl,
      });
    });

  // Visitas
  visits
    .filter((v) => v.customerId === customerId)
    .forEach((v) => {
      timeline.push({
        id: v.id,
        tipoItem: 'VISITA',
        fechaHora: v.fechaHora,
        titulo: `Visita en Local: ${v.resultadoTexto}`,
        subtitulo: v.observacion || 'Sin observaciones adicionales',
        usuario: v.usuario,
        detalles: v.proximaVisitaOption ? `Próxima visita: ${v.proximaVisitaOption}` : undefined,
      });
    });

  // Actividades registradas (WhatsApp, Llamadas, etc)
  activityLogs
    .filter((a) => a.customerId === customerId && (a.tipoAccion === 'WHATSAPP' || a.tipoAccion === 'LLAMADA' || a.tipoAccion === 'CLIENTE'))
    .forEach((a) => {
      timeline.push({
        id: a.id,
        tipoItem: a.tipoAccion === 'WHATSAPP' ? 'WHATSAPP' : 'OBSERVACION',
        fechaHora: a.fechaHora,
        titulo: a.tipoAccion === 'WHATSAPP' ? 'Mensaje de WhatsApp' : 'Acción Comercial',
        subtitulo: a.accion,
        usuario: a.usuario,
        detalles: a.detalles,
      });
    });

  // Ordenar cronológicamente descendente (más reciente primero)
  return timeline.sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
}

export function resetToDemoData(): void {
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(MOCK_INITIAL_CUSTOMERS));
  localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(MOCK_INITIAL_MOVEMENTS));
  localStorage.setItem(VISITS_KEY, JSON.stringify(MOCK_INITIAL_VISITS));
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(MOCK_INITIAL_ACTIVITY));
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(DEFAULT_WHATSAPP_TEMPLATES));
}

export function exportAllDataJSON(): string {
  const data = {
    app: 'C&C Gestión',
    version: '3.0',
    exportedAt: new Date().toISOString(),
    customers: getStoredCustomers(),
    movements: getStoredMovements(),
    visits: getStoredVisits(),
    activity: getActivityLogs(),
    templates: getWhatsAppTemplates(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllDataJSON(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed.customers) && Array.isArray(parsed.movements)) {
      saveCustomers(parsed.customers);
      saveMovements(parsed.movements);
      if (Array.isArray(parsed.visits)) saveVisits(parsed.visits);
      if (parsed.templates) saveWhatsAppTemplates(parsed.templates);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error importando JSON', err);
    return false;
  }
}
