/**
 * Motor de Almacenamiento Local Robusto con IndexedDB (Offline-First)
 * C&C Gestión - Menudencias C&C
 */

import {
  VirtualBoleta,
  Movement,
  Customer,
  StockMovement,
  UserRole,
} from '../types';

export type SyncOperationStatus =
  | 'LOCAL_SAVED'
  | 'PENDING'
  | 'SYNCING'
  | 'SYNCED'
  | 'ERROR'
  | 'CONFLICT'
  | 'CANCELLED'
  | 'COMPLETED';

export type EntityType =
  | 'BOLETA'
  | 'PAGO'
  | 'STOCK_MOVEMENT'
  | 'VISIT'
  | 'IMAGE'
  | 'CUSTOMER_EDIT'
  | 'AUDIT'
  | 'ATOMIC_SALE'
  | 'ATOMIC_SALE_CANCELLATION';

export type SyncAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'ATOMIC_TRANSACTION';

export type SaleCancellationStage =
  | 'OPERATION_CREATED'
  | 'BOLETA_MARKED_CANCELLED'
  | 'MOVEMENTS_MARKED_CANCELLED'
  | 'STOCK_RESTORED'
  | 'AUDIT_RECORDED'
  | 'COMPLETED';

export interface SaleCancellationStockRestore {
  sourceStockMovementId?: string;
  restorationMovementId: string;
  semanaId: string;
  productId: string;
  productName: string;
  unidades: number;
  kilogramos: number;
}

export interface AtomicSaleCancellationPayload {
  boletaVirtualId: string;
  motivo: string;
  usuario: string;
  username?: string;
  rol?: UserRole;
  deviceId: string;
  createdAtLocal: string;
  stage: SaleCancellationStage;
  completedStages: SaleCancellationStage[];
  movementIds: string[];
  stockRestorations: SaleCancellationStockRestore[];
  stockPeriodIds: string[];
  auditId: string;
  lastError?: string;
}

export interface SyncQueueItem {
  operationId: string;
  entityType: EntityType;
  entityId: string;
  action: SyncAction;
  payload: any;
  createdAt: string; // ISO
  createdBy: string;
  deviceId: string;
  retryCount: number;
  lastError?: string;
  status: SyncOperationStatus;
  dependencies?: string[];
  syncedAt?: string;
}

export interface ImageBlobEntry {
  imageId: string;
  entityId: string;
  entityType: 'RECEIPT' | 'STOCK_DOC' | 'PAYMENT_COMPROBANTE' | 'VIRTUAL_BOLETA';
  blob: string | Blob; // DataURL o Blob
  fileName: string;
  pathName: string; // receipts/2026/08/cust123/vboleta_123.png
  status: 'LOCAL_ONLY' | 'UPLOAD_PENDING' | 'UPLOADING' | 'UPLOADED' | 'UPLOAD_ERROR' | 'GUARDADA';
  remoteUrl?: string;
  createdAt: string;
  createdBy: string;
  retryCount: number;
  lastError?: string;
  boletaVirtualId?: string;
  numeroBoleta?: string;
  customerId?: string;
  branchId?: string;
  movementIdPrincipal?: string;
  mimeType?: 'image/png';
  source?: 'VIRTUAL_BOLETA';
  thumbnail?: string;
  isAnulada?: boolean;
}

export interface SyncConflictItem {
  conflictId: string;
  operationId: string;
  entityType: EntityType;
  entityId: string;
  localValue: any;
  serverValue: any;
  user: string;
  date: string;
  proposedAction: string;
  status: 'CONFLICT_PENDING' | 'CONFLICT_RESOLVED';
  resolvedBy?: string;
  resolutionStrategy?: 'KEEP_LOCAL' | 'ACCEPT_SERVER' | 'MERGED';
  resolutionNotes?: string;
  resolvedAt?: string;
}

const DB_NAME = 'cyc_gestion_offline_v2_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Obtiene o crea un ID único de dispositivo persistente
 */
