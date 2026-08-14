/**
 * Smoke aislada del comprobante virtual. No usa datos reales del navegador.
 * Ejecutar: node node_modules/tsx/dist/cli.mjs tests/virtualBoletaImageRecoverySmoke.ts
 */
const values = new Map<string, string>();
const stores = new Map<string, Map<string, any>>();

const localStorageMock = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, String(value)),
  removeItem: (key: string) => values.delete(key),
  clear: () => values.clear(),
};

function requestWith<T>(producer: () => T, tx?: any): any {
  const request: any = {};
  queueMicrotask(() => {
    request.result = producer();
    request.onsuccess?.({ target: request });
    queueMicrotask(() => tx?.oncomplete?.());
  });
  return request;
}

const database: any = {
  objectStoreNames: { contains: (name: string) => stores.has(name) },
  createObjectStore(name: string) {
    stores.set(name, new Map());
    return { createIndex: () => undefined };
  },
  transaction(name: string) {
    const tx: any = {};
    tx.objectStore = () => {
      const store = stores.get(name)!;
      return {
        put: (value: any) => requestWith(() => {
          store.set(value.operationId || value.imageId || value.id || value.key, structuredClone(value));
          return value;
        }, tx),
        get: (key: string) => requestWith(() => structuredClone(store.get(key)), tx),
        getAll: () => requestWith(() => Array.from(store.values(), (value) => structuredClone(value)), tx),
        delete: (key: string) => requestWith(() => store.delete(key), tx),
      };
    };
    return tx;
  },
};

const imageDataUrl = 'data:image/png;base64,iVBORw0KGgo=';
const canvasContext = new Proxy({}, {
  get: () => () => undefined,
  set: () => true,
});

(globalThis as any).window = {
  indexedDB: {
    open: () => {
      const request: any = {};
      queueMicrotask(() => {
        request.result = database;
        request.onupgradeneeded?.({ target: request });
        queueMicrotask(() => request.onsuccess?.({ target: request }));
      });
      return request;
    },
  },
};
(globalThis as any).document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => canvasContext,
    toDataURL: () => imageDataUrl,
  }),
};
(globalThis as any).localStorage = localStorageMock;
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: false, userAgent: 'virtual-boleta-image-test' },
  configurable: true,
});

const manager = await import('../src/utils/stockAndBoletasManager');
const storage = await import('../src/utils/storage');
const images = await import('../src/utils/virtualBoletaImageStorage');
const indexedDb = await import('../src/utils/indexedDBEngine');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const financialSnapshot = (movements: any[]) => movements.map((movement) => ({
  id: movement.id,
  customerId: movement.customerId,
  branchId: movement.branchId,
  tipo: movement.tipo,
  fecha: movement.fecha,
  numeroBoleta: movement.numeroBoleta,
  monto: movement.monto,
  esDebito: movement.esDebito,
  metodoPago: movement.metodoPago,
  descripcion: movement.descripcion,
  comprobantePago: movement.comprobantePago,
  registradoPor: movement.registradoPor,
  createdAt: movement.createdAt,
  boletaVirtualId: movement.boletaVirtualId,
}));

function reset() {
  values.clear();
  stores.forEach((store) => store.clear());
}

function seedCustomer() {
  const customer: any = {
    id: 'edu_835', nombre: 'Edu 835', alias: 'Edu 835', sucursales: [], saldoActual: 0,
  };
  storage.saveCustomers([customer]);
  storage.saveMovements([]);
  manager.saveVirtualBoletas([]);
  manager.saveStockMovements([]);
  return customer;
}

