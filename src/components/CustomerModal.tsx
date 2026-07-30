import React, { useState, useEffect } from 'react';
import { Customer, CustomerCategory, VisitFrequency, CustomerStatus } from '../types';
import { X, Save, Building2, MapPin, Phone, DollarSign, Calendar, AlertCircle } from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>, initialBalance: number) => void;
  initialCustomer?: Customer | null;
  availableRoutes: string[];
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCustomer,
  availableRoutes,
}) => {
  const [nombre, setNombre] = useState('');
  const [alias, setAlias] = useState('');
  const [cuitDni, setCuitDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [referenciaUbicacion, setReferenciaUbicacion] = useState('');
  const [zonaRuta, setZonaRuta] = useState('');
  const [nuevaRutaCustom, setNuevaRutaCustom] = useState('');
  const [frecuenciaVisita, setFrecuenciaVisita] = useState<VisitFrequency>('SEMANAL');
  const [categoria, setCategoria] = useState<CustomerCategory>('CARNICERIA');
  const [estado, setEstado] = useState<CustomerStatus>('ACTIVO');
  const [limiteCredito, setLimiteCredito] = useState<number>(1000000);
  const [diasTopeCredito, setDiasTopeCredito] = useState<number>(14);
  const [saldoInicial, setSaldoInicial] = useState<number>(0);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (initialCustomer) {
      setNombre(initialCustomer.nombre || '');
      setAlias(initialCustomer.alias || '');
      setCuitDni(initialCustomer.cuitDni || '');
      setTelefono(initialCustomer.telefono || '');
      setDireccion(initialCustomer.direccion || '');
      setLocalidad(initialCustomer.localidad || '');
      setReferenciaUbicacion(initialCustomer.referenciaUbicacion || '');
      setZonaRuta(initialCustomer.zonaRuta || '');
      setFrecuenciaVisita(initialCustomer.frecuenciaVisita || 'SEMANAL');
      setCategoria(initialCustomer.categoria || 'CARNICERIA');
      setEstado(initialCustomer.estado || 'ACTIVO');
      setLimiteCredito(initialCustomer.limiteCredito || 0);
      setDiasTopeCredito(initialCustomer.diasTopeCredito || 14);
      setObservaciones(initialCustomer.observaciones || '');
      setSaldoInicial(0); // Edición no cambia saldo inicial
    } else {
      setNombre('');
      setAlias('');
      setCuitDni('');
      setTelefono('');
      setDireccion('');
      setLocalidad('Morón');
      setReferenciaUbicacion('');
      setZonaRuta(availableRoutes[0] || 'Ruta 1 - Morón / Haedo (Lun-Jue)');
      setFrecuenciaVisita('SEMANAL');
      setCategoria('CARNICERIA');
      setEstado('ACTIVO');
      setLimiteCredito(1000000);
      setDiasTopeCredito(14);
      setSaldoInicial(0);
      setObservaciones('');
    }
  }, [initialCustomer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    const finalRuta = zonaRuta === 'NUEVA' ? nuevaRutaCustom : zonaRuta;

    onSave(
      {
        nombre: nombre.trim(),
        alias: alias.trim(),
        cuitDni: cuitDni.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        localidad: localidad.trim(),
        referenciaUbicacion: referenciaUbicacion.trim(),
        zonaRuta: finalRuta || 'Ruta General',
        frecuenciaVisita,
        categoria,
        estado,
        limiteCredito: Number(limiteCredito) || 0,
        diasTopeCredito: Number(diasTopeCredito) || 14,
        observaciones: observaciones.trim(),
      },
      Number(saldoInicial) || 0
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-[95vw] sm:w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Encabezado */}
        <div className="bg-[#0F172A] text-white px-4 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-base sm:text-lg">
              {initialCustomer ? 'Editar Ficha de Cliente' : 'Registrar Nuevo Cliente'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Alias / Fantasía */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nombre Fantasía / Alias (Crucial para el chofer)*
              </label>
              <input
                type="text"
                required
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Ej: Carnicería Don Juan"
                className="w-full px-3 py-2 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Nombre Completo / Razón Social */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Razón Social / Nombre Dueño*
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan Carlos Rodríguez"
                className="w-full px-3 py-2 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* CUIT / DNI */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CUIT / DNI</label>
              <input
                type="text"
                value={cuitDni}
                onChange={(e) => setCuitDni(e.target.value)}
                placeholder="20-28492019-3"
                className="w-full px-3 py-2 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Teléfono (Para WhatsApp)
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 1154839201"
                className="w-full px-3 py-2 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rubro / Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CustomerCategory)}
                className="w-full px-3 py-2 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
              >
                <option value="CARNICERIA">Carnicería</option>
                <option value="FIAMBRERIA">Fiambrería / Chacinados</option>
                <option value="RESTAURANTE_SUPER">Restaurante / Supermercado</option>
                <option value="REVENDEDOR">Revendedor / Distribuidor</option>
                <option value="PARTICULAR">Cliente Particular</option>
              </select>
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dirección Local</label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Av. San Martín 1420"
                className="w-full px-3 py-2 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Localidad */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Localidad</label>
              <input
                type="text"
                value={localidad}
                onChange={(e) => setLocalidad(e.target.value)}
                placeholder="Ej: Morón"
                className="w-full px-3 py-2 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Referencia de ubicación */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Referencia de Entrega / Horarios
              </label>
              <input
                type="text"
                value={referenciaUbicacion}
                onChange={(e) => setReferenciaUbicacion(e.target.value)}
                placeholder="Ej: Esquina Belgrano, persiana verde. Recibe de 7 a 10 hs."
                className="w-full px-3 py-2 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Zona / Ruta de Reparto */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Zona / Ruta de Reparto</label>
              <select
                value={zonaRuta}
                onChange={(e) => setZonaRuta(e.target.value)}
                className="w-full px-3 py-2 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
              >
                {availableRoutes.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                <option value="NUEVA">+ Crear Nueva Ruta...</option>
              </select>
            </div>

            {zonaRuta === 'NUEVA' && (
              <div>
                <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Nombre de Nueva Ruta</label>
                <input
                  type="text"
                  required
                  value={nuevaRutaCustom}
                  onChange={(e) => setNuevaRutaCustom(e.target.value)}
                  placeholder="Ej: Ruta 3 - Merlo / Castelar"
                  className="w-full px-3 py-2 min-h-[48px] bg-blue-50 border border-blue-300 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>
            )}

            {/* Frecuencia de Visita */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Frecuencia de Visita</label>
              <select
                value={frecuenciaVisita}
                onChange={(e) => setFrecuenciaVisita(e.target.value as VisitFrequency)}
                className="w-full px-3 py-2 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
              >
                <option value="DIARIA">Diaria</option>
                <option value="SEMANAL">Semanal</option>
                <option value="BISEMANAL">Bi-semanal</option>
                <option value="QUINCENAL">Quincenal</option>
              </select>
            </div>

            {/* Límite de Crédito ($) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Límite de Crédito ($ ARS)</label>
              <input
                type="number"
                value={limiteCredito}
                onChange={(e) => setLimiteCredito(Number(e.target.value))}
                placeholder="1000000"
                className="w-full px-3 py-2 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Días Tope Crédito */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Plazo Máx. Crédito (Días)</label>
              <input
                type="number"
                value={diasTopeCredito}
                onChange={(e) => setDiasTopeCredito(Number(e.target.value))}
                placeholder="14"
                className="w-full px-3 py-2 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Saldo Inicial (Solo al crear) */}
            {!initialCustomer && (
              <div className="sm:col-span-2 bg-amber-50 p-3.5 rounded-xl border border-amber-200">
                <label className="block text-xs font-bold text-amber-900 uppercase mb-1">
                  Saldo Inicial al momento de alta ($ ARS)
                </label>
                <input
                  type="number"
                  value={saldoInicial}
                  onChange={(e) => setSaldoInicial(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 min-h-[48px] bg-white border border-amber-300 rounded-xl text-sm font-mono font-bold text-red-600"
                />
                <p className="text-[10px] text-amber-700 mt-1 font-medium">
                  Si el cliente ya arranca debiendo plata, registralo aquí. Se creará un movimiento auditable de "SALDO INICIAL".
                </p>
              </div>
            )}

            {/* Estado */}
            {initialCustomer && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Estado del Cliente</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as CustomerStatus)}
                  className="w-full px-3 py-2 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900"
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="SUSPENDIDO">Suspendido por Mora</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>
            )}

            {/* Observaciones */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones Internas</label>
              <textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Preferencia de cortes, cobrador de preferencia, etc..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Botones de Envío */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 min-h-[48px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 min-h-[48px] bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md transition flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cliente</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
