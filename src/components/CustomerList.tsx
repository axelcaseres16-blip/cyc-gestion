import React, { useState } from 'react';
import { CustomerWithBalance } from '../types';
import { formatCurrency, formatDate, CATEGORY_LABELS, FREQUENCY_LABELS, buildWhatsAppDebtMessageUrl } from '../utils/formatters';
import {
  Search,
  Filter,
  PlusCircle,
  Phone,
  MapPin,
  ShieldAlert,
  MessageSquare,
  FileText,
  DollarSign,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  AlertTriangle,
} from 'lucide-react';

interface CustomerListProps {
  customers: CustomerWithBalance[];
  onSelectCustomer: (id: string) => void;
  onOpenNewCustomer: () => void;
  onOpenNewBoleta: (customerId?: string) => void;
  onOpenNewPago: (customerId?: string) => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  onSelectCustomer,
  onOpenNewCustomer,
  onOpenNewBoleta,
  onOpenNewPago,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('TODAS');
  const [selectedRisk, setSelectedRisk] = useState('TODOS');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [showArchived, setShowArchived] = useState(false);

  const availableRoutes = Array.from(new Set(customers.map((c) => c.zonaRuta))).filter(Boolean);

  const filteredCustomers = customers.filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      c.nombre.toLowerCase().includes(term) ||
      c.alias.toLowerCase().includes(term) ||
      c.cuitDni.includes(term) ||
      c.localidad.toLowerCase().includes(term) ||
      c.telefono.includes(term);

    const matchesRoute = selectedRoute === 'TODAS' || c.zonaRuta === selectedRoute;
    const matchesCategory = selectedCategory === 'TODAS' || c.categoria === selectedCategory;
    const level = c.evaluacionRiesgo?.level || (c.evaluacionRiesgo as any)?.nivel;
    const matchesRisk =
      selectedRisk === 'TODOS' ||
      (selectedRisk === 'RIESGO_ALTO' && (level === 'CRITICO' || level === 'ALTO')) ||
      (selectedRisk === 'SOLO_DEUDORES' && c.saldoActual > 0) ||
      level === selectedRisk;

    return matchesSearch && matchesRoute && matchesCategory && matchesRisk && (showArchived ? true : !c.archivado);
  });

  return (
    <div id="customer-list-container" className="space-y-6 pb-12">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Nómina de Clientes ({filteredCustomers.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Administración de comercios, saldos pendientes y clasificación de riesgo crediticio
          </p>
        </div>

        <button
          id="btn-create-customer"
          onClick={onOpenNewCustomer}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm px-4 py-3 min-h-[48px] rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Registrar Nuevo Cliente</span>
        </button>
      </div>

      {/* Bar de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Búsqueda por texto */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              id="input-search-customers"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nombre, Alias (ej: Don Juan), CUIT, Teléfono o Localidad..."
              className="w-full pl-10 pr-4 py-2.5 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Filtro por Ruta */}
          <div>
            <select
              id="filter-route-select"
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="w-full py-2.5 px-3 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODAS">📍 Todas las Rutas</option>
              {availableRoutes.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Nivel de Riesgo / Estado Deuda */}
          <div>
            <select
              id="filter-risk-select"
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="w-full py-2.5 px-3 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">⚠️ Todos los Niveles de Riesgo</option>
              <option value="SOLO_DEUDORES">🔴 Solo Clientes con Deuda</option>
              <option value="RIESGO_ALTO">🚨 Riesgo Alto / Crítico</option>
              <option value="MEDIO">🨨 Riesgo Medio</option>
              <option value="BAJO">🟢 Riesgo Bajo / Sin Deuda</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />Mostrar clientes archivados (sólo consulta y reactivación)</label>
      </div>

      {/* Grid de Tarjetas de Clientes (No tablas para máxima comodidad táctil) */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 space-y-3">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
          <p className="font-bold text-slate-800">No se encontraron clientes con los filtros aplicados</p>
          <p className="text-xs text-slate-500">Pruebe limpiando la búsqueda o cambiando de ruta.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => {
            const level = cust.evaluacionRiesgo.level;
            const isCritical = level === 'CRITICO';
            const isHigh = level === 'ALTO';
            const isMedium = level === 'MEDIO';

            return (
              <div
                key={cust.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between space-y-4"
              >
                {/* Encabezado Tarjeta: Alias + Categoria + Status Badge */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="cursor-pointer" onClick={() => onSelectCustomer(cust.id)}>
                      <h3 className="font-extrabold text-base text-slate-900 hover:text-blue-600 transition leading-snug">
                        {cust.alias || cust.nombre}
                      </h3>
                      {cust.alias && (
                        <p className="text-xs text-slate-500 font-medium truncate">{cust.nombre}</p>
                      )}
                    </div>

                    {/* Badge de Riesgo */}
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${
                        isCritical
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : isHigh
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : isMedium
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      Riesgo {level}
                    </span>
                  </div>

                  {/* Etiquetas de Categoria & Ruta */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                      {CATEGORY_LABELS[cust.categoria] || cust.categoria}
                    </span>
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                      📍 {cust.zonaRuta}
                    </span>
                  </div>
                </div>

                {/* Detalles de contacto y ubicación */}
                <div className="space-y-1.5 text-xs text-slate-600 font-medium border-t border-slate-100 pt-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {cust.direccion}, {cust.localidad}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{cust.telefono || 'Sin teléfono'}</span>
                    </div>
                    {cust.cuitDni && (
                      <span className="text-[11px] font-mono text-slate-400">CUIT: {cust.cuitDni}</span>
                    )}
                  </div>
                </div>

                {/* Muestreo de Saldo Actual y Estado Crediticio */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-bold text-slate-500">Saldo Pendiente</span>
                    <span
                      className={`text-base font-black font-mono ${
                        cust.saldoActual > 0 ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatCurrency(cust.saldoActual)}
                    </span>
                  </div>

                  {/* Barra de límite de crédito */}
                  {cust.limiteCredito > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                        <span>Límite: {formatCurrency(cust.limiteCredito)}</span>
                        <span>{cust.evaluacionRiesgo?.creditUsagePercent ?? 0}% uso</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            cust.evaluacionRiesgo.creditUsagePercent > 100
                              ? 'bg-red-600'
                              : cust.evaluacionRiesgo.creditUsagePercent > 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, cust.evaluacionRiesgo.creditUsagePercent)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Info de fechas de última compra y pago */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <span>
                      U. Compra:{' '}
                      <strong className="text-slate-800">
                        {cust.fechaUltimaCompra ? formatDate(cust.fechaUltimaCompra) : 'Sin compras'}
                      </strong>
                    </span>
                    <span>
                      U. Pago:{' '}
                      <strong className="text-slate-800">
                        {cust.fechaUltimoPago ? formatDate(cust.fechaUltimoPago) : 'Sin pagos'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Botones de Acción Inmediata en Tarjeta */}
                <div className={`grid ${cust.archivado ? 'grid-cols-1' : 'grid-cols-3'} gap-2 border-t border-slate-100 pt-3`}>
                  {!cust.archivado && <>
                  <a
                    href={buildWhatsAppDebtMessageUrl(cust)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition"
                    title="Enviar estado de cuenta por WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  <button
                    onClick={() => onOpenNewPago(cust.id)}
                    className="flex items-center justify-center space-x-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-2xs"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Cobrar</span>
                  </button>
                  </>}

                  <button
                    onClick={() => onSelectCustomer(cust.id)}
                    className="flex items-center justify-center space-x-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
                  >
                    <span>Ficha</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
