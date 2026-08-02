import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, AlertCircle, Database } from 'lucide-react';
import { subscribeToSyncEngine, SyncEngineStatusSummary } from '../utils/syncEngine';

interface ConnectionStatusBadgeProps {
  onOpenSyncModal: () => void;
}

export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({
  onOpenSyncModal,
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatusSummary>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    syncedCount: 0,
    errorCount: 0,
    conflictCount: 0,
    pendingImagesCount: 0,
    lastSyncTime: null,
    lastSyncError: null,
  });

  useEffect(() => {
    const unsubscribe = subscribeToSyncEngine((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, []);

  const totalPending = syncStatus.pendingCount + syncStatus.pendingImagesCount;

  return (
    <div className="flex items-center space-x-2">
      {/* Botón Indicador Principal en Header */}
      <button
        onClick={onOpenSyncModal}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-black transition border shadow-2xs cursor-pointer ${
          !syncStatus.isOnline
            ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
            : syncStatus.errorCount > 0
            ? 'bg-red-500/20 text-red-300 border-red-500/40'
            : syncStatus.conflictCount > 0
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            : syncStatus.isSyncing
            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
            : totalPending > 0
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        }`}
        title="Centro de Sincronización e Idempotencia Offline"
      >
        {!syncStatus.isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>🔴 Sin conexión</span>
          </>
        ) : syncStatus.isSyncing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-spin" />
            <span>🔄 Sincronizando ({totalPending})</span>
          </>
        ) : syncStatus.errorCount > 0 ? (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>⚠️ Error ({syncStatus.errorCount})</span>
          </>
        ) : syncStatus.conflictCount > 0 ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>⚡ Conflictos ({syncStatus.conflictCount})</span>
          </>
        ) : totalPending > 0 ? (
          <>
            <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>⚡ {totalPending} en dispositivo</span>
          </>
        ) : (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>🟢 Guardado en Dispositivo</span>
          </>
        )}
      </button>

      {/* Badge adicional si hay operaciones guardadas localmente */}
      {totalPending > 0 && (
        <button
          onClick={onOpenSyncModal}
          className="hidden md:flex items-center space-x-1 bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 py-1 rounded-full text-[11px] font-black shadow-xs transition cursor-pointer"
        >
          <Database className="w-3.5 h-3.5" />
          <span>{totalPending} guardadas localmente</span>
        </button>
      )}
    </div>
  );
};
