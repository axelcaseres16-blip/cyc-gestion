class MemoryStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });

const storage = await import('../src/utils/storage');
const listsManager = await import('../src/utils/priceListsManager');
const stock = await import('../src/utils/stockAndBoletasManager');

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const customers = storage.getStoredCustomers();
const makeCustomer = (id: string, alias: string) => ({
  ...customers[0], id, nombre: alias, alias, cuitDni: id, telefono: '', priceListId: undefined,
  listaPrecioTipo: undefined, preciosPersonalizados: undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});
customers.push(makeCustomer('test_edu', 'Edu'), makeCustomer('test_gaby', 'Gaby'), makeCustomer('test_charly', 'Charly'));
storage.saveCustomers(customers);

const migrated = listsManager.getStoredPriceLists();
const general = migrated.find((list) => list.nombre === 'Lista General');
assert(general, 'La migración debe crear Lista General.');
listsManager.assignCustomersToPriceList(general!.id, ['test_edu', 'test_gaby', 'test_charly'], 'Smoke', 'ADMINISTRADOR');
assert(storage.getStoredCustomers().find((customer) => customer.id === 'test_gaby')?.priceListId === general!.id, 'Gaby debe usar Lista General.');

const barata = listsManager.createPriceList({ nombre: 'Lista Barata', creadoPor: 'Smoke', base: 'COPIA', sourceListId: general!.id });
listsManager.assignCustomersToPriceList(barata.id, ['test_gaby'], 'Smoke', 'ADMINISTRADOR');
assert(storage.getStoredCustomers().find((customer) => customer.id === 'test_gaby')?.priceListId === barata.id, 'Gaby debe moverse a Lista Barata.');

const exclusive = listsManager.createExclusivePriceList(storage.getStoredCustomers().find((customer) => customer.id === 'test_charly')!, 'Smoke');
assert(exclusive.esListaDelCliente && exclusive.clienteExclusivoId === 'test_charly', 'La lista exclusiva debe quedar vinculada al cliente.');

const product = stock.getStoredProducts()[0];
const changed = { ...barata, precios: { ...barata.precios, [product.id]: { ...barata.precios[product.id], productId: product.id, precioKg: 9999, activo: true } } };
listsManager.savePriceList(changed, 'Smoke', 'Caso D');
assert(listsManager.getPriceFromList(listsManager.getPriceListById(barata.id), product) === 9999, 'El precio nuevo debe aplicar sólo a futuras boletas.');

const empty = makeCustomer('test_empty', 'Sin historial');
storage.saveCustomers([...storage.getStoredCustomers(), empty]);
storage.deleteCustomerIfEmpty(empty.id, 'Smoke', 'ADMINISTRADOR');
assert(!storage.getStoredCustomers().some((customer) => customer.id === empty.id), 'Un cliente sin historial debe eliminarse definitivamente.');

storage.archiveCustomer('test_edu', 'Smoke', 'ADMINISTRADOR');
assert(storage.getStoredCustomers().find((customer) => customer.id === 'test_edu')?.archivado, 'Un cliente con uso debe poder archivarse.');

console.log('priceListsSmoke: OK');
