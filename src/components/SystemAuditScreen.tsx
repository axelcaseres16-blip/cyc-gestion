import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Calendar,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wifi,
  WifiOff,
  Laptop,
} from 'lucide-react';
import {
  getAuditLogs,
  exportAuditLogsToCSV,
  exportAuditLogsToJSON,
  ComprehensiveAuditLog,
} from '../utils/auditLogger';
import { AppUser } from '../types';

interface SystemAuditScreenProps {
  currentUser: AppUser;
}

export const SystemAuditScreen: React.FC<SystemAuditScreenProps> = ({ currentUser }) => {
  const [logs] = useState<ComprehensiveAuditLog[]>(() => getAuditLogs());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('TODOS');
  const [selectedTipo, setSelectedTipo] = useState<string>('TODOS');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Lista única de usuarios en los logs
  const userList = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.usuario));
    return Array.from(set);
  }, [logs]);

  // Filtrado de auditoría
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Filtro de búsqueda
      const matchSearch =
        !searchTerm ||
        log.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.accion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.customerName && log.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.detalles && log.detalles.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro de usuario
      const matchUser = selectedUser === 'TODOS' || log.usuario === selectedUser;

      // Filtro de tipo de acción
      const matchTipo = selectedTipo === 'TODOS' || log.tipoAccion === selectedTipo;

      // Filtro de fecha
      let matchDate = true;
      if (dateFrom) {
        matchDate = matchDate && new Date(log.timestamp) >= new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        matchDate = matchDate && new Date(log.timestamp) <= toDate;
      }

      return matchSearch && matchUser && matchTipo && matchDate;
    });
  }, [logs, searchTerm, selectedUser, selectedTipo, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      {/* Header Panel Auditoría */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 text-slate-100 pointer-events-none">
          <ShieldAlert size={280} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30 mb-3">
              <ShieldAlert size={14} />
              <span>Control Absoluto del Negocio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Auditoría del Sistema
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
              Registro inmutable e inalterable de todas las operaciones realizadas por cada usuario, rol, fecha, hora, dispositivo y estado de sincronización.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => exportAuditLogsToCSV(filteredLogs)}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Download size={16} className="text-emerald-400" />
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={() => exportAuditLogsToJSON(filteredLogs)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Download size={16} />
              <span>Exportar JSON</span>
            </button>
          </div>
        </div>

        {/* Métricas rápidas de auditoría */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
            <span className="text-slate-400 block font-medium">Total Registros</span>
            <span className="text-xl font-black text-white">{logs.length}</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
            <span className="text-slate-400 block font-medium">Usuarios Activos</span>
            <span className="text-xl font-black text-blue-400">{userList.length}</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
            <span className="text-slate-400 block font-medium">Acciones Filtradas</span>
            <span className="text-xl font-black text-emerald-400">{filteredLogs.length}</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
            <span className="text-slate-400 block font-medium">Estado Registro</span>
            <span className="text-xl font-black text-amber-400">Inmutable 🔒</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Avanzados */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center space-x-2 font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">
          <Filter size={18} className="text-blue-600" />
          <span>Filtros de Auditoría</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Buscador libre */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por usuario, acción o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
          </div>

          {/* Filtro por usuario */}
          <div>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            >
              <option value="TODOS">👥 Todos los usuarios</option>
              {userList.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Tipo de Acción */}
          <div>
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            >
              <option value="TODOS">⚡ Todos los tipos</option>
              <option value="VENTA">💰 Ventas</option>
              <option value="PAGO">💵 Pagos</option>
              <option value="AJUSTE">⚖️ Ajustes</option>
              <option value="ANULACION">🚨 Anulaciones</option>
              <option value="CLIENTE">👥 Clientes</option>
              <option value="VISITA">🚛 Visitas</option>
              <option value="USUARIO">👤 Usuarios</option>
            </select>
          </div>

          {/* Fecha Desde / Hasta */}
          <div className="flex items-center space-x-1">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Tabla de Registros de Auditoría */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Fecha y Hora</th>
                <th className="py-3.5 px-4">Usuario & Rol</th>
                <th className="py-3.5 px-4">Acción Realizada</th>
                <th className="py-3.5 px-4">Cliente Afectado</th>
                <th className="py-3.5 px-4">Dispositivo</th>
                <th className="py-3.5 px-4">Conexión</th>
                <th className="py-3.5 px-4 text-right">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No se encontraron eventos de auditoría con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isAnulacion = log.tipoAccion === 'ANULACION';
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isAnulacion ? 'bg-red-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600">
                        <div className="font-bold text-slate-900">{log.fecha}</div>
                        <div className="text-[10px] text-slate-400">{log.hora} hs</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900">{log.usuario}</div>
                        <span
                          className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full mt-0.5 ${
                            log.rol === 'DUENO'
                              ? 'bg-amber-100 text-amber-800'
                              : log.rol === 'ADMINISTRADOR'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {log.rol}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 leading-tight">{log.accion}</div>
                        {log.detalles && (
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {log.detalles}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700">
                        {log.customerName ? (
                          <span className="font-bold text-slate-900">{log.customerName}</span>
                        ) : (
                          <span className="text-slate-400 italic">N/A</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px] flex items-center space-x-1.5 mt-2">
                        <Laptop size={14} className="text-slate-400" />
                        <span className="truncate max-w-[140px]">{log.dispositivo}</span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.isOnline ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <Wifi size={10} />
                            <span>Online</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <WifiOff size={10} />
                            <span>Offline</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        {log.resultado === 'EXITO' ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-black text-emerald-600">
                            <CheckCircle2 size={12} />
                            <span>Éxito</span>
                          </span>
                        ) : log.resultado === 'ADVERTENCIA' ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-black text-amber-600">
                            <AlertTriangle size={12} />
                            <span>Alerta</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-black text-red-600">
                            <XCircle size={12} />
                            <span>Error</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
