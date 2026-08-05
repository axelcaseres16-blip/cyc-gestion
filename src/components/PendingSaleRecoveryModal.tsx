import React, { useState } from 'react';
import { PendingCompletedSale, clearPendingCompletedSale, updatePendingSaleEnvioEstado } from '../utils/completedSaleStorage';
import { formatCurrency } from '../utils/formatters';
import {
  FileText,
  User,
  CheckCircle2,
  MessageSquare,
  Eye,
  X,
  ArrowRight,
} from 'lucide-react';

interface PendingSaleRecoveryModalProps {
  pendingSale: PendingCompletedSale;
  onContinue: () => void;
  onCloseOperation: () => void;
  onViewImage?: (url: string, title: string) => void;
}

export const PendingSaleRecoveryModal: React.FC<PendingSaleRecoveryModalProps> = ({
  pendingSale,
  onContinue,
  onCloseOperation,
  onViewImage,
}) => {
  const [sale, setSale] = useState<PendingCompletedSale>(pendingSale);
  const [statusMsg, setStatusMsg] = useState('');

  const handleSaveImage = () => {
    if (!sale.comprobanteImagenUrl) return;
    const download = document.createElement('a');
    download.href = sale.comprobanteImagenUrl;
    download.download = `Boleta-CYC-${sale.boleta?.numeroBoleta || sale.id}.png`;
    document.body.appendChild(download);
    download.click();
    download.remove();
  };

  const handleMarkAsSent = () => {
    updatePendingSaleEnvioEstado('ENVIADO_CONFIRMADO');
    setSale((prev) => ({ ...prev, envioEstado: 'ENVIADO_CONFIRMADO' }));
    setStatusMsg('✓ Marcado como enviado correctamente.');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleDismiss = () => {
    clearPendingCompletedSale();
    onCloseOperation();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-fadeIn">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white px-5 py-4 flex items-center justify-between border-b border-emerald-950">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-white">Comprobante Pendiente</h3>
                <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Guardada en memoria
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 font-medium">
                Venta N° {sale.boleta?.numeroBoleta || sale.id} recien registrada
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-emerald-300 hover:text-white p-2 rounded-lg transition cursor-pointer"
            title="Cerrar operación"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-800">
          
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-bold flex items-center gap-1 uppercase">
                <User className="w-3.5 h-3.5 text-emerald-700" /> Cliente
              </span>
              <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[10px]">
                Estado: Guardada correctamente
              </span>
            </div>
            
            <p className="font-black text-slate-900 text-base">{sale.customerName}</p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 font-semibold text-slate-700">
              <div>
                <span className="block text-slate-500 text-[10px] uppercase font-bold">Total Venta:</span>
                <span className="font-black text-slate-900 text-sm">{formatCurrency(sale.total)}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[10px] uppercase font-bold">Cobrado Hoy:</span>
                <span className="font-black text-emerald-700 text-sm">{formatCurrency(sale.totalPagado)}</span>
              </div>
            </div>
          </div>

          {statusMsg && (
            <div className="bg-emerald-100 text-emerald-800 p-2.5 rounded-xl border border-emerald-300 font-bold text-center">
              {statusMsg}
            </div>
          )}

          {/* Action Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-black pt-1">
            
            <button
              onClick={onContinue}
              className="col-span-1 sm:col-span-2 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl shadow-sm transition cursor-pointer text-sm"
            >
              <Eye className="w-4 h-4" />
              <span>Continuar donde estaba / Ver comprobante</span>
            </button>

            <button
              onClick={onContinue}
              className="flex items-center justify-center space-x-2 bg-slate-900 hover:bg-black text-white py-2.5 rounded-xl transition cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Reabrir para compartir imagen</span>
            </button>

            <button
              onClick={handleMarkAsSent}
              className="flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl border border-slate-300 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Marcar como enviado</span>
            </button>

            {sale.comprobanteImagenUrl && onViewImage && (
              <button
                onClick={() => onViewImage(sale.comprobanteImagenUrl!, `Comprobante #${sale.boleta?.numeroBoleta || sale.id}`)}
                className="col-span-1 sm:col-span-2 flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl border border-slate-300 transition cursor-pointer"
              >
                <Eye className="w-4 h-4 text-blue-600" />
                <span>Ver imagen 1080px</span>
              </button>
            )}

            {sale.comprobanteImagenUrl && (
              <button
                onClick={handleSaveImage}
                className="col-span-1 sm:col-span-2 flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl border border-slate-300 transition cursor-pointer"
              >
                <FileText className="w-4 h-4 text-slate-600" />
                <span>Guardar imagen</span>
              </button>
            )}

            <button
              onClick={handleDismiss}
              className="col-span-1 sm:col-span-2 flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 py-2.5 rounded-xl transition cursor-pointer border border-slate-200 text-xs mt-1"
            >
              <span>Ir al siguiente cliente / Cerrar operación</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </div>

        </div>

      </div>
    </div>
  );
};
