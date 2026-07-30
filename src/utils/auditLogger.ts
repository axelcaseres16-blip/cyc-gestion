import { AppUser, UserRole } from '../types';
import { getDeviceInfo } from './deviceDetector';

const AUDIT_LOGS_KEY = 'cyc_gestion_audit_logs_v2';

export interface ComprehensiveAuditLog {
  id: string;
  timestamp: string; // ISO String
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm:ss
  usuario: string; // Nombre del usuario
  username: string; // Username o ID
  rol: UserRole;
  accion: string; // e.g. "Venta realizada", "Cliente modificado", "Ajuste de saldo", "Anulación"
  tipoAccion:
    | 'VENTA'
    | 'PAGO'
    | 'AJUSTE'
    | 'ANULACION'
    | 'VISITA'
    | 'CLIENTE'
    | 'USUARIO'
    | 'CONFIGURACION'
    | 'INICIO_SESION'
    | 'CERRAR_SESION';
  customerId?: string;
  customerName?: string;
  dispositivo: string;
  isOnline: boolean;
  syncState: 'SINCRONIZADO' | 'PENDIENTE_SYNC';
  resultado: 'EXITO' | 'ADVERTENCIA' | 'ERROR';
  detalles?: string;
}

/**
 * Obtiene todos los registros de auditoría
 */
export function getAuditLogs(): ComprehensiveAuditLog[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_KEY);
    if (!raw) return generateInitialMockAuditLogs();
    const logs: ComprehensiveAuditLog[] = JSON.parse(raw);
    return Array.isArray(logs) ? logs : generateInitialMockAuditLogs();
  } catch (err) {
    console.error('Error leyendo logs de auditoría:', err);
    return generateInitialMockAuditLogs();
  }
}

/**
 * Registra una acción en el Historial de Auditoría
 */
export function recordAuditLog(logData: {
  usuario: string;
  username?: string;
  rol: UserRole;
  accion: string;
  tipoAccion: ComprehensiveAuditLog['tipoAccion'];
  customerId?: string;
  customerName?: string;
  resultado?: 'EXITO' | 'ADVERTENCIA' | 'ERROR';
  detalles?: string;
}): ComprehensiveAuditLog {
  try {
    const logs = getAuditLogs();
    const now = new Date();
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    const newLog: ComprehensiveAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: now.toISOString(),
      fecha: now.toLocaleDateString('es-AR'),
      hora: now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      usuario: logData.usuario,
      username: logData.username || logData.usuario.toLowerCase().replace(/\s+/g, ''),
      rol: logData.rol,
      accion: logData.accion,
      tipoAccion: logData.tipoAccion,
      customerId: logData.customerId,
      customerName: logData.customerName,
      dispositivo: getDeviceInfo(),
      isOnline,
      syncState: isOnline ? 'SINCRONIZADO' : 'PENDIENTE_SYNC',
      resultado: logData.resultado || 'EXITO',
      detalles: logData.detalles || '',
    };

    const updatedLogs = [newLog, ...logs];
    // Mantener los últimos 2000 eventos en almacenamiento local
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(updatedLogs.slice(0, 2000)));
    return newLog;
  } catch (err) {
    console.error('Error guardando registro de auditoría:', err);
    throw err;
  }
}

/**
 * Exporta registros de auditoría a CSV
 */
export function exportAuditLogsToCSV(logs: ComprehensiveAuditLog[]): void {
  const headers = ['ID', 'Fecha', 'Hora', 'Usuario', 'Rol', 'Accion', 'Tipo', 'Cliente', 'Dispositivo', 'Estado Sync', 'Resultado', 'Detalles'];
  const rows = logs.map(l => [
    l.id,
    l.fecha,
    l.hora,
    `"${l.usuario}"`,
    l.rol,
    `"${l.accion}"`,
    l.tipoAccion,
    `"${l.customerName || 'N/A'}"`,
    `"${l.dispositivo}"`,
    l.syncState,
    l.resultado,
    `"${(l.detalles || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `auditoria_cyc_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exporta registros de auditoría a JSON
 */
export function exportAuditLogsToJSON(logs: ComprehensiveAuditLog[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', `auditoria_cyc_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Mock inicial de logs de auditoría para demostración
 */
function generateInitialMockAuditLogs(): ComprehensiveAuditLog[] {
  const now = new Date();
  const mockLogs: ComprehensiveAuditLog[] = [
    {
      id: 'audit_1',
      timestamp: new Date(now.getTime() - 1000 * 60 * 15).toISOString(),
      fecha: new Date(now.getTime() - 1000 * 60 * 15).toLocaleDateString('es-AR'),
      hora: new Date(now.getTime() - 1000 * 60 * 15).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      usuario: 'Braian López',
      username: 'braian',
      rol: 'REPARTIDOR',
      accion: 'Venta registrada por $180.000 (Boleta B-00982)',
      tipoAccion: 'VENTA',
      customerName: 'Carnicería Don Juan',
      dispositivo: '📱 Android Móvil (Chrome) [Online]',
      isOnline: true,
      syncState: 'SINCRONIZADO',
      resultado: 'EXITO',
      detalles: 'Abonado en mano $180.000. Fotografía de boleta capturada.',
    },
    {
      id: 'audit_2',
      timestamp: new Date(now.getTime() - 1000 * 60 * 45).toISOString(),
      fecha: new Date(now.getTime() - 1000 * 60 * 45).toLocaleDateString('es-AR'),
      hora: new Date(now.getTime() - 1000 * 60 * 45).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      usuario: 'Martín Gómez',
      username: 'martin',
      rol: 'ADMINISTRADOR',
      accion: 'Cliente modificado: Límite de crédito actualizado',
      tipoAccion: 'CLIENTE',
      customerName: 'El Parrillón de Ramos',
      dispositivo: '💻 Windows PC (Chrome) [Online]',
      isOnline: true,
      syncState: 'SINCRONIZADO',
      resultado: 'EXITO',
      detalles: 'Límite de crédito ajustado de $2.000.000 a $2.500.000.',
    },
    {
      id: 'audit_3',
      timestamp: new Date(now.getTime() - 1000 * 60 * 120).toISOString(),
      fecha: new Date(now.getTime() - 1000 * 60 * 120).toLocaleDateString('es-AR'),
      hora: new Date(now.getTime() - 1000 * 60 * 120).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      usuario: 'Axel Cáseres',
      username: 'axel',
      rol: 'DUENO',
      accion: 'Ajuste de saldo de cuenta corriente ($50.000)',
      tipoAccion: 'AJUSTE',
      customerName: 'Granja y Carnes Gómez',
      dispositivo: '💻 Mac OS (Safari) [Online]',
      isOnline: true,
      syncState: 'SINCRONIZADO',
      resultado: 'EXITO',
      detalles: 'Descuento autorizado por bonificación comercial.',
    },
  ];

  localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(mockLogs));
  return mockLogs;
}
