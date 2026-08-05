/**
 * Motor de Sincronización Automática e Idempotencia (Sync Engine)
 * C&C Gestión - Menudencias C&C
 */

import {
  idbGetPendingQueueItems,
  idbUpdateQueueStatus,
  idbGetPendingImages,
  idbUpdateImageStatus,
  idbSaveConflict,
  SyncQueueItem,
  ImageBlobEntry,
  SyncConflictItem,
  idbSaveEntity,
  idbGetAllQueueItems,
} from './indexedDBEngine';
import {
  getStoredMovements,
  saveMovements,
  getStoredCustomers,
  saveCustomers,
  isSimulatedOffline,
} from './storage';
import {
  getStoredVirtualBoletas,
  saveVirtualBoletas,
  getStoredStockMovements,
  saveStockMovements,
  resumeVirtualBoletaCancellation,
} from './stockAndBoletasManager';
import { VirtualBoleta, Movement, StockMovement, Customer } from '../types';

const PROCESSED_OPS_KEY = 'cyc_processed_operation_ids_v1';
const SYNC_LOCK_KEY = 'cyc_active_sync_lock_v1';

/**
 * Obtiene la lista de IDs de operaciones ya procesadas (Idempotencia)
 */
export function getProcessedOperationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(PROCESSED_OPS_KEY);
    if (!raw) return new Set<string>();
    return new Set<string>(JSON.parse(raw));
  } catch {
    return new Set<string>();
  }
}

/**
 * Registra una operación como procesada para evitar duplicaciones
 */
export function recordProcessedOperationId(opId: string): void {
  try {
    const processed = getProcessedOperationIds();
    processed.add(opId);
    localStorage.setItem(PROCESSED_OPS_KEY, JSON.stringify(Array.from(processed)));
  } catch (err) {
    console.error('Error guardando ID de operación procesada:', err);
  }
}

/**
 * Control de Lock local entre pestañas para evitar sincronizaciones simultáneas
 */
function acquireSyncLock(): boolean {
  try {
    const lockRaw = localStorage.getItem(SYNC_LOCK_KEY);
    const now = Date.now();
    if (lockRaw) {
      const lockTime = parseInt(lockRaw, 10);
      // Lock expira después de 30 segundos si quedó colgado
      if (now - lockTime < 30000) {
        return false;
      }
    }
    localStorage.setItem(SYNC_LOCK_KEY, now.toString());
    return true;
  } catch {
    return true;
  }
}

function releaseSyncLock(): void {
  try {
    localStorage.removeItem(SYNC_LOCK_KEY);
  } catch {
    // ignore
  }
}

export interface SyncEngineStatusSummary {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncedCount: number;
  errorCount: number;
  conflictCount: number;
  pendingImagesCount: number;
  lastSyncTime: string | null;
  lastSyncError: string | null;
}

let isSyncRunning = false;
let lastSyncTimestamp: string | null = null;
let lastSyncErrorMsg: string | null = null;

// Callbacks para notificar cambios de estado a la UI
type SyncListener = (status: SyncEngineStatusSummary) => void;
const listeners = new Set<SyncListener>();

