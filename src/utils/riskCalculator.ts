import { Customer, Movement, RiskEvaluation, RiskFactor, RiskLevel } from '../types';
import { getDaysAgo } from './formatters';
import { isMovementFinanciallyActive } from './movementFinancialState';

/**
 * Algoritmo dinámico de clasificación de riesgo crediticio para C&C Gestión.
 * Analiza múltiples variables operativas del distribuidor:
 * 1. Exceso de Límite de Crédito
 * 2. Inactividad de Pagos (días sin registrar un pago teniendo deuda)
 * 3. Inactividad de Compras con Deuda Pendiente (Cliente "desaparecido")
 * 4. Días de plazo de crédito excedidos
 * 5. Asimetría Compra vs Pago (Sigue comprando pero no abona)
 */
export function calculateCustomerRisk(
  customer: Customer,
  movements: Movement[]
): {
  saldoActual: number;
  fechaUltimaCompra?: string;
  fechaUltimoPago?: string;
  evaluacionRiesgo: RiskEvaluation;
  totalBoletasHistorico: number;
  totalPagosHistorico: number;
} {
  // Ordenar movimientos por fecha ascendente (excluyendo movimientos anulados)
  const customerMovements = movements
    .filter((m) => m.customerId === customer.id && isMovementFinanciallyActive(m))
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  let saldoActual = 0;
  let totalBoletasHistorico = 0;
  let totalPagosHistorico = 0;

  let fechaUltimaCompra: string | undefined;
  let fechaUltimoPago: string | undefined;

  for (const m of customerMovements) {
    if (m.tipo === 'BOLETA' || m.tipo === 'SALDO_INICIAL') {
      saldoActual += m.monto;
      totalBoletasHistorico += m.monto;
      if (m.tipo === 'BOLETA' && (!fechaUltimaCompra || new Date(m.fecha) > new Date(fechaUltimaCompra))) {
        fechaUltimaCompra = m.fecha;
      }
    } else if (m.tipo === 'PAGO') {
      saldoActual -= m.monto;
      totalPagosHistorico += m.monto;
      if (!fechaUltimoPago || new Date(m.fecha) > new Date(fechaUltimoPago)) {
        fechaUltimoPago = m.fecha;
      }
    } else if (m.tipo === 'AJUSTE') {
      // Si esDebito aumenta la deuda, sino disminuye
      if (m.esDebito) {
        saldoActual += m.monto;
      } else {
        saldoActual -= m.monto;
      }
    }
  }

  // Redondear saldo a 2 decimales para evitar imprecisiones de punto flotante
  saldoActual = Math.round(saldoActual * 100) / 100;

  // Si no hay deuda o saldo es <= 0, el riesgo disminuye drásticamente
  const tieneDeuda = saldoActual > 0;
  const daysWithoutBuying = getDaysAgo(fechaUltimaCompra);
  const daysWithoutPaying = getDaysAgo(fechaUltimoPago);

  let score = 0; // 0 = Sin riesgo, 100 = Riesgo Crítico
  const factors: RiskFactor[] = [];

  if (tieneDeuda) {
    // Variable 1: Límite de crédito superado
    if (customer.limiteCredito > 0) {
      const usagePct = (saldoActual / customer.limiteCredito) * 100;
      if (usagePct > 150) {
        score += 40;
        factors.push({
          factor: `Superó el límite de crédito en un ${Math.round(usagePct - 100)}% (${saldoActual.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })} vs ${customer.limiteCredito.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })})`,
          points: 40,
          severity: 'danger',
        });
      } else if (usagePct > 100) {
        score += 25;
        factors.push({
          factor: `Excedió el límite de crédito configurado (${Math.round(usagePct)}% utilizado)`,
          points: 25,
          severity: 'warning',
        });
      } else if (usagePct > 80) {
        score += 10;
        factors.push({
          factor: `Cerca de alcanzar el límite de crédito (${Math.round(usagePct)}% utilizado)`,
          points: 10,
          severity: 'info',
        });
      }
    }

    // Variable 2: Días sin pagar teniendo saldo pendiente
    if (daysWithoutPaying > 45) {
      score += 40;
      factors.push({
        factor: `Más de 45 días sin registrar ningún pago (${daysWithoutPaying} días)`,
        points: 40,
        severity: 'danger',
      });
    } else if (daysWithoutPaying > 30) {
      score += 25;
      factors.push({
        factor: `Más de 30 días sin abonos a la cuenta (${daysWithoutPaying} días)`,
        points: 25,
        severity: 'warning',
      });
    } else if (daysWithoutPaying > 15) {
      score += 10;
      factors.push({
        factor: `Más de 15 días sin realizar entregas de dinero (${daysWithoutPaying} días)`,
        points: 10,
        severity: 'info',
      });
    }

    // Variable 3: Plazo de crédito acordado (diasTopeCredito) excedido
    const limiteDias = customer.diasTopeCredito || 14; // por defecto 14 días en el rubro carnes/achuras
    if (daysWithoutPaying > limiteDias && tieneDeuda) {
      const diasAtraso = daysWithoutPaying - limiteDias;
      if (diasAtraso > 10) {
        score += 20;
        factors.push({
          factor: `Superó en ${diasAtraso} días el plazo máximo de crédito pactado (${limiteDias} días)`,
          points: 20,
          severity: 'danger',
        });
      }
    }

    // Variable 4: Cliente que dejó de comprar pero mantiene deuda abierta ("Desaparición")
    if (daysWithoutBuying > 30 && tieneDeuda) {
      score += 25;
      factors.push({
        factor: `Dejó de comprar hace ${daysWithoutBuying} días manteniendo un saldo adeudado`,
        points: 25,
        severity: 'danger',
      });
    }

    // Variable 5: Asimetría - Compra continuo pero no liquida deuda anterior
    if (daysWithoutBuying < 7 && daysWithoutPaying > 20) {
      score += 15;
      factors.push({
        factor: `Sigue recibiendo mercadería recientemente pero no registra pagos hace ${daysWithoutPaying} días`,
        points: 15,
        severity: 'warning',
      });
    }
  } else {
    // Saldo <= 0 (Al día o a favor)
    if (saldoActual < 0) {
      factors.push({
        factor: 'Cliente con saldo a favor',
        points: 0,
        severity: 'info',
      });
    } else {
      factors.push({
        factor: 'Cuenta corriente al día (Saldo $0)',
        points: 0,
        severity: 'info',
      });
    }
  }

  // Si está marcado como suspendido
  if (customer.estado === 'SUSPENDIDO') {
    score = Math.max(score, 85);
    factors.unshift({
      factor: 'Cliente marcando manualmente como SUSPENDIDO por la empresa',
      points: 85,
      severity: 'danger',
    });
  }

  // Normalizar score entre 0 y 100
  score = Math.min(100, Math.max(0, score));

  let level: RiskLevel = 'BAJO';
  if (score >= 70) {
    level = 'CRITICO';
  } else if (score >= 45) {
    level = 'ALTO';
  } else if (score >= 20) {
    level = 'MEDIO';
  } else {
    level = 'BAJO';
  }

  const creditUsagePercent =
    customer.limiteCredito > 0 ? Math.round((saldoActual / customer.limiteCredito) * 100) : 0;

  return {
    saldoActual,
    fechaUltimaCompra,
    fechaUltimoPago,
    totalBoletasHistorico,
    totalPagosHistorico,
    evaluacionRiesgo: {
      score,
      level,
      factors,
      lastPurchaseDays: daysWithoutBuying,
      lastPaymentDays: daysWithoutPaying,
      overdueAmount: Math.max(0, saldoActual),
      creditUsagePercent,
    },
  };
}
