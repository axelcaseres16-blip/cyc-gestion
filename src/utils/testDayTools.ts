import { getAuditLogs } from './auditLogger';
import {
  idbGetAllConflicts,
  idbGetAllEntities,
  idbGetAllImages,
  idbGetAllQueueItems,
} from './indexedDBEngine';
import {
  getStoredMataderoIngresos,
  getStoredProducts,
  getStoredStockMovements,
  getStoredStockPeriods,
  getStoredVirtualBoletas,
} from './stockAndBoletasManager';
import { getActivityLogs, getStoredCustomers, getStoredMovements, getStoredVisits } from './storage';

const COMPLETED_SALE_KEY = 'cc_last_completed_sale';

const isFromToday = (value: string | undefined) => {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
};

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error || new Error('No se pudo leer una imagen del respaldo'));
  reader.readAsDataURL(blob);
});

const getLocalStorageSnapshot = () => Object.keys(localStorage)
  .filter((key) => key.startsWith('cyc_') || key === COMPLETED_SALE_KEY)
  .reduce<Record<string, string>>((snapshot, key) => {
    const value = localStorage.getItem(key);
    if (value !== null) snapshot[key] = value;
    return snapshot;
  }, {});

export interface TestDaySummary {
  clientesVisitados: number;
  ventas: number;
  totalVendido: number;
  efectivoCobrado: number;
  transferenciasCobradas: number;
  totalPendiente: number;
  boletasGeneradas: number;
  boletasEnviadas: number;
  pendientesRecuperacion: number;
  erroresPendientes: number;
}

export async function getTestDaySummary(): Promise<TestDaySummary> {
  const movements = getStoredMovements();
  const visits = getStoredVisits();
  const virtualBoletas = getStoredVirtualBoletas();
  const activityLogs = getActivityLogs();
  const [queue, conflicts] = await Promise.all([idbGetAllQueueItems(), idbGetAllConflicts()]);

  const todaySales = movements.filter((movement) =>
    movement.tipo === 'BOLETA' && !movement.isAnulado && isFromToday(movement.fecha)
  );
  const todayPayments = movements.filter((movement) =>
    movement.tipo === 'PAGO' && !movement.isAnulado && isFromToday(movement.fecha)
  );
  const todayVirtualBoletas = virtualBoletas.filter((boleta) => isFromToday(boleta.fechaHora));
  const confirmedShares = activityLogs.filter((activity) =>
    isFromToday(activity.fechaHora)
    && activity.tipoAccion === 'WHATSAPP'
    && /boleta|comprobante/i.test(`${activity.accion} ${activity.detalles || ''}`)
  );
  const pendingQueue = queue.filter((item) =>
    item.status === 'LOCAL_SAVED' || item.status === 'PENDING' || item.status === 'ERROR'
  );

  return {
    clientesVisitados: new Set(visits.filter((visit) => isFromToday(visit.fechaHora)).map((visit) => visit.customerId)).size,
    ventas: todaySales.length,
    totalVendido: todaySales.reduce((total, movement) => total + movement.monto, 0),
    efectivoCobrado: todayPayments
      .filter((movement) => movement.metodoPago === 'EFECTIVO')
      .reduce((total, movement) => total + movement.monto, 0),
    transferenciasCobradas: todayPayments
      .filter((movement) => movement.metodoPago === 'TRANSFERENCIA')
      .reduce((total, movement) => total + movement.monto, 0),
    totalPendiente: todayVirtualBoletas
      .filter((boleta) => !boleta.isAnulado)
      .reduce((total, boleta) => total + Math.max(0, boleta.saldoRestanteBoleta), 0),
    boletasGeneradas: todayVirtualBoletas.length,
    boletasEnviadas: confirmedShares.length,
    pendientesRecuperacion: pendingQueue.length + conflicts.filter((conflict) => conflict.status === 'CONFLICT_PENDING').length,
    erroresPendientes: queue.filter((item) => item.status === 'ERROR').length,
  };
}

export async function exportTestDayBackup(): Promise<string> {
  const [images, queue, conflicts, indexedBoletas, indexedMovements, indexedCustomers, indexedStockMovements] = await Promise.all([
    idbGetAllImages(),
    idbGetAllQueueItems(),
    idbGetAllConflicts(),
    idbGetAllEntities('boletas'),
    idbGetAllEntities('movements'),
    idbGetAllEntities('customers'),
    idbGetAllEntities('stockMovements'),
  ]);
  const serializedImages = await Promise.all(images.map(async (image) => ({
    ...image,
    blob: typeof image.blob === 'string' ? image.blob : await blobToDataUrl(image.blob),
  })));

  return JSON.stringify({
    app: 'C&C Gestión Prueba',
    format: 'CYC_TEST_DAY_BACKUP_V1',
    exportedAt: new Date().toISOString(),
    localStorage: getLocalStorageSnapshot(),
    customers: getStoredCustomers(),
    movements: getStoredMovements(),
    virtualBoletas: getStoredVirtualBoletas(),
    visits: getStoredVisits(),
    products: getStoredProducts(),
    priceLists: JSON.parse(localStorage.getItem('cyc_gestion_price_lists_v1') || '[]'),
    priceListHistory: JSON.parse(localStorage.getItem('cyc_gestion_price_list_history_v1') || '[]'),
    stockMovements: getStoredStockMovements(),
    stockPeriods: getStoredStockPeriods(),
    mataderoIngresos: getStoredMataderoIngresos(),
    activity: getActivityLogs(),
    audit: getAuditLogs(),
    pendingCompletedSale: localStorage.getItem(COMPLETED_SALE_KEY),
    indexedDB: {
      imageBlobs: serializedImages,
      syncQueue: queue,
      conflicts,
      boletas: indexedBoletas,
      movements: indexedMovements,
      customers: indexedCustomers,
      stockMovements: indexedStockMovements,
    },
  }, null, 2);
}

export const getTestBackupFileName = () => {
  const timestamp = new Date().toISOString().replace('T', '-').slice(0, 16).replace(':', '-');
  return `CYC-Prueba-${timestamp}.json`;
};
