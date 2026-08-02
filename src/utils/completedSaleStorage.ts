import { VirtualBoleta } from '../types';

export type EnvioEstado =
  | 'NO_ENVIADO'
  | 'COMPARTIR_ABIERTO'
  | 'ENVIADO_CONFIRMADO'
  | 'PENDIENTE'
  | 'ERROR';

export interface PendingCompletedSale {
  id: string; // ID de la boleta
  boleta: VirtualBoleta;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  branchName?: string;
  comprobanteImagenUrl?: string;
  messagePrepared: string;
  total: number;
  totalPagado: number;
  saldoRestanteBoleta: number;
  nuevoSaldoCuenta: number;
  envioEstado: EnvioEstado;
  activeView: string;
  timestamp: string;
  usuario: string;
  isClosed?: boolean;
}

const COMPLETED_SALE_KEY = 'cc_last_completed_sale';

/**
 * Guarda el estado de la venta finalizada en LocalStorage (y respaldo en memoria/eventos).
 */
export function savePendingCompletedSale(sale: PendingCompletedSale): void {
  try {
    localStorage.setItem(COMPLETED_SALE_KEY, JSON.stringify(sale));
  } catch (err) {
    console.error('Error al guardar cc_last_completed_sale:', err);
  }
}

/**
 * Obtiene la venta finalizada pendiente si existe y no ha sido cerrada.
 */
export function getPendingCompletedSale(): PendingCompletedSale | null {
  try {
    const raw = localStorage.getItem(COMPLETED_SALE_KEY);
    if (!raw) return null;
    const parsed: PendingCompletedSale = JSON.parse(raw);
    
    if (parsed.isClosed) return null;

    // Si tiene más de 24 hs, expirar
    const diffHours = (new Date().getTime() - new Date(parsed.timestamp).getTime()) / (1000 * 60 * 60);
    if (diffHours > 24) {
      clearPendingCompletedSale();
      return null;
    }

    return parsed;
  } catch (err) {
    console.error('Error al leer cc_last_completed_sale:', err);
    return null;
  }
}

/**
 * Actualiza el estado de envío de la venta finalizada.
 */
export function updatePendingSaleEnvioEstado(nuevoEstado: EnvioEstado): PendingCompletedSale | null {
  const current = getPendingCompletedSale();
  if (!current) return null;

  current.envioEstado = nuevoEstado;
  savePendingCompletedSale(current);
  return current;
}

/**
 * Limpia la venta guardada cuando el usuario explícitamente presiona "Ir al siguiente cliente" / "Cerrar operación".
 */
export function clearPendingCompletedSale(): void {
  try {
    localStorage.removeItem(COMPLETED_SALE_KEY);
  } catch (err) {
    console.error('Error al limpiar cc_last_completed_sale:', err);
  }
}

/**
 * Registra listeners globales de visibilidad para guardar estado en segundo plano (pagehide y visibilitychange).
 */
export function registerVisibilitySync(getCurrentPendingSale: () => PendingCompletedSale | null) {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      const sale = getCurrentPendingSale();
      if (sale && !sale.isClosed) {
        savePendingCompletedSale(sale);
      }
    }
  };

  const handlePageHide = () => {
    const sale = getCurrentPendingSale();
    if (sale && !sale.isClosed) {
      savePendingCompletedSale(sale);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handlePageHide);
  };
}
