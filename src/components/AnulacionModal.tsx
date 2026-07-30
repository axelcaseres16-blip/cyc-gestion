import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Movement, AppUser } from '../types';
import { anularMovement } from '../utils/storage';
import { formatCurrency, formatDate } from '../utils/formatters';

interface AnulacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement: Movement | null;
  customerName?: string;
  currentUser: AppUser;
  onSuccess: () => void;
}

export const AnulacionModal: React.FC<AnulacionModalProps> = ({
  isOpen,
  onClose,
  movement,
  customerName,
  currentUser,
  onSuccess,
}) => {
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !movement) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setError('Por favor ingrese el motivo detallado de la anulación.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      anularMovement(movement.id, currentUser, motivo.trim());
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al anular el movimiento.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header Modal */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-500/20 text-red-400 rounded-2xl border border-red-500/30">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Anulación de Movimiento</h3>
              <p className="text-xs text-slate-400">Proceso inmutable de seguridad contable</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold flex items-center space-x-2">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Información del Movimiento a Anular */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span className="font-bold">Cliente:</span>
              <span className="font-extrabold text-slate-900">{customerName || 'Cliente'}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="font-bold">Tipo y Boleta:</span>
              <span className="font-extrabold text-slate-900">
                {movement.tipo} {movement.numeroBoleta ? `(N° ${movement.numeroBoleta})` : ''}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="font-bold">Monto:</span>
              <span className="font-black text-red-600">{formatCurrency(movement.monto)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="font-bold">Fecha Original:</span>
              <span>{formatDate(movement.fecha)}</span>
            </div>
          </div>

          <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-amber-900 text-xs space-y-1 font-medium">
            <div className="font-bold flex items-center space-x-1.5 text-amber-950">
              <AlertTriangle size={14} className="text-amber-600" />
              <span>Garantía de Inmutabilidad de Datos:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Los registros históricos nunca se eliminan. Al confirmar, este movimiento se marcará como <strong>ANULADO</strong>, se generará un ajuste inverso compensatorio en la cuenta corriente y se registrará un evento inalterable en el Panel de Auditoría a nombre de <strong>{currentUser.nombre} ({currentUser.role})</strong>.
            </p>
          </div>

          {/* Campo Motivo */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
              Motivo de la Anulación (Obligatorio):
            </label>
            <textarea
              rows={3}
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Error en el importe cargado por el chofer, boleta duplicada..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {/* Botones Acciones */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Anulando...' : 'Confirmar Anulación Contable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