async function assertPaymentCase(label: string, efectivo: number, transferencia: number) {
  reset();
  const customer = seedCustomer();
  const { virtualBoleta, movementBoleta } = manager.finalizeVirtualBoleta({
    numeroBoleta: `B-${label}`,
    customer,
    items: [{
      id: 'linea', productId: 'higado', productName: 'Hígado', tipoVenta: 'POR_KILO',
      unidades: 1, kilajeReal: 1, unidadMedida: 'kg', precioAplicado: 100, subtotal: 100,
    }],
    subtotal: 100, descuento: 0, recargo: 0, total: 100,
    pagoEfectivo: efectivo, pagoTransferencia: transferencia, pagoOtros: 0,
    fotoBoletaFisicaUrl: '', usuario: 'Tester', listaPrecioAplicada: 'Edu',
  });

  const pendingBoleta = manager.getStoredVirtualBoletas()[0];
  const pendingMovement = storage.getStoredMovements().find((movement) => movement.id === movementBoleta.id)!;
  assert(pendingBoleta.imageStatus === 'IMAGE_PENDING', `${label}: la boleta debe quedar pendiente antes del PNG`);
  assert(pendingBoleta.movementIdPrincipal === movementBoleta.id, `${label}: falta el movimiento BOLETA principal`);
  assert(pendingMovement.imageId === pendingBoleta.imageId, `${label}: falta el vínculo imageId en la BOLETA`);

  await images.persistVirtualBoletaImage(virtualBoleta, imageDataUrl, movementBoleta.id);
  const savedBoleta = manager.getStoredVirtualBoletas()[0];
  const movements = storage.getStoredMovements();
  const savedMovement = movements.find((movement) => movement.id === movementBoleta.id)!;
  const paymentMovements = movements.filter((movement) => movement.tipo === 'PAGO');
  const blob = await indexedDb.idbGetImageBlob(savedBoleta.imageId!);

  assert(savedBoleta.imageStatus === 'GUARDADA', `${label}: el PNG no dejó la boleta guardada`);
  assert(Boolean(blob?.blob), `${label}: falta el blob en IndexedDB`);
  assert(savedMovement.imageId === savedBoleta.imageId && savedMovement.hasAttachment, `${label}: la BOLETA no quedó vinculada`);
  assert(paymentMovements.every((movement) => !movement.imageId), `${label}: el comprobante se vinculó a un PAGO`);
}

await assertPaymentCase('sin-pago', 0, 0);
await assertPaymentCase('pago-parcial', 40, 0);
await assertPaymentCase('efectivo-completo', 100, 0);
await assertPaymentCase('transferencia-completa', 0, 100);
await assertPaymentCase('mixto-completo', 40, 60);

reset();
const customer = seedCustomer();
const legacyBoleta: any = {
  id: 'vboleta_historica', numeroBoleta: 'B-207815', customerId: customer.id, customerName: customer.alias,
  fechaHora: '2026-08-06T18:53:00.000Z', registradoPor: 'Tester', listaPrecioAplicada: 'edu',
  items: [{ id: 'legacy-line', productId: 'higado', productName: 'Hígado', tipoVenta: 'POR_KILO', unidades: 1, kilajeReal: 1, unidadMedida: 'kg', precioAplicado: 121170, subtotal: 121170 }],
  subtotal: 121170, descuento: 0, recargo: 0, total: 121170,
  pagoEfectivo: 121170, pagoTransferencia: 0, pagoOtros: 0, totalPagado: 121170,
  saldoRestanteBoleta: 0, saldoAnteriorCuenta: 0, nuevoSaldoCuenta: 0, sincronizado: true,
};
const legacyMovement: any = {
  id: 'mov_boletta_historica', customerId: customer.id, tipo: 'BOLETA', fecha: legacyBoleta.fechaHora,
  numeroBoleta: legacyBoleta.numeroBoleta, monto: legacyBoleta.total, esDebito: true,
  descripcion: 'Venta histórica', registradoPor: 'Tester', createdAt: legacyBoleta.fechaHora,
  boletaVirtualId: legacyBoleta.id,
};
const legacyPayment: any = {
  id: 'mov_pago_historico', customerId: customer.id, tipo: 'PAGO', fecha: legacyBoleta.fechaHora,
  numeroBoleta: legacyBoleta.numeroBoleta, monto: legacyBoleta.total, esDebito: false,
  descripcion: 'Pago histórico', registradoPor: 'Tester', createdAt: legacyBoleta.fechaHora,
  boletaVirtualId: legacyBoleta.id,
};
manager.saveVirtualBoletas([legacyBoleta]);
storage.saveMovements([legacyPayment, legacyMovement]);
const beforeFinancialData = JSON.stringify(financialSnapshot(storage.getStoredMovements()));
const recovery = await images.recoverVirtualBoletaImageById(legacyBoleta.id);
const recoveredMovements = storage.getStoredMovements();
assert(recovery?.status === 'GENERATED', 'La boleta histórica debe regenerar su PNG');
assert(recoveredMovements.find((movement) => movement.id === legacyMovement.id)?.imageId === `virtual_boleta_${legacyBoleta.id}`, 'La recuperación no vinculó la BOLETA histórica');
assert(!recoveredMovements.find((movement) => movement.id === legacyPayment.id)?.imageId, 'La recuperación vinculó incorrectamente el PAGO histórico');
assert(JSON.stringify(financialSnapshot(recoveredMovements)) === beforeFinancialData, 'La recuperación alteró datos contables');

