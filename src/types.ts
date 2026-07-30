export type MovementType = 'BOLETA' | 'PAGO' | 'AJUSTE' | 'SALDO_INICIAL';

export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'OTRO';

export type CustomerCategory = 'CARNICERIA' | 'FIAMBRERIA' | 'RESTAURANTE_SUPER' | 'REVENDEDOR' | 'PARTICULAR';

export type CustomerStatus = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';

export type VisitFrequency = 'DIARIA' | 'SEMANAL' | 'BISEMANAL' | 'QUINCENAL';

export type RiskLevel = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';

export type UserRole = 'DUENO' | 'ADMINISTRADOR' | 'REPARTIDOR';

export interface AppUser {
  id: string;
  nombre: string;
  apellido: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  activo: boolean;
  createdAt: string;
  lastAccessAt?: string;
  updatedAt: string;
}

export type VisitResult =
  | 'COMPRO_MERCADERIA'
  | 'NO_QUISO_MERCADERIA'
  | 'LOCAL_CERRADO'
  | 'NO_RESPONDIO'
  | 'DE_VACACIONES'
  | 'PEDIDO_PERSONAL'
  | 'OTRO';

export type ProximaVisitaOp = 'NO_VOLVER' | 'PROXIMO_REPARTO' | 'ESTA_SEMANA' | 'FECHA_ESPECIFICA';

export interface ProximaVisitaInfo {
  fecha: string; // ISO date YYYY-MM-DD
  motivo: string;
  option: ProximaVisitaOp;
}

export interface UltimaVisitaInfo {
  fecha: string;
  resultadoTexto: string;
  usuario: string;
}

export interface CustomerVisit {
  id: string;
  customerId: string;
  fechaHora: string; // ISO String
  usuario: string;
  resultado: VisitResult;
  resultadoTexto: string;
  observacion?: string;
  proximaVisitaOption?: ProximaVisitaOp;
  proximaVisitaFecha?: string;
  createdAt: string;
}

export interface WhatsAppTemplates {
  informarSaldo: string;
  solicitarPedido: string;
}

export interface ActivityLogEntry {
  id: string;
  fechaHora: string; // ISO String
  usuario: string;
  accion: string;
  tipoAccion: 'BOLETA' | 'PAGO' | 'AJUSTE' | 'VISITA' | 'WHATSAPP' | 'LLAMADA' | 'CLIENTE' | 'CONFIG';
  customerId?: string;
  customerName?: string;
  detalles?: string;
}

export interface RiskFactor {
  factor: string;
  points: number;
  severity: 'info' | 'warning' | 'danger';
}

export interface RiskEvaluation {
  score: number; // 0 to 100 (higher = riskier)
  level: RiskLevel;
  factors: RiskFactor[];
  lastPurchaseDays: number;
  lastPaymentDays: number;
  overdueAmount: number;
  creditUsagePercent: number;
}

export interface Customer {
  id: string;
  nombre: string;
  alias: string; // Nombre fantasía (ej: "Carnicería Don Juan")
  cuitDni: string;
  telefono: string;
  direccion: string;
  localidad: string;
  referenciaUbicacion?: string;
  zonaRuta: string; // ej: "Zona Norte - Ruta 1"
  frecuenciaVisita: VisitFrequency;
  categoria: CustomerCategory;
  estado: CustomerStatus;
  limiteCredito: number; // $ ARS
  diasTopeCredito: number; // Días máximos de plazo
  observaciones: string;
  proximaVisita?: ProximaVisitaInfo;
  ultimaVisita?: UltimaVisitaInfo;
  createdAt: string;
  updatedAt: string;
}

export interface Movement {
  id: string;
  customerId: string;
  tipo: MovementType;
  fecha: string; // ISO String (YYYY-MM-DDTHH:mm)
  numeroBoleta?: string; // Para tipo BOLETA
  monto: number; // Positivo siempre. Boleta suma saldo, Pago resta saldo, Ajuste modifica saldo según signo o tipo
  esDebito: boolean; // true = aumenta deuda (Boleta, Ajuste positivo, Saldo Inicial), false = disminuye deuda (Pago, Ajuste negativo)
  metodoPago?: PaymentMethod; // Para tipo PAGO
  comprobantePago?: string; // Nro transferencia o cheque
  fotoUrl?: string; // Data URL or Blob URL de la boleta
  descripcion: string;
  registradoPor: string;
  createdAt: string;
  isAnulado?: boolean;
  anuladoPor?: string;
  anuladoAt?: string;
  motivoAnulacion?: string;
  movimientoInversoId?: string;
}

export interface CustomerWithBalance extends Customer {
  saldoActual: number;
  fechaUltimaCompra?: string;
  fechaUltimoPago?: string;
  evaluacionRiesgo: RiskEvaluation;
  totalBoletasHistorico: number;
  totalPagosHistorico: number;
}

export interface CollectionRouteGroup {
  zonaRuta: string;
  customers: CustomerWithBalance[];
  totalDeudaZona: number;
  clientesConDeudaCount: number;
}

export interface DailyCollectionSummary {
  totalCobradoHoy: number;
  pagosCountHoy: number;
  cobrosEfectivo: number;
  cobrosTransferencia: number;
  cobrosCheque: number;
}

export interface SmartReminder {
  id: string;
  customerId: string;
  customerName: string;
  tipo: 'VOLVER_HOY' | 'SIN_COMPRA_15D' | 'SIN_PAGO_20D' | 'DEUDA_ALTA' | 'SIN_VISITA';
  mensaje: string;
  prioridad: 'alta' | 'media' | 'baja';
}

export interface TimelineItem {
  id: string;
  tipoItem: 'BOLETA' | 'PAGO' | 'AJUSTE' | 'VISITA' | 'WHATSAPP' | 'OBSERVACION';
  fechaHora: string;
  titulo: string;
  subtitulo: string;
  monto?: number;
  esDebito?: boolean;
  usuario: string;
  detalles?: string;
  fotoUrl?: string;
}

export type WhatsAppPostSaleBehavior = 'ALWAYS_AUTO' | 'ASK' | 'NONE';

export type PaymentStatus = 'EFECTIVO' | 'TRANSFERENCIA' | 'PARCIAL' | 'DEBE';

export interface PendingSale {
  id: string;
  customerId: string;
  customerName: string;
  montoTotal: number;
  estadoPago: PaymentStatus;
  montoAbonado: number;
  medioPago?: PaymentMethod;
  saldoRestante: number;
  saldoAnterior: number;
  nuevoSaldo: number;
  fotoUrl: string; // Obligatoria
  fechaHora: string;
  usuario: string;
  whatsappStatus: 'PENDIENTE' | 'ENVIADO' | 'NO_REQUERIDO';
  sincronizado: boolean;
}
