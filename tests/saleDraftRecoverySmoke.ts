/**
 * Smoke aislada: un borrador de Express nunca crea una venta hasta que se
 * ejecuta explícitamente finalizeVirtualBoleta.
 */
class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

const stores = new Map<string, Map<string, any>>();
const localStorageMock = new MemoryStorage();

function requestWith<T>(producer: () => T, tx?: any): any {
  const request: any = {};
  queueMicrotask(() => {
    request.result = producer();
    request.onsuccess?.({ target: request });
    queueMicrotask(() => tx?.oncomplete?.());
  });
  return request;
}

(globalThis as any).localStorage = localStorageMock;
(globalThis as any).window = {
  indexedDB: {
    open: () => {
      const request: any = {};
      queueMicrotask(() => {
        request.result = {
          objectStoreNames: { contains: (name: string) => stores.has(name) },
          createObjectStore(name: string) { stores.set(name, new Map()); return { createIndex: () => undefined }; },
          transaction(name: string) {
            const tx: any = {};
            tx.objectStore = () => {
              const store = stores.get(name)!;
              return {
                put: (value: any) => requestWith(() => { store.set(value.operationId || value.id || value.imageId, structuredClone(value)); return value; }, tx),
                get: (key: string) => requestWith(() => structuredClone(store.get(key)), tx),
                getAll: () => requestWith(() => Array.from(store.values(), (value) => structuredClone(value)), tx),
                delete: (key: string) => requestWith(() => store.delete(key), tx),
              };
            };
            return tx;
          },
        };
        request.onupgradeneeded?.({ target: request });
        queueMicrotask(() => request.onsuccess?.({ target: request }));
      });
      return request;
    },
  },
};
Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true });

const storage = await import('../src/utils/storage');
const manager = await import('../src/utils/stockAndBoletasManager');

const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

const customer = storage.getStoredCustomers()[0];
const product = manager.getStoredProducts()[0];
const item = {
  id: 'draft-item-1',
  productId: product.id,
  unidadesInput: '2',
  kilajeInput: '4,5',
  precioOverride: '6789',
  observacion: 'Cortar fino',
};
const baselineMovements = storage.getStoredMovements().length;
const baselineVirtualBoletas = manager.getStoredVirtualBoletas().length;
const draft = {
  schemaVersion: 2,
  draftId: 'draft-recovery-smoke',
  customerId: customer.id,
  activePriceListId: customer.priceListId || 'lista-smoke',
  items: [item],
  descuentoInput: '100',
  recargoInput: '50',
  pagoTipo: 'MIXTO' as const,
  pagoEfectivoInput: '200',
  pagoTransferenciaInput: '300',
  pagoOtrosInput: '0',
  fotoUrl: 'data:image/png;base64,AAAA',
  stockJustification: 'Stock contado en camión',
  createdByUserId: 'smoke-user',
  createdByUserName: 'Smoke',
};

// A-D-H: guardar, cerrar/reabrir y pagos escritos no crean movimientos.
storage.saveSaleDraft(draft);
const restored = storage.getSaleDraft();
assert(restored?.draftId === draft.draftId, 'El draftId debe sobrevivir la restauración.');
assert(JSON.stringify(restored?.items) === JSON.stringify([item]), 'Los ítems deben restaurarse exactamente.');
assert(restored?.pagoTipo === 'MIXTO', 'El tipo de pago debe restaurarse.');
assert(restored?.pagoEfectivoInput === '200' && restored?.pagoTransferenciaInput === '300', 'Los importes de pago deben restaurarse.');
assert(storage.getStoredMovements().length === baselineMovements, 'Guardar/cerrar un borrador no debe crear movimientos.');
assert(manager.getStoredVirtualBoletas().length === baselineVirtualBoletas, 'Guardar/cerrar un borrador no debe crear boletas.');

// E: descartar sólo elimina el borrador.
storage.clearSaleDraft();
assert(storage.getSaleDraft() === null, 'Descartar debe eliminar únicamente el borrador.');
assert(storage.getStoredMovements().length === baselineMovements, 'Descartar no debe tocar movimientos.');

// J: el formato simple anterior migra con valores seguros.
localStorageMock.setItem('cyc_gestion_sale_draft_v1', JSON.stringify({ customerId: customer.id, fotoUrl: 'data:image/png;base64,OLD' }));
const migrated = storage.getSaleDraft();
assert(migrated?.schemaVersion === 2 && migrated.items?.length === 0, 'Un draft antiguo debe leerse sin fabricar ítems.');

// F-G-I: la finalización explícita crea una sola boleta; repetir el draftId no duplica nada.
storage.saveSaleDraft(draft);
const finalized = manager.finalizeVirtualBoleta({
  draftId: draft.draftId,
  numeroBoleta: 'B-DRAFT-SMOKE',
  customer,
  items: [{
    id: item.id,
    productId: product.id,
    productName: product.nombre,
    tipoVenta: product.tipoVenta,
    unidades: 2,
    kilajeReal: 4.5,
    unidadMedida: product.unidadMedida,
    precioAplicado: 6789,
    subtotal: 30550.5,
    observacion: item.observacion,
  }],
  subtotal: 30550.5,
  descuento: 100,
  recargo: 50,
  total: 30500.5,
  pagoEfectivo: 200,
  pagoTransferencia: 300,
  pagoOtros: 0,
  fotoBoletaFisicaUrl: draft.fotoUrl,
  usuario: 'Smoke',
  listaPrecioAplicada: 'Lista Smoke',
  priceListId: draft.activePriceListId,
});
assert(!finalized.alreadyFinalized, 'La primera finalización explícita debe crear la venta.');
assert(finalized.virtualBoleta.imageStatus === 'IMAGE_PENDING', 'Una venta finalizada puede quedar IMAGE_PENDING sin duplicarse.');
assert(storage.getStoredMovements().length === baselineMovements + 3, 'La venta explícita debe crear BOLETA y dos PAGOS.');

const duplicate = manager.finalizeVirtualBoleta({
  draftId: draft.draftId,
  numeroBoleta: 'B-NO-DEBE-USARSE',
  customer,
  items: [], subtotal: 0, descuento: 0, recargo: 0, total: 0,
  pagoEfectivo: 0, pagoTransferencia: 0, pagoOtros: 0,
  fotoBoletaFisicaUrl: '', usuario: 'Smoke', listaPrecioAplicada: 'Lista Smoke',
});
assert(duplicate.alreadyFinalized, 'Repetir el mismo draftId debe recuperar la venta existente.');
assert(duplicate.virtualBoleta.id === finalized.virtualBoleta.id, 'La recuperación debe apuntar a la misma boleta.');
assert(storage.getStoredMovements().length === baselineMovements + 3, 'La doble finalización no debe duplicar movimientos.');

console.log('saleDraftRecoverySmoke: OK');
