import React, { useState, useMemo } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  Filter,
  Camera,
  DollarSign,
  UserX,
  ExternalLink,
} from 'lucide-react';
import { CustomerWithBalance, Movement } from '../types';
import { generateSystemAlerts, SystemAlert, AlertPriority } from '../utils/alertEngine';

interface AlertCenterScreenProps {
  customers: CustomerWithBalance[];
  movements: Movement[];
  onSelectCustomer: (customer: CustomerWithBalance) => void;
  onNavigateTo: (view: string) => void;
}

export const AlertCenterScreen: React.FC<AlertCenterScreenProps> = ({
  customers,
  movements,
  onSelectCustomer,
  onNavigateTo,
}) => {
  const [selectedPriority, setSelectedPriority] = useState<string>('TODAS');

  const alerts = useMemo(() => {
    return generateSystemAlerts(customers, movements);
  }, [customers, movements]);

  const filteredAlerts = useMemo(() => {
    if (selectedPriority === 'TODAS') return alerts;
    return alerts.filter((a) => a.prioridad === selectedPriority);
  }, [alerts, selectedPriority]);

  // Contadores
  const criticalCount = alerts.filter((a) => a.prioridad === 'CRITICA').length;
  const highCount = alerts.filter((a) => a.prioridad === 'ALTA').length;
  const mediumCount = alerts.filter((a) => a.prioridad === 'MEDIA').length;

  return (
    <div className="space-y-6">
      {/* Header Centro de Alertas */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-bold border border-red-500/30 mb-2">
              <AlertOctagon size={14} />
              <span>Detección Automática de Anomalías</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Centro de Alertas</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Monitoreo permanente de clientes morosos, límites excedidos, boletas sin fotografía y atrasos de cobranza.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-red-500/10 border border-red-500/30 px-3 py-2 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-red-400 block uppercase">Críticas</span>
              <span className="text-lg font-black text-red-400">{criticalCount}</span>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/30 px-3 py-2 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-orange-400 block uppercase">Altas</span>
              <span className="text-lg font-black text-orange-400">{highCount}</span>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-amber-400 block uppercase">Medias</span>
              <span className="text-lg font-black text-amber-400">{mediumCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros de Alertas */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2">
          <Filter size={18} className="text-slate-500" />
          <span className="text-xs font-extrabold uppercase text-slate-600">Prioridad:</span>
        </div>

        <div className="flex space-x-2 overflow-x-auto">
          {['TODAS', 'CRITICA', 'ALTA', 'MEDIA'].map((p) => {
            const isActive = selectedPriority === p;
            return (
              <button
                key={p}
                onClick={() => setSelectedPriority(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p === 'TODAS'
                  ? `Todas (${alerts.length})`
                  : p === 'CRITICA'
                  ? `🔴 Críticas (${criticalCount})`
                  : p === 'ALTA'
                  ? `🟠 Altas (${highCount})`
                  : `🟡 Medias (${mediumCount})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Alertas */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">¡Todo en orden!</h3>
            <p className="text-slate-500 text-xs mt-1">
              No se detectaron alertas operativas con la prioridad seleccionada.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.prioridad === 'CRITICA';
            const isHigh = alert.prioridad === 'ALTA';

            const cust = alert.customerId
              ? customers.find((c) => c.id === alert.customerId)
              : undefined;

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isCritical
                    ? 'bg-red-50/60 border-red-200 hover:border-red-300'
                    : isHigh
                    ? 'bg-orange-50/60 border-orange-200 hover:border-orange-300'
                    : 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div
                    className={`p-2.5 rounded-xl mt-0.5 ${
                      isCritical
                        ? 'bg-red-600 text-white'
                        : isHigh
                        ? 'bg-orange-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {alert.tipo === 'DEUDA_EXCEDIDA' ? (
                      <DollarSign size={20} />
                    ) : alert.tipo === 'BOLETA_SIN_FOTO' ? (
                      <Camera size={20} />
                    ) : alert.tipo === 'INACTIVO_SIN_COMPRAS' ? (
                      <UserX size={20} />
                    ) : (
                      <AlertTriangle size={20} />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                          isCritical
                            ? 'bg-red-600 text-white'
                            : isHigh
                            ? 'bg-orange-500 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {alert.prioridad}
                      </span>
                      <h4 className="text-sm font-black text-slate-900">{alert.titulo}</h4>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
                      {alert.descripcion}
                    </p>
                  </div>
                </div>

                {/* Botón de Acción Directa */}
                <div>
                  {cust && (
                    <button
                      onClick={() => onSelectCustomer(cust)}
                      className="w-full sm:w-auto flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 text-xs font-bold px-3.5 py-2 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer"
                    >
                      <span>Ver Ficha Cliente</span>
                      <ExternalLink size={14} className="text-blue-600" />
                    </button>
                  )}
                  {alert.tipo === 'BOLETA_SIN_FOTO' && (
                    <button
                      onClick={() => onNavigateTo('boletas')}
                      className="w-full sm:w-auto flex items-center justify-center space-x-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer mt-2 sm:mt-0"
                    >
                      <Camera size={14} />
                      <span>Ver Boletas</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
