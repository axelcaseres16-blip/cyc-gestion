import React, { useState } from 'react';
import { CustomerWithBalance, Movement } from '../types';
import { formatCurrency, formatDate, getDaysAgo, buildWhatsAppDebtMessageUrl } from '../utils/formatters';
import {
  DollarSign,
  Users,
  AlertTriangle,
  TrendingDown,
  Truck,
  PlusCircle,
  FileText,
  Phone,
  Calendar,
  MessageSquare,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  ShieldAlert,
  Search,
  Filter,
} from 'lucide-react';

interface DashboardProps {
  customers: CustomerWithBalance[];
  movements: Movement[];
  onSelectCustomer: (id: string) => void;
  onOpenNewBoleta: (customerId?: string) => void;
  onOpenNewPago: (customerId?: string) => void;
  onGoToCobranzas: () => void;
  onGoToClientes: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  customers,
  movements,
  onSelectCustomer,
  onOpenNewBoleta,
  onOpenNewPago,
  onGoToCobranzas,
  onGoToClientes,
}) => {
  const [selectedRoute, setSelectedRoute] = useState<string>('TODAS');

  // Filtrar clientes por ruta elegida
  const availableRoutes = Array.from(new Set(customers.map((c) => c.zonaRuta))).filter(Boolean);

  const filteredCustomers = customers.filter(
    (c) => selectedRoute === 'TODAS' || c.zonaRuta === selectedRoute
  );

  // Cálculos consolidados
  const totalDeuda = filteredCustomers.reduce((acc, c) => acc + Math.max(0, c.saldoActual), 0);
  const totalClientes = filteredCustomers.length;
  const clientesConDeuda = filteredCustomers.filter((c) => c.saldoActual > 0);

  // Clientes riesgosos (CRITICO o ALTO)
  const clientesRiesgosos = filteredCustomers.filter((c) => {
    const level = c.evaluacionRiesgo?.level || (c.evaluacionRiesgo as any)?.nivel;
    return level === 'CRITICO' || level === 'ALTO';
  });

  // Clientes inactivos (+20 días sin comprar)
  const clientesInactivosSinComprar = filteredCustomers.filter(
    (c) => c.saldoActual > 0 && (c.evaluacionRiesgo?.lastPurchaseDays ?? 0) > 20
  );

  // Cobranzas del día de hoy
  const hoyStr = new Date().toISOString().split('T')[0];
  const pagosHoy = movements.filter(
    (m) => m.tipo === 'PAGO' && m.fecha.startsWith(hoyStr)
  );
  const totalCobradoHoy = pagosHoy.reduce((acc, m) => acc + m.monto, 0);

  // Top 5 mayores deudores
  const topDeudores = [...filteredCustomers]
    .filter((c) => c.saldoActual > 0)
    .sort((a, b) => b.saldoActual - a.saldoActual)
    .slice(0, 5);

  // Últimos 6 movimientos globales
  const ultimosMovimientos = [...movements]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 6);

  return (
    <div id="dashboard-container" className="space-y-6 pb-12">
      {/* Filtro por Zona/Ruta y Bienvenida */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Tablero Principal de Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Estado de clientes, saldos deudores y cobranzas en calle
          </p>
        </div>

        {/* Filter Zone */}
        <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <Filter className="w-4 h-4 text-slate-500 ml-2" />
          <span className="text-xs font-semibold text-slate-600 hidden sm:inline">Ruta/Zona:</span>
          <select
            id="dashboard-route-filter"
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="bg-white border border-slate-300 text-xs text-slate-800 font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODAS">📍 Todas las Rutas ({customers.length})</option>
            {availableRoutes.map((route) => (
              <option key={route} value={route}>
                {route}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Tarjetas de Métricas Clave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Deuda */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              ¿Cuánto me deben? (Total)
            </span>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {formatCurrency(totalDeuda)}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Repartido en <span className="font-bold text-slate-800">{clientesConDeuda.length}</span> de {totalClientes} clientes
          </p>
        </div>

        {/* Card 2: Cobrado Hoy */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cobrado Hoy en Ruta
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono">
            {formatCurrency(totalCobradoHoy)}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            <span className="font-bold text-slate-800">{pagosHoy.length}</span> cobro(s) registrado(s) hoy
          </p>
        </div>

        {/* Card 3: Clientes Riesgosos */}
        <div
          onClick={onGoToClientes}
          className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-2 cursor-pointer hover:border-red-300 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Clientes en Riesgo
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono">
            {clientesRiesgosos.length}
          </div>
          <p className="text-xs text-amber-700 font-medium flex items-center">
            <span>Riesgo Alto/Crítico por mora</span>
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </p>
        </div>

        {/* Card 4: Clientes Inactivos */}
        <div
          onClick={onGoToClientes}
          className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-2 cursor-pointer hover:border-slate-300 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sin Comprar (+20 días)
            </span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono">
            {clientesInactivosSinComprar.length}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Clientes con saldo que dejaron de pedir
          </p>
        </div>
      </div>

      {/* Banner Acciones Rápidas */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 sm:p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-600/30 rounded-2xl border border-blue-500/30">
            <Truck className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Modo Cobranzas en Ruta</h3>
            <p className="text-xs text-slate-300 max-w-xl">
              Accedé a la pantalla de cobranza rápida optimizada para celular. Visualizá la ruta del día, saldos ordenados y cobrá en 1 tap.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button
            id="btn-goto-cobranzas"
            onClick={onGoToCobranzas}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition shadow-md flex items-center justify-center space-x-2"
          >
            <Truck className="w-4 h-4" />
            <span>Iniciar Cobranza de Hoy</span>
          </button>
        </div>
      </div>

      {/* Grid Principal: Top Deudores & Últimos Movimientos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Top Deudores ("¿Quién me debe?") */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Mayores Deudores ("¿Quién me debe?")</span>
            </h2>
            <button
              onClick={onGoToClientes}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>Ver todos ({customers.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {topDeudores.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
                🎉 No hay clientes con saldo deudor pendiente en esta ruta.
              </div>
            ) : (
              topDeudores.map((cust) => {
                const isCritical = cust.evaluacionRiesgo.level === 'CRITICO';
                const isHigh = cust.evaluacionRiesgo.level === 'ALTO';

                return (
                  <div
                    key={cust.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div
                      className="cursor-pointer flex-1 space-y-1"
                      onClick={() => onSelectCustomer(cust.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-base hover:text-blue-600 transition">
                          {cust.alias || cust.nombre}
                        </span>
                        {isCritical && (
                          <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase">
                            Riesgo Crítico
                          </span>
                        )}
                        {isHigh && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase">
                            Riesgo Alto
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 font-medium">
                        {cust.nombre} • <span className="text-slate-700">{cust.zonaRuta}</span>
                      </p>

                      <div className="flex items-center space-x-4 text-[11px] text-slate-500 pt-1">
                        <span>
                          📦 Última compra:{' '}
                          <strong className="text-slate-800">
                            {formatDate(cust.fechaUltimaCompra || '')} ({cust.evaluacionRiesgo.lastPurchaseDays} días)
                          </strong>
                        </span>
                        <span>
                          💵 Último pago:{' '}
                          <strong className="text-slate-800">
                            {formatDate(cust.fechaUltimoPago || '')} ({cust.evaluacionRiesgo.lastPaymentDays} días)
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Muestreo de Saldo y Acciones Rápidas */}
                    <div className="flex items-center justify-between sm:justify-end space-x-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Saldo Pendiente</p>
                        <p className="text-lg font-black text-red-600 font-mono">
                          {formatCurrency(cust.saldoActual)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-1">
                        <a
                          href={buildWhatsAppDebtMessageUrl(cust)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition border border-emerald-200"
                          title="Enviar resumen por WhatsApp"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => onOpenNewPago(cust.id)}
                          className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition text-xs font-bold flex items-center space-x-1"
                          title="Registrar Pago"
                        >
                          <DollarSign className="w-4 h-4" />
                          <span className="hidden sm:inline">Cobrar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Útimos Movimientos & Registrar Rápido */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Últimos Movimientos</span>
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            {ultimosMovimientos.map((m) => {
              const cust = customers.find((c) => c.id === m.customerId);
              const isDebito = m.esDebito;

              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition border border-slate-100"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-xl text-xs font-bold ${
                        isDebito ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {isDebito ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {cust ? cust.alias || cust.nombre : 'Cliente'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {m.tipo === 'BOLETA' ? `Boleta ${m.numeroBoleta || ''}` : m.descripcion || m.tipo} •{' '}
                        {formatDate(m.fecha, true)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-mono text-sm font-bold ${
                        isDebito ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {isDebito ? '+' : '-'}{formatCurrency(m.monto)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Buttons Card */}
          <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 space-y-3">
            <p className="text-xs font-bold uppercase text-slate-600 tracking-wider">
              Acciones de Operación Diaria
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onOpenNewBoleta()}
                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold p-3 rounded-xl shadow-xs flex items-center justify-center space-x-2 transition"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>+ Boleta con Foto</span>
              </button>
              <button
                onClick={() => onOpenNewPago()}
                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold p-3 rounded-xl shadow-xs flex items-center justify-center space-x-2 transition"
              >
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>+ Registrar Pago</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
