/**
 * Smoke manual aislada de la anulación durable.
 * Ejecutar: node node_modules/tsx/dist/cli.mjs tests/cancellationDurabilitySmoke.ts
 * No se importa desde la aplicación ni usa datos reales del navegador.
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
          store.set(value.operationId || value.id, structuredClone(value));
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

(globalThis as any).window = { indexedDB: undefined };
(globalThis as any).window.indexedDB = {
  open: () => {
    const request: any = {};
    queueMicrotask(() => {
      request.result = database;
      request.onupgradeneeded?.({ target: request });
      queueMicrotask(() => request.onsuccess?.({ target: request }));
    });
    return request;
  },
};
(globalThis as any).localStorage = localStorageMock;
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true, userAgent: 'durability-test' },
  configurable: true,
});

const manager = await import('../src/utils/stockAndBoletasManager');
const storage = await import('../src/utils/storage');
const indexedDb = await import('../src/utils/indexedDBEngine');
const audit = await import('../src/utils/auditLogger');
const { buildCuentaCorrienteCsv } = await import('../src/components/CuentaCorrienteScreen');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function reset() {
  values.clear();
  stores.forEach((store) => store.clear());
}

function seed(id: string) {
  const now = '2026-08-04T12:00:00.000Z';
  const boleta: any = {
    id, numeroBoleta: id, customerId: `customer_${id}`, customerName: 'Cliente de prueba', fechaHora: now,
    registradoPor: 'Tester', listaPrecioAplicada: 'GENERAL', items: [
      { id: `${id}_a`, productId: 'prod_higado', productName: 'Hígado', tipoVenta: 'POR_UNIDAD', unidades: 2, kilajeReal: 0, unidadMedida: 'u', precioAplicado: 100, subtotal: 200 },
      { id: `${id}_b`, productId: 'prod_higado', productName: 'Hígado', tipoVenta: 'POR_UNIDAD', unidades: 3, kilajeReal: 0, unidadMedida: 'u', precioAplicado: 100, subtotal: 300 },
    ], subtotal: 500, descuento: 0, recargo: 0, total: 500, pagoEfectivo: 0, pagoTransferencia: 0, pagoOtros: 0,
    totalPagado: 0, saldoRestanteBoleta: 500, saldoAnteriorCuenta: 0, nuevoSaldoCuenta: 500, sincronizado: true,
  };
  manager.saveVirtualBoletas([boleta]);
  storage.saveMovements([{ id: `mov_${id}`, customerId: boleta.customerId, tipo: 'BOLETA', fecha: now, monto: 500, esDebito: true, descripcion: 'Venta de prueba', registradoPor: 'Tester', createdAt: now, boletaVirtualId: id }]);
  manager.saveStockMovements([
    { id: `in_${id}`, semanaId: 'week_1', productId: 'prod_higado', productName: 'Hígado', tipo: 'INGRESO_MATADERO', direccion: 'ENTRADA', unidades: 20, kilogramos: 0, usuario: 'Tester', fechaHora: now, motivo: 'Ingreso', sincronizado: true, saldoPosteriorUnidades: 20, saldoPosteriorKilogramos: 0 },
    { id: `out_${id}_a`, semanaId: 'week_1', productId: 'prod_higado', productName: 'Hígado', tipo: 'VENTA_CLIENTE', direccion: 'SALIDA', unidades: 2, kilogramos: 0, referenciaOrigenId: id, usuario: 'Tester', fechaHora: now, motivo: 'Venta', sincronizado: true, saldoPosteriorUnidades: 18, saldoPosteriorKilogramos: 0 },
    { id: `out_${id}_b`, semanaId: 'week_1', productId: 'prod_higado', productName: 'Hígado', tipo: 'VENTA_CLIENTE', direccion: 'SALIDA', unidades: 3, kilogramos: 0, referenciaOrigenId: id, usuario: 'Tester', fechaHora: now, motivo: 'Venta', sincronizado: true, saldoPosteriorUnidades: 15, saldoPosteriorKilogramos: 0 },
  ]);
  return boleta;
}

async function assertRecovered(id: string) {
  const result = await manager.recoverPendingVirtualBoletaCancellations();
  assert(result.errors.length === 0, `recuperación ${id} con error`);
  const boleta = manager.getStoredVirtualBoletas().find((item: any) => item.id === id);
  assert(boleta?.estadoAnulacion === 'COMPLETADA', `boleta ${id} no completada`);
  assert(storage.getStoredMovements().filter((movement: any) => movement.boletaVirtualId === id).every((movement: any) => movement.isAnulado), `movimientos ${id} no anulados`);
  const restores = manager.getStoredStockMovements().filter((movement: any) => movement.id.includes(`sale_cancel`) && movement.referenciaOrigenId === id);
  assert(restores.length === 2, `restauraciones ${id} duplicadas o incompletas`);
  const operation = (await indexedDb.idbGetAllQueueItems()).find((item: any) => item.entityId === id);
  assert(operation?.status === 'COMPLETED', `operación ${id} no completada`);
  assert(audit.getAuditLogs().filter((entry: any) => entry.id === operation.payload.auditId).length === 1, `auditoría ${id} duplicada`);
}

for (const [id, stage] of [['case_boleta', 'BOLETA_MARKED_CANCELLED'], ['case_movimientos', 'MOVEMENTS_MARKED_CANCELLED']] as const) {
  reset();
  seed(id);
  manager.setCancellationFailureAfterStageForTesting(stage);
  await manager.anularVirtualBoleta({ boletaId: id, usuario: 'Tester', rol: 'ADMINISTRADOR', motivo: 'Prueba' }).catch(() => undefined);
  if (stage === 'BOLETA_MARKED_CANCELLED') {
    assert(storage.getStoredMovements().some((movement: any) => movement.boletaVirtualId === id && movement.anulacionEnProceso), 'movimiento pendiente no quedó excluido');
  }
  await assertRecovered(id);
}

reset();
seed('case_stock');
manager.setCancellationStockRestoreFailureAfterForTesting(1);
await manager.anularVirtualBoleta({ boletaId: 'case_stock', usuario: 'Tester', rol: 'ADMINISTRADOR', motivo: 'Prueba' }).catch(() => undefined);
await assertRecovered('case_stock');

const secondRecovery = await Promise.all([
  manager.recoverPendingVirtualBoletaCancellations(),
  manager.recoverPendingVirtualBoletaCancellations(),
]);
assert(secondRecovery.every((result: any) => result.errors.length === 0), 'reintento concurrente falló');
assert(manager.getStoredStockMovements().filter((movement: any) => movement.referenciaOrigenId === 'case_stock' && movement.tipo === 'ANULACION').length === 2, 'reintento duplicó stock');

reset();
seed('case_double_start');
await Promise.all([
  manager.anularVirtualBoleta({ boletaId: 'case_double_start', usuario: 'Tester', rol: 'ADMINISTRADOR', motivo: 'Prueba simultánea' }),
  manager.anularVirtualBoleta({ boletaId: 'case_double_start', usuario: 'Tester', rol: 'ADMINISTRADOR', motivo: 'Prueba simultánea' }),
]);
assert((await indexedDb.idbGetAllQueueItems()).filter((item: any) => item.entityId === 'case_double_start').length === 1, 'doble inicio creó más de una operación');
assert(manager.getStoredStockMovements().filter((movement: any) => movement.referenciaOrigenId === 'case_double_start' && movement.tipo === 'ANULACION').length === 2, 'doble inicio duplicó stock');

const csv = buildCuentaCorrienteCsv([
  { id: 'active', customerId: 'customer', tipo: 'BOLETA', fecha: '2026-08-04T12:00:00.000Z', monto: 100, esDebito: true, descripcion: 'Activo', registradoPor: 'Tester', createdAt: '2026-08-04T12:00:00.000Z' },
  { id: 'cancelled', customerId: 'customer', tipo: 'PAGO', fecha: '2026-08-04T12:00:00.000Z', monto: 50, esDebito: false, descripcion: 'Anulado', registradoPor: 'Tester', createdAt: '2026-08-04T12:00:00.000Z', isAnulado: true, anuladoAt: '2026-08-04T13:00:00.000Z', motivoAnulacion: 'Prueba', anuladoPor: 'Tester (ADMINISTRADOR)' },
  { id: 'in-progress', customerId: 'customer', tipo: 'BOLETA', fecha: '2026-08-04T12:00:00.000Z', monto: 25, esDebito: true, descripcion: 'En proceso', registradoPor: 'Tester', createdAt: '2026-08-04T12:00:00.000Z', anulacionEnProceso: true },
] as any, [{ id: 'customer', alias: 'Cliente CSV', nombre: 'Cliente CSV' }] as any);
assert(csv.includes('Estado') && csv.includes('FechaAnulacion') && csv.includes('MotivoAnulacion') && csv.includes('UsuarioAnulo'), 'cabeceras CSV incompletas');
assert(csv.includes('"Activo"') && csv.includes('"Anulado"') && csv.includes('"Anulación en proceso"') && csv.includes('"Prueba"'), 'CSV no identifica activo, anulado y pendiente');

console.log('Pruebas de durabilidad de anulación y CSV: OK');
