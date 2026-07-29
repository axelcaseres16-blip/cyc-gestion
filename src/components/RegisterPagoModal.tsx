import React, { useState, useEffect } from 'react';
import { CustomerWithBalance, Movement, PaymentMethod } from '../types';
import { X, DollarSign, Save, CheckCircle2, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface RegisterPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pagoData: Omit<Movement, 'id' | 'createdAt'>) => void;
  customers: CustomerWithBalance[];
  preselectedCustomerId?: string;
  currentUserRole: string;
}

export const RegisterPagoModal: React.FC<RegisterPagoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customers,
  preselectedCustomerId,
  currentUserRole,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [monto, setMonto] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>('EFECTIVO');
  const [comprobantePago, setComprobantePago] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 16));
  const [registradoPor, setRegistradoPor] = useState(currentUserRole || 'Repartidor');

  useEffect(() => {
    if (preselectedCustomerId) {
      setSelectedCustomerId(preselectedCustomerId);
    } else if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }

    setMonto('');
    setMetodoPago('EFECTIVO');
    setComprobantePago('');
    setDescripcion('');
    setFecha(new Date().toISOString().slice(0, 16));
    setRegistradoPor(currentUserRole || 'Repartidor');
  }, [preselectedCustomerId, isOpen, currentUserRole]);

  if (!isOpen) return null;

  const currentCustomer = customers.find((c) => c.id === selectedCustomerId);
  const currentSaldo = currentCustomer ? currentCustomer.saldoActual : 0;
  const numericMonto = parseFloat(monto) || 0;
  const nuevoSaldoEsperado = currentSaldo - numericMonto;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || numericMonto <= 0) return;

    onSave({
      customerId: selectedCustomerId,
      tipo: 'PAGO',
      fecha: new Date(fecha).toISOString(),
      monto: numericMonto,
      esDebito: false, // Disminuye deuda
      metodoPago,
      comprobantePago: comprobantePago.trim(),
      descripcion: descripcion.trim() || `Cobro en ${metodoPago.toLowerCase()}`,
      registradoPor,
    });

    onClose();
  };

  const setPresetAmount = (value: number) => {
    setMonto(String(value));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Encabezado */}
        <div className="bg-[#16A34A] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-6 h-6" />
            <h2 className="font-bold text-lg">Registrar Cobro / Pago de Cliente</h2>
          </div>
          <button onClick={onClose} className="text-emerald-100 hover:text-white p-1 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Cliente */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cliente*</label>
            <select
              required
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.alias || c.nombre} ({c.zonaRuta}) - Deuda: {formatCurrency(c.saldoActual)}
                </option>
              ))}
            </select>
          </div>

          {/* Saldo Actual Card */}
          {currentCustomer && (
            <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Deuda Actual</p>
                <p className="text-lg font-black font-mono text-red-400">
                  {formatCurrency(currentSaldo)}
                </p>
              </div>

              {numericMonto > 0 && (
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Saldo tras cobro</p>
                  <p className="text-lg font-black font-mono text-emerald-400">
                    {formatCurrency(nuevoSaldoEsperado)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Monto del Pago */}
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-2">
            <label className="block text-xs font-extrabold text-emerald-900 uppercase">
              Monto Ingresado ($ ARS)*
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-lg font-bold text-slate-400">$</span>
              <input
                type="number"
                step="any"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 bg-white border border-emerald-300 rounded-xl text-xl font-mono font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Presets Rápidos de Monto */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[50000, 100000, 200000, 500000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPresetAmount(val)}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 transition"
                >
                  +{formatCurrency(val)}
                </button>
              ))}

              {currentSaldo > 0 && (
                <button
                  type="button"
                  onClick={() => setPresetAmount(currentSaldo)}
                  className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg transition"
                >
                  Cobrar Deuda Total ({formatCurrency(currentSaldo)})
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Método de Pago */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Medio de Pago</label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value="EFECTIVO">💵 Efectivo</option>
                <option value="TRANSFERENCIA">🏦 Transferencia Bancaria</option>
                <option value="CHEQUE">📜 Cheque</option>
                <option value="OTRO">Otro Medio</option>
              </select>
            </div>

            {/* N° Comprobante / Ref */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">N° Comprobante / Ref</label>
              <input
                type="text"
                value={comprobantePago}
                onChange={(e) => setComprobantePago(e.target.value)}
                placeholder="Ej: TRF-98231 / Cheque #1029"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900"
              />
            </div>
          </div>

          {/* Fecha y Hora */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha y Hora de Cobro</label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
            />
          </div>

          {/* Observación / Detalle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Cobro en mano entregado al chofer"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
            />
          </div>

          {/* Botones */}
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
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Confirmar Registro de Pago</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
