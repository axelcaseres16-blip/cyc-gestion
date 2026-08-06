import React, { useMemo, useState } from 'react';
import { AppUser, CustomerWithBalance, PriceList, PriceListProductPrice } from '../types';
import { getStoredProducts } from '../utils/stockAndBoletasManager';
import {
  archivePriceList,
  assignCustomersToPriceList,
  createPriceList,
  deletePriceList,
  getAssignedCustomers,
  getPriceListHistory,
  getStoredPriceLists,
  savePriceList,
  unassignCustomersFromPriceList,
} from '../utils/priceListsManager';
import { formatDate } from '../utils/formatters';
import { Archive, Copy, History, Plus, Save, Search, Trash2, Users } from 'lucide-react';

interface PriceListsScreenProps {
  currentUser: AppUser;
  customers: CustomerWithBalance[];
  onRefreshData: () => void;
}

const makeDraft = (list: PriceList): PriceList => structuredClone(list);

export const PriceListsScreen: React.FC<PriceListsScreenProps> = ({ currentUser, customers, onRefreshData }) => {
  const [lists, setLists] = useState<PriceList[]>(() => getStoredPriceLists());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PriceList | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'TODAS' | 'ACTIVA' | 'ARCHIVADA'>('ACTIVA');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [message, setMessage] = useState<string>('');

  const products = useMemo(() => getStoredProducts(), []);
  const selectedList = lists.find((list) => list.id === selectedId);
  const assigned = selectedId ? getAssignedCustomers(selectedId) : [];
  const filteredLists = lists
    .filter((list) => (status === 'TODAS' ? true : list.estado === status))
    .filter((list) => list.nombre.toLowerCase().includes(query.toLowerCase()) || list.descripcion?.toLowerCase().includes(query.toLowerCase()))
    .sort((left, right) => left.ordenVisual - right.ordenVisual || left.nombre.localeCompare(right.nombre));

  const reload = () => {
    setLists(getStoredPriceLists());
    onRefreshData();
  };

  const openList = (list: PriceList) => {
    setSelectedId(list.id);
    setDraft(makeDraft(list));
    setSelectedCustomers(getAssignedCustomers(list.id).map((customer) => customer.id));
    setShowHistory(false);
    setMessage('');
  };

  const createList = (base: 'VACIA' | 'CATALOGO' | 'COPIA' = 'CATALOGO') => {
    const name = window.prompt('Nombre de la nueva lista de precios:');
    if (!name?.trim()) return;
    try {
      const created = createPriceList({
        nombre: name,
        creadoPor: currentUser.nombre,
        base,
        sourceListId: base === 'COPIA' ? selectedId || undefined : undefined,
      });
      reload();
      openList(created);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo crear la lista.');
    }
  };

  const updatePrice = (productId: string, key: 'precioKg' | 'precioUnidad', raw: string) => {
    if (!draft) return;
    const value = raw.trim() === '' ? undefined : Number(raw.replace(',', '.'));
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) return;
    setDraft({
      ...draft,
      precios: {
        ...draft.precios,
        [productId]: {
          productId,
          activo: true,
          ...(draft.precios[productId] || {}),
          [key]: value,
        } as PriceListProductPrice,
      },
    });
  };

  const saveDraft = () => {
    if (!draft || !draft.nombre.trim()) return;
    try {
      const saved = savePriceList(draft, currentUser.nombre);
      reload();
      setDraft(makeDraft(saved));
      setMessage('Lista guardada. Las boletas futuras usarán estos precios.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar la lista.');
    }
  };

  const applyAssignments = () => {
    if (!selectedList) return;
    try {
      assignCustomersToPriceList(selectedList.id, selectedCustomers, currentUser.nombre, currentUser.role);
      reload();
      setMessage('Clientes asignados a la lista.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudieron asignar los clientes.');
    }
  };

  const removeAssignments = () => {
    if (!selectedList || selectedCustomers.length === 0) return;
    unassignCustomersFromPriceList(selectedList.id, selectedCustomers, currentUser.nombre, currentUser.role);
    reload();
    setSelectedCustomers([]);
    setMessage('Clientes quitados de la lista; no podrán vender hasta asignar otra.');
  };

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900">Listas de precios</h1>
          <p className="text-xs font-medium text-slate-500">Precios, asignaciones y cambios comerciales sin alterar boletas emitidas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => createList('VACIA')} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-700"><Plus className="mr-1 inline h-4 w-4" />Lista vacía</button>
          <button onClick={() => createList('CATALOGO')} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white"><Plus className="mr-1 inline h-4 w-4" />Usar catálogo</button>
          {selectedList && <button onClick={() => createList('COPIA')} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white"><Copy className="mr-1 inline h-4 w-4" />Duplicar</button>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.5fr]">
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex gap-2">
            <label className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar lista" className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-2 text-xs" /></label>
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="rounded-lg border border-slate-300 px-2 text-xs font-bold"><option value="ACTIVA">Activas</option><option value="ARCHIVADA">Archivadas</option><option value="TODAS">Todas</option></select>
          </div>
          <div className="space-y-2">
            {filteredLists.map((list) => {
              const count = getAssignedCustomers(list.id).length;
              const priceCount = Object.values(list.precios).filter((price) => price.activo && ((price.precioKg || 0) > 0 || (price.precioUnidad || 0) > 0)).length;
              return <button key={list.id} onClick={() => openList(list)} className={`w-full rounded-xl border p-3 text-left text-xs transition ${selectedId === list.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className="flex items-center justify-between gap-2"><strong className="text-slate-900">{list.nombre}</strong><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${list.estado === 'ACTIVA' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{list.estado}</span></div>
                <p className="mt-1 text-slate-500">{priceCount} productos · {count} clientes · {formatDate(list.actualizadoAt)}</p>
                {list.esListaDelCliente && <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-900">EXCLUSIVA DEL CLIENTE</span>}
              </button>;
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          {!draft || !selectedList ? <p className="p-8 text-center text-sm font-bold text-slate-500">Seleccioná o creá una lista para administrarla.</p> : <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex-1 space-y-2"><input value={draft.nombre} onChange={(event) => setDraft({ ...draft, nombre: event.target.value })} className="w-full border-b border-slate-300 py-1 text-lg font-black text-slate-900" /><input value={draft.descripcion || ''} onChange={(event) => setDraft({ ...draft, descripcion: event.target.value })} placeholder="Descripción opcional" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs" /></div>
              <div className="flex gap-2"><button onClick={saveDraft} disabled={selectedList.estado !== 'ACTIVA'} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40"><Save className="mr-1 inline h-4 w-4" />Guardar</button><button onClick={() => setShowHistory(!showHistory)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black"><History className="mr-1 inline h-4 w-4" />Historial</button></div>
            </div>
            {message && <p className="rounded-lg bg-amber-50 p-2 text-xs font-bold text-amber-900">{message}</p>}
            {showHistory && <div className="max-h-36 overflow-y-auto rounded-lg bg-slate-50 p-2 text-xs">{getPriceListHistory().filter((entry) => entry.priceListId === selectedList.id).slice(0, 20).map((entry) => <p key={entry.id}>{formatDate(entry.fechaHora, true)} · {entry.productId}: {entry.precioAnterior ?? '—'} → {entry.precioNuevo ?? '—'} · {entry.usuario}</p>)}</div>}
            <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="border-b text-left text-slate-500"><tr><th className="py-2">Producto</th><th>Precio</th><th>Activo</th><th>Observación</th></tr></thead><tbody>{products.map((product) => {
              const entry = draft.precios[product.id] || { productId: product.id, activo: false };
              const priceKey = product.tipoVenta === 'POR_UNIDAD' ? 'precioUnidad' : 'precioKg';
              return <tr key={product.id} className="border-b border-slate-100"><td className="py-2 font-bold text-slate-800">{product.nombre}</td><td><input disabled={selectedList.estado !== 'ACTIVA'} value={entry[priceKey] ?? ''} onChange={(event) => updatePrice(product.id, priceKey, event.target.value)} inputMode="decimal" className="w-24 rounded border border-slate-300 px-1.5 py-1" /></td><td><input type="checkbox" checked={entry.activo} disabled={selectedList.estado !== 'ACTIVA'} onChange={(event) => setDraft({ ...draft, precios: { ...draft.precios, [product.id]: { ...entry, activo: event.target.checked } } })} /></td><td><input value={entry.observacion || ''} disabled={selectedList.estado !== 'ACTIVA'} onChange={(event) => setDraft({ ...draft, precios: { ...draft.precios, [product.id]: { ...entry, observacion: event.target.value } } })} className="w-full rounded border border-slate-300 px-1.5 py-1" /></td></tr>;
            })}</tbody></table></div>
            <div className="border-t border-slate-200 pt-3"><div className="flex items-center justify-between"><h2 className="text-sm font-black text-slate-900"><Users className="mr-1 inline h-4 w-4" />Administrar clientes asignados ({assigned.length})</h2><div className="flex gap-2"><button onClick={applyAssignments} disabled={selectedList.estado !== 'ACTIVA'} className="rounded-lg bg-blue-600 px-2 py-1.5 text-xs font-black text-white disabled:opacity-40">Asignar / mover</button><button onClick={removeAssignments} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-black">Quitar</button></div></div><div className="mt-2 grid max-h-44 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">{customers.filter((customer) => !customer.archivado).map((customer) => <label key={customer.id} className="flex items-center gap-2 rounded bg-slate-50 p-2 text-xs"><input type="checkbox" checked={selectedCustomers.includes(customer.id)} onChange={(event) => setSelectedCustomers((previous) => event.target.checked ? [...previous, customer.id] : previous.filter((id) => id !== customer.id))} /><span>{customer.alias || customer.nombre}</span></label>)}</div></div>
            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">{selectedList.estado === 'ACTIVA' ? <button onClick={() => { archivePriceList(selectedList.id, currentUser.nombre, currentUser.role); reload(); }} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900"><Archive className="mr-1 inline h-4 w-4" />Archivar lista</button> : null}<button onClick={() => { try { deletePriceList(selectedList.id, currentUser.nombre, currentUser.role); setSelectedId(null); setDraft(null); reload(); } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo eliminar.'); } }} className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-black text-red-800"><Trash2 className="mr-1 inline h-4 w-4" />Eliminar sin uso</button></div>
          </div>}
        </section>
      </div>
    </div>
  );
};
