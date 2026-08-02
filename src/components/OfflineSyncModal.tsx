import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Database,
  Camera,
  AlertTriangle,
  RotateCcw,
  Check,
  Server,
  Smartphone,
  Eye,
  Trash2,
} from 'lucide-react';
import {
  idbGetAllQueueItems,
  idbGetAllImages,
  idbGetPendingConflicts,
  SyncQueueItem,
  ImageBlobEntry,
  SyncConflictItem,
  getDeviceId,
  idbRemoveQueueItem,
} from '../utils/indexedDBEngine';
import {
  runFullSyncProcess,
  getSyncEngineStatus,
  SyncEngineStatusSummary,
  subscribeToSyncEngine,
} from '../utils/syncEngine';
import { isSimulatedOffline, setSimulatedOffline } from '../utils/storage';
import { formatDate } from '../utils/formatters';

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
  const [activeTab, setActiveTab] = useState<'queue' | 'images' | 'conflicts' | 'device'>('queue');
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [imagesQueue, setImagesQueue] = useState<ImageBlobEntry[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflictItem[]>([]);
  const [simulatedOfflineState, setSimulatedOfflineState] = useState<boolean>(isSimulatedOffline());
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatusSummary | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState<SyncQueueItem | null>(null);

  const deviceId = getDeviceId();

  const reloadAllData = async () => {
    try {
      const q = await idbGetAllQueueItems();
      const img = await idbGetAllImages();
      const conf = await idbGetPendingConflicts();
      const st = await getSyncEngineStatus();

      setQueueItems(q.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setImagesQueue(img.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setConflicts(conf);
      setSyncStatus(st);
      setSimulatedOfflineState(isSimulatedOffline());
    } catch (err) {
      console.error('Error cargando Centro de Sincronización:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      reloadAllData();
      const unsubscribe = subscribeToSyncEngine(() => {
        reloadAllData();
      });
      return () => unsubscribe();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleOffline = () => {
    const nextVal = !simulatedOfflineState;
    setSimulatedOffline(nextVal);
    setSimulatedOfflineState(nextVal);
    reloadAllData();
  };

  const handleForceSync = async () => {
    setSyncFeedback('Iniciando sincronización...');
    const result = await runFullSyncProcess();
    onRefreshData();
    await reloadAllData();

    if (result.success) {
      setSyncFeedback(`¡Sincronización completada! ${result.processedCount} operaciones procesadas.`);
    } else {
      setSyncFeedback(`Sincronización finalizada con ${result.errorCount} errores.`);
    }

    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const handleClearSynced = async () => {
    const synced = queueItems.filter((i) => i.status === 'SYNCED');
    for (const item of synced) {
      await idbRemoveQueueItem(item.operationId);
    }
    reloadAllData();
  };

  const isActuallyOffline = !navigator.onLine || simulatedOfflineState;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-[96vw] sm:w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92dvh] flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl ${isActuallyOffline ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
              {isActuallyOffline ? <WifiOff className="w-6 h-6" /> : <Wifi className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Centro de Sincronización & Idempotencia Offline
                </h2>
                <span className="bg-slate-800 text-slate-300 font-mono text-[10px] px-2 py-0.5 rounded-md border border-slate-700">
                  ID Dispositivo: {deviceId.substring(0, 15)}...
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                {isActuallyOffline
                  ? '🔴 Modo Sin Conexión Activo (Guardando todo en IndexedDB)'
                  : '🟢 Conexión a Servidor Estable (Conexión activa)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Message Banner */}
        {syncFeedback && (
          <div className="bg-blue-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 shadow-inner">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{syncFeedback}</span>
            </div>
            <button onClick={() => setSyncFeedback(null)} className="text-blue-200 hover:text-white font-black">✕</button>
          </div>
        )}

        {/* Top Control Bar & Simulator */}
        <div className="bg-slate-100 p-3 sm:p-4 border-b border-slate-200 shrink-0 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleForceSync}
              disabled={isActuallyOffline || syncStatus?.isSyncing}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-black text-xs transition shadow-xs cursor-pointer ${
                isActuallyOffline || syncStatus?.isSyncing
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus?.isSyncing ? 'animate-spin' : ''}`} />
              <span>{syncStatus?.isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
            </button>

            <button
              onClick={handleClearSynced}
              className="flex items-center space-x-1.5 px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition cursor-pointer"
              title="Limpiar operaciones confirmadas del historial local"
            >
              <Trash2 className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Limpiar Completados</span>
            </button>
          </div>

          {/* Offline Simulator Switch */}
          <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800">
            <span className="text-[11px] font-extrabold uppercase text-amber-700">Simular Sin Conexión:</span>
            <button
              onClick={handleToggleOffline}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                simulatedOfflineState ? 'bg-red-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  simulatedOfflineState ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border-b border-slate-200 shrink-0 px-4 flex space-x-2 overflow-x-auto text-xs font-black">
          <button
            onClick={() => setActiveTab('queue')}
            className={`py-3 px-3 border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'queue'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Cola de Ventas & Operaciones ({queueItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('images')}
            className={`py-3 px-3 border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'images'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Imágenes & Archivos ({imagesQueue.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('conflicts')}
            className={`py-3 px-3 border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'conflicts'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Conflictos ({conflicts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('device')}
            className={`py-3 px-3 border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'device'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Info del Dispositivo</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* TAB 1: COLA DE OPERACIONES */}
          {activeTab === 'queue' && (
            <div className="space-y-3">
              {queueItems.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="font-extrabold text-slate-800">¡Cola de sincronización vacía!</p>
                  <p className="text-xs">Todas las operaciones registradas en este dispositivo están al día.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">Estado</th>
                        <th className="p-3">Operación / ID</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3">Usuario</th>
                        <th className="p-3">Fecha</th>
                        <th className="p-3 text-right">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      {queueItems.map((item) => (
                        <tr key={item.operationId} className="hover:bg-slate-50">
                          <td className="p-3">
                            {item.status === 'SYNCED' && (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sincronizado
                              </span>
                            )}
                            {item.status === 'LOCAL_SAVED' && (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                                <Database className="w-3 h-3 text-amber-600" /> Guardado Local
                              </span>
                            )}
                            {item.status === 'SYNCING' && (
                              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                                <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" /> Procesando
                              </span>
                            )}
                            {item.status === 'ERROR' && (
                              <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full text-[10px]" title={item.lastError}>
                                <AlertCircle className="w-3 h-3 text-red-600" /> Error ({item.retryCount || 1})
                              </span>
                            )}
                            {item.status === 'CONFLICT' && (
                              <span className="inline-flex items-center gap-1 bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full text-[10px]">
                                <AlertTriangle className="w-3 h-3 text-amber-700" /> Conflicto
                              </span>
                            )}
                          </td>

                          <td className="p-3 font-mono text-[11px] font-bold text-slate-900">
                            {item.operationId.substring(0, 22)}...
                          </td>

                          <td className="p-3 font-bold text-slate-900">
                            {item.entityType === 'ATOMIC_SALE' ? '🛍️ Venta Completa' : item.entityType}
                          </td>

                          <td className="p-3 text-slate-700 font-semibold">{item.createdBy || 'Sistema'}</td>

                          <td className="p-3 text-slate-500 font-mono text-[10px]">
                            {new Date(item.createdAt).toLocaleString('es-AR')}
                          </td>

                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedItemDetail(item)}
                              className="text-blue-600 hover:text-blue-800 font-bold text-xs underline cursor-pointer"
                            >
                              Ver Payload
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: IMÁGENES Y ARCHIVOS */}
          {activeTab === 'images' && (
            <div className="space-y-3">
              {imagesQueue.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 space-y-2">
                  <Camera className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="font-extrabold text-slate-800">No hay imágenes en cola</p>
                  <p className="text-xs">Los comprobantes y fotos se guardan primero en IndexedDB antes de subir a la nube.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {imagesQueue.map((img) => (
                    <div key={img.imageId} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center space-x-3">
                      <div className="w-16 h-16 bg-slate-900 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-slate-300">
                        {typeof img.blob === 'string' && img.blob.startsWith('data:') ? (
                          <img src={img.blob} alt={img.fileName} className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-bold text-slate-900 truncate">{img.fileName}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">{img.pathName}</p>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            img.status === 'UPLOADED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {img.status}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(img.createdAt).toLocaleTimeString('es-AR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONTROL DE CONFLICTOS */}
          {activeTab === 'conflicts' && (
            <div className="space-y-3">
              {conflicts.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="font-extrabold text-slate-800">Sin conflictos de concurrencia</p>
                  <p className="text-xs">
                    Las ventas, pagos y stock se gestionan mediante registros incrementales e idempotentes.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conflicts.map((conf) => (
                    <div key={conf.conflictId} className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 text-amber-900">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" /> {conf.proposedAction}
                        </span>
                        <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                          {conf.date} - Usuario: {conf.user}
                        </span>
                      </div>
                      <p className="text-xs text-amber-800">
                        Esta modificación ocurrió simultáneamente con otro dispositivo.
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INFO DEL DISPOSITIVO */}
          {activeTab === 'device' && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-bold block">ID del Dispositivo:</span>
                  <span className="font-black text-slate-900 break-all">{deviceId}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-bold block">Navegador & Conexión:</span>
                  <span className="font-black text-slate-900">
                    {navigator.onLine ? '🟢 Online' : '🔴 Offline'} | {navigator.userAgent.substring(0, 30)}...
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-bold block">Motor Local:</span>
                  <span className="font-black text-emerald-700">IndexedDB (cyc_gestion_offline_v2_db) OK</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-bold block">Estrategia de Idempotencia:</span>
                  <span className="font-black text-slate-900">Operaciones únicas + atomic transaction payloads</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-4 py-3 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs font-bold text-slate-600">
          <span>Menudencias C&C - Garantía de Cero Pérdida de Datos</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-black rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>

      {/* Detail Payload Drawer Modal */}
      {selectedItemDetail && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-300 space-y-3 font-sans max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Payload de Operación #{selectedItemDetail.operationId.substring(0, 18)}...
              </h3>
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl border border-slate-800 space-y-2">
              <pre>{JSON.stringify(selectedItemDetail.payload, null, 2)}</pre>
            </div>
            <button
              onClick={() => setSelectedItemDetail(null)}
              className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black rounded-xl cursor-pointer text-xs"
            >
              Cerrar Detalle
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
