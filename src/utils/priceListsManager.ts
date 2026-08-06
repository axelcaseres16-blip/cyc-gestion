import { Customer, PriceList, PriceListChangeHistory, PriceListProductPrice, PriceListType, Product, UserRole } from '../types';
import { recordAuditLog } from './auditLogger';
import { getStoredCustomers, saveCustomers } from './storage';
import { getStoredProducts } from './stockAndBoletasManager';

const PRICE_LISTS_KEY = 'cyc_gestion_price_lists_v1';
const PRICE_LIST_HISTORY_KEY = 'cyc_gestion_price_list_history_v1';
const VIRTUAL_BOLETAS_KEY = 'cyc_gestion_virtual_boletas_v1';
const MIGRATION_KEY = 'cyc_gestion_price_lists_migrated_v1';

const LEGACY_LISTS: Array<{ type: PriceListType; id: string; nombre: string }> = [
  { type: 'GENERAL', id: 'price-list-general', nombre: 'Lista General' },
  { type: 'MAYORISTA', id: 'price-list-mayorista', nombre: 'Lista Mayorista' },
  { type: 'ESPECIAL', id: 'price-list-especial', nombre: 'Lista Especial' },
];

const now = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const priceForProduct = (product: Product, value: number): PriceListProductPrice => ({
  productId: product.id,
  ...(product.tipoVenta === 'POR_UNIDAD' ? { precioUnidad: value } : { precioKg: value }),
  activo: value > 0,
});

const getLegacyPrices = (products: Product[], legacyType: PriceListType): Record<string, PriceListProductPrice> =>
  products.reduce<Record<string, PriceListProductPrice>>((prices, product) => {
    prices[product.id] = priceForProduct(product, product.precios[legacyType] ?? 0);
    return prices;
  }, {});

