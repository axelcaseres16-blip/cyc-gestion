import React, { useState } from 'react';
import { ActivityLogEntry } from '../types';
import { formatDate } from '../utils/formatters';
import { ShieldAlert, Search, Filter, Clock, User, FileText, DollarSign, Zap, MessageSquare, Tag } from 'lucide-react';

interface ActivityLogScreenProps {
  logs: ActivityLogEntry[];
  onSelectCustomer?: (customerId: string) => void;
}

export const ActivityLogScreen: React.FC<ActivityLogScreenProps> = ({ logs, onSelectCustomer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('TODOS');

  const filteredLogs = logs.filter((l) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      l.accion.toLowerCase().includes(term) ||
      l.usuario.toLowerCase().includes(term) ||
      (l.customerName && l.customerName.toLowerCase().includes(term));

    const matchesType = filterType === 'TODOS' || l.tipoAccion === filterType;

    return matchesSearch && matchesType;
  });

  const getActionBadge = (tipo: ActivityLogEntry['tipoAccion']) => {
    switch (tipo) {
      case 'BOLETA':
        return <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-md">🔴 Boleta</span>;
      case 'PAGO':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md">🟢 Pago</span>;
      case 'VISITA':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">⚡ Visita</span>;
      case 'WHATSAPP':
        return <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200">💬 WhatsApp</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md">📌 Sistema</span>;
    }
  };

  return (
    <div id="activity-log-container" className="space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-blue-600" />
            <span>Historial de Actividad & Auditoría</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Registro automático inmutable de todas las acciones realizadas por usuarios en el sistema
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por usuario, acción..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full sm:w-auto py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
          >
            <option value="TODOS">Todas las acciones</option>
            <option value="BOLETA">Boletas</option>
            <option value="PAGO">Pagos</option>
            <option value="VISITA">Visitas</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
        </div>
      </div>

      {/* Tabla / Lista de Registros */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold">No hay registros de actividad coincidentes</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-slate-50 transition flex items-start space-x-3">
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-2xl shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-900">{log.usuario}</span>
                    {getActionBadge(log.tipoAccion)}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{formatDate(log.fechaHora, true)}</span>
                </div>

                <p className="text-xs text-slate-700 font-medium">
                  {log.accion}
                </p>

                {log.detalles && (
                  <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                    "{log.detalles}"
                  </p>
                )}

                {log.customerId && onSelectCustomer && (
                  <button
                    onClick={() => onSelectCustomer(log.customerId!)}
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center space-x-1"
                  >
                    <span>Ver cliente ({log.customerName})</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