reset();
const linkedCustomer = seedCustomer();
const blobOnlyBoleta: any = { ...structuredClone(legacyBoleta), id: 'vboleta_blob_existente', customerId: linkedCustomer.id, customerName: linkedCustomer.alias };
const blobOnlyMovement: any = { ...structuredClone(legacyMovement), id: 'mov_blob_existente', customerId: linkedCustomer.id, boletaVirtualId: blobOnlyBoleta.id, imageId: 'legacy_blob_only' };
manager.saveVirtualBoletas([blobOnlyBoleta]);
storage.saveMovements([blobOnlyMovement]);
await indexedDb.idbSaveImageBlobStrict({
  imageId: 'legacy_blob_only', entityId: blobOnlyBoleta.id, entityType: 'VIRTUAL_BOLETA', blob: imageDataUrl,
  fileName: 'Boleta-existente.png', pathName: 'virtual-boletas/legacy_blob_only.png', status: 'GUARDADA',
  createdAt: blobOnlyBoleta.fechaHora, createdBy: 'Tester', retryCount: 0,
});
const linkRecovery = await images.recoverVirtualBoletaImageById(blobOnlyBoleta.id);
assert(linkRecovery?.status === 'REPAIRED_REFERENCE', 'El blob existente debe reparar sólo referencias');
assert(manager.getStoredVirtualBoletas()[0].imageId === 'legacy_blob_only', 'La reparación reemplazó el ID de imagen existente');

reset();
const interruptedCustomer = seedCustomer();
const interruptedBoleta: any = {
  ...structuredClone(legacyBoleta),
  id: 'vboleta_interrumpida',
  numeroBoleta: 'B-INTERRUPTIDA',
  customerId: interruptedCustomer.id,
  customerName: interruptedCustomer.alias,
  imageId: 'virtual_boleta_vboleta_interrumpida',
  imageStatus: 'IMAGE_PENDING',
};
const interruptedMovement: any = {
  ...structuredClone(legacyMovement),
  id: 'mov_boletta_interrumpida',
  numeroBoleta: interruptedBoleta.numeroBoleta,
  customerId: interruptedCustomer.id,
  boletaVirtualId: interruptedBoleta.id,
  imageId: interruptedBoleta.imageId,
};
manager.saveVirtualBoletas([interruptedBoleta]);
storage.saveMovements([interruptedMovement]);
const startupRecovery = await images.recoverPendingVirtualBoletaImages();
assert(startupRecovery.recoveredCount === 1 && startupRecovery.errors.length === 0, 'La recuperación al reiniciar no regeneró el comprobante pendiente');
assert(Boolean(await indexedDb.idbGetImageBlob(interruptedBoleta.imageId)), 'La recuperación al reiniciar no guardó el blob');

console.log('virtualBoletaImageRecoverySmoke: OK');
