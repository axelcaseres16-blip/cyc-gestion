export type MovementType = 'BOLETA' | 'PAGO' | 'AJUSTE' | 'SALDO_INICIAL';

export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'OTRO';

export type CustomerCategory = 'CARNICERIA' | 'FIAMBRERIA' | 'RESTAURANTE_SUPER' | 'REVENDEDOR' | 'PARTICULAR';

export type CustomerStatus = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';

export type VisitFrequency = 'DIARIA' | 'SEMANAL' | 'BISEMANAL' | 'QUINCENAL';

export type RiskLevel = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';

export type UserRole = 'DUENO' | 'ADMINISTRADOR' | 'REPARTIDOR';

export type PriceListType = 'GENERAL' | 'MAYORISTA' | 'ESPECIAL' | 'PERSONALIZADA';

export type ProductVentaType = 'POR_KILO' | 'POR_UNIDAD' | 'UNIDADES_INFORMATIVAS_COBRO_POR_KILO';

export type StockControlType = 'UNIDADES_Y_KILOS' | 'SOLO_KILOS' | 'SOLO_UNIDADES' | 'UNIDADES_INFORMATIVAS_COBRO_POR_KILO';

export interface Product {
  id: string;
  codigo: string;
  nombre: string;
  tipoVenta: ProductVentaType;
  tipoControlStock: StockControlType;
  unidadMedida: 'kg' | 'u';
  precios: Record<PriceListType, number>;
  stockMinimoUnidades: number;
  stockMinimoKg: number;
  activo: boolean;
  orden?: number;
  usaUnidades?: boolean;
  usaKilogramos?: boolean;
  cobroPor?: 'KG' | 'UNIDAD';
}

export interface CustomerBranch {
  id: string;
  customerId: string;
  nombre: string;
  direccion: string;
  localidad: string;
  telefono?: string;
  referenciaUbicacion?: string;
  saldoActual: number;
}

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
  tipoAccion: 'BOLETA' | 'PAGO' | 'AJUSTE' | 'VISITA' | 'WHATSAPP' | 'LLAMADA' | 'CLIENTE' | 'CONFIG' | 'STOCK';
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
  telefonoOriginal?: string;
  telefonoWhatsAppNormalizado?: string;
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
  listaPrecioTipo?: PriceListType;
  preciosPersonalizados?: Record<string, number>;
  sucursales?: CustomerBranch[];
  condicionesComerciales?: string;
  formaPagoHabitual?: PaymentMethod | 'MIXTO' | 'DEBE';
  proximaVisita?: ProximaVisitaInfo;
  ultimaVisita?: UltimaVisitaInfo;
  createdAt: string;
  updatedAt: string;
}

export interface Movement {
  id: string;
  customerId: string;
  branchId?: string;
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
  boletaVirtualId?: string;
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

export type PaymentStatus = 'EFECTIVO' | 'TRANSFERENCIA' | 'PARCIAL' | 'DEBE' | 'MIXTO';

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

export interface BoletaItem {
  id: string;
  productId: string;
  productName: string;
  tipoVenta: ProductVentaType;
  unidades: number;
  kilajeReal: number;
  unidadMedida: 'kg' | 'u';
  precioAplicado: number;
  subtotal: number;
  observacion?: string;
}

export interface VirtualBoleta {
  id: string;
  numeroBoleta: string;
  customerId: string;
  customerName: string;
  branchId?: string;
  branchName?: string;
  fechaHora: string;
  registradoPor: string;
  listaPrecioAplicada: PriceListType | 'PERSONALIZADA';
  items: BoletaItem[];
  subtotal: number;
  descuento: number;
  recargo: number;
  total: number;
  pagoEfectivo: number;
  pagoTransferencia: number;
  pagoOtros: number;
  totalPagado: number;
  saldoRestanteBoleta: number;
  saldoAnteriorCuenta: number;
  nuevoSaldoCuenta: number;
  fotoBoletaFisicaUrl?: string;
  comprobanteImagenUrl?: string;
  observacionesDocUrl?: string;
  sincronizado: boolean;
  isAnulado?: boolean;
  anuladoPor?: string;
  anuladoAt?: string;
  motivoAnulacion?: string;
}

export type StockPeriodState = 'ABIERTA' | 'CERRADA' | 'EN_REVISION';

export interface StockPeriod {
  id: string;
  semanaNombre: string;
  fechaInicio: string;
  fechaFin: string;
  estado: StockPeriodState;
  abiertaPor: string;
  fechaApertura: string;
  cerradaPor?: string;
  fechaCierre?: string;
  observaciones?: string;
}

export interface MataderoIngresoItem {
  id: string;
  productId: string;
  productName: string;
  unidades: number;
  kilogramos: number;
  lote?: string;
  observacion?: string;
  costoUnitario?: number;
}

export interface MataderoIngreso {
  id: string;
  semanaId: string;
  fechaHora: string;
  proveedor: string;
  numeroRemito: string;
  usuario: string;
  observaciones?: string;
  fotosUrls: string[];
  items: MataderoIngresoItem[];
  sincronizado: boolean;
}

export type StockMovementType =
  | 'INGRESO_MATADERO'
  | 'VENTA_CLIENTE'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO'
  | 'MERMA'
  | 'DEVOLUCION_CLIENTE'
  | 'DEVOLUCION_PROVEEDOR'
  | 'CONTEO_FISICO'
  | 'ANULACION';

export interface StockMovement {
  id: string;
  semanaId: string;
  productId: string;
  productName: string;
  tipo: StockMovementType;
  direccion: 'ENTRADA' | 'SALIDA';
  unidades: number;
  kilogramos: number;
  referenciaOrigenId?: string;
  customerId?: string;
  customerName?: string;
  branchId?: string;
  usuario: string;
  fechaHora: string;
  motivo: string;
  sincronizado: boolean;
  saldoPosteriorUnidades: number;
  saldoPosteriorKilogramos: number;
}

export type SemaforoState = 'VERDE' | 'AMARILLO' | 'ROJO' | 'GRIS';

export interface ProductStockSummary {
  product: Product;
  unidadesDisponibles: number;
  kilogramosDisponibles: number;
  unidadesIngresadas: number;
  kilogramosIngresados: number;
  unidadesVendidas: number;
  kilogramosVendidos: number;
  unidadesMermas: number;
  kilogramosMermas: number;
  estadoSemaforo: SemaforoState;
}

