import React, { useState } from 'react';
import { CustomerWithBalance, Movement } from '../types';
import { formatCurrency, formatDate, buildWhatsAppDebtMessageUrl } from '../utils/formatters';
import {
  Truck,
  DollarSign,
  Phone,
  MessageSquare,
  CheckCircle2,
  Clock,
  Filter,
  ArrowRight,
  TrendingUp,
  MapPin,
  ChevronRight,
  FileText,
} from 'lucide-react';

interface CobranzasScreenProps {
  customers: CustomerWithBalance[];
  movements: Movement[];
  onOpenNewPago: (customerId: string) => void;
  onOpenNewBoleta: (customerId: string) => void;
  onSelectCustomer: (id: string) => void;
}

export const CobranzasScreen: React.FC<CobranzasScreenProps> = ({
  customers,
  movements,
  onOpenNewPago,
  onOpenNewBoleta,
  onSelectCustomer,
}) => {
  const availableRoutes = Array.from(new Set(customers.map((c) => c.zonaRuta))).filter(Boolean);
  const [selectedRoute, setSelectedRoute] = useState<string>(availableRoutes[0] || 'TODAS');

  // Filtrar clientes de la ruta activa con deuda pendiente
  const routeCustomers = customers.filter(
    (c) => (selectedRoute === 'TODAS' || c.zonaRuta === selectedRoute)
  );

  const routeDebtors = routeCustomers
    .filter((c) => c.saldoActual > 0)
    .sort((a, b) => b.saldoActual - a.saldoActual);

  const routePaidOrUpToDate = routeCustomers.filter((c) => c.saldoActual <= 0);

  const totalDeudaRuta = routeCustomers.reduce((acc, c) => acc + Math.max(0, c.saldoActual), 0);

  // Cobranzas registradas hoy en esta ruta
  const hoyStr = new Date().toISOString().split('T')[0];
  const routeCustomerIds = new Set(routeCustomers.map((c) => c.id));

  const pagosRutaHoy = movements.filter(
    (m) =>
      m.tipo === 'PAGO' &&
      m.fecha.startsWith(hoyStr) &&
      routeCustomerIds.has(m.customerId)
  );

  const totalCobradoRutaHoy = pagosRutaHoy.reduce((acc, m) => acc + m.monto, 0);

  return (
    <div id="cobranzas-screen-container" className="space-y-6 pb-16">
      {/* Header Banner - Optimizado para cel en camioneta */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-5 rounded-2xl shadow-lg border border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-600/30 rounded-2xl border border-blue-500/40 text-blue-400">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Modo Cobranzas en Ruta</h1>
              <p className="text-xs text-slate-300 font-medium">Gestión ágil de cobros en calle para reparto</p>
            </div>
          </div>

          {/* Selector de Ruta */}
          <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700">
            <select
              id="select-cobranza-ruta"
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs sm:text-sm font-bold text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
            >
              <option value="TODAS">📍 Todas las Rutas ({customers.length})</option>
              {availableRoutes.map((r) => (
                <option key={r} value={r}>
                  🚚 {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Resumen de Cobranzas del Día */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-700/80">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <p className="text-[10px] uppercase font-bold text-slate-400">Pendiente en Ruta</p>
            <p className="text-lg font-black font-mono text-red-400">
              {formatCurrency(totalDeudaRuta)}
            </p>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <p className="text-[10px] uppercase font-bold text-slate-400">Cobrado Hoy</p>
            <p className="text-lg font-black font-mono text-emerald-400">
              {formatCurrency(totalCobradoRutaHoy)}
            </p>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 col-span-2 sm:col-span-1">
            <p className="text-[10px] uppercase font-bold text-slate-400">Clientes Deudores</p>
            <p className="text-lg font-black font-mono text-amber-400">
              {routeDebtors.length} <span className="text-xs font-sans text-slate-400">de {routeCustomers.length}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Clientes en Ruta Deudores */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <span>Pendientes de Cobro ({routeDebtors.length})</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">Ordenados por monto adeudado</span>
        </div>

        {routeDebtors.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-600 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-base text-slate-900">¡Ruta al día!</h3>
            <p className="text-xs text-slate-500">No hay saldos pendientes de cobro para esta ruta.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {routeDebtors.map((cust) => {
              const level = cust.evaluacionRiesgo?.level || (cust.evaluacionRiesgo as any)?.nivel;
              const isCritical = level === 'CRITICO';
              const isHigh = level === 'ALTO';

              return (
                <div
                  key={cust.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1 cursor-pointer" onClick={() => onSelectCustomer(cust.id)}>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-base text-slate-900 hover:text-blue-600 transition">
                          {cust.alias || cust.nombre}
                        </span>
                        {isCritical && (
                          <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full uppercase">
                            Mora Crítica
                          </span>
                        )}
                        {isHigh && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase">
                            Mora Alta
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-slate-600 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{cust.direccion}, {cust.localidad}</span>
                      </div>

                      {cust.referenciaUbicacion && (
                        <p className="text-[11px] text-slate-500 italic pl-5">
                          "{cust.referenciaUbicacion}"
                        </p>
                      )}
                    </div>

                    {/* Muestreo de Saldo */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left sm:text-right shrink-0">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Deuda Abierta</p>
                      <p className="text-xl font-black font-mono text-red-600">
                        {formatCurrency(cust.saldoActual)}
                      </p>
                    </div>
                  </div>

                  {/* Botones de acción táctiles para el celular */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => onOpenNewPago(cust.id)}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center justify-center space-x-1.5 active:scale-95 transition"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Cobrar Ahora</span>
                    </button>

                    <button
                      onClick={() => onOpenNewBoleta(cust.id)}
                      className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center justify-center space-x-1.5 active:scale-95 transition"
                    >
                      <FileText className="w-4 h-4" />
                      <span>+ Boleta</span>
                    </button>

                    <a
                      href={buildWhatsAppDebtMessageUrl(cust)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center justify-center space-x-1.5 transition"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>

                    <button
                      onClick={() => onSelectCustomer(cust.id)}
                      className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center justify-center space-x-1 transition"
                    >
                      <span>Ver Ficha</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clientes al día en la ruta */}
      {routePaidOrUpToDate.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
            Clientes al día / Saldo $0 en esta ruta ({routePaidOrUpToDate.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {routePaidOrUpToDate.map((c) => (
              <div
                key={c.id}
                onClick={() => onSelectCustomer(c.id)}
                className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">{c.alias || c.nombre}</p>
                  <p className="text-[10px] text-slate-500">{c.localidad}</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 font-mono">
                  {formatCurrency(c.saldoActual)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
