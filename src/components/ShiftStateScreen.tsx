import React, { useState } from 'react';
import {
  Truck,
  Printer,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Camera,
  RefreshCw,
  FileText,
  Send,
  Users,
} from 'lucide-react';
import { CustomerWithBalance, Movement, CustomerVisit, AppUser } from '../types';
import { calculateShiftStats, resetShiftStartTime } from '../utils/shiftManager';
import { openPrintableDailySummary } from '../utils/pdfGenerator';
import { formatCurrency } from '../utils/formatters';

interface ShiftStateScreenProps {
  currentUser: AppUser;
  customers: CustomerWithBalance[];
  movements: Movement[];
  visits: CustomerVisit[];
  onRefreshData: () => void;
}

export const ShiftStateScreen: React.FC<ShiftStateScreenProps> = ({
  currentUser,
  customers,
  movements,
  visits,
  onRefreshData,
}) => {
  const [observaciones, setObservaciones] = useState('');

  const stats = calculateShiftStats(customers, movements, visits);

  const handlePrintPDF = () => {
    openPrintableDailySummary(currentUser, customers, movements, visits, observaciones);
  };

  const handleRestartShift = () => {
    if (confirm('¿Desea reiniciar el contador de tiempo de reparto para la jornada actual?')) {
      resetShiftStartTime();
      onRefreshData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Estado del Reparto */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30 mb-2">
              <Truck size={14} />
              <span>Control Operativo de Reparto</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Estado del Día</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Rendición en tiempo real de la ruta, cobranza en efectivo/transferencia, fiado generado y respaldo de boletas.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRestartShift}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl border border-slate-700 transition-all cursor-pointer"
              title="Reiniciar timer de reparto"
            >
              <RefreshCw size={18} />
            </button>

            <button
              onClick={handlePrintPDF}
              className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-black px-5 py-3 rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <Printer size={18} />
              <span>Generar Resumen PDF / Imprimir</span>
            </button>
          </div>
        </div>

        {/* Timer de Jornada de Trabajo */}
        <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl">
              <Clock size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                Tiempo de Reparto Transcurrido
              </span>
              <span className="text-lg font-black text-white font-mono">
                {stats.elapsedFormatted}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              Chofer / Responsable
            </span>
            <span className="text-sm font-extrabold text-slate-200">
              {currentUser.nombre} ({currentUser.role})
            </span>
          </div>
        </div>
      </div>

      {/* Grid de Tarjetas del Estado del Día */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Clientes Visitados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Clientes Visitados</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {stats.clientesVisitados} <span className="text-xs text-slate-400 font-normal">de {stats.totalClientesRuta}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {stats.clientesPendientes} clientes restantes en ruta hoy
          </div>
        </div>

        {/* Ventas Realizadas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Ventas de Hoy</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <FileText size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(stats.totalVentasMonto)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {stats.ventasRealizadasCount} boletas de venta emitidas
          </div>
        </div>

        {/* Total Cobrado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Cobrado en Ruta</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {formatCurrency(stats.totalCobradoMonto)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Efectivo: {formatCurrency(stats.cobradoEfectivo)} | Transf: {formatCurrency(stats.cobradoTransferencia)}
          </div>
        </div>

        {/* Fiado Generado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Fiado Generado</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600 mt-2">
            {formatCurrency(stats.fiadoGeneradoMonto)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Saldo acumulado por cobrar
          </div>
        </div>
      </div>

      {/* Tarjetas Secundarias: Fotos y Sincronización */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Estado de Fotos de Boletas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2 font-bold text-slate-800 text-sm">
              <Camera size={18} className="text-teal-600" />
              <span>Fotos de Boletas de Hoy</span>
            </div>
            <span className="text-xs font-extrabold text-slate-500">
              {stats.fotosTomadasCount}/{stats.ventasRealizadasCount} completadas
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold py-1">
            <span className="text-slate-600">Fotografías adjuntas:</span>
            <span className="font-bold text-emerald-600">✓ {stats.fotosTomadasCount} fotos</span>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold py-1">
            <span className="text-slate-600">Fotos pendientes:</span>
            <span className={stats.fotosPendientesCount > 0 ? 'font-bold text-amber-600' : 'text-slate-400'}>
              {stats.fotosPendientesCount > 0 ? `⚠️ ${stats.fotosPendientesCount} pendientes` : '0 pendientes'}
            </span>
          </div>
        </div>

        {/* Estado de Sincronización */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2 font-bold text-slate-800 text-sm">
              <Send size={18} className="text-blue-600" />
              <span>Sincronización y Servidor</span>
            </div>
            <span className="text-xs font-extrabold text-slate-500">
              {stats.sincronizacionesPendientesCount === 0 ? '100% Sincronizado' : 'Pendientes'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold py-1">
            <span className="text-slate-600">Ventas en cola offline:</span>
            <span className={stats.sincronizacionesPendientesCount > 0 ? 'font-bold text-amber-600' : 'font-bold text-emerald-600'}>
              {stats.sincronizacionesPendientesCount > 0 ? `⚠️ ${stats.sincronizacionesPendientesCount} por subir` : '✓ Todas sincronizadas'}
            </span>
          </div>
        </div>
      </div>

      {/* Campo de Observaciones para el Reporte PDF */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <label className="block text-xs font-extrabold uppercase text-slate-700">
          Observaciones de Cierre de Jornada (Se incluirá en el PDF):
        </label>
        <textarea
          rows={3}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Escriba novedades del reparto, entregas reprogramadas o inconvenientes con clientes..."
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />

        <div className="flex justify-end">
          <button
            onClick={handlePrintPDF}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <Printer size={16} />
            <span>Generar y Descargar Cierre PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
