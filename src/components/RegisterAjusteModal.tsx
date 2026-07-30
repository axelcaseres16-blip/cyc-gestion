import React, { useState, useEffect } from 'react';
import { CustomerWithBalance, Movement } from '../types';
import { X, SlidersHorizontal, Save, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface RegisterAjusteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ajusteData: Omit<Movement, 'id' | 'createdAt'>) => void;
  customers: CustomerWithBalance[];
  preselectedCustomerId?: string;
  currentUserRole: string;
}

export const RegisterAjusteModal: React.FC<RegisterAjusteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customers,
  preselectedCustomerId,
  currentUserRole,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [tipoAjuste, setTipoAjuste] = useState<'AUMENTA_DEUDA' | 'DISMINUYE_DEUDA'>('DISMINUYE_DEUDA');
  const [monto, setMonto] = useState<string>('');
  const [motivo, setMotivo] = useState('');
  const [registradoPor, setRegistradoPor] = useState(currentUserRole || 'Administración');

  useEffect(() => {
    if (preselectedCustomerId) {
      setSelectedCustomerId(preselectedCustomerId);
    } else if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }
    setMonto('');
    setMotivo('');
  }, [preselectedCustomerId, isOpen]);

  if (!isOpen) return null;

  const currentCustomer = customers.find((c) => c.id === selectedCustomerId);
  const numericMonto = parseFloat(monto) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || numericMonto <= 0 || !motivo.trim()) return;

    const esDebito = tipoAjuste === 'AUMENTA_DEUDA';

    onSave({
      customerId: selectedCustomerId,
      tipo: 'AJUSTE',
      fecha: new Date().toISOString(),
      monto: numericMonto,
      esDebito,
      descripcion: `Ajuste de Saldo Auditable (${esDebito ? 'Incremento Deuda' : 'Descuento/Bonificación'}): ${motivo.trim()}`,
      registradoPor,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-[95vw] sm:w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92dvh] flex flex-col">
        <div className="bg-[#0F172A] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-base sm:text-lg">Ajuste Auditable de Saldo</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-start space-x-2 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Regla fundamental:</strong> El saldo no se edita directamente. Este ajuste creará un movimiento auditable registrado a tu nombre.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cliente*</label>
            <select
              required
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.alias || c.nombre} - Saldo Actual: {formatCurrency(c.saldoActual)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Efecto en el Saldo*</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoAjuste('DISMINUYE_DEUDA')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition ${
                  tipoAjuste === 'DISMINUYE_DEUDA'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-300'
                }`}
              >
                🟢 Restar Deuda (Bonificación / Descuento)
              </button>

              <button
                type="button"
                onClick={() => setTipoAjuste('AUMENTA_DEUDA')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition ${
                  tipoAjuste === 'AUMENTA_DEUDA'
                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-300'
                }`}
              >
                🔴 Sumar Deuda (Recargo / Corrección)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Monto del Ajuste ($ ARS)*</label>
            <input
              type="number"
              required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-lg font-mono font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Motivo del Ajuste (Obligatorio para Auditoría)*
            </label>
            <textarea
              required
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Bonificación por kilos defectuosos / Corrección por error de tipeo en boleta anterior..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Registrar Ajuste</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
