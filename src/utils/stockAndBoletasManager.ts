import {
  Product,
  StockPeriod,
  MataderoIngreso,
  StockMovement,
  VirtualBoleta,
  ProductStockSummary,
  SemaforoState,
  Customer,
  CustomerBranch,
  Movement,
  UserRole,
} from '../types';
import { getStoredCustomers, saveCustomers, getStoredMovements, saveMovements } from './storage';
import { recordAuditLog } from './auditLogger';
import { isMovementFinanciallyActive } from './movementFinancialState';
import {
  generateOperationId,
  idbSaveQueueItem,
  idbSaveQueueItemStrict,
  idbSaveEntity,
  idbSaveEntityStrict,
  idbSaveImageBlob,
  getDeviceId,
  idbGetIncompleteSaleCancellationItems,
  idbGetAllQueueItems,
  AtomicSaleCancellationPayload,
  SaleCancellationStage,
  SaleCancellationStockRestore,
  SyncQueueItem,
} from './indexedDBEngine';
import { runFullSyncProcess } from './syncEngine';

const PRODUCTS_KEY = 'cyc_gestion_products_v1';
const STOCK_PERIODS_KEY = 'cyc_gestion_stock_periods_v1';
const MATADERO_INGRESOS_KEY = 'cyc_gestion_matadero_ingresos_v1';
const STOCK_MOVEMENTS_KEY = 'cyc_gestion_stock_movements_v1';
const VIRTUAL_BOLETAS_KEY = 'cyc_gestion_virtual_boletas_v1';

// Products catalogue default
export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod_higado',
    codigo: 'HIG-01',
    nombre: 'Hígado Vacuno',
    tipoVenta: 'UNIDADES_INFORMATIVAS_COBRO_POR_KILO',
    tipoControlStock: 'UNIDADES_Y_KILOS',
    unidadMedida: 'kg',
    precios: {
      GENERAL: 5200,
      MAYORISTA: 4850,
      ESPECIAL: 4600,
      PERSONALIZADA: 5005,
    },
    stockMinimoUnidades: 10,
    stockMinimoKg: 50,
    activo: true,
  },
  {
    id: 'prod_chinchulin',
    codigo: 'CHI-02',
    nombre: 'Chinchulines Vacunos',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'SOLO_KILOS',
    unidadMedida: 'kg',
    precios: {
      GENERAL: 6800,
      MAYORISTA: 6300,
      ESPECIAL: 6000,
      PERSONALIZADA: 6500,
    },
    stockMinimoUnidades: 0,
    stockMinimoKg: 40,
    activo: true,
  },
  {
    id: 'prod_centro',
    codigo: 'MOL-03',
    nombre: 'Centro (Molleja de Corazón)',
    tipoVenta: 'UNIDADES_INFORMATIVAS_COBRO_POR_KILO',
    tipoControlStock: 'UNIDADES_INFORMATIVAS_COBRO_POR_KILO',
    unidadMedida: 'kg',
    precios: {
      GENERAL: 12500,
      MAYORISTA: 11800,
      ESPECIAL: 11200,
      PERSONALIZADA: 12000,
    },
    stockMinimoUnidades: 5,
    stockMinimoKg: 20,
    activo: true,
  },
  {
    id: 'prod_corazon',
    codigo: 'COR-04',
    nombre: 'Corazón Vacuno',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'UNIDADES_Y_KILOS',
    unidadMedida: 'kg',
    precios: {
      GENERAL: 4500,
      MAYORISTA: 4100,
      ESPECIAL: 3900,
      PERSONALIZADA: 4300,
    },
    stockMinimoUnidades: 8,
    stockMinimoKg: 30,
    activo: true,
  },
  {
    id: 'prod_mondongo',
    codigo: 'MON-05',
    nombre: 'Mondongo Blanqueado',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'SOLO_KILOS',
    unidadMedida: 'kg',
    precios: {
      GENERAL: 5900,
      MAYORISTA: 5400,
      ESPECIAL: 5100,
      PERSONALIZADA: 5600,
    },
    stockMinimoUnidades: 0,
    stockMinimoKg: 35,
    activo: true,
  },
  {
    id: 'prod_lengua',
    codigo: 'LEN-06',
    nombre: 'Lengua Vacuna',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'UNIDADES_Y_KILOS',
    unidadMedida: 'kg',
    precios: {
      GENERAL: 9800,
      MAYORISTA: 9200,
      ESPECIAL: 8800,
      PERSONALIZADA: 9400,
    },
    stockMinimoUnidades: 5,
    stockMinimoKg: 15,
    activo: true,
  },
  {
    id: 'prod_caja_pollo',
    codigo: 'POL-07',
    nombre: 'Caja Pata Muslo (15kg)',
    tipoVenta: 'POR_UNIDAD',
    tipoControlStock: 'SOLO_UNIDADES',
    unidadMedida: 'u',
    precios: {
      GENERAL: 38000,
      MAYORISTA: 35500,
      ESPECIAL: 34000,
      PERSONALIZADA: 36500,
    },
    stockMinimoUnidades: 10,
    stockMinimoKg: 0,
    activo: true,
  },
];

type OfficialBoletaProduct = {
  nombre: string;
  codigo: string;
  aliases: string[];
};

const normalizeProductCatalogName = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export const OFFICIAL_BOLETA_CATALOG: OfficialBoletaProduct[] = [
  { nombre: 'Hígado', codigo: 'HIG-01', aliases: ['higado', 'higado vacuno'] },
  { nombre: 'Corazón', codigo: 'COR-02', aliases: ['corazon', 'corazon vacuno'] },
  { nombre: 'Lengua', codigo: 'LEN-03', aliases: ['lengua', 'lengua vacuna'] },
  { nombre: 'Quijada', codigo: 'QUI-04', aliases: ['quijada'] },
  { nombre: 'Rabo', codigo: 'RAB-05', aliases: ['rabo'] },
  { nombre: 'Riñón', codigo: 'RIN-06', aliases: ['riñon', 'rinon'] },
  { nombre: 'Bofe', codigo: 'BOF-07', aliases: ['bofe'] },
  { nombre: 'Centro', codigo: 'CEN-08', aliases: ['centro', 'centro (molleja de corazon)'] },
  { nombre: 'Chinchulín', codigo: 'CHI-09', aliases: ['chinchulin', 'chinchulines vacunos'] },
  { nombre: 'Mondongo', codigo: 'MON-10', aliases: ['mondongo', 'mondongo blanqueado'] },
  { nombre: 'Tripa', codigo: 'TRI-11', aliases: ['tripa'] },
  { nombre: 'Rueda', codigo: 'RUE-12', aliases: ['rueda'] },
  { nombre: 'Seso', codigo: 'SES-13', aliases: ['seso'] },
  { nombre: 'Molleja', codigo: 'MOL-14', aliases: ['molleja'] },
  { nombre: 'Gañote', codigo: 'GAN-15', aliases: ['gañote', 'ganote'] },
  { nombre: 'Pechito', codigo: 'PEC-16', aliases: ['pechito'] },
  { nombre: 'Carré', codigo: 'CAR-17', aliases: ['carre'] },
  { nombre: 'Bondiola Fresca', codigo: 'BON-F-18', aliases: ['bondiola fresca'] },
  { nombre: 'Bondiola Congelada', codigo: 'BON-C-19', aliases: ['bondiola congelada'] },
  { nombre: 'Nuez', codigo: 'NUE-20', aliases: ['nuez'] },
  { nombre: 'Cuajo Crudo', codigo: 'CUA-C-21', aliases: ['cuajo crudo'] },
  { nombre: 'Cuajo Cocinado', codigo: 'CUA-O-22', aliases: ['cuajo cocinado'] },
  { nombre: 'Pajarilla', codigo: 'PAJ-23', aliases: ['pajarilla'] },
  { nombre: 'Tendones', codigo: 'TEN-24', aliases: ['tendones'] },
];

