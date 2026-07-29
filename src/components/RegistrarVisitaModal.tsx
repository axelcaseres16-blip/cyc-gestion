import React, { useState } from 'react';
import { CustomerWithBalance, CustomerVisit, VisitResult, ProximaVisitaOp } from '../types';
import { X, CheckCircle2, Clock, Calendar, ArrowRight, MessageSquare, AlertCircle } from 'lucide-react';

interface RegistrarVisitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (visitData: Omit<CustomerVisit, 'id' | 'createdAt'>) => void;
  customer?: CustomerWithBalance;
  customers: CustomerWithBalance[];
  currentUserRole: string;
}

const VISIT_OPTIONS: { id: VisitResult; label: string; icon: string; bg: string; border: string }[] = [
  { id: 'COMPRO_MERCADERIA', label: 'Compró mercadería', icon: '🛒', bg: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950', border: 'border-emerald-300' },
  { id: 'NO_QUISO_MERCADERIA', label: 'No quiso (tenía stock)', icon: '📦', bg: 'bg-amber-50 hover:bg-amber-100 text-amber-950', border: 'border-amber-300' },
  { id: 'LOCAL_CERRADO', label: 'Local cerrado', icon: '🔒', bg: 'bg-red-50 hover:bg-red-100 text-red-950', border: 'border-red-300' },
  { id: 'NO_RESPONDIO', label: 'No respondió', icon: '📵', bg: 'bg-slate-50 hover:bg-slate-100 text-slate-900', border: 'border-slate-300' },
  { id: 'DE_VACACIONES', label: 'Estaba de vacaciones', icon: '🏖️', bg: 'bg-purple-50 hover:bg-purple-100 text-purple-950', border: 'border-purple-300' },
  { id: 'PEDIDO_PERSONAL', label: 'Tomó pedido personal', icon: '📝', bg: 'bg-blue-50 hover:bg-blue-100 text-blue-950', border: 'border-blue-300' },
  { id: 'OTRO', label: 'Otro resultado', icon: '💬', bg: 'bg-gray-50 hover:bg-gray-100 text-gray-950', border: 'border-gray-300' },
];

const PROXIMA_OPTIONS: { id: ProximaVisitaOp; label: string; sub: string; icon: string }[] = [
  { id: 'PROXIMO_REPARTO', label: 'Próximo reparto', sub: 'Volver mañana / siguiente vuelta', icon: '🚚' },
  { id: 'ESTA_SEMANA', label: 'Esta semana', sub: 'En 2 o 3 días', icon: '📅' },
  { id: 'FECHA_ESPECIFICA', label: 'Elegir fecha...', sub: 'Indicar día exacto', icon: '🗓️' },
  { id: 'NO_VOLVER', label: 'No volver por ahora', sub: 'Sin fecha agendada', icon: '🚫' },
];

export const RegistrarVisitaModal: React.FC<RegistrarVisitaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customer,
  customers,
  currentUserRole,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customer?.id || (customers[0]?.id || ''));
  const [selectedResult, setSelectedResult] = useState<VisitResult | null>(null);
  const [observacion, setObservacion] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [proximaOption, setProximaOption] = useState<ProximaVisitaOp>('PROXIMO_REPARTO');
  const [customDate, setCustomDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );

  if (!isOpen) return null;

  const currentCust = customer || customers.find((c) => c.id === selectedCustomerId);

  const handleSelectResult = (resultId: VisitResult) => {
    setSelectedResult(resultId);
    if (resultId !== 'OTRO') {
      setStep(2);
    }
  };

  const handleFinalSubmit = () => {
    if (!currentCust || !selectedResult) return;

    const selectedOpt = VISIT_OPTIONS.find((o) => o.id === selectedResult);
    const resultadoTexto = selectedOpt ? selectedOpt.label : 'Visita';

    const visitObj: Omit<CustomerVisit, 'id' | 'createdAt'> = {
      customerId: currentCust.id,
      fechaHora: new Date().toISOString(),
      usuario: `Repartidor (${currentUserRole})`,
      resultado: selectedResult,
      resultadoTexto,
      observacion: observacion.trim() || undefined,
      proximaVisitaOption: proximaOption,
      proximaVisitaFecha: proximaOption === 'FECHA_ESPECIFICA' ? customDate : undefined,
    };

    onSave(visitObj);

    setSelectedResult(null);
    setObservacion('');
    setStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-0 sm:my-8 max-h-[92vh] flex flex-col">
        {/* Header Táctil */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-500/30">
              ⚡ Registro Express de Visita (&lt;5 seg)
            </span>
            <h2 className="text-lg sm:text-xl font-black mt-1 text-white">
              {currentCust ? (currentCust.alias || currentCust.nombre) : 'Seleccionar Cliente'}
            </h2>
            {currentCust && (
              <p className="text-xs text-slate-300 font-medium">{currentCust.direccion}, {currentCust.localidad}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {!customer && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Cliente a visitar:</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-800"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.alias || c.nombre} ({c.localidad})
                  </option>
                ))}
              </select>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Paso 1: ¿Qué sucedió en la visita?
                </p>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  Tocar opción
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {VISIT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectResult(opt.id)}
                    className={`p-3.5 rounded-2xl border ${opt.border} ${opt.bg} transition-all active:scale-95 flex items-center space-x-3 text-left font-bold text-sm shadow-2xs group`}
                  >
                    <span className="text-2xl shrink-0 group-hover:scale-110 transition">{opt.icon}</span>
                    <span className="leading-tight">{opt.label}</span>
                  </button>
                ))}
              </div>

              {selectedResult === 'OTRO' && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-700">Escribir observación libre:</label>
                  <textarea
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    placeholder="Escribí el detalle de lo ocurrido..."
                    rows={2}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setStep(2)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center space-x-1"
                  >
                    <span>Siguiente Paso</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-900">
                    Resultado registrado:{' '}
                    <span className="font-extrabold underline">
                      {VISIT_OPTIONS.find((o) => o.id === selectedResult)?.label}
                    </span>
                  </p>
                  <p className="text-[11px] text-emerald-700">Ahora configurá la próxima visita programada.</p>
                </div>
              </div>

              <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                Paso 2: ¿Cuándo hay que volver a este cliente?
              </p>

              <div className="space-y-2">
                {PROXIMA_OPTIONS.map((opt) => {
                  const isSelected = proximaOption === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setProximaOption(opt.id)}
                      className={`w-full p-3 rounded-2xl border transition flex items-center justify-between text-left ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                          : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{opt.icon}</span>
                        <div>
                          <p className="font-extrabold text-xs">{opt.label}</p>
                          <p className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                            {opt.sub}
                          </p>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-white shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {proximaOption === 'FECHA_ESPECIFICA' && (
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-700">Seleccionar Fecha:</label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Guardar Visita Ahora</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