export function getDeviceId(): string {
  const key = 'cyc_device_id_v1';
  let deviceId = localStorage.getItem(key);
  if (!deviceId) {
    deviceId = `dev_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    localStorage.setItem(key, deviceId);
  }
  return deviceId;
}

/**
 * Genera un ID de operación único globalmente idempotente
 */
export function generateOperationId(prefix: string = 'op'): string {
  const deviceId = getDeviceId();
  const timestamp = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${deviceId}_${timestamp}_${rand}`;
}

/**
 * Inicializa la base de datos IndexedDB nativa
 */
export function initIndexedDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      console.warn('IndexedDB no está disponible en este entorno, se usará modo fallback.');
      reject(new Error('IndexedDB no soportado'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Error al abrir IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // 1. Store: syncQueue
      if (!db.objectStoreNames.contains('syncQueue')) {
        const queueStore = db.createObjectStore('syncQueue', { keyPath: 'operationId' });
        queueStore.createIndex('status', 'status', { unique: false });
        queueStore.createIndex('createdAt', 'createdAt', { unique: false });
        queueStore.createIndex('entityType', 'entityType', { unique: false });
      }

      // 2. Store: boletas
      if (!db.objectStoreNames.contains('boletas')) {
        const boletaStore = db.createObjectStore('boletas', { keyPath: 'id' });
        boletaStore.createIndex('customerId', 'customerId', { unique: false });
        boletaStore.createIndex('numeroBoleta', 'numeroBoleta', { unique: false });
        boletaStore.createIndex('sincronizado', 'sincronizado', { unique: false });
      }

      // 3. Store: movements
      if (!db.objectStoreNames.contains('movements')) {
        const movStore = db.createObjectStore('movements', { keyPath: 'id' });
        movStore.createIndex('customerId', 'customerId', { unique: false });
        movStore.createIndex('tipo', 'tipo', { unique: false });
        movStore.createIndex('fecha', 'fecha', { unique: false });
      }

      // 4. Store: stockMovements
      if (!db.objectStoreNames.contains('stockMovements')) {
        const stockStore = db.createObjectStore('stockMovements', { keyPath: 'id' });
        stockStore.createIndex('semanaId', 'semanaId', { unique: false });
        stockStore.createIndex('productId', 'productId', { unique: false });
      }

      // 5. Store: customers
      if (!db.objectStoreNames.contains('customers')) {
        db.createObjectStore('customers', { keyPath: 'id' });
      }

      // 6. Store: imageBlobs
      if (!db.objectStoreNames.contains('imageBlobs')) {
        const imgStore = db.createObjectStore('imageBlobs', { keyPath: 'imageId' });
        imgStore.createIndex('entityId', 'entityId', { unique: false });
        imgStore.createIndex('status', 'status', { unique: false });
      }

      // 7. Store: conflicts
      if (!db.objectStoreNames.contains('conflicts')) {
        const confStore = db.createObjectStore('conflicts', { keyPath: 'conflictId' });
        confStore.createIndex('status', 'status', { unique: false });
      }

      // 8. Store: metadata
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };
  });

  return dbPromise;
}

/* ========================================================
 * COLA DE SINCRONIZACIÓN (syncQueue)
 * ======================================================== */

export async function idbSaveQueueItem(item: SyncQueueItem): Promise<void> {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error idbSaveQueueItem:', err);
  }
}

/**
 * Versión estricta para operaciones contables: si no logra persistir, no
 * permite que el llamador continúe con cambios en localStorage.
 */
export async function idbSaveQueueItemStrict(item: SyncQueueItem): Promise<void> {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const req = store.put(item);
    req.onerror = () => reject(req.error || new Error('No se pudo persistir la operación'));
    tx.onabort = () => reject(tx.error || new Error('La transacción IndexedDB fue abortada'));
    tx.oncomplete = () => resolve();
  });
}

export async function idbGetAllQueueItems(): Promise<SyncQueueItem[]> {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readonly');
      const store = tx.objectStore('syncQueue');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error idbGetAllQueueItems:', err);
    return [];
  }
}

export async function idbGetPendingQueueItems(): Promise<SyncQueueItem[]> {
  const all = await idbGetAllQueueItems();
  return all.filter(
    (item) =>
      item.status === 'LOCAL_SAVED' ||
      item.status === 'PENDING' ||
      item.status === 'ERROR'
  );
}

export async function idbGetIncompleteSaleCancellationItems(): Promise<SyncQueueItem[]> {
  const all = await idbGetAllQueueItems();
  return all.filter(
    (item) =>
      item.entityType === 'ATOMIC_SALE_CANCELLATION' &&
      item.status !== 'COMPLETED'
  );
}

export async function idbUpdateQueueStatus(
  operationId: string,
  status: SyncOperationStatus,
  lastError?: string,
  syncedAt?: string
): Promise<void> {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const getReq = store.get(operationId);

      getReq.onsuccess = () => {
        const item: SyncQueueItem | undefined = getReq.result;
        if (!item) {
          resolve();
          return;
        }
        item.status = status;
        if (lastError !== undefined) item.lastError = lastError;
        if (status === 'ERROR') item.retryCount = (item.retryCount || 0) + 1;
        if (syncedAt) item.syncedAt = syncedAt;

        const putReq = store.put(item);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.error('Error idbUpdateQueueStatus:', err);
  }
}

