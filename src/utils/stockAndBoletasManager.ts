import {
  Product,
  PriceListType,
  StockPeriod,
  MataderoIngreso,
  StockMovement,
  VirtualBoleta,
  ProductStockSummary,
  SemaforoState,
  Customer,
  CustomerBranch,
  Movement,
} from '../types';
import { getStoredCustomers, saveCustomers, getStoredMovements, saveMovements } from './storage';
import { formatCurrency } from './formatters';
import { recordAuditLog } from './auditLogger';
import {
  generateOperationId,
  idbSaveQueueItem,
  idbSaveEntity,
  idbSaveImageBlob,
  getDeviceId,
} from './indexedDBEngine';
import { runFullSyncProcess } from './syncEngine';

const PRODUCTS_KEY = 'cyc_gestion_products_v1';
const STOCK_PERIODS_KEY = 'cyc_gestion_stock_periods_v1';
const MATADERO_INGRESOS_KEY = 'cyc_gestion_matadero_ingresos_v1';
const STOCK_MOVEMENTS_KEY = 'cyc_gestion_stock_movements_v1';
const VIRTUAL_BOLETAS_KEY = 'cyc_gestion_virtual_boletas_v1';

// Products catalogue default - Exact 24 Canonical Products
export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod_higado',
    codigo: 'HIG-01',
    nombre: 'Higado',
    tipoVenta: 'UNIDADES_INFORMATIVAS_COBRO_POR_KILO',
    tipoControlStock: 'UNIDADES_Y_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 5200, MAYORISTA: 4850, ESPECIAL: 4600, PERSONALIZADA: 5005 },
    stockMinimoUnidades: 10,
    stockMinimoKg: 50,
    activo: true,
    orden: 1,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_corazon',
    codigo: 'COR-02',
    nombre: 'Corazon',
    tipoVenta: 'UNIDADES_INFORMATIVAS_COBRO_POR_KILO',
    tipoControlStock: 'UNIDADES_Y_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 4500, MAYORISTA: 4100, ESPECIAL: 3900, PERSONALIZADA: 4300 },
    stockMinimoUnidades: 8,
    stockMinimoKg: 30,
    activo: true,
    orden: 2,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_lengua',
    codigo: 'LEN-03',
    nombre: 'Lengua',
    tipoVenta: 'UNIDADES_INFORMATIVAS_COBRO_POR_KILO',
    tipoControlStock: 'UNIDADES_Y_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 9800, MAYORISTA: 9200, ESPECIAL: 8800, PERSONALIZADA: 9400 },
    stockMinimoUnidades: 5,
    stockMinimoKg: 15,
    activo: true,
    orden: 3,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_quijada',
    codigo: 'QUI-04',
    nombre: 'Quijada',
    tipoVenta: 'UNIDADES_INFORMATIVAS_COBRO_POR_KILO',
    tipoControlStock: 'UNIDADES_Y_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 4000, MAYORISTA: 3700, ESPECIAL: 3500, PERSONALIZADA: 3800 },
    stockMinimoUnidades: 5,
    stockMinimoKg: 20,
    activo: true,
    orden: 4,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_rabo',
    codigo: 'RAB-05',
    nombre: 'Rabo',
    tipoVenta: 'UNIDADES_INFORMATIVAS_COBRO_POR_KILO',
    tipoControlStock: 'UNIDADES_Y_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 7800, MAYORISTA: 7300, ESPECIAL: 7000, PERSONALIZADA: 7500 },
    stockMinimoUnidades: 5,
    stockMinimoKg: 20,
    activo: true,
    orden: 5,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_rinon',
    codigo: 'RIN-06',
    nombre: 'Riñon',
    tipoVenta: 'UNIDADES_INFORMATIVAS_COBRO_POR_KILO',
    tipoControlStock: 'UNIDADES_Y_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 4200, MAYORISTA: 3800, ESPECIAL: 3600, PERSONALIZADA: 3900 },
    stockMinimoUnidades: 10,
    stockMinimoKg: 30,
    activo: true,
    orden: 6,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_bofe',
    codigo: 'BOF-07',
    nombre: 'Bofe',
    tipoVenta: 'UNIDADES_INFORMATIVAS_COBRO_POR_KILO',
    tipoControlStock: 'UNIDADES_Y_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 2400, MAYORISTA: 2100, ESPECIAL: 1900, PERSONALIZADA: 2200 },
    stockMinimoUnidades: 5,
    stockMinimoKg: 20,
    activo: true,
    orden: 7,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_centro',
    codigo: 'CEN-08',
    nombre: 'Centro',
    tipoVenta: 'UNIDADES_INFORMATIVAS_COBRO_POR_KILO',
    tipoControlStock: 'UNIDADES_Y_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 12500, MAYORISTA: 11800, ESPECIAL: 11200, PERSONALIZADA: 7000 },
    stockMinimoUnidades: 5,
    stockMinimoKg: 20,
    activo: true,
    orden: 8,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_chinchulin',
    codigo: 'CHI-09',
    nombre: 'Chinchulin',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'SOLO_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 6800, MAYORISTA: 6300, ESPECIAL: 6000, PERSONALIZADA: 6000 },
    stockMinimoUnidades: 0,
    stockMinimoKg: 40,
    activo: true,
    orden: 9,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_mondongo',
    codigo: 'MON-10',
    nombre: 'Mondongo',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'SOLO_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 5900, MAYORISTA: 5400, ESPECIAL: 5100, PERSONALIZADA: 5600 },
    stockMinimoUnidades: 0,
    stockMinimoKg: 35,
    activo: true,
    orden: 10,
    usaUnidades: false,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_tripa',
    codigo: 'TRI-11',
    nombre: 'Tripa',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'SOLO_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 4800, MAYORISTA: 4300, ESPECIAL: 4000, PERSONALIZADA: 4500 },
    stockMinimoUnidades: 0,
    stockMinimoKg: 25,
    activo: true,
    orden: 11,
    usaUnidades: false,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_rueda',
    codigo: 'RUE-12',
    nombre: 'Rueda',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'SOLO_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 3500, MAYORISTA: 3100, ESPECIAL: 2900, PERSONALIZADA: 3200 },
    stockMinimoUnidades: 0,
    stockMinimoKg: 20,
    activo: true,
    orden: 12,
    usaUnidades: false,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_seso',
    codigo: 'SES-13',
    nombre: 'Seso',
    tipoVenta: 'POR_UNIDAD',
    tipoControlStock: 'SOLO_UNIDADES',
    unidadMedida: 'u',
    precios: { GENERAL: 2800, MAYORISTA: 2400, ESPECIAL: 2200, PERSONALIZADA: 2500 },
    stockMinimoUnidades: 10,
    stockMinimoKg: 0,
    activo: true,
    orden: 13,
    usaUnidades: true,
    usaKilogramos: false,
    cobroPor: 'UNIDAD',
  },
  {
    id: 'prod_molleja',
    codigo: 'MOL-14',
    nombre: 'Molleja',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'SOLO_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 12000, MAYORISTA: 11200, ESPECIAL: 10800, PERSONALIZADA: 11500 },
    stockMinimoUnidades: 0,
    stockMinimoKg: 15,
    activo: true,
    orden: 14,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_ganote',
    codigo: 'GAN-15',
    nombre: 'Gañote',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'SOLO_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 3000, MAYORISTA: 2600, ESPECIAL: 2400, PERSONALIZADA: 2800 },
    stockMinimoUnidades: 0,
    stockMinimoKg: 15,
    activo: true,
    orden: 15,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_pechito',
    codigo: 'PEC-16',
    nombre: 'Pechito',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'SOLO_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 6500, MAYORISTA: 5900, ESPECIAL: 5600, PERSONALIZADA: 6200 },
    stockMinimoUnidades: 0,
    stockMinimoKg: 20,
    activo: true,
    orden: 16,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_carre',
    codigo: 'CAR-17',
    nombre: 'Carre',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'SOLO_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 6800, MAYORISTA: 6200, ESPECIAL: 5900, PERSONALIZADA: 6500 },
    stockMinimoUnidades: 0,
    stockMinimoKg: 20,
    activo: true,
    orden: 17,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_bondiola_fresca',
    codigo: 'BDF-18',
    nombre: 'Bondiola Fresca',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'SOLO_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 8200, MAYORISTA: 7600, ESPECIAL: 7300, PERSONALIZADA: 7800 },
    stockMinimoUnidades: 0,
    stockMinimoKg: 20,
    activo: true,
    orden: 18,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_bondiola_congelada',
    codigo: 'BDC-19',
    nombre: 'Bondiola Congelada',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'SOLO_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 7600, MAYORISTA: 7000, ESPECIAL: 6700, PERSONALIZADA: 7200 },
    stockMinimoUnidades: 0,
    stockMinimoKg: 20,
    activo: true,
    orden: 19,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_nuez',
    codigo: 'NUE-20',
    nombre: 'Nuez',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'SOLO_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 9000, MAYORISTA: 8300, ESPECIAL: 8000, PERSONALIZADA: 8500 },
    stockMinimoUnidades: 0,
    stockMinimoKg: 15,
    activo: true,
    orden: 20,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_cuajo_crudo',
    codigo: 'CUC-21',
    nombre: 'Cuajo Crudo',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'SOLO_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 3200, MAYORISTA: 2800, ESPECIAL: 2600, PERSONALIZADA: 2900 },
    stockMinimoUnidades: 0,
    stockMinimoKg: 15,
    activo: true,
    orden: 21,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_cuajo_cocinado',
    codigo: 'CUO-22',
    nombre: 'Cuajo Cocinado',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'SOLO_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 3700, MAYORISTA: 3300, ESPECIAL: 3000, PERSONALIZADA: 3400 },
    stockMinimoUnidades: 0,
    stockMinimoKg: 15,
    activo: true,
    orden: 22,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_pajarilla',
    codigo: 'PAJ-23',
    nombre: 'Pajarilla',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'SOLO_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 2300, MAYORISTA: 2000, ESPECIAL: 1800, PERSONALIZADA: 2100 },
    stockMinimoUnidades: 0,
    stockMinimoKg: 15,
    activo: true,
    orden: 23,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
  {
    id: 'prod_tendones',
    codigo: 'TEN-24',
    nombre: 'Tendones',
    tipoVenta: 'POR_KILO',
    tipoControlStock: 'SOLO_KILOS',
    unidadMedida: 'kg',
    precios: { GENERAL: 3800, MAYORISTA: 3400, ESPECIAL: 3100, PERSONALIZADA: 3600 },
    stockMinimoUnidades: 0,
    stockMinimoKg: 15,
    activo: true,
    orden: 24,
    usaUnidades: true,
    usaKilogramos: true,
    cobroPor: 'KG',
  },
];

