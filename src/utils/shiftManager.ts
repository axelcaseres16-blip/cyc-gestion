import { CustomerWithBalance, Movement, CustomerVisit, PendingSale } from '../types';

const SHIFT_START_KEY = 'cyc_gestion_shift_start_v1';

export interface ShiftStats {
  shiftStartTime: string; // ISO String
  elapsedMinutes: number;
  elapsedFormatted: string;
  totalClientesRuta: number;
  clientesVisitados: number;
  clientesPendientes: number;
  ventasRealizadasCount: number;
  totalVentasMonto: number;
  cobradoEfectivo: number;
  cobradoTransferencia: number;
  cobradoCheque: number;
  totalCobradoMonto: number;
  fiadoGeneradoMonto: number;
  fotosTomadasCount: number;
  fotosPendientesCount: number;
  boletasEnviadasGrupoCount: number;
  boletasPendientesGrupoCount: number;
  sincronizacionesPendientesCount: number;
}

export function getShiftStartTime(): string {
  try {
    let start = localStorage.getItem(SHIFT_START_KEY);
    if (!start) {
      // Si no hay hora registrada hoy, arrancar a las 07:00 AM de hoy
      const today = new Date();
      today.setHours(7, 0, 0, 0);
      start = today.toISOString();
      localStorage.setItem(SHIFT_START_KEY, start);
    }
    return start;
  } catch {
    return new Date().toISOString();
  }
}

export function resetShiftStartTime(): string {
  const newStart = new Date().toISOString();
  localStorage.setItem(SHIFT_START_KEY, newStart);
  return newStart;
}

export function calculateShiftStats(
  customers: CustomerWithBalance[],
  movements: Movement[] = [],
  visits: CustomerVisit[] = [],
  pendingSales: PendingSale[] = []
): ShiftStats {
  const shiftStartTime = getShiftStartTime();
  const startTime = new Date(shiftStartTime);
  const now = new Date();

  const diffMs = Math.max(0, now.getTime() - startTime.getTime());
  const elapsedMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(elapsedMinutes / 60);
  const mins = elapsedMinutes % 60;
  const elapsedFormatted = `${hours}h ${mins}m`;

  const todayStr = now.toISOString().split('T')[0];

  // Movimientos de hoy
  const movementsToday = movements.filter(
    (m) => !m.isAnulado && m.fecha.startsWith(todayStr)
  );

  // Visitas de hoy
  const visitsToday = visits.filter((v) => v.fechaHora.startsWith(todayStr));

  // Clientes con visitas o compras hoy
  const visitedCustomerIds = new Set([
    ...visitsToday.map((v) => v.customerId),
    ...movementsToday.map((m) => m.customerId),
  ]);

  const totalClientesRuta = customers.filter((c) => c.estado === 'ACTIVO').length;
  const clientesVisitados = visitedCustomerIds.size;
  const clientesPendientes = Math.max(0, totalClientesRuta - clientesVisitados);

  // Ventas de hoy
  const salesToday = movementsToday.filter((m) => m.tipo === 'BOLETA');
  const ventasRealizadasCount = salesToday.length;
  const totalVentasMonto = salesToday.reduce((sum, m) => sum + m.monto, 0);

  // Cobros de hoy
  const paymentsToday = movementsToday.filter((m) => m.tipo === 'PAGO');
  let cobradoEfectivo = 0;
  let cobradoTransferencia = 0;
  let cobradoCheque = 0;

  paymentsToday.forEach((p) => {
    if (p.metodoPago === 'EFECTIVO' || !p.metodoPago) cobradoEfectivo += p.monto;
    else if (p.metodoPago === 'TRANSFERENCIA') cobradoTransferencia += p.monto;
    else if (p.metodoPago === 'CHEQUE') cobradoCheque += p.monto;
  });

  const totalCobradoMonto = cobradoEfectivo + cobradoTransferencia + cobradoCheque;
  const fiadoGeneradoMonto = Math.max(0, totalVentasMonto - totalCobradoMonto);

  // Fotos
  const fotosTomadasCount = salesToday.filter((s) => !!s.fotoUrl).length;
  const fotosPendientesCount = Math.max(0, salesToday.length - fotosTomadasCount);

  // Boletas enviadas vs pendientes
  const boletasEnviadasGrupoCount = salesToday.filter(
    (s) => s.registradoPor && s.registradoPor.includes('Grupo')
  ).length; // o de las ventas de hoy
  const boletasPendientesGrupoCount = Math.max(
    0,
    salesToday.length - boletasEnviadasGrupoCount
  );

  // Sincronizaciones pendientes
  const sincronizacionesPendientesCount = pendingSales.filter(
    (p) => !p.sincronizado
  ).length;

  return {
    shiftStartTime,
    elapsedMinutes,
    elapsedFormatted,
    totalClientesRuta,
    clientesVisitados,
    clientesPendientes,
    ventasRealizadasCount,
    totalVentasMonto,
    cobradoEfectivo,
    cobradoTransferencia,
    cobradoCheque,
    totalCobradoMonto,
    fiadoGeneradoMonto,
    fotosTomadasCount,
    fotosPendientesCount,
    boletasEnviadasGrupoCount,
    boletasPendientesGrupoCount,
    sincronizacionesPendientesCount,
  };
}