const createOfficialBoletaProduct = (definition: OfficialBoletaProduct): Product => ({
  id: `prod_${normalizeProductCatalogName(definition.nombre).replace(/[^a-z0-9]+/g, '_')}`,
  codigo: definition.codigo,
  nombre: definition.nombre,
  tipoVenta: 'UNIDADES_INFORMATIVAS_COBRO_POR_KILO',
  tipoControlStock: 'UNIDADES_Y_KILOS',
  unidadMedida: 'kg',
  precios: { GENERAL: 0, MAYORISTA: 0, ESPECIAL: 0, PERSONALIZADA: 0 },
  stockMinimoUnidades: 0,
  stockMinimoKg: 0,
  activo: true,
});

export function ensureOfficialBoletaCatalog(products: Product[]): Product[] {
  const usedIds = new Set<string>();
  const officialProducts = OFFICIAL_BOLETA_CATALOG.map((definition) => {
    const aliases = new Set(definition.aliases.map(normalizeProductCatalogName));
    const existing = products.find(
      (product) => !usedIds.has(product.id) && aliases.has(normalizeProductCatalogName(product.nombre))
    );

    if (!existing) return createOfficialBoletaProduct(definition);

    usedIds.add(existing.id);
    return existing.nombre === definition.nombre ? existing : { ...existing, nombre: definition.nombre };
  });

  return [...officialProducts, ...products.filter((product) => !usedIds.has(product.id))];
}

// Helper Products Storage
export function getStoredProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (!raw) {
      const initialProducts = ensureOfficialBoletaCatalog(DEFAULT_PRODUCTS);
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(initialProducts));
      return initialProducts;
    }
    const storedProducts = JSON.parse(raw) as Product[];
    const normalizedProducts = ensureOfficialBoletaCatalog(storedProducts);
    if (JSON.stringify(storedProducts) !== JSON.stringify(normalizedProducts)) {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(normalizedProducts));
    }
    return normalizedProducts;
  } catch (err) {
    console.error('Error cargando productos:', err);
    return DEFAULT_PRODUCTS;
  }
}

export function saveProducts(products: Product[]): void {
  try {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  } catch (err) {
    console.error('Error guardando productos:', err);
  }
}

