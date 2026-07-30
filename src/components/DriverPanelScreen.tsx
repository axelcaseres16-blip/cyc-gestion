import React from 'react';
import {
  Truck,
  Zap,
  DollarSign,
  Users,
  MessageCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Camera,
} from 'lucide-react';
import { CustomerWithBalance, Movement, AppUser } from '../types';
import { calculateShiftStats } from '../utils/shiftManager';
import { formatCurrency } from '../utils/formatters';

interface DriverPanelScreenProps {
  currentUser: AppUser;
  customers: CustomerWithBalance[];
  movements: Movement[];
  onNavigateTo: (view: string) => void;
  onStartSale: (customer?: CustomerWithBalance) => void;
  onOpenNewPago: () => void;
}

export const DriverPanelScreen: React.FC<DriverPanelScreenProps> = ({
  currentUser,
  customers,
  movements,
  onNavigateTo,
  onStartSale,
  onOpenNewPago,
}) => {
  const stats = calculateShiftStats(customers, movements);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Banner Superior de Repartidor */}
      <div className="bg-gradient-to-r from-emerald-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-emerald-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Truck size={32} />
            </div>
            <div>
              <span className="text-xs font-black uppercase text-emerald-300 tracking-wider">
                Panel Chofer
              </span>
              <h1 className="text-2xl font-black text-white leading-tight">
                Hola, {currentUser.nombre}
              </h1>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-extrabold uppercase text-slate-300 block">
              Tiempo Reparto
            </span>
            <span className="text-lg font-black text-emerald-400 font-mono">
              {stats.elapsedFormatted}
            </span>
          </div>
        </div>

        {/* Resumen de Trabajo en Camión */}
        <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-emerald-700/50 text-center">
          <div className="bg-black/30 p-2.5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-300 block">Visitados</span>
            <span className="text-xl font-black text-white">
              {stats.clientesVisitados}/{stats.totalClientesRuta}
            </span>
          </div>
          <div className="bg-black/30 p-2.5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-300 block">Cobrado Hoy</span>
            <span className="text-base font-black text-emerald-400 truncate block">
              {formatCurrency(stats.totalCobradoMonto)}
            </span>
          </div>
          <div className="bg-black/30 p-2.5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-300 block">Fotos Pend.</span>
            <span
              className={`text-xl font-black ${
                stats.fotosPendientesCount > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {stats.fotosPendientesCount}
            </span>
          </div>
        </div>
      </div>

      {/* Título de Botones Gigantes */}
      <div className="text-center">
        <h2 className="text-sm font-extrabold uppercase text-slate-500 tracking-wider">
          Acciones Rápidas de Reparto
        </h2>
      </div>

      {/* Grid de 6 Botones Gigantes Táctiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 1. Finalizar Venta Express */}
        <button
          onClick={() => onStartSale()}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-6 rounded-3xl shadow-lg border-2 border-emerald-400 flex items-center space-x-4 transition-transform active:scale-98 cursor-pointer text-left"
        >
          <div className="p-4 bg-white/20 rounded-2xl">
            <Zap size={36} />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-200 block">
              Paso Único
            </span>
            <span className="text-2xl font-black block leading-tight">⚡ Finalizar Venta</span>
            <span className="text-xs text-emerald-100 font-medium block mt-1">
              Boleta + Foto + Cobro Express
            </span>
          </div>
        </button>

        {/* 2. Ruta Hoy */}
        <button
          onClick={() => onNavigateTo('hoy')}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white p-6 rounded-3xl shadow-lg border-2 border-blue-400 flex items-center space-x-4 transition-transform active:scale-98 cursor-pointer text-left"
        >
          <div className="p-4 bg-white/20 rounded-2xl">
            <Truck size={36} />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-blue-200 block">
              Plan del Día
            </span>
            <span className="text-2xl font-black block leading-tight">🚛 Ruta HOY</span>
            <span className="text-xs text-blue-100 font-medium block mt-1">
              {stats.clientesPendientes} clientes pendientes
            </span>
          </div>
        </button>

        {/* 3. Registrar Pago */}
        <button
          onClick={onOpenNewPago}
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 p-6 rounded-3xl shadow-lg border-2 border-amber-300 flex items-center space-x-4 transition-transform active:scale-98 cursor-pointer text-left"
        >
          <div className="p-4 bg-black/10 rounded-2xl">
            <DollarSign size={36} />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-900 block">
              Cobro en Mano
            </span>
            <span className="text-2xl font-black block leading-tight">💵 Registrar Pago</span>
            <span className="text-xs text-amber-900 font-medium block mt-1">
              Efectivo o Transferencia
            </span>
          </div>
        </button>

        {/* 4. Lista de Clientes */}
        <button
          onClick={() => onNavigateTo('clientes')}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white p-6 rounded-3xl shadow-lg border-2 border-slate-600 flex items-center space-x-4 transition-transform active:scale-98 cursor-pointer text-left"
        >
          <div className="p-4 bg-white/10 rounded-2xl">
            <Users size={36} />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 block">
              Directorio
            </span>
            <span className="text-2xl font-black block leading-tight">👥 Clientes</span>
            <span className="text-xs text-slate-300 font-medium block mt-1">
              Consultar saldos y direcciones
            </span>
          </div>
        </button>

        {/* 5. Estado del Reparto */}
        <button
          onClick={() => onNavigateTo('estadoreparto')}
          className="w-full bg-purple-700 hover:bg-purple-600 text-white p-6 rounded-3xl shadow-lg border-2 border-purple-400 flex items-center space-x-4 transition-transform active:scale-98 cursor-pointer text-left"
        >
          <div className="p-4 bg-white/20 rounded-2xl">
            <BarChart3 size={36} />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-purple-200 block">
              Rendición
            </span>
            <span className="text-2xl font-black block leading-tight">📊 Estado del Día</span>
            <span className="text-xs text-purple-100 font-medium block mt-1">
              Total cobrado y fiado
            </span>
          </div>
        </button>

        {/* 6. Fotos de Boletas */}
        <button
          onClick={() => onNavigateTo('boletas')}
          className="w-full bg-teal-600 hover:bg-teal-500 text-white p-6 rounded-3xl shadow-lg border-2 border-teal-400 flex items-center space-x-4 transition-transform active:scale-98 cursor-pointer text-left"
        >
          <div className="p-4 bg-white/20 rounded-2xl">
            <Camera size={36} />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-teal-200 block">
              Respaldos
            </span>
            <span className="text-2xl font-black block leading-tight">📷 Fotos Boletas</span>
            <span className="text-xs text-teal-100 font-medium block mt-1">
              Galeria de remitos cargados
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
