import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { getPendingSales, isSimulatedOffline } from '../utils/storage';

interface ConnectionStatusBadgeProps {
  onOpenSyncModal: () => void;
}

export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({
  onOpenSyncModal,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [simulatedOffline, setSimulatedOfflineState] = useState<boolean>(isSimulatedOffline());
  const [pendingCount, setPendingCount] = useState<number>(0);

  const checkStatus = () => {
    setIsOnline(navigator.onLine);
    setSimulatedOfflineState(isSimulatedOffline());
    const pending = getPendingSales();
    const unsynced = pending.filter((p) => !p.sincronizado).length;
    setPendingCount(unsynced);
  };

  useEffect(() => {
    checkStatus();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(checkStatus, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const effectiveOffline = !isOnline || simulatedOffline;

  return (
    <div className="flex items-center space-x-2">
      {/* Botón Indicador en Header */}
      <button
        onClick={onOpenSyncModal}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-black transition border shadow-2xs ${
          effectiveOffline
            ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
            : pendingCount > 0
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        }`}
        title="Estado de conexión y sincronización offline"
      >
        {effectiveOffline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>🔴 Sin conexión</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin" />
            <span>🟡 Sincronizando ({pendingCount})</span>
          </>
        ) : (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>🟢 Conectado</span>
          </>
        )}
      </button>

      {/* Aviso flotante si hay ventas pendientes */}
      {pendingCount > 0 && (
        <button
          onClick={onOpenSyncModal}
          className="hidden md:flex items-center space-x-1 bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 py-1 rounded-full text-[11px] font-black shadow-xs transition"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{pendingCount} venta(s) pendiente(s)</span>
        </button>
      )}
    </div>
  );
};