// Stock Periods Storage
export function getStoredStockPeriods(): StockPeriod[] {
  try {
    const raw = localStorage.getItem(STOCK_PERIODS_KEY);
    if (!raw) {
      const activePeriod: StockPeriod = {
        id: 'sem_actual',
        semanaNombre: 'Semana del 03/08/2026 al 09/08/2026',
        fechaInicio: '2026-08-03',
        fechaFin: '2026-08-09',
        estado: 'ABIERTA',
        abiertaPor: 'Administración C&C',
        fechaApertura: '2026-08-03T07:00:00.000Z',
        observaciones: 'Semana operativa activa para venta y reparto de achuras.',
      };
      localStorage.setItem(STOCK_PERIODS_KEY, JSON.stringify([activePeriod]));
      return [activePeriod];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStockPeriods(periods: StockPeriod[]): void {
  localStorage.setItem(STOCK_PERIODS_KEY, JSON.stringify(periods));
}

export function getActiveStockPeriod(): StockPeriod {
  const periods = getStoredStockPeriods();
  const active = periods.find((p) => p.estado === 'ABIERTA');
  if (active) return active;
  if (periods.length > 0) return periods[0];
  const newPeriod: StockPeriod = {
    id: `sem_${Date.now()}`,
    semanaNombre: 'Semana Actual de Stock',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    estado: 'ABIERTA',
    abiertaPor: 'Sistema C&C',
    fechaApertura: new Date().toISOString(),
  };
  saveStockPeriods([newPeriod]);
  return newPeriod;
}

// Stock Movements Storage
export function getStoredStockMovements(): StockMovement[] {
  try {
    const raw = localStorage.getItem(STOCK_MOVEMENTS_KEY);
    if (!raw) {
      // Seed initial matadero stock movements for testing
      const period = getActiveStockPeriod();
      const initialMovements: StockMovement[] = [
        {
          id: 'sm_init_1',
          semanaId: period.id,
          productId: 'prod_higado',
          productName: 'Hígado Vacuno',
          tipo: 'INGRESO_MATADERO',
          direccion: 'ENTRADA',
          unidades: 40,
          kilogramos: 200,
          referenciaOrigenId: 'remito_matadero_001',
          usuario: 'Administrador C&C',
          fechaHora: new Date(Date.now() - 86400000 * 2).toISOString(),
          motivo: 'Carga inicial matadero Frigorífico Morón',
          sincronizado: true,
          saldoPosteriorUnidades: 40,
          saldoPosteriorKilogramos: 200,
        },
        {
          id: 'sm_init_2',
          semanaId: period.id,
          productId: 'prod_chinchulin',
          productName: 'Chinchulines Vacunos',
          tipo: 'INGRESO_MATADERO',
          direccion: 'ENTRADA',
          unidades: 0,
          kilogramos: 150,
          referenciaOrigenId: 'remito_matadero_001',
          usuario: 'Administrador C&C',
          fechaHora: new Date(Date.now() - 86400000 * 2).toISOString(),
          motivo: 'Carga inicial matadero Frigorífico Morón',
          sincronizado: true,
          saldoPosteriorUnidades: 0,
          saldoPosteriorKilogramos: 150,
        },
        {
          id: 'sm_init_3',
          semanaId: period.id,
          productId: 'prod_centro',
          productName: 'Centro (Molleja de Corazón)',
          tipo: 'INGRESO_MATADERO',
          direccion: 'ENTRADA',
          unidades: 15,
          kilogramos: 60,
          referenciaOrigenId: 'remito_matadero_001',
          usuario: 'Administrador C&C',
          fechaHora: new Date(Date.now() - 86400000 * 2).toISOString(),
          motivo: 'Carga inicial matadero Frigorífico Morón',
          sincronizado: true,
          saldoPosteriorUnidades: 15,
          saldoPosteriorKilogramos: 60,
        },
        {
          id: 'sm_init_4',
          semanaId: period.id,
          productId: 'prod_corazon',
          productName: 'Corazón Vacuno',
          tipo: 'INGRESO_MATADERO',
          direccion: 'ENTRADA',
          unidades: 25,
          kilogramos: 90,
          referenciaOrigenId: 'remito_matadero_001',
          usuario: 'Administrador C&C',
          fechaHora: new Date(Date.now() - 86400000 * 2).toISOString(),
          motivo: 'Carga inicial matadero Frigorífico Morón',
          sincronizado: true,
          saldoPosteriorUnidades: 25,
          saldoPosteriorKilogramos: 90,
        },
        {
          id: 'sm_init_5',
          semanaId: period.id,
          productId: 'prod_caja_pollo',
          productName: 'Caja Pata Muslo (15kg)',
          tipo: 'INGRESO_MATADERO',
          direccion: 'ENTRADA',
          unidades: 30,
          kilogramos: 450,
          referenciaOrigenId: 'remito_matadero_001',
          usuario: 'Administrador C&C',
          fechaHora: new Date(Date.now() - 86400000 * 2).toISOString(),
          motivo: 'Carga inicial avícola',
          sincronizado: true,
          saldoPosteriorUnidades: 30,
          saldoPosteriorKilogramos: 450,
        },
      ];
      localStorage.setItem(STOCK_MOVEMENTS_KEY, JSON.stringify(initialMovements));
      return initialMovements;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStockMovements(movements: StockMovement[]): void {
  localStorage.setItem(STOCK_MOVEMENTS_KEY, JSON.stringify(movements));
}

// Matadero Ingresos Storage
export function getStoredMataderoIngresos(): MataderoIngreso[] {
  try {
    const raw = localStorage.getItem(MATADERO_INGRESOS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveMataderoIngresos(ingresos: MataderoIngreso[]): void {
  localStorage.setItem(MATADERO_INGRESOS_KEY, JSON.stringify(ingresos));
}

// Virtual Boletas Storage
export function getStoredVirtualBoletas(): VirtualBoleta[] {
  try {
    const raw = localStorage.getItem(VIRTUAL_BOLETAS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveVirtualBoletas(boletas: VirtualBoleta[]): void {
  localStorage.setItem(VIRTUAL_BOLETAS_KEY, JSON.stringify(boletas));
}

// Calculate Current Stock Summary for each product for the active week
export function getStockSummaryForPeriod(semanaId?: string): ProductStockSummary[] {
  const products = getStoredProducts();
  const movements = getStoredStockMovements();
  const period = semanaId ? { id: semanaId } : getActiveStockPeriod();

  const periodMovements = movements.filter((m) => m.semanaId === period.id);

  return products.map((prod) => {
    let unidadesIngresadas = 0;
    let kilogramosIngresados = 0;
    let unidadesVendidas = 0;
    let kilogramosVendidos = 0;
    let unidadesMermas = 0;
    let kilogramosMermas = 0;

    let unidadesDisponibles = 0;
    let kilogramosDisponibles = 0;

    periodMovements
      .filter((m) => m.productId === prod.id)
      .forEach((m) => {
        if (m.direccion === 'ENTRADA') {
          unidadesDisponibles += m.unidades;
          kilogramosDisponibles += m.kilogramos;
          if (m.tipo === 'INGRESO_MATADERO') {
            unidadesIngresadas += m.unidades;
            kilogramosIngresados += m.kilogramos;
          }
        } else {
          // SALIDA
          unidadesDisponibles -= m.unidades;
          kilogramosDisponibles -= m.kilogramos;
          if (m.tipo === 'VENTA_CLIENTE') {
            unidadesVendidas += m.unidades;
            kilogramosVendidos += m.kilogramos;
          } else if (m.tipo === 'MERMA' || m.tipo === 'AJUSTE_NEGATIVO') {
            unidadesMermas += m.unidades;
            kilogramosMermas += m.kilogramos;
          }
        }
      });

    // Ensure non-negative display overflow
    unidadesDisponibles = Math.max(0, unidadesDisponibles);
    kilogramosDisponibles = Math.max(0, kilogramosDisponibles);

    // Determine Semáforo state
    let estadoSemaforo: SemaforoState = 'VERDE';
    if (unidadesDisponibles === 0 && kilogramosDisponibles === 0) {
      estadoSemaforo = 'GRIS';
    } else {
      const uCritical = prod.stockMinimoUnidades > 0 && unidadesDisponibles <= prod.stockMinimoUnidades;
      const kgCritical = prod.stockMinimoKg > 0 && kilogramosDisponibles <= prod.stockMinimoKg;

      const uWarning = prod.stockMinimoUnidades > 0 && unidadesDisponibles <= prod.stockMinimoUnidades * 1.5;
      const kgWarning = prod.stockMinimoKg > 0 && kilogramosDisponibles <= prod.stockMinimoKg * 1.5;

      if (uCritical || kgCritical) {
        estadoSemaforo = 'ROJO';
      } else if (uWarning || kgWarning) {
        estadoSemaforo = 'AMARILLO';
      }
    }

    return {
      product: prod,
      unidadesDisponibles,
      kilogramosDisponibles,
      unidadesIngresadas,
      kilogramosIngresados,
      unidadesVendidas,
      kilogramosVendidos,
      unidadesMermas,
      kilogramosMermas,
      estadoSemaforo,
    };
  });
}

// Register Matadero Delivery (Ingresar Mercadería)
export function registerMataderoIngreso(ingreso: Omit<MataderoIngreso, 'id' | 'semanaId' | 'sincronizado'>): MataderoIngreso {
  const period = getActiveStockPeriod();
  const id = `ing_mat_${Date.now()}`;
  const fullIngreso: MataderoIngreso = {
    ...ingreso,
    id,
    semanaId: period.id,
    sincronizado: true,
  };

  const currentIngresos = getStoredMataderoIngresos();
  currentIngresos.unshift(fullIngreso);
  saveMataderoIngresos(currentIngresos);

  // Generate Stock Movements
  const currentStockMovements = getStoredStockMovements();
  const summary = getStockSummaryForPeriod(period.id);

  fullIngreso.items.forEach((item) => {
    const prodSummary = summary.find((s) => s.product.id === item.productId);
    const prevU = prodSummary ? prodSummary.unidadesDisponibles : 0;
    const prevKg = prodSummary ? prodSummary.kilogramosDisponibles : 0;

    const sm: StockMovement = {
      id: `sm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      semanaId: period.id,
      productId: item.productId,
      productName: item.productName,
      tipo: 'INGRESO_MATADERO',
      direccion: 'ENTRADA',
      unidades: item.unidades,
      kilogramos: item.kilogramos,
      referenciaOrigenId: id,
      usuario: ingreso.usuario,
      fechaHora: ingreso.fechaHora,
      motivo: `Ingreso Matadero ${ingreso.proveedor} Remito #${ingreso.numeroRemito}`,
      sincronizado: true,
      saldoPosteriorUnidades: prevU + item.unidades,
      saldoPosteriorKilogramos: prevKg + item.kilogramos,
    };
    currentStockMovements.push(sm);
  });

  saveStockMovements(currentStockMovements);

  recordAuditLog({
    usuario: ingreso.usuario,
    accion: `Carga de Mercadería Matadero ${ingreso.proveedor} (Remito #${ingreso.numeroRemito})`,
    tipoAccion: 'AJUSTE',
    detalles: `Ingresaron ${ingreso.items.length} productos. Fotos adjuntas: ${ingreso.fotosUrls.length}`,
  });

  return fullIngreso;
}

// Finalize a Virtual Boleta: updates Cuenta Corriente, Stock, and Virtual Boleta history
export function finalizeVirtualBoleta(params: {
  numeroBoleta: string;
  customer: Customer;
  branchId?: string;
  branchName?: string;
  items: VirtualBoleta['items'];
  subtotal: number;
  descuento: number;
  recargo: number;
  total: number;
  pagoEfectivo: number;
  pagoTransferencia: number;
  pagoOtros: number;
  fotoBoletaFisicaUrl: string;
  usuario: string;
  listaPrecioAplicada: string;
  priceListId?: string;
  priceListName?: string;
}): { virtualBoleta: VirtualBoleta; movementBoleta: Movement } {
  const period = getActiveStockPeriod();
  const nowIso = new Date().toISOString();
  const boletaId = `vboleta_${Date.now()}`;

  const totalPagado = params.pagoEfectivo + params.pagoTransferencia + params.pagoOtros;
  const saldoRestanteBoleta = Math.max(0, params.total - totalPagado);

  // Determine previous customer balance
  const customers = getStoredCustomers();
  const targetCustIndex = customers.findIndex((c) => c.id === params.customer.id);
  const targetCust = customers[targetCustIndex] || params.customer;

  let saldoAnteriorCuenta = 0;

  // Calculate existing customer balance from movements
  const allMovements = getStoredMovements();
  const custMovements = allMovements.filter((m) => m.customerId === targetCust.id && isMovementFinanciallyActive(m));

  custMovements.forEach((m) => {
    if (m.esDebito) {
      saldoAnteriorCuenta += m.monto;
    } else {
      saldoAnteriorCuenta -= m.monto;
    }
  });

  const nuevoSaldoCuenta = saldoAnteriorCuenta + params.total - totalPagado;

  // 1. Create Virtual Boleta Record
  const virtualBoleta: VirtualBoleta = {
    id: boletaId,
    numeroBoleta: params.numeroBoleta,
    customerId: targetCust.id,
    customerName: targetCust.alias || targetCust.nombre,
    branchId: params.branchId,
    branchName: params.branchName,
    fechaHora: nowIso,
    registradoPor: params.usuario,
    listaPrecioAplicada: params.listaPrecioAplicada,
    priceListId: params.priceListId,
    priceListName: params.priceListName,
    items: params.items,
    subtotal: params.subtotal,
    descuento: params.descuento,
    recargo: params.recargo,
    total: params.total,
    pagoEfectivo: params.pagoEfectivo,
    pagoTransferencia: params.pagoTransferencia,
    pagoOtros: params.pagoOtros,
    totalPagado,
    saldoRestanteBoleta,
    saldoAnteriorCuenta,
    nuevoSaldoCuenta,
    fotoBoletaFisicaUrl: params.fotoBoletaFisicaUrl,
    sincronizado: true,
  };

  const virtualBoletas = getStoredVirtualBoletas();
  virtualBoletas.unshift(virtualBoleta);
  saveVirtualBoletas(virtualBoletas);

  // 2. Create Cuenta Corriente Movements
  const newMovements: Movement[] = [];

  // A. Movement BOLETA (Total Amount)
  const movementBoleta: Movement = {
    id: `mov_bol_${Date.now()}`,
    customerId: targetCust.id,
    branchId: params.branchId,
    tipo: 'BOLETA',
    fecha: nowIso,
    numeroBoleta: params.numeroBoleta,
    monto: params.total,
    esDebito: true,
    fotoUrl: params.fotoBoletaFisicaUrl,
    descripcion: `Venta Boleta #${params.numeroBoleta} (${params.items.length} ítems) - Lista: ${params.listaPrecioAplicada}`,
    registradoPor: params.usuario,
    createdAt: nowIso,
    boletaVirtualId: boletaId,
  };
  newMovements.push(movementBoleta);

  // B. Movement PAGO Efectivo
  if (params.pagoEfectivo > 0) {
    newMovements.push({
      id: `mov_pag_efec_${Date.now()}_1`,
      customerId: targetCust.id,
      branchId: params.branchId,
      tipo: 'PAGO',
      fecha: nowIso,
      numeroBoleta: params.numeroBoleta,
      monto: params.pagoEfectivo,
      esDebito: false,
      metodoPago: 'EFECTIVO',
      comprobantePago: `Cobro en efectivo Boleta #${params.numeroBoleta}`,
      descripcion: `Cobro en efectivo Boleta #${params.numeroBoleta}`,
      registradoPor: params.usuario,
      createdAt: nowIso,
      boletaVirtualId: boletaId,
    });
  }

  // C. Movement PAGO Transferencia
  if (params.pagoTransferencia > 0) {
    newMovements.push({
      id: `mov_pag_trans_${Date.now()}_2`,
      customerId: targetCust.id,
      branchId: params.branchId,
      tipo: 'PAGO',
      fecha: nowIso,
      numeroBoleta: params.numeroBoleta,
      monto: params.pagoTransferencia,
      esDebito: false,
      metodoPago: 'TRANSFERENCIA',
      comprobantePago: `Cobro transferencia Boleta #${params.numeroBoleta}`,
      descripcion: `Cobro por transferencia Boleta #${params.numeroBoleta}`,
      registradoPor: params.usuario,
      createdAt: nowIso,
      boletaVirtualId: boletaId,
    });
  }

  // D. Movement PAGO Otros
  if (params.pagoOtros > 0) {
    newMovements.push({
      id: `mov_pag_otro_${Date.now()}_3`,
      customerId: targetCust.id,
      branchId: params.branchId,
      tipo: 'PAGO',
      fecha: nowIso,
      numeroBoleta: params.numeroBoleta,
      monto: params.pagoOtros,
      esDebito: false,
      metodoPago: 'OTRO',
      comprobantePago: `Cobro otro medio Boleta #${params.numeroBoleta}`,
      descripcion: `Cobro otro medio de pago Boleta #${params.numeroBoleta}`,
      registradoPor: params.usuario,
      createdAt: nowIso,
      boletaVirtualId: boletaId,
    });
  }

  const existingMovements = getStoredMovements();
  saveMovements([...newMovements, ...existingMovements]);

  // Update customer branch balance if branch selected
  if (params.branchId && targetCust.sucursales) {
    const branchIndex = targetCust.sucursales.findIndex((b) => b.id === params.branchId);
    if (branchIndex !== -1) {
      targetCust.sucursales[branchIndex].saldoActual =
        (targetCust.sucursales[branchIndex].saldoActual || 0) + params.total - totalPagado;
      saveCustomers(customers);
    }
  }

  // 3. Create Automatic Stock Deduction Movements
  const currentStockMovements = getStoredStockMovements();
  const summary = getStockSummaryForPeriod(period.id);

  params.items.forEach((item) => {
    const prodSummary = summary.find((s) => s.product.id === item.productId);
    const prevU = prodSummary ? prodSummary.unidadesDisponibles : 0;
    const prevKg = prodSummary ? prodSummary.kilogramosDisponibles : 0;

    const stockM: StockMovement = {
      id: `sm_sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      semanaId: period.id,
      productId: item.productId,
      productName: item.productName,
      tipo: 'VENTA_CLIENTE',
      direccion: 'SALIDA',
      unidades: item.unidades,
      kilogramos: item.kilajeReal,
      referenciaOrigenId: boletaId,
      customerId: targetCust.id,
      customerName: targetCust.alias || targetCust.nombre,
      branchId: params.branchId,
      usuario: params.usuario,
      fechaHora: nowIso,
      motivo: `Venta Boleta #${params.numeroBoleta} - ${targetCust.alias || targetCust.nombre}`,
      sincronizado: true,
      saldoPosteriorUnidades: Math.max(0, prevU - item.unidades),
      saldoPosteriorKilogramos: Math.max(0, prevKg - item.kilajeReal),
    };
    currentStockMovements.push(stockM);
  });

  saveStockMovements(currentStockMovements);

  // Audit Log
  recordAuditLog({
    usuario: params.usuario,
    accion: `Boleta Virtual #${params.numeroBoleta} emitida a ${targetCust.alias || targetCust.nombre}`,
    tipoAccion: 'VENTA',
    customerId: targetCust.id,
    customerName: targetCust.alias || targetCust.nombre,
    detalles: `Total: $${params.total.toLocaleString()} - Pagado: $${totalPagado.toLocaleString()} - Saldo Restante: $${saldoRestanteBoleta.toLocaleString()}`,
  });

  // 4. OFFLINE-FIRST: Guardado Atómico en IndexedDB y Cola de Sincronización Idempotente
  const operationId = generateOperationId('sale');
  const deviceId = getDeviceId();

  // Guardar en las tiendas locales de IndexedDB para disponibilidad offline garantizada
  idbSaveEntity('boletas', virtualBoleta);
  newMovements.forEach((m) => idbSaveEntity('movements', m));

  // Guardar imagen en IndexedDB si existe
  if (params.fotoBoletaFisicaUrl) {
    idbSaveImageBlob({
      imageId: `img_${boletaId}`,
      entityId: boletaId,
      entityType: 'RECEIPT',
      blob: params.fotoBoletaFisicaUrl,
      fileName: `boleta_${params.numeroBoleta}.png`,
      pathName: `receipts/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${targetCust.id}/${boletaId}.png`,
      status: 'LOCAL_ONLY',
      createdAt: nowIso,
      createdBy: params.usuario,
      retryCount: 0,
    });
  }

  // Encolar Operación Atómica en syncQueue
  idbSaveQueueItem({
    operationId,
    entityType: 'ATOMIC_SALE',
    entityId: boletaId,
    action: 'ATOMIC_TRANSACTION',
    payload: {
      boleta: virtualBoleta,
      movements: newMovements,
      stockMovements: currentStockMovements.filter((sm) => sm.referenciaOrigenId === boletaId),
      customer: {
        id: targetCust.id,
        saldoActual: nuevoSaldoCuenta,
      },
    },
    createdAt: nowIso,
    createdBy: params.usuario,
    deviceId,
    retryCount: 0,
    status: 'LOCAL_SAVED',
  });

  // Disparar sincronización en segundo plano si hay conexión
  runFullSyncProcess().catch(() => {});

  return { virtualBoleta, movementBoleta };
}

export interface VirtualBoletaCancellationResult {
  status: 'ANULADA' | 'YA_ANULADA' | 'NO_ENCONTRADA' | 'EN_PROCESO';
  message: string;
  boleta?: VirtualBoleta;
  movimientosAnulados: Movement[];
  movimientosStockGenerados: StockMovement[];
}

let cancellationFailureAfterStageForTesting: SaleCancellationStage | null = null;
let cancellationStockRestoreFailureAfterForTesting: number | null = null;
const activeCancellationResumes = new Map<string, Promise<VirtualBoletaCancellationResult>>();
const CANCELLATION_LOCK_PREFIX = 'cyc_sale_cancellation_lock_';
const CANCELLATION_LOCK_TTL_MS = 30_000;

/** Permite simular un cierre abrupto después de una etapa ya persistida. */
export function setCancellationFailureAfterStageForTesting(stage: SaleCancellationStage | null): void {
  cancellationFailureAfterStageForTesting = stage;
}

/** Simula un cierre luego de persistir N restauraciones de stock individuales. */
export function setCancellationStockRestoreFailureAfterForTesting(count: number | null): void {
  cancellationStockRestoreFailureAfterForTesting = count;
}

function throwIfCancellationFailureWasRequested(stage: SaleCancellationStage): void {
  if (cancellationFailureAfterStageForTesting === stage) {
    cancellationFailureAfterStageForTesting = null;
    throw new Error(`Fallo técnico simulado después de ${stage}`);
  }
}

function acquireCancellationLock(operationId: string): string | null {
  try {
    const key = `${CANCELLATION_LOCK_PREFIX}${operationId}`;
    const now = Date.now();
    const current = JSON.parse(localStorage.getItem(key) || 'null') as { token?: string; expiresAt?: number } | null;
    if (current?.expiresAt && current.expiresAt > now) return null;

    const token = `${getDeviceId()}_${now}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(key, JSON.stringify({ token, expiresAt: now + CANCELLATION_LOCK_TTL_MS }));
    const saved = JSON.parse(localStorage.getItem(key) || 'null') as { token?: string } | null;
    return saved?.token === token ? token : null;
  } catch {
    // IndexedDB y los IDs determinísticos siguen evitando duplicados si el
    // navegador bloquea localStorage (por ejemplo, en modo restringido).
    return 'local-lock-unavailable';
  }
}

function releaseCancellationLock(operationId: string, token: string): void {
  if (token === 'local-lock-unavailable') return;
  try {
    const key = `${CANCELLATION_LOCK_PREFIX}${operationId}`;
    const current = JSON.parse(localStorage.getItem(key) || 'null') as { token?: string } | null;
    if (current?.token === token) localStorage.removeItem(key);
  } catch {
    // El lock vence solo; no interfiere con la recuperación posterior.
  }
}

function buildCancellationStockRestorations(
  operationId: string,
  boleta: VirtualBoleta
): SaleCancellationStockRestore[] {
  const saleStockMovements = getStoredStockMovements().filter(
    (movement) =>
      movement.referenciaOrigenId === boleta.id &&
      movement.tipo === 'VENTA_CLIENTE' &&
      movement.direccion === 'SALIDA'
  );

  if (saleStockMovements.length > 0) {
    return saleStockMovements.map((movement) => ({
      sourceStockMovementId: movement.id,
      restorationMovementId: `sm_anul_${operationId}_${movement.id}`,
      semanaId: movement.semanaId,
      productId: movement.productId,
      productName: movement.productName,
      unidades: movement.unidades,
      kilogramos: movement.kilogramos,
    }));
  }

  const activePeriod = getActiveStockPeriod();
  return boleta.items.map((item, index) => ({
    restorationMovementId: `sm_anul_${operationId}_${boleta.id}_${index}`,
    semanaId: activePeriod.id,
    productId: item.productId,
    productName: item.productName,
    unidades: item.unidades,
    kilogramos: item.kilajeReal,
  }));
}

async function persistCancellationStage(
  item: SyncQueueItem,
  stage: SaleCancellationStage,
  lastError?: string
): Promise<SyncQueueItem> {
  const nextItem: SyncQueueItem = {
    ...item,
    status: stage === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
    payload: {
      ...(item.payload as AtomicSaleCancellationPayload),
      stage,
      completedStages: Array.from(new Set([
        ...((item.payload as AtomicSaleCancellationPayload).completedStages || []),
        stage,
      ])),
      lastError,
    } satisfies AtomicSaleCancellationPayload,
  };
  await idbSaveQueueItemStrict(nextItem);
  return nextItem;
}

function getCancellationResult(item: SyncQueueItem, status: VirtualBoletaCancellationResult['status'], message: string): VirtualBoletaCancellationResult {
  const payload = item.payload as AtomicSaleCancellationPayload;
  const boleta = getStoredVirtualBoletas().find((current) => current.id === payload.boletaVirtualId);
  const movementIds = new Set(payload.movementIds);
  const stockIds = new Set(payload.stockRestorations.map((restore) => restore.restorationMovementId));

  return {
    status,
    message,
    boleta,
    movimientosAnulados: getStoredMovements().filter((movement) => movementIds.has(movement.id) && movement.isAnulado),
    movimientosStockGenerados: getStoredStockMovements().filter((movement) => stockIds.has(movement.id)),
  };
}

function isDurableCancellationPayload(payload: unknown): payload is AtomicSaleCancellationPayload {
  return Boolean(payload && typeof payload === 'object' && 'stage' in payload && 'movementIds' in payload && 'stockRestorations' in payload);
}

function completeLegacyCancellationOperation(item: SyncQueueItem): SyncQueueItem {
  const legacy = item.payload as any;
  const boletaVirtualId = legacy.boletaVirtualId || item.entityId;
  const boleta = getStoredVirtualBoletas().find((current) => current.id === boletaVirtualId);
  if (!boletaVirtualId || !boleta?.isAnulado) {
    throw new Error('La anulación antigua no contiene datos suficientes para migrarse automáticamente.');
  }
  const generatedStock = Array.isArray(legacy.movimientosStockGenerados) ? legacy.movimientosStockGenerados : [];
  const migratedPayload: AtomicSaleCancellationPayload = {
    boletaVirtualId,
    motivo: legacy.motivo || 'Anulación registrada antes de la recuperación durable',
    usuario: legacy.usuario || item.createdBy,
    username: legacy.username,
    rol: legacy.rol,
    deviceId: legacy.deviceId || item.deviceId,
    createdAtLocal: legacy.createdAtLocal || item.createdAt,
    stage: 'COMPLETED',
    completedStages: ['COMPLETED'],
    movementIds: Array.isArray(legacy.movimientosAnulados) ? legacy.movimientosAnulados.map((movement: Movement) => movement.id) : [],
    stockRestorations: generatedStock.map((movement: StockMovement) => ({
      restorationMovementId: movement.id,
      semanaId: movement.semanaId,
      productId: movement.productId,
      productName: movement.productName,
      unidades: movement.unidades,
      kilogramos: movement.kilogramos,
    })),
    stockPeriodIds: Array.from(new Set(generatedStock.map((movement: StockMovement) => movement.semanaId))),
    auditId: `audit_legacy_sale_cancel_${item.operationId}`,
  };
  return { ...item, status: 'COMPLETED', payload: migratedPayload };
}

async function resumeSaleCancellation(item: SyncQueueItem): Promise<VirtualBoletaCancellationResult> {
  let currentItem = item;
  if (!isDurableCancellationPayload(currentItem.payload)) {
    // Las operaciones de la versión anterior se encolaban al final del flujo,
    // por lo que ya representaban una anulación aplicada. Se cierran sin
    // reprocesar stock ni crear una segunda auditoría.
    currentItem = completeLegacyCancellationOperation(currentItem);
    await idbSaveQueueItemStrict(currentItem);
    return getCancellationResult(currentItem, 'ANULADA', 'Anulación histórica migrada a operación durable.');
  }
  const payload = currentItem.payload;

  try {
    if (payload.stage === 'OPERATION_CREATED') {
      const boletas = getStoredVirtualBoletas();
      const boletaIndex = boletas.findIndex((boleta) => boleta.id === payload.boletaVirtualId);
      if (boletaIndex === -1) throw new Error('No se encontró la Boleta Virtual de la anulación pendiente.');

      const boleta = boletas[boletaIndex];
      boletas[boletaIndex] = {
        ...boleta,
        isAnulado: true,
        anuladoPor: payload.usuario,
        anuladoRol: payload.rol,
        anuladoAt: boleta.anuladoAt || payload.createdAtLocal,
        motivoAnulacion: payload.motivo,
        estadoAnulacion: 'ANULACION_EN_PROCESO',
        anulacionOperationId: currentItem.operationId,
      };
      saveVirtualBoletas(boletas);
      await idbSaveEntityStrict('boletas', boletas[boletaIndex]);

      // El estado transitorio evita que los movimientos vinculados aparezcan
      // como ventas activas antes de alcanzar su etapa de anulación definitiva.
      const movements = getStoredMovements();
      const movementIds = new Set(payload.movementIds);
      const movementsInProcess: Movement[] = [];
      movements.forEach((movement, index) => {
        if (!movementIds.has(movement.id) || movement.isAnulado || movement.anulacionEnProceso) return;
        movements[index] = {
          ...movement,
          anulacionEnProceso: true,
          anulacionOperationId: currentItem.operationId,
        };
        movementsInProcess.push(movements[index]);
      });
      saveMovements(movements);
      await Promise.all(
        movements
          .filter((movement) => movementIds.has(movement.id))
          .map((movement) => idbSaveEntityStrict('movements', movement))
      );

      currentItem = await persistCancellationStage(currentItem, 'BOLETA_MARKED_CANCELLED');
      throwIfCancellationFailureWasRequested('BOLETA_MARKED_CANCELLED');
    }

    if ((currentItem.payload as AtomicSaleCancellationPayload).stage === 'BOLETA_MARKED_CANCELLED') {
      const movements = getStoredMovements();
      const movementIds = new Set(payload.movementIds);
      const updatedMovements: Movement[] = [];

      movements.forEach((movement, index) => {
        if (!movementIds.has(movement.id) || movement.isAnulado) return;
        movements[index] = {
          ...movement,
          isAnulado: true,
          anuladoPor: payload.usuario,
          anuladoRol: payload.rol,
          anuladoAt: payload.createdAtLocal,
          motivoAnulacion: payload.motivo,
          anulacionEnProceso: false,
          anulacionOperationId: currentItem.operationId,
        };
        updatedMovements.push(movements[index]);
      });
      saveMovements(movements);
      await Promise.all(
        movements
          .filter((movement) => movementIds.has(movement.id))
          .map((movement) => idbSaveEntityStrict('movements', movement))
      );
      currentItem = await persistCancellationStage(currentItem, 'MOVEMENTS_MARKED_CANCELLED');
      throwIfCancellationFailureWasRequested('MOVEMENTS_MARKED_CANCELLED');
    }

    if ((currentItem.payload as AtomicSaleCancellationPayload).stage === 'MOVEMENTS_MARKED_CANCELLED') {
      const boleta = getStoredVirtualBoletas().find((current) => current.id === payload.boletaVirtualId);
      if (!boleta) throw new Error('No se encontró la Boleta Virtual para restaurar su stock.');

      const stockMovements = getStoredStockMovements();
      const stockDisponible = new Map<string, { unidades: number; kilogramos: number }>();
      const restoredMovements: StockMovement[] = [];

      for (const restore of payload.stockRestorations) {
        const existingRestoration = stockMovements.find((movement) => movement.id === restore.restorationMovementId);
        if (existingRestoration) {
          await idbSaveEntityStrict('stockMovements', existingRestoration);
          continue;
        }

        const key = `${restore.semanaId}:${restore.productId}`;
        let disponible = stockDisponible.get(key);
        if (!disponible) {
          const summary = getStockSummaryForPeriod(restore.semanaId).find(
            (productSummary) => productSummary.product.id === restore.productId
          );
          disponible = {
            unidades: summary ? summary.unidadesDisponibles : 0,
            kilogramos: summary ? summary.kilogramosDisponibles : 0,
          };
        }

        const restorationMovement: StockMovement = {
          id: restore.restorationMovementId,
          semanaId: restore.semanaId,
          productId: restore.productId,
          productName: restore.productName,
          tipo: 'ANULACION',
          direccion: 'ENTRADA',
          unidades: restore.unidades,
          kilogramos: restore.kilogramos,
          referenciaOrigenId: boleta.id,
          customerId: boleta.customerId,
          customerName: boleta.customerName,
          branchId: boleta.branchId,
          usuario: payload.usuario,
          fechaHora: payload.createdAtLocal,
          motivo: `Restauración por Anulación de Boleta #${boleta.numeroBoleta}: ${payload.motivo}`,
          sincronizado: true,
          saldoPosteriorUnidades: disponible.unidades + restore.unidades,
          saldoPosteriorKilogramos: disponible.kilogramos + restore.kilogramos,
        };
        stockMovements.push(restorationMovement);
        restoredMovements.push(restorationMovement);
        stockDisponible.set(key, {
          unidades: restorationMovement.saldoPosteriorUnidades,
          kilogramos: restorationMovement.saldoPosteriorKilogramos,
        });

        // Punto de recuperación granular: un cierre a mitad del lote conserva este ID determinístico.
        saveStockMovements(stockMovements);
        await idbSaveEntityStrict('stockMovements', restorationMovement);
        if (cancellationStockRestoreFailureAfterForTesting !== null) {
          cancellationStockRestoreFailureAfterForTesting -= 1;
          if (cancellationStockRestoreFailureAfterForTesting <= 0) {
            cancellationStockRestoreFailureAfterForTesting = null;
            throw new Error('Fallo técnico simulado durante la restauración parcial de stock');
          }
        }
      }

      if (boleta.branchId) {
        const customers = getStoredCustomers();
        const customerIndex = customers.findIndex((customer) => customer.id === boleta.customerId);
        const branchIndex = customers[customerIndex]?.sucursales?.findIndex((branch) => branch.id === boleta.branchId) ?? -1;
        if (customerIndex !== -1 && branchIndex !== -1 && customers[customerIndex].sucursales) {
          const branch = customers[customerIndex].sucursales![branchIndex];
          const processedOperations = branch.anulacionOperationIds || [];
          if (!processedOperations.includes(currentItem.operationId)) {
            customers[customerIndex].sucursales![branchIndex] = {
              ...branch,
              saldoActual: branch.saldoActual - (boleta.total - boleta.totalPagado),
              anulacionOperationIds: [...processedOperations, currentItem.operationId],
            };
            saveCustomers(customers);
          }
          await idbSaveEntityStrict('customers', customers[customerIndex]);
        }
      }

      currentItem = await persistCancellationStage(currentItem, 'STOCK_RESTORED');
      throwIfCancellationFailureWasRequested('STOCK_RESTORED');
    }

    if ((currentItem.payload as AtomicSaleCancellationPayload).stage === 'STOCK_RESTORED') {
      const boleta = getStoredVirtualBoletas().find((current) => current.id === payload.boletaVirtualId);
      if (!boleta) throw new Error('No se encontró la Boleta Virtual para registrar la auditoría.');

      recordAuditLog({
        id: payload.auditId,
        usuario: payload.usuario,
        username: payload.username,
        rol: payload.rol,
        accion: `Anulación de Boleta Virtual #${boleta.numeroBoleta}`,
        tipoAccion: 'ANULACION',
        customerId: boleta.customerId,
        customerName: boleta.customerName,
        detalles: `Motivo: ${payload.motivo}. Movimientos contables anulados: ${payload.movementIds.length}. Movimientos de stock restaurados: ${payload.stockRestorations.length}.`,
      });
      currentItem = await persistCancellationStage(currentItem, 'AUDIT_RECORDED');
      throwIfCancellationFailureWasRequested('AUDIT_RECORDED');
    }

    if ((currentItem.payload as AtomicSaleCancellationPayload).stage === 'AUDIT_RECORDED') {
      const boletas = getStoredVirtualBoletas();
      const boletaIndex = boletas.findIndex((boleta) => boleta.id === payload.boletaVirtualId);
      if (boletaIndex === -1) throw new Error('No se encontró la Boleta Virtual para completar la anulación.');
      boletas[boletaIndex] = { ...boletas[boletaIndex], estadoAnulacion: 'COMPLETADA' };
      saveVirtualBoletas(boletas);
      await idbSaveEntityStrict('boletas', boletas[boletaIndex]);
      currentItem = await persistCancellationStage(currentItem, 'COMPLETED');
    }

    return getCancellationResult(
      currentItem,
      'ANULADA',
      'Venta anulada correctamente. La operación durable quedó completada.'
    );
  } catch (error: any) {
    const message = error?.message || 'No se pudo completar la anulación pendiente.';
    if (isDurableCancellationPayload(currentItem.payload)) {
      await persistCancellationStage(currentItem, currentItem.payload.stage, message).catch(() => {});
    } else {
      await idbSaveQueueItemStrict({
        ...currentItem,
        status: 'ERROR',
        payload: { ...(currentItem.payload || {}), lastError: message },
      }).catch(() => {});
    }
    throw new Error(message);
  }
}

function resumeSaleCancellationWithLock(item: SyncQueueItem): Promise<VirtualBoletaCancellationResult> {
  const active = activeCancellationResumes.get(item.operationId);
  if (active) return active;

  const lockToken = acquireCancellationLock(item.operationId);
  if (!lockToken) {
    return Promise.resolve(
      getCancellationResult(item, 'EN_PROCESO', 'Otra pestaña está completando esta anulación.')
    );
  }

  const task = resumeSaleCancellation(item).finally(() => {
    activeCancellationResumes.delete(item.operationId);
    releaseCancellationLock(item.operationId, lockToken);
  });
  activeCancellationResumes.set(item.operationId, task);
  return task;
}

export async function resumeVirtualBoletaCancellation(operationId: string): Promise<VirtualBoletaCancellationResult> {
  const pendingItems = await idbGetIncompleteSaleCancellationItems();
  const item = pendingItems.find((candidate) => candidate.operationId === operationId);
  if (!item) {
    const completed = (await idbGetAllQueueItems()).find(
      (candidate) => candidate.operationId === operationId && candidate.status === 'COMPLETED'
    );
    if (completed) return getCancellationResult(completed, 'ANULADA', 'La anulación ya estaba completada.');
    throw new Error('No se encontró una anulación pendiente para recuperar.');
  }
  return resumeSaleCancellationWithLock(item);
}

export async function recoverPendingVirtualBoletaCancellations(): Promise<{
  recoveredCount: number;
  pendingCount: number;
  errors: string[];
}> {
  const pendingItems = await idbGetIncompleteSaleCancellationItems();
  let recoveredCount = 0;
  const errors: string[] = [];

  for (const item of pendingItems) {
    try {
      const result = await resumeSaleCancellationWithLock(item);
      if (result.status === 'ANULADA') recoveredCount++;
    } catch (error: any) {
      errors.push(error?.message || 'No se pudo recuperar una anulación pendiente.');
    }
  }

  return { recoveredCount, pendingCount: pendingItems.length, errors };
}

// Crea primero la operación durable y recién después modifica los datos de la venta.
export async function anularVirtualBoleta(params: {
  boletaId: string;
  usuario: string;
  username?: string;
  rol?: UserRole;
  motivo: string;
}): Promise<VirtualBoletaCancellationResult> {
  const existingOperations = await idbGetIncompleteSaleCancellationItems();
  const existingOperation = existingOperations.find(
    (item) =>
      (item.payload as AtomicSaleCancellationPayload).boletaVirtualId === params.boletaId ||
      item.entityId === params.boletaId
  );
  if (existingOperation) {
    try {
      return await resumeSaleCancellationWithLock(existingOperation);
    } catch (error: any) {
      return getCancellationResult(
        existingOperation,
        'EN_PROCESO',
        error?.message || 'La anulación sigue pendiente de recuperación.'
      );
    }
  }

  const virtualBoletas = getStoredVirtualBoletas();
  const boletaIndex = virtualBoletas.findIndex((b) => b.id === params.boletaId);
  if (boletaIndex === -1) {
    return {
      status: 'NO_ENCONTRADA',
      message: 'No se encontró la Boleta Virtual solicitada.',
      movimientosAnulados: [],
      movimientosStockGenerados: [],
    };
  }

  const boleta = virtualBoletas[boletaIndex];
  if (boleta.isAnulado) {
    return {
      status: 'YA_ANULADA',
      message: 'Esta boleta ya se encuentra anulada.',
      boleta,
      movimientosAnulados: [],
      movimientosStockGenerados: [],
    };
  }

  const nowIso = new Date().toISOString();
  // Una misma boleta sólo puede tener una anulación integral: el ID estable
  // evita que dos pestañas creen operaciones concurrentes distintas.
  const operationId = `sale_cancel_${boleta.id}`;
  const deviceId = getDeviceId();
  const payload: AtomicSaleCancellationPayload = {
    boletaVirtualId: boleta.id,
    motivo: params.motivo,
    usuario: params.usuario,
    username: params.username,
    rol: params.rol,
    deviceId,
    createdAtLocal: nowIso,
    stage: 'OPERATION_CREATED',
    completedStages: ['OPERATION_CREATED'],
    movementIds: getStoredMovements()
      .filter((movement) => movement.boletaVirtualId === boleta.id)
      .map((movement) => movement.id),
    stockRestorations: buildCancellationStockRestorations(operationId, boleta),
    stockPeriodIds: Array.from(new Set(buildCancellationStockRestorations(operationId, boleta).map((restore) => restore.semanaId))),
    auditId: `audit_sale_cancel_${operationId}`,
  };
  const operation: SyncQueueItem = {
    operationId,
    entityType: 'ATOMIC_SALE_CANCELLATION',
    entityId: boleta.id,
    action: 'ATOMIC_TRANSACTION',
    payload,
    createdAt: nowIso,
    createdBy: params.usuario,
    deviceId,
    retryCount: 0,
    status: 'PENDING',
  };

  // Este await es la barrera de durabilidad: sin operación en IndexedDB no se toca la venta.
  await idbSaveQueueItemStrict(operation);
  return resumeSaleCancellationWithLock(operation);
}

// Stock Adjustment / Merma Registration
export function registerStockAdjustment(params: {
  productId: string;
  productName: string;
  tipo: 'MERMA' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO' | 'CONTEO_FISICO';
  unidades: number;
  kilogramos: number;
  motivo: string;
  usuario: string;
}): StockMovement {
  const period = getActiveStockPeriod();
  const nowIso = new Date().toISOString();
  const summary = getStockSummaryForPeriod(period.id);
  const prodSummary = summary.find((s) => s.product.id === params.productId);

  const prevU = prodSummary ? prodSummary.unidadesDisponibles : 0;
  const prevKg = prodSummary ? prodSummary.kilogramosDisponibles : 0;

  const isEntrada = params.tipo === 'AJUSTE_POSITIVO';
  const direccion = isEntrada ? 'ENTRADA' : 'SALIDA';

  let newU = isEntrada ? prevU + params.unidades : Math.max(0, prevU - params.unidades);
  let newKg = isEntrada ? prevKg + params.kilogramos : Math.max(0, prevKg - params.kilogramos);

  if (params.tipo === 'CONTEO_FISICO') {
    // Difference adjustment
    newU = params.unidades;
    newKg = params.kilogramos;
  }

  const sm: StockMovement = {
    id: `sm_adj_${Date.now()}`,
    semanaId: period.id,
    productId: params.productId,
    productName: params.productName,
    tipo: params.tipo,
    direccion,
    unidades: params.unidades,
    kilogramos: params.kilogramos,
    usuario: params.usuario,
    fechaHora: nowIso,
    motivo: params.motivo,
    sincronizado: true,
    saldoPosteriorUnidades: newU,
    saldoPosteriorKilogramos: newKg,
  };

  const movements = getStoredStockMovements();
  movements.push(sm);
  saveStockMovements(movements);

  recordAuditLog({
    usuario: params.usuario,
    accion: `Ajuste de Stock (${params.tipo}) en ${params.productName}`,
    tipoAccion: 'AJUSTE',
    detalles: `U: ${params.unidades}, Kg: ${params.kilogramos}. Motivo: ${params.motivo}`,
  });

  return sm;
}

// WhatsApp Message Formatters
export function generateCustomerVirtualBoletaWpMessage(
  customerName: string,
  boleta: VirtualBoleta
): string {
  const totalFormatted = boleta.total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
  const pagadoFormatted = boleta.totalPagado.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
  const saldoPendienteFormatted = boleta.saldoRestanteBoleta.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
  const saldoTotalFormatted = boleta.nuevoSaldoCuenta.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  const itemsList = boleta.items
    .map((it) => {
      const uText = it.unidades > 0 ? `${it.unidades}u` : '';
      const kgText = it.kilajeReal > 0 ? `${it.kilajeReal}kg` : '';
      const detail = [uText, kgText].filter(Boolean).join(' / ');
      return `• ${it.productName} (${detail}): ${it.subtotal.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}`;
    })
    .join('\n');

  return (
    `Hola *${customerName}*! Te enviamos el detalle de la compra realizada hoy (Boleta #${boleta.numeroBoleta}):\n\n` +
    `*Detalle de Productos:*\n${itemsList}\n\n` +
    `💰 *Total de esta compra:* ${totalFormatted}\n` +
    `💵 *Abonado hoy:* ${pagadoFormatted}\n` +
    `📌 *Saldo pendiente de esta boleta:* ${saldoPendienteFormatted}\n` +
    `📊 *Saldo TOTAL de tu cuenta corriente:* ${saldoTotalFormatted}\n\n` +
    `Muchas gracias por elegir *C&C Distribuidora*! 🚚`
  );
}

export function generateInternalBoletaWpText(boleta: VirtualBoleta): string {
  return (
    `📋 *NUEVA BOLETA FÍSICA Y VIRTUAL REGISTRADA*\n` +
    `----------------------------------------\n` +
    `🧾 *N° Boleta:* #${boleta.numeroBoleta}\n` +
    `👤 *Cliente:* ${boleta.customerName}${boleta.branchName ? ` (${boleta.branchName})` : ''}\n` +
    `💵 *Total Boleta:* $${boleta.total.toLocaleString('es-AR')}\n` +
    `💳 *Total Abonado:* $${boleta.totalPagado.toLocaleString('es-AR')}\n` +
    `📌 *Saldo Restante:* $${boleta.saldoRestanteBoleta.toLocaleString('es-AR')}\n` +
    `👤 *Registrado por:* ${boleta.registradoPor}\n` +
    `📅 *Fecha:* ${new Date(boleta.fechaHora).toLocaleString('es-AR')}\n\n` +
    `📸 *Adjunto foto de la boleta física conformada.*`
  );
}
