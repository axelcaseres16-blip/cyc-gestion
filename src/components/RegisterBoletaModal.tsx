import React, { useState, useEffect, useRef } from 'react';
import { CustomerWithBalance, Movement } from '../types';
import { X, Camera, Upload, Save, FileText, Check, DollarSign, MessageSquare } from 'lucide-react';
import { formatCurrency, cleanPhoneNumber } from '../utils/formatters';

interface RegisterBoletaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (boletaData: Omit<Movement, 'id' | 'createdAt'>) => void;
  customers: CustomerWithBalance[];
  preselectedCustomerId?: string;
  currentUserRole: string;
}

export const RegisterBoletaModal: React.FC<RegisterBoletaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customers,
  preselectedCustomerId,
  currentUserRole,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [numeroBoleta, setNumeroBoleta] = useState('');
  const [monto, setMonto] = useState<string>('');
  const [descripcion, setDescripcion] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string>('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 16));
  const [registradoPor, setRegistradoPor] = useState(currentUserRole || 'Repartidor');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (preselectedCustomerId) {
      setSelectedCustomerId(preselectedCustomerId);
    } else if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }

    // Auto-generar número de boleta sugerido
    const randomBoletaNum = 'B-' + String(Math.floor(10000 + Math.random() * 90000));
    setNumeroBoleta(randomBoletaNum);
    setMonto('');
    setDescripcion('');
    setFotoUrl('');
    setFecha(new Date().toISOString().slice(0, 16));
    setRegistradoPor(currentUserRole || 'Repartidor');
  }, [preselectedCustomerId, isOpen, currentUserRole]);

  if (!isOpen) return null;

  const currentCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMonto = parseFloat(monto);
    if (!selectedCustomerId || isNaN(parsedMonto) || parsedMonto <= 0) return;

    onSave({
      customerId: selectedCustomerId,
      tipo: 'BOLETA',
      fecha: new Date(fecha).toISOString(),
      numeroBoleta: numeroBoleta.trim(),
      monto: parsedMonto,
      esDebito: true,
      fotoUrl,
      descripcion: descripcion.trim() || 'Boleta de entrega en ruta',
      registradoPor,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-[95vw] sm:w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92dvh] flex flex-col">
        {/* Encabezado */}
        <div className="bg-[#0F172A] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-base sm:text-lg">Registrar Nueva Boleta</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Cliente */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cliente Receptor*</label>
            <select
              required
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.alias || c.nombre} ({c.zonaRuta}) - Saldo: {formatCurrency(c.saldoActual)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Número de Boleta */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">N° de Boleta*</label>
              <input
                type="text"
                required
                value={numeroBoleta}
                onChange={(e) => setNumeroBoleta(e.target.value)}
                placeholder="B-00123"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900"
              />
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha y Hora</label>
              <input
                type="datetime-local"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>
          </div>

          {/* Monto Total ($) */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200">
            <label className="block text-xs font-extrabold text-blue-900 uppercase mb-1">Monto Total de Boleta ($ ARS)*</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-lg font-bold text-slate-400">$</span>
              <input
                type="number"
                step="any"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 bg-white border border-blue-300 rounded-xl text-xl font-mono font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Carga o Captura de Foto de la Boleta */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Foto de la Boleta Manuscrita (Resguardo)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {fotoUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-100 max-h-48 flex items-center justify-center">
                <img src={fotoUrl} alt="Foto Boleta" className="object-contain max-h-48 w-full" />
                <button
                  type="button"
                  onClick={() => setFotoUrl('')}
                  className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg text-xs font-bold shadow-md"
                >
                  Cambiar Foto
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 p-6 rounded-xl text-center bg-slate-50 hover:bg-blue-50/30 cursor-pointer transition space-y-2"
              >
                <Camera className="w-8 h-8 text-blue-600 mx-auto" />
                <p className="text-xs font-bold text-slate-800">Sacar Foto o Seleccionar de Galería</p>
                <p className="text-[10px] text-slate-500">Se adjuntará al historial del cliente y estará disponible en la galería</p>
              </div>
            )}
          </div>

          {/* Detalle o notas de la boleta */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Detalle de Mercadería (Opcional)</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: 3 cajones chinchulín, 2 bolsas hígado, 10kg mollejas"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
            />
          </div>

          {/* Registrado por */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Registrado por</label>
            <input
              type="text"
              value={registradoPor}
              onChange={(e) => setRegistradoPor(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
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
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Boleta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
