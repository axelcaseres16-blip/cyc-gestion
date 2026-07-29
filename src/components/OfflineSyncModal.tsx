import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Wifi, WifiOff, CheckCircle2, AlertCircle, MessageSquare, Trash2, Camera } from 'lucide-react';
import {
  getPendingSales,
  syncPendingSales,
  clearSyncedPendingSales,
  isSimulatedOffline,
  setSimulatedOffline,
} from '../utils/storage';
import { PendingSale } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => void;
  onViewImage?: (url: string, title: string) => void;
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  onViewImage,
}) => {
  const [pendingSales, setPendingSalesState] = useState<PendingSale[]>([]);
  const [simulatedOfflineState, setSimulatedOfflineState] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  const reloadData = () => {
    setPendingSalesState(getPendingSales());
    setSimulatedOfflineState(isSimulatedOffline());
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleOffline = () => {
    const nextVal = !simulatedOfflineState;
    setSimulatedOffline(nextVal);
    setSimulatedOfflineState(nextVal);
  };

  const handleSyncAll = () => {
    const count = syncPendingSales();
    setSyncSuccessMsg(`¡Se sincronizaron ${count} ventas e historiales correctamente!`);
    onRefreshData();
    reloadData();
    setTimeout(() => {
      setSyncSuccessMsg(null);
    }, 3000);
  };

  const handleClearSynced = () => {
    clearSyncedPendingSales();
    reloadData();
  };

  const unsyncedCount = pendingSales.filter((p) => !p.sincronizado).length;
  const isActuallyOffline = !navigator.onLine || simulatedOfflineState;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-2xl ${isActuallyOffline ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {isActuallyOffline ? <WifiOff className="w-6 h-6" /> : <Wifi className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Sincronización & Trabajo Sin Conexión (Offline)
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                {isActuallyOffline ? '🔴 Modo Sin Conexión Activo' : '🟢 Conexión a Internet Estable'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Simulated Offline Toggle Control for Testing */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                Simulador para Demostración
              </span>
              <p className="font-extrabold text-sm text-white">Simular Corte de Señal / Internet</p>
              <p className="text-xs text-slate-400">
                Permite probar cómo funciona la app sin señal arriba del camión.
              </p>
            </div>
            <button
              onClick={handleToggleOffline}
              className={`px-4 py-2 rounded-xl text-xs font-black transition border shadow-sm ${
                simulatedOfflineState
                  ? 'bg-red-600 text-white border-red-500 shadow-red-900/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {simulatedOfflineState ? '🔴 CORTE ACTIVADO' : '⚪ ONLINE NORMAL'}
            </button>
          </div>

          {syncSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-extrabold flex items-center space-x-2 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{syncSuccessMsg}</span>
            </div>
          )}

          {/* Sync status summary & action */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-2xl gap-3">
            <div>
              <p className="text-xs font-black uppercase text-blue-900 tracking-wider">
                Estado de la Cola de Ventas
              </p>
              <p className="text-sm font-bold text-blue-950 mt-0.5">
                {unsyncedCount > 0
                  ? `Hay ${unsyncedCount} venta(s) pendiente(s) de sincronizar`
                  : 'Todas las ventas están 100% sincronizadas y respaldadas'}
              </p>
            </div>
            {unsyncedCount > 0 && (
              <button
                onClick={handleSyncAll}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Sincronizar Todo Ahora</span>
              </button>
            )}
          </div>

          {/* List of Pending Sales */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Registro de Operaciones Recientes ({pendingSales.length})
              </h3>
              {pendingSales.some((p) => p.sincronizado) && (
                <button
                  onClick={handleClearSynced}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar ya sincronizados</span>
                </button>
              )}
            </div>

            {pendingSales.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Sin ventas pendientes</p>
                <p className="text-xs text-slate-500">
                  Todas las ventas realizadas fueron respaldadas y sincronizadas correctamente.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {pendingSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      {/* Photo Thumbnail */}
                      {sale.fotoUrl ? (
                        <button
                          onClick={() => onViewImage && onViewImage(sale.fotoUrl, `Boleta: ${sale.customerName}`)}
                          className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-300 overflow-hidden shrink-0 group relative"
                        >
                          <img src={sale.fotoUrl} alt="Boleta" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-slate-900/30 group-hover:bg-slate-900/50 flex items-center justify-center transition">
                            <Camera className="w-4 h-4 text-white" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                          <Camera className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-extrabold text-xs text-slate-900 truncate">
                            {sale.customerName}
                          </p>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-black border ${
                              sale.sincronizado
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {sale.sincronizado ? 'SINCRONIZADO' : 'PENDIENTE'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {formatDate(sale.fechaHora, true)} • Estado: <span className="font-bold text-slate-800">{sale.estadoPago}</span>
                        </p>
                        <p className="text-[11px] font-mono font-black text-slate-900">
                          Total: {formatCurrency(sale.montoTotal)}
                          {sale.montoAbonado > 0 && (
                            <span className="text-emerald-600 ml-1">
                              (Abonó {formatCurrency(sale.montoAbonado)})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `📄 Boleta ${sale.customerName}: Total ${formatCurrency(sale.montoTotal)}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-[10px] font-extrabold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1.5 rounded-xl transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Reenviar WA</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">🛡️ Garantía de Almacenamiento Local:</p>
            <p>
              Aunque la app se cierre, el celular se reinicie o se agote la batería, ninguna venta ni foto de boleta se perderá jamás. Todo queda guardado de manera persistente en la memoria interna.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