export function subscribeToSyncEngine(listener: SyncListener): () => void {
  listeners.add(listener);
  // Notificar estado inicial
  getSyncEngineStatus().then(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function notifySyncListeners(): Promise<void> {
  const status = await getSyncEngineStatus();
  listeners.forEach((fn) => {
    try {
      fn(status);
    } catch (e) {
      console.error('Error en listener de SyncEngine:', e);
    }
  });
}

/**
 * Obtiene el resumen del estado del motor de sincronización
 */
export async function getSyncEngineStatus(): Promise<SyncEngineStatusSummary> {
  const isOnline = navigator.onLine && !isSimulatedOffline();
  const allQueue = await idbGetAllQueueItems();
  const pendingImages = await idbGetPendingImages();

  const pendingCount = allQueue.filter(
    (i) => i.status === 'LOCAL_SAVED' || i.status === 'PENDING'
  ).length;
  const syncedCount = allQueue.filter((i) => i.status === 'SYNCED').length;
  const errorCount = allQueue.filter((i) => i.status === 'ERROR').length;
  const conflictCount = allQueue.filter((i) => i.status === 'CONFLICT').length;

  return {
    isOnline,
    isSyncing: isSyncRunning,
    pendingCount,
    syncedCount,
    errorCount,
    conflictCount,
    pendingImagesCount: pendingImages.length,
    lastSyncTime: lastSyncTimestamp,
    lastSyncError: lastSyncErrorMsg,
  };
}

/**
 * Sincroniza la cola de operaciones pendientes e imágenes
 */
export async function runFullSyncProcess(): Promise<{
  success: boolean;
  processedCount: number;
  errorCount: number;
}> {
  if (isSyncRunning) {
    return { success: false, processedCount: 0, errorCount: 0 };
  }

  const isOnline = navigator.onLine && !isSimulatedOffline();
  if (!isOnline) {
    notifySyncListeners();
    return { success: false, processedCount: 0, errorCount: 0 };
  }

  if (!acquireSyncLock()) {
    console.log('Sincronización en curso en otra pestaña/proceso.');
    return { success: false, processedCount: 0, errorCount: 0 };
  }

  isSyncRunning = true;
  notifySyncListeners();

  let processedCount = 0;
  let errorCount = 0;

  try {
    // 1. Procesar imágenes pendientes
    await processPendingImagesQueue();

    // 2. Procesar cola de operaciones
    const pendingItems = await idbGetPendingQueueItems();
    const processedSet = getProcessedOperationIds();

    for (const item of pendingItems) {
      // Regla de idempotencia: Si la operación ya fue procesada anteriormente, marcar SYNCED y omitir
      if (processedSet.has(item.operationId)) {
        await idbUpdateQueueStatus(item.operationId, 'SYNCED', undefined, new Date().toISOString());
        processedCount++;
        continue;
      }

      await idbUpdateQueueStatus(item.operationId, 'SYNCING');

        try {
          await processSingleQueueItem(item);
          // Las anulaciones integrales se completan por etapas y mantienen su
          // estado COMPLETED; no se las debe sobrescribir como SYNCED.
          if (item.entityType === 'ATOMIC_SALE_CANCELLATION') {
            processedCount++;
            continue;
          }
          recordProcessedOperationId(item.operationId);
        await idbUpdateQueueStatus(
          item.operationId,
          'SYNCED',
          undefined,
          new Date().toISOString()
        );
        processedCount++;
      } catch (err: any) {
        console.error(`Error procesando operacion ${item.operationId}:`, err);
        const errMsg = err?.message || 'Error de conexión o datos inválidos';
        lastSyncErrorMsg = errMsg;
        await idbUpdateQueueStatus(item.operationId, 'ERROR', errMsg);
        errorCount++;
      }
    }

    lastSyncTimestamp = new Date().toISOString();
  } catch (globalErr: any) {
    console.error('Error global en runFullSyncProcess:', globalErr);
    lastSyncErrorMsg = globalErr?.message || 'Error inesperado durante la sincronización';
  } finally {
    isSyncRunning = false;
    releaseSyncLock();
    notifySyncListeners();
  }

  return { success: errorCount === 0, processedCount, errorCount };
}

/**
 * Procesa una operación individual de la cola (Garantizando Idempotencia)
 */
async function processSingleQueueItem(item: SyncQueueItem): Promise<void> {
  const { entityType, payload, operationId } = item;

  switch (entityType) {
    case 'ATOMIC_SALE':
      await syncAtomicSalePayload(payload, operationId);
      break;

    case 'ATOMIC_SALE_CANCELLATION':
      await resumeVirtualBoletaCancellation(operationId);
      break;

    case 'BOLETA':
      await syncSingleBoletaPayload(payload, operationId);
      break;

    case 'PAGO':
      await syncSinglePaymentPayload(payload, operationId);
      break;

    case 'STOCK_MOVEMENT':
      await syncStockMovementPayload(payload, operationId);
      break;

    case 'CUSTOMER_EDIT':
      await syncCustomerEditPayload(payload, item);
      break;

    default:
      // Operación desconocida o genérica
      break;
  }
}

/**
 * Sincronización de Venta Atómica (Boleta + Pagos + Stock + Auditoría)
 */
async function syncAtomicSalePayload(payload: any, operationId: string): Promise<void> {
  const { boleta, movements, stockMovements, customer } = payload;

  // Sync to local memory / IndexedDB mirrors
  if (boleta) {
    const currentBoletas = getStoredVirtualBoletas();
    const idx = currentBoletas.findIndex((b) => b.id === boleta.id);
    if (idx === -1) {
      boleta.sincronizado = true;
      currentBoletas.unshift(boleta);
    } else {
      currentBoletas[idx] = { ...boleta, sincronizado: true };
    }
    saveVirtualBoletas(currentBoletas);
    await idbSaveEntity('boletas', boleta);
  }

  if (Array.isArray(movements) && movements.length > 0) {
    const currentMovs = getStoredMovements();
    movements.forEach((m: Movement) => {
      const idx = currentMovs.findIndex((existing) => existing.id === m.id);
      if (idx === -1) {
        currentMovs.unshift(m);
      } else {
        currentMovs[idx] = m;
      }
    });
    saveMovements(currentMovs);
  }

  if (Array.isArray(stockMovements) && stockMovements.length > 0) {
    const currentStock = getStoredStockMovements();
    stockMovements.forEach((sm: StockMovement) => {
      const idx = currentStock.findIndex((existing) => existing.id === sm.id);
      if (idx === -1) {
        sm.sincronizado = true;
        currentStock.push(sm);
      } else {
        currentStock[idx] = { ...sm, sincronizado: true };
      }
    });
    saveStockMovements(currentStock);
  }

  if (customer && customer.id) {
    const customers = getStoredCustomers();
    const cIdx = customers.findIndex((c) => c.id === customer.id);
    if (cIdx !== -1) {
      customers[cIdx].updatedAt = new Date().toISOString();
      saveCustomers(customers);
    }
  }
}

async function syncSingleBoletaPayload(boleta: VirtualBoleta, opId: string): Promise<void> {
  const currentBoletas = getStoredVirtualBoletas();
  const idx = currentBoletas.findIndex((b) => b.id === boleta.id);
  if (idx === -1) {
    boleta.sincronizado = true;
    currentBoletas.unshift(boleta);
  } else {
    currentBoletas[idx] = { ...boleta, sincronizado: true };
  }
  saveVirtualBoletas(currentBoletas);
  await idbSaveEntity('boletas', boleta);
}

async function syncSinglePaymentPayload(movement: Movement, opId: string): Promise<void> {
  const currentMovs = getStoredMovements();
  const idx = currentMovs.findIndex((m) => m.id === movement.id);
  if (idx === -1) {
    currentMovs.unshift(movement);
  } else {
    currentMovs[idx] = movement;
  }
  saveMovements(currentMovs);
  await idbSaveEntity('movements', movement);
}

async function syncStockMovementPayload(stockM: StockMovement, opId: string): Promise<void> {
  const currentStock = getStoredStockMovements();
  const idx = currentStock.findIndex((sm) => sm.id === stockM.id);
  if (idx === -1) {
    stockM.sincronizado = true;
    currentStock.push(stockM);
  } else {
    currentStock[idx] = { ...stockM, sincronizado: true };
  }
  saveStockMovements(currentStock);
  await idbSaveEntity('stockMovements', stockM);
}

async function syncCustomerEditPayload(payload: any, item: SyncQueueItem): Promise<void> {
  const customers = getStoredCustomers();
  const idx = customers.findIndex((c) => c.id === payload.id);
  if (idx !== -1) {
    // Detect potential conflict: if server modified customer after local creation
    const serverCustomer = customers[idx];
    if (
      serverCustomer.updatedAt &&
      payload.updatedAt &&
      new Date(serverCustomer.updatedAt).getTime() > new Date(item.createdAt).getTime()
    ) {
      // Generar registro de conflicto para resolución del administrador
      const conflict: SyncConflictItem = {
        conflictId: `conf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        operationId: item.operationId,
        entityType: 'CUSTOMER_EDIT',
        entityId: payload.id,
        localValue: payload,
        serverValue: serverCustomer,
        user: item.createdBy,
        date: item.createdAt,
        proposedAction: `Edición simultánea de cliente "${payload.nombre}"`,
        status: 'CONFLICT_PENDING',
      };
      await idbSaveConflict(conflict);
      await idbUpdateQueueStatus(item.operationId, 'CONFLICT', 'Edición de cliente en conflicto con versión del servidor');
      return;
    }

    customers[idx] = { ...customers[idx], ...payload };
    saveCustomers(customers);
  }
}

/**
 * Subida de imágenes pendientes desde IndexedDB
 */
async function processPendingImagesQueue(): Promise<void> {
  const pendingImages = await idbGetPendingImages();

  for (const imgEntry of pendingImages) {
    await idbUpdateImageStatus(imgEntry.imageId, 'UPLOADING');

    try {
      // Simulación de subida a la nube / Firebase Storage o servidor local
      // Si la imagen está en formato DataURL/Blob, asignamos la URL resultante
      let remoteUrl = typeof imgEntry.blob === 'string' ? imgEntry.blob : '';

      if (!remoteUrl && imgEntry.blob instanceof Blob) {
        remoteUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(imgEntry.blob as Blob);
        });
      }

      // Marcar como UPLOADED en IndexedDB sin eliminar el Blob local
      await idbUpdateImageStatus(imgEntry.imageId, 'UPLOADED', remoteUrl);

      // Si la imagen pertenece a una boleta virtual, actualizar URL en la boleta
      if (imgEntry.entityType === 'RECEIPT') {
        const boletas = getStoredVirtualBoletas();
        const bIdx = boletas.findIndex((b) => b.id === imgEntry.entityId);
        if (bIdx !== -1) {
          boletas[bIdx].comprobanteImagenUrl = remoteUrl;
          saveVirtualBoletas(boletas);
        }
      }
    } catch (err: any) {
      console.error(`Error al subir imagen ${imgEntry.imageId}:`, err);
      await idbUpdateImageStatus(
        imgEntry.imageId,
        'UPLOAD_ERROR',
        undefined,
        err?.message || 'Error al procesar archivo de imagen'
      );
    }
  }
}

/**
 * Escuchador global de cambios de conectividad y ciclo de vida de la página
 */
let isListenerInitialized = false;

export function initConnectivitySyncListeners(): void {
  if (isListenerInitialized || typeof window === 'undefined') return;
  isListenerInitialized = true;

  const handleOnline = () => {
    console.log('🟢 Conexión restablecida. Iniciando sincronización de cola...');
    // Esperar 1.5s para estabilizar la conexión
    setTimeout(() => {
      runFullSyncProcess();
    }, 1500);
  };

  const handleOffline = () => {
    console.log('🔴 Modo sin conexión activado.');
    notifySyncListeners();
  };

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      runFullSyncProcess();
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  document.addEventListener('visibilitychange', handleVisibility);

  // Ejecutar intento de sincronización inicial al arrancar
  setTimeout(() => {
    runFullSyncProcess();
  }, 2000);
}