const parseLists = (): PriceList[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRICE_LISTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function savePriceLists(lists: PriceList[]): void {
  localStorage.setItem(PRICE_LISTS_KEY, JSON.stringify(lists));
}

export function getPriceListHistory(): PriceListChangeHistory[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRICE_LIST_HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const savePriceListHistory = (history: PriceListChangeHistory[]) =>
  localStorage.setItem(PRICE_LIST_HISTORY_KEY, JSON.stringify(history.slice(0, 5000)));

/** Idempotently converts the four former fixed price keys into dynamic lists. */
export function migrateLegacyPriceLists(): PriceList[] {
  const products = getStoredProducts();
  const lists = parseLists();
  const existingByLegacy = new Map(lists.filter((list) => list.legacyType).map((list) => [list.legacyType!, list]));
  let changed = false;

  for (const legacy of LEGACY_LISTS) {
    if (!existingByLegacy.has(legacy.type)) {
      lists.push({
        id: legacy.id,
        nombre: legacy.nombre,
        descripcion: `Migrada automáticamente desde ${legacy.type}.`,
        estado: 'ACTIVA',
        creadoAt: now(),
        actualizadoAt: now(),
        creadoPor: 'Migración del sistema',
        precios: getLegacyPrices(products, legacy.type),
        cantidadClientesAsignados: 0,
        esListaDelCliente: false,
        ordenVisual: lists.length,
        legacyType: legacy.type,
      });
      changed = true;
    }
  }

  const shouldAssignLegacyCustomers = localStorage.getItem(MIGRATION_KEY) !== 'true';
  const customers = getStoredCustomers();
  let customersChanged = false;
  const listIds = new Set(lists.map((list) => list.id));
  for (const customer of shouldAssignLegacyCustomers ? customers : []) {
    if (customer.priceListId && listIds.has(customer.priceListId)) continue;

    if (customer.listaPrecioTipo === 'PERSONALIZADA' || Object.keys(customer.preciosPersonalizados || {}).length > 0) {
      const exclusiveId = `price-list-customer-${customer.id}`;
      let exclusive = lists.find((list) => list.id === exclusiveId || list.clienteExclusivoId === customer.id);
      if (!exclusive) {
        const prices = getLegacyPrices(products, 'PERSONALIZADA');
        Object.entries(customer.preciosPersonalizados || {}).forEach(([productId, price]) => {
          const product = products.find((candidate) => candidate.id === productId);
          if (product) prices[productId] = priceForProduct(product, price);
        });
        exclusive = {
          id: exclusiveId,
          nombre: `Lista de ${customer.alias || customer.nombre}`,
          descripcion: 'Lista exclusiva migrada desde precios personalizados.',
          estado: 'ACTIVA',
          creadoAt: now(),
          actualizadoAt: now(),
          creadoPor: 'Migración del sistema',
          precios: prices,
          cantidadClientesAsignados: 0,
          esListaDelCliente: true,
          clienteExclusivoId: customer.id,
          ordenVisual: lists.length,
          legacyType: 'PERSONALIZADA',
        };
        lists.push(exclusive);
        listIds.add(exclusive.id);
        changed = true;
      }
      customer.priceListId = exclusive.id;
    } else {
      const legacyType = customer.listaPrecioTipo || 'GENERAL';
      customer.priceListId = LEGACY_LISTS.find((entry) => entry.type === legacyType)?.id || 'price-list-general';
    }
    customersChanged = true;
  }

  if (changed) savePriceLists(lists);
  if (customersChanged) saveCustomers(customers);
  if (shouldAssignLegacyCustomers) localStorage.setItem(MIGRATION_KEY, 'true');
  const assignmentCounts = getStoredCustomers().reduce<Record<string, number>>((counts, customer) => {
    if (customer.priceListId) counts[customer.priceListId] = (counts[customer.priceListId] || 0) + 1;
    return counts;
  }, {});
  const countedLists = lists.map((list) => ({ ...list, cantidadClientesAsignados: assignmentCounts[list.id] || 0 }));
  if (countedLists.some((list, index) => list.cantidadClientesAsignados !== lists[index].cantidadClientesAsignados)) savePriceLists(countedLists);
  return countedLists;
}

export const getStoredPriceLists = (): PriceList[] => migrateLegacyPriceLists();

export const getPriceListById = (id?: string): PriceList | undefined =>
  getStoredPriceLists().find((list) => list.id === id);

export const getAssignedCustomers = (priceListId: string): Customer[] =>
  getStoredCustomers().filter((customer) => customer.priceListId === priceListId);

export const getPriceFromList = (list: PriceList | undefined, product: Product): number => {
  const entry = list?.precios[product.id];
  if (!entry?.activo) return 0;
  return product.tipoVenta === 'POR_UNIDAD' ? entry.precioUnidad ?? 0 : entry.precioKg ?? 0;
};

export function createPriceList(params: {
  nombre: string;
  descripcion?: string;
  color?: string;
  observaciones?: string;
  creadoPor: string;
  base?: 'VACIA' | 'CATALOGO' | 'COPIA';
  sourceListId?: string;
}): PriceList {
  const lists = getStoredPriceLists();
  if (lists.some((list) => list.nombre.trim().toLowerCase() === params.nombre.trim().toLowerCase())) {
    throw new Error('Ya existe una lista con ese nombre.');
  }
  const source = params.sourceListId ? lists.find((list) => list.id === params.sourceListId) : undefined;
  const productPrices = params.base === 'COPIA' && source
    ? structuredClone(source.precios)
    : params.base === 'CATALOGO'
      ? getLegacyPrices(getStoredProducts(), 'GENERAL')
      : {};
  const list: PriceList = {
    id: makeId('price_list'),
    nombre: params.nombre.trim(),
    descripcion: params.descripcion?.trim(),
    estado: 'ACTIVA',
    color: params.color,
    creadoAt: now(),
    actualizadoAt: now(),
    creadoPor: params.creadoPor,
    precios: productPrices,
    cantidadClientesAsignados: 0,
    esListaDelCliente: false,
    ordenVisual: lists.length,
    observaciones: params.observaciones?.trim(),
  };
  savePriceLists([...lists, list]);
  recordAuditLog({ usuario: params.creadoPor, accion: `Creó la lista de precios ${list.nombre}`, tipoAccion: 'CONFIGURACION' });
  return list;
}

export function savePriceList(updated: PriceList, usuario: string, motivo?: string): PriceList {
  const lists = getStoredPriceLists();
  const previous = lists.find((list) => list.id === updated.id);
  if (!previous) throw new Error('La lista de precios no existe.');
  const next = { ...updated, actualizadoAt: now() };
  savePriceLists(lists.map((list) => list.id === next.id ? next : list));

  const history = getPriceListHistory();
  const productIds = new Set([...Object.keys(previous.precios), ...Object.keys(next.precios)]);
  productIds.forEach((productId) => {
    const oldEntry = previous.precios[productId];
    const newEntry = next.precios[productId];
    const oldPrice = oldEntry?.precioKg ?? oldEntry?.precioUnidad;
    const newPrice = newEntry?.precioKg ?? newEntry?.precioUnidad;
    if (oldPrice !== newPrice) {
      history.unshift({ id: makeId('price_history'), priceListId: next.id, productId, precioAnterior: oldPrice, precioNuevo: newPrice, usuario, fechaHora: now(), motivo });
    }
  });
  savePriceListHistory(history);
  recordAuditLog({ usuario, accion: `Actualizó la lista de precios ${next.nombre}`, tipoAccion: 'CONFIGURACION', detalles: motivo });
  return next;
}

export function createExclusivePriceList(customer: Customer, usuario: string): PriceList {
  const existing = getStoredPriceLists().find((list) => list.clienteExclusivoId === customer.id);
  if (existing) return existing;
  const base = getPriceListById(customer.priceListId) || getPriceListById('price-list-general');
  const list: PriceList = {
    id: makeId('price_list_customer'),
    nombre: `Lista de ${customer.alias || customer.nombre}`,
    descripcion: 'Lista exclusiva del cliente.',
    estado: 'ACTIVA',
    creadoAt: now(),
    actualizadoAt: now(),
    creadoPor: usuario,
    precios: structuredClone(base?.precios || {}),
    cantidadClientesAsignados: 0,
    esListaDelCliente: true,
    clienteExclusivoId: customer.id,
    ordenVisual: getStoredPriceLists().length,
  };
  savePriceLists([...getStoredPriceLists(), list]);
  assignCustomersToPriceList(list.id, [customer.id], usuario, 'ADMINISTRADOR', true);
  return list;
}

export function assignCustomersToPriceList(priceListId: string, customerIds: string[], usuario: string, rol: UserRole, confirmedExclusive = false): void {
  const list = getPriceListById(priceListId);
  if (!list || list.estado !== 'ACTIVA') throw new Error('La lista seleccionada no está activa.');
  if (list.esListaDelCliente && customerIds.some((id) => id !== list.clienteExclusivoId) && !(rol === 'DUENO' && confirmedExclusive)) {
    throw new Error('La lista es exclusiva de otro cliente y requiere confirmación del Dueño.');
  }
  const ids = new Set(customerIds);
  const customers = getStoredCustomers().map((customer) => ids.has(customer.id)
    ? { ...customer, priceListId, updatedAt: now() }
    : customer);
  saveCustomers(customers);
  recordAuditLog({ usuario, rol, accion: `Asignó ${ids.size} cliente(s) a ${list.nombre}`, tipoAccion: 'CONFIGURACION' });
}

export function unassignCustomersFromPriceList(priceListId: string, customerIds: string[], usuario: string, rol: UserRole): void {
  const ids = new Set(customerIds);
  const customers = getStoredCustomers().map((customer) =>
    ids.has(customer.id) && customer.priceListId === priceListId
      ? { ...customer, priceListId: undefined, updatedAt: now() }
      : customer
  );
  saveCustomers(customers);
  recordAuditLog({ usuario, rol, accion: `Quitó ${ids.size} cliente(s) de una lista de precios`, tipoAccion: 'CONFIGURACION' });
}

export function archivePriceList(priceListId: string, usuario: string, rol: UserRole): void {
  const list = getPriceListById(priceListId);
  if (!list) throw new Error('La lista no existe.');
  savePriceList({ ...list, estado: 'ARCHIVADA' }, usuario, 'Lista archivada');
  recordAuditLog({ usuario, rol, accion: `Archivó la lista ${list.nombre}`, tipoAccion: 'CONFIGURACION' });
}

export function deletePriceList(priceListId: string, usuario: string, rol: UserRole): void {
  const list = getPriceListById(priceListId);
  if (!list) return;
  if (getAssignedCustomers(priceListId).length > 0) throw new Error('No se puede eliminar una lista con clientes asignados.');
  const boletas = JSON.parse(localStorage.getItem(VIRTUAL_BOLETAS_KEY) || '[]') as Array<{ priceListId?: string; listaPrecioAplicada?: string }>;
  if (boletas.some((boleta) => boleta.priceListId === priceListId || boleta.listaPrecioAplicada === list.nombre)) {
    throw new Error('La lista fue usada en boletas históricas: sólo puede archivarse.');
  }
  savePriceLists(getStoredPriceLists().filter((entry) => entry.id !== priceListId));
  recordAuditLog({ usuario, rol, accion: `Eliminó la lista ${list.nombre}`, tipoAccion: 'CONFIGURACION' });
}
