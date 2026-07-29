import React, { useState } from 'react';
import { CustomerWithBalance, Movement, CustomerVisit, WhatsAppTemplates, SmartReminder } from '../types';
import { formatCurrency, buildCustomWhatsAppUrl, formatDate } from '../utils/formatters';
import { addActivityLog } from '../utils/storage';
import {
  Truck,
  Search,
  MessageSquare,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  Package,
  ChevronRight,
  Sparkles,
  Zap,
} from 'lucide-react';

interface HoyRepartidorScreenProps {
  customers: CustomerWithBalance[];
  movements: Movement[];
  visits: CustomerVisit[];
  reminders: SmartReminder[];
  templates: WhatsAppTemplates;
  onOpenRegistrarVisita: (customer: CustomerWithBalance) => void;
  onSelectCustomer: (customerId: string) => void;
  onStartSale?: (customer: CustomerWithBalance) => void;
  currentUserRole: string;
}

export const HoyRepartidorScreen: React.FC<HoyRepartidorScreenProps> = ({
  customers,
  movements,
  visits,
  reminders,
  templates,
  onOpenRegistrarVisita,
  onSelectCustomer,
  onStartSale,
  currentUserRole,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDIENTES' | 'DEUDORES' | 'SIN_PEDIDO' | 'TODOS'>('PENDIENTES');

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Clientes Pendientes (Visita programada para hoy/atrasada o con seguimiento especial)
  const pendingCustomers = customers.filter((c) => {
    const hasScheduledVisitToday = c.proximaVisita && c.proximaVisita.fecha <= todayStr;
    const hasRiskOrDebt = c.saldoActual > 0;
    return hasScheduledVisitToday || (c.ultimaVisita && c.ultimaVisita.resultadoTexto.includes('No respondió'));
  });

  // 2. Clientes con Deuda
  const debtCustomers = customers.filter((c) => c.saldoActual > 0).sort((a, b) => b.saldoActual - a.saldoActual);

  // 3. Clientes sin pedido enviado
  const noOrderCustomers = customers.filter((c) => {
    if (!c.fechaUltimaCompra) return true;
    const days = Math.floor((Date.now() - new Date(c.fechaUltimaCompra).getTime()) / (1000 * 60 * 60 * 24));
    return days >= 5 && c.estado === 'ACTIVO';
  });

  // Filtrado de la lista completa
  const filteredCustomers = customers.filter((c) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = (c.nombre && c.nombre.toLowerCase().includes(term)) || (c.alias && c.alias.toLowerCase().includes(term));
    const locationMatch = (c.direccion && c.direccion.toLowerCase().includes(term)) || (c.localidad && c.localidad.toLowerCase().includes(term));
    const routeMatch = c.zonaRuta && c.zonaRuta.toLowerCase().includes(term);

    if (activeTab === 'PENDIENTES') return (nameMatch || locationMatch || routeMatch) && pendingCustomers.some((pc) => pc.id === c.id);
    if (activeTab === 'DEUDORES') return (nameMatch || locationMatch || routeMatch) && c.saldoActual > 0;
    if (activeTab === 'SIN_PEDIDO') return (nameMatch || locationMatch || routeMatch) && noOrderCustomers.some((nc) => nc.id === c.id);

    return nameMatch || locationMatch || routeMatch;
  });

  // Log de actividad para envíos de WhatsApp
  const handleWhatsAppClick = (type: 'SALDO' | 'PEDIDO', customer: CustomerWithBalance) => {
    const url = buildCustomWhatsAppUrl(type, customer, templates);
    const label = type === 'SALDO' ? 'informando saldo' : 'solicitando pedido';
    addActivityLog(
      `Repartidor (${currentUserRole})`,
      `envió WhatsApp ${label} a ${customer.alias || customer.nombre}`,
      'WHATSAPP',
      customer.id,
      customer.alias || customer.nombre
    );
    window.open(url, '_blank');
  };

  return (
    <div id="hoy-repartidor-container" className="space-y-5 pb-20">
      {/* Banner Principal Modo Repartidor en Camión */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-xl border border-blue-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/30 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                  Panel HOY • Reparto
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">Visitas y Reparto Diario</h1>
            </div>
          </div>

          <div className="hidden sm:block text-right">
            <p className="text-xs text-slate-400">Total Clientes</p>
            <p className="text-xl font-black font-mono text-white">{customers.length}</p>
          </div>
        </div>

        {/* Recordatorios Automáticos Inteligentes */}
        {reminders.length > 0 && (
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recordatorios Inteligentes del Día ({reminders.length})</span>
            </p>

            <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {reminders.slice(0, 4).map((rem) => (
                <div
                  key={rem.id}
                  onClick={() => onSelectCustomer(rem.customerId)}
                  className="shrink-0 bg-slate-800/90 hover:bg-slate-800 border border-amber-500/30 text-slate-200 p-2.5 rounded-xl text-xs space-y-1 cursor-pointer max-w-[260px] transition"
                >
                  <p className="font-bold text-amber-300 truncate">{rem.customerName}</p>
                  <p className="text-[11px] text-slate-300 line-clamp-2">{rem.mensaje}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs / Sub-Secciones Rápidas Táctiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setActiveTab('PENDIENTES')}
          className={`p-3 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between ${
            activeTab === 'PENDIENTES'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <Truck className={`w-5 h-5 ${activeTab === 'PENDIENTES' ? 'text-white' : 'text-blue-600'}`} />
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${activeTab === 'PENDIENTES' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'}`}>
              {pendingCustomers.length}
            </span>
          </div>
          <p className="font-extrabold text-xs mt-2">🚚 Pendientes</p>
        </button>

        <button
          onClick={() => setActiveTab('DEUDORES')}
          className={`p-3 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between ${
            activeTab === 'DEUDORES'
              ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-300'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <DollarSign className={`w-5 h-5 ${activeTab === 'DEUDORES' ? 'text-white' : 'text-red-600'}`} />
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${activeTab === 'DEUDORES' ? 'bg-white/20 text-white' : 'bg-red-50 text-red-700'}`}>
              {debtCustomers.length}
            </span>
          </div>
          <p className="font-extrabold text-xs mt-2">💰 Con Deuda</p>
        </button>

        <button
          onClick={() => setActiveTab('SIN_PEDIDO')}
          className={`p-3 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between ${
            activeTab === 'SIN_PEDIDO'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <Package className={`w-5 h-5 ${activeTab === 'SIN_PEDIDO' ? 'text-white' : 'text-amber-600'}`} />
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${activeTab === 'SIN_PEDIDO' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'}`}>
              {noOrderCustomers.length}
            </span>
          </div>
          <p className="font-extrabold text-xs mt-2">📦 Sin Pedido</p>
        </button>

        <button
          onClick={() => setActiveTab('TODOS')}
          className={`p-3 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between ${
            activeTab === 'TODOS'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-400'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <Search className={`w-5 h-5 ${activeTab === 'TODOS' ? 'text-white' : 'text-slate-600'}`} />
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${activeTab === 'TODOS' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {customers.length}
            </span>
          </div>
          <p className="font-extrabold text-xs mt-2">👥 Todos ({customers.length})</p>
        </button>
      </div>

      {/* Buscador Gigante táctil para celular */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="🔍 Buscar cliente, localidad, calle..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-2xl font-bold text-sm text-slate-900 placeholder-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-3 bg-slate-100 text-slate-600 p-1 rounded-full text-xs font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* Listado de Clientes con Formato de Tarjeta Súper Limpia */}
      <div className="space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-500 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-slate-800">No hay clientes para esta vista</h3>
            <p className="text-xs text-slate-500">Probá cambiando de pestaña o borrando el término de búsqueda.</p>
          </div>
        ) : (
          filteredCustomers.map((c) => {
            const hasDebt = c.saldoActual > 0;

            return (
              <div
                key={c.id}
                className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs hover:border-blue-300 transition space-y-3"
              >
                {/* Requisito explícito: Nombre, Saldo, Estado */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 cursor-pointer" onClick={() => onSelectCustomer(c.id)}>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-black text-base text-slate-900 leading-tight hover:text-blue-600 transition">
                        {c.alias || c.nombre}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{c.direccion}, {c.localidad}</span>
                    </div>

                    {c.proximaVisita && (
                      <p className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                        🗓️ Volver: {c.proximaVisita.fecha} ({c.proximaVisita.motivo})
                      </p>
                    )}
                  </div>

                  {/* Saldo y Estado Badge */}
                  <div className="text-right shrink-0">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-block mb-1 ${
                        hasDebt ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {hasDebt ? 'Con Deuda' : 'Al Día'}
                    </span>
                    <p
                      className={`text-lg font-black font-mono leading-tight ${
                        hasDebt ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatCurrency(c.saldoActual)}
                    </p>
                  </div>
                </div>

                {/* Botones de acción táctiles para el Repartidor */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 border-t border-slate-100 pt-3">
                  {/* Botón Principal Express: Finalizar Venta */}
                  <button
                    onClick={() => onStartSale && onStartSale(c)}
                    className="col-span-2 sm:col-span-2 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-xs flex items-center justify-center space-x-1.5 transition active:scale-95 border border-emerald-400/40"
                  >
                    <Zap className="w-4 h-4 fill-white text-white" />
                    <span>⚡ FINALIZAR VENTA</span>
                  </button>

                  {/* Botón 1: Informar Saldo WhatsApp */}
                  <button
                    onClick={() => handleWhatsAppClick('SALDO', c)}
                    className="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold rounded-xl border border-emerald-200 flex items-center justify-center space-x-1 transition active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Inf. Saldo</span>
                  </button>

                  {/* Botón 2: Solicitar Pedido WhatsApp */}
                  <button
                    onClick={() => handleWhatsAppClick('PEDIDO', c)}
                    className="py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold rounded-xl border border-blue-200 flex items-center justify-center space-x-1 transition active:scale-95"
                  >
                    <Package className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pedir Pedido</span>
                  </button>

                  {/* Botón 4: Llamar */}
                  <a
                    href={`tel:${c.telefono}`}
                    className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center justify-center space-x-1 transition active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-600" />
                    <span>Llamar</span>
                  </a>

                  {/* Botón 5: Maps */}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.direccion} ${c.localidad}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center justify-center space-x-1 transition active:scale-95"
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Maps</span>
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