export async function idbRemoveQueueItem(operationId: string): Promise<void> {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const req = store.delete(operationId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error idbRemoveQueueItem:', err);
  }
}

/* ========================================================
 * IMÁGENES Y ARCHIVOS (imageBlobs)
 * ======================================================== */

export async function idbSaveImageBlob(entry: ImageBlobEntry): Promise<void> {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('imageBlobs', 'readwrite');
      const store = tx.objectStore('imageBlobs');
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error idbSaveImageBlob:', err);
  }
}

export async function idbGetAllImages(): Promise<ImageBlobEntry[]> {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('imageBlobs', 'readonly');
      const store = tx.objectStore('imageBlobs');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error idbGetAllImages:', err);
    return [];
  }
}

export async function idbGetPendingImages(): Promise<ImageBlobEntry[]> {
  const all = await idbGetAllImages();
  return all.filter(
    (img) =>
      img.status === 'LOCAL_ONLY' ||
      img.status === 'UPLOAD_PENDING' ||
      img.status === 'UPLOAD_ERROR'
  );
}

export async function idbUpdateImageStatus(
  imageId: string,
  status: ImageBlobEntry['status'],
  remoteUrl?: string,
  lastError?: string
): Promise<void> {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('imageBlobs', 'readwrite');
      const store = tx.objectStore('imageBlobs');
      const getReq = store.get(imageId);

      getReq.onsuccess = () => {
        const item: ImageBlobEntry | undefined = getReq.result;
        if (!item) {
          resolve();
          return;
        }
        item.status = status;
        if (remoteUrl) item.remoteUrl = remoteUrl;
        if (lastError !== undefined) item.lastError = lastError;
        if (status === 'UPLOAD_ERROR') item.retryCount = (item.retryCount || 0) + 1;

        const putReq = store.put(item);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.error('Error idbUpdateImageStatus:', err);
  }
}

/* ========================================================
 * CONTROL DE CONFLICTOS (conflicts)
 * ======================================================== */

export async function idbSaveConflict(conflict: SyncConflictItem): Promise<void> {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('conflicts', 'readwrite');
      const store = tx.objectStore('conflicts');
      const req = store.put(conflict);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error idbSaveConflict:', err);
  }
}

export async function idbGetPendingConflicts(): Promise<SyncConflictItem[]> {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('conflicts', 'readonly');
      const store = tx.objectStore('conflicts');
      const req = store.getAll();
      req.onsuccess = () => {
        const res: SyncConflictItem[] = req.result || [];
        resolve(res.filter((c) => c.status === 'CONFLICT_PENDING'));
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error idbGetPendingConflicts:', err);
    return [];
  }
}

export async function idbGetAllConflicts(): Promise<SyncConflictItem[]> {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('conflicts', 'readonly');
      const store = tx.objectStore('conflicts');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error idbGetAllConflicts:', err);
    return [];
  }
}

/* ========================================================
 * GENERIC LOCAL PERSISTENCE HELPERS (BOLETAS, MOVEMENTS, CUSTOMERS, STOCK)
 * ======================================================== */

export async function idbSaveEntity<T extends { id: string }>(
  storeName: 'boletas' | 'movements' | 'customers' | 'stockMovements',
  entity: T
): Promise<void> {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(entity);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`Error idbSaveEntity in ${storeName}:`, err);
  }
}

export async function idbGetImageBlob(imageId: string): Promise<ImageBlobEntry | null> {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('imageBlobs', 'readonly');
      const req = tx.objectStore('imageBlobs').get(imageId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error idbGetImageBlob:', err);
    return null;
  }
}

export async function idbSaveEntityStrict<T extends { id: string }>(
  storeName: 'boletas' | 'movements' | 'customers' | 'stockMovements',
  entity: T
): Promise<void> {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(entity);
    req.onerror = () => reject(req.error || new Error(`No se pudo persistir ${storeName}`));
    tx.onabort = () => reject(tx.error || new Error(`La transacción ${storeName} fue abortada`));
    tx.oncomplete = () => resolve();
  });
}

export async function idbGetAllEntities<T>(
  storeName: 'boletas' | 'movements' | 'customers' | 'stockMovements'
): Promise<T[]> {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`Error idbGetAllEntities from ${storeName}:`, err);
    return [];
  }
}
