import React, { useState, useRef } from 'react';
import { X, Download, Upload, CheckCircle2, AlertCircle, Database, BarChart3 } from 'lucide-react';
import { exportAllDataJSON, importAllDataJSON } from '../utils/storage';
import { exportTestDayBackup, getTestBackupFileName, getTestDaySummary, TestDaySummary } from '../utils/testDayTools';
import { formatCurrency } from '../utils/formatters';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [daySummary, setDaySummary] = useState<TestDaySummary | null>(null);
  const [isExportingTestBackup, setIsExportingTestBackup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    const jsonStr = exportAllDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Resguardo_CyC_Gestion_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMsg({ text: 'Respaldo exportado correctamente en formato JSON.', type: 'success' });
  };

  const handleDownloadTestBackup = async () => {
    setIsExportingTestBackup(true);
    try {
      const jsonStr = await exportTestDayBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', getTestBackupFileName());
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMsg({ text: 'Respaldo completo de prueba exportado correctamente.', type: 'success' });
    } catch (error) {
      console.error('No se pudo exportar el respaldo completo de prueba:', error);
      setMsg({ text: 'No se pudo exportar el respaldo completo de prueba.', type: 'error' });
    } finally {
      setIsExportingTestBackup(false);
    }
  };

  const handleShowDaySummary = async () => {
    try {
      setDaySummary(await getTestDaySummary());
    } catch (error) {
      console.error('No se pudo calcular el resumen del día:', error);
      setMsg({ text: 'No se pudo calcular el resumen del día.', type: 'error' });
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          const ok = importAllDataJSON(content);
          if (ok) {
            setMsg({ text: 'Base de datos restaurada con éxito desde archivo.', type: 'success' });
            onRefreshData();
          } else {
            setMsg({ text: 'El archivo JSON no tiene el formato válido de C&C Gestión.', type: 'error' });
          }
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-[95vw] sm:w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92dvh] flex flex-col">
        <div className="bg-[#0F172A] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-base sm:text-lg">Respaldo y Gestión de Datos</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {msg && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold flex items-center space-x-2 ${
                msg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{msg.text}</span>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleDownloadTestBackup}
              disabled={isExportingTestBackup}
              className="w-full p-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingTestBackup ? 'Preparando respaldo...' : 'Exportar respaldo completo de prueba'}</span>
            </button>

            <button
              onClick={handleShowDaySummary}
              className="w-full p-3 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2"
            >
              <BarChart3 className="w-4 h-4 text-blue-700" />
              <span>Ver resumen del día</span>
            </button>

            {daySummary && (
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-700">
                <p>Clientes visitados: <strong>{daySummary.clientesVisitados}</strong></p>
                <p>Ventas: <strong>{daySummary.ventas}</strong></p>
                <p>Total vendido: <strong>{formatCurrency(daySummary.totalVendido)}</strong></p>
                <p>Efectivo: <strong>{formatCurrency(daySummary.efectivoCobrado)}</strong></p>
                <p>Transferencias: <strong>{formatCurrency(daySummary.transferenciasCobradas)}</strong></p>
                <p>Pendiente: <strong>{formatCurrency(daySummary.totalPendiente)}</strong></p>
                <p>Boletas generadas: <strong>{daySummary.boletasGeneradas}</strong></p>
                <p>Boletas enviadas: <strong>{daySummary.boletasEnviadas}</strong></p>
                <p>Recuperaciones pendientes: <strong>{daySummary.pendientesRecuperacion}</strong></p>
                <p>Errores pendientes: <strong>{daySummary.erroresPendientes}</strong></p>
              </div>
            )}

            {/* Download Backup */}
            <button
              onClick={handleDownloadBackup}
              className="w-full p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Descargar Copia de Seguridad JSON</span>
            </button>

            {/* Import Backup */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Restaurar Copia desde Archivo JSON</span>
            </button>

          </div>

          <div className="pt-2 border-t border-slate-200 text-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