// Helper Products Storage
export function getStoredProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (!raw) {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS));
      return DEFAULT_PRODUCTS;
    }
    const list: Product[] = JSON.parse(raw);
    // Ensure all 24 canonical products exist or reset if missing canonical ones
    const canonicalIds = new Set(DEFAULT_PRODUCTS.map(p => p.id));
    const hasAllCanonical = DEFAULT_PRODUCTS.every(dp => list.some(p => p.id === dp.id));
    
    if (!hasAllCanonical) {
      // Re-initialize with canonical list, preserving customized prices if found
      const merged = DEFAULT_PRODUCTS.map(dp => {
        const found = list.find(p => p.id === dp.id);
        return found ? { ...dp, precios: { ...dp.precios, ...found.precios }, activo: found.activo } : dp;
      });
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(merged));
      return merged;
    }

    return list.sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));
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
  fotoBoletaFisicaUrl?: string;
  usuario: string;
  listaPrecioAplicada: PriceListType | 'PERSONALIZADA';
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
  const custMovements = allMovements.filter((m) => m.customerId === targetCust.id && !m.isAnulado);

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

// Anular Virtual Boleta & Reverse Stock + Cuenta Corriente
export function anularVirtualBoleta(params: {
  boletaId: string;
  usuario: string;
  motivo: string;
}): boolean {
  const virtualBoletas = getStoredVirtualBoletas();
  const boletaIndex = virtualBoletas.findIndex((b) => b.id === params.boletaId);
  if (boletaIndex === -1) return false;

  const boleta = virtualBoletas[boletaIndex];
  if (boleta.isAnulado) return true;

  const nowIso = new Date().toISOString();

  // Mark Boleta as anulada
  virtualBoletas[boletaIndex].isAnulado = true;
  virtualBoletas[boletaIndex].anuladoPor = params.usuario;
  virtualBoletas[boletaIndex].anuladoAt = nowIso;
  virtualBoletas[boletaIndex].motivoAnulacion = params.motivo;
  saveVirtualBoletas(virtualBoletas);

  // Anular associated Cuenta Corriente Movements
  const movements = getStoredMovements();
  movements.forEach((m) => {
    if (m.boletaVirtualId === boleta.id || m.numeroBoleta === boleta.numeroBoleta) {
      m.isAnulado = true;
      m.anuladoPor = params.usuario;
      m.anuladoAt = nowIso;
      m.motivoAnulacion = params.motivo;
    }
  });
  saveMovements(movements);

  // Restore Stock by generating inverse stock movements (ANULACION, ENTRADA)
  const period = getActiveStockPeriod();
  const stockMovements = getStoredStockMovements();
  const summary = getStockSummaryForPeriod(period.id);

  boleta.items.forEach((item) => {
    const prodSummary = summary.find((s) => s.product.id === item.productId);
    const prevU = prodSummary ? prodSummary.unidadesDisponibles : 0;
    const prevKg = prodSummary ? prodSummary.kilogramosDisponibles : 0;

    const sm: StockMovement = {
      id: `sm_anul_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      semanaId: period.id,
      productId: item.productId,
      productName: item.productName,
      tipo: 'ANULACION',
      direccion: 'ENTRADA',
      unidades: item.unidades,
      kilogramos: item.kilajeReal,
      referenciaOrigenId: boleta.id,
      customerId: boleta.customerId,
      customerName: boleta.customerName,
      branchId: boleta.branchId,
      usuario: params.usuario,
      fechaHora: nowIso,
      motivo: `Restauración por Anulación de Boleta #${boleta.numeroBoleta}: ${params.motivo}`,
      sincronizado: true,
      saldoPosteriorUnidades: prevU + item.unidades,
      saldoPosteriorKilogramos: prevKg + item.kilajeReal,
    };
    stockMovements.push(sm);
  });

  saveStockMovements(stockMovements);

  recordAuditLog({
    usuario: params.usuario,
    accion: `Anulación de Boleta Virtual #${boleta.numeroBoleta}`,
    tipoAccion: 'ANULACION',
    customerId: boleta.customerId,
    customerName: boleta.customerName,
    detalles: `Motivo: ${params.motivo}. Stock restaurado.`,
  });

  return true;
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
  const totalFormatted = formatCurrency(boleta.total);
  const saldoActualizadoFormatted = formatCurrency(boleta.nuevoSaldoCuenta);
  const estadoTexto = boleta.nuevoSaldoCuenta <= 0.01 ? 'AL DÍA' : `DEBE ${saldoActualizadoFormatted}`;

  return (
    `Hola *${customerName}*, te enviamos la boleta de la compra realizada hoy (Boleta #${boleta.numeroBoleta}).\n\n` +
    `Total de la boleta: *${totalFormatted}*\n` +
    `Saldo actualizado: *${saldoActualizadoFormatted}*\n` +
    `Estado: *${estadoTexto}*\n\n` +
    `Ante cualquier consulta, respondé a este mensaje.\n` +
    `Muchas gracias.`
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
