import { CustomerWithBalance, Movement } from '../types';
import { isMovementFinanciallyActive } from './movementFinancialState';

export interface HealthFactor {
  isPositive: boolean;
  text: string;
  icon: string;
}

export interface CustomerHealthResult {
  score: number; // 0 to 100
  label: 'Excelente' | 'Muy Bueno' | 'Atención' | 'Riesgo' | 'Crítico';
  badgeColor: string;
  textColor: string;
  borderColor: string;
  bgColor: string;
  factors: HealthFactor[];
  daysSinceLastPurchase: number;
  daysSinceLastPayment: number;
  debtPercentage: number;
}

export function calculateCustomerHealth(
  customer: CustomerWithBalance,
  movements: Movement[] = []
): CustomerHealthResult {
  const now = new Date();
  const customerMovements = movements.filter(m => m.customerId === customer.id && isMovementFinanciallyActive(m));

  // 1. Días desde última compra
  let daysSinceLastPurchase = 999;
  if (customer.fechaUltimaCompra) {
    const diffTime = Math.abs(now.getTime() - new Date(customer.fechaUltimaCompra).getTime());
    daysSinceLastPurchase = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } else {
    // Buscar en movimientos tipo BOLETA
    const boletas = customerMovements.filter(m => m.tipo === 'BOLETA');
    if (boletas.length > 0) {
      const last = boletas.reduce((max, m) => new Date(m.fecha) > new Date(max.fecha) ? m : max, boletas[0]);
      const diffTime = Math.abs(now.getTime() - new Date(last.fecha).getTime());
      daysSinceLastPurchase = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  // 2. Días desde último pago
  let daysSinceLastPayment = 999;
  if (customer.fechaUltimoPago) {
    const diffTime = Math.abs(now.getTime() - new Date(customer.fechaUltimoPago).getTime());
    daysSinceLastPayment = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } else {
    const pagos = customerMovements.filter(m => m.tipo === 'PAGO');
    if (pagos.length > 0) {
      const last = pagos.reduce((max, m) => new Date(m.fecha) > new Date(max.fecha) ? m : max, pagos[0]);
      const diffTime = Math.abs(now.getTime() - new Date(last.fecha).getTime());
      daysSinceLastPayment = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  // 3. Porcentaje de uso del límite de crédito
  const limite = customer.limiteCredito || 1;
  const saldo = customer.saldoActual || 0;
  const debtPercentage = Math.round((saldo / limite) * 100);

  let score = 100;
  const factors: HealthFactor[] = [];

  // Evaluación de Frecuencia de Compra
  if (daysSinceLastPurchase <= 7) {
    factors.push({ isPositive: true, text: 'Compra todas las semanas', icon: '✔' });
  } else if (daysSinceLastPurchase <= 14) {
    factors.push({ isPositive: true, text: `Última compra hace ${daysSinceLastPurchase} días`, icon: '✔' });
  } else if (daysSinceLastPurchase <= 30) {
    score -= 20;
    factors.push({ isPositive: false, text: `Última compra hace ${daysSinceLastPurchase} días (Frecuencia baja)`, icon: '⚠' });
  } else if (daysSinceLastPurchase < 999) {
    score -= 40;
    factors.push({ isPositive: false, text: `Inactivo: ${daysSinceLastPurchase} días sin comprar`, icon: '🔴' });
  } else {
    score -= 30;
    factors.push({ isPositive: false, text: 'Sin registro de compras recientes', icon: '⚠' });
  }

  // Evaluación de Pagos
  if (daysSinceLastPayment <= 10) {
    factors.push({ isPositive: true, text: 'Siempre paga dentro del plazo', icon: '✔' });
  } else if (daysSinceLastPayment <= 20) {
    factors.push({ isPositive: true, text: `Último pago hace ${daysSinceLastPayment} días`, icon: '✔' });
  } else if (daysSinceLastPayment < 999) {
    score -= 25;
    factors.push({ isPositive: false, text: `Hace ${daysSinceLastPayment} días que no registra un pago`, icon: '⚠' });
  }

  // Evaluación de Saldo y Mora
  if (saldo <= 0) {
    factors.push({ isPositive: true, text: 'Al día, no posee deuda activa', icon: '✔' });
  } else if (debtPercentage > 100) {
    score -= 35;
    factors.push({ isPositive: false, text: `Excedió su límite de crédito (${debtPercentage}% del límite)`, icon: '🔴' });
  } else if (debtPercentage > 75) {
    score -= 15;
    factors.push({ isPositive: false, text: `Uso elevado de crédito (${debtPercentage}% del límite)`, icon: '⚠' });
  } else {
    factors.push({ isPositive: true, text: `Deuda controlada (${debtPercentage}% del límite)`, icon: '✔' });
  }

  if (customer.diasTopeCredito && daysSinceLastPayment > customer.diasTopeCredito && saldo > 0) {
    score -= 20;
    factors.push({ isPositive: false, text: 'Tiene deuda vencida fuera del plazo otorgado', icon: '⚠' });
  }

  // Acotar score entre 0 y 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Categorización de salud
  let label: 'Excelente' | 'Muy Bueno' | 'Atención' | 'Riesgo' | 'Crítico' = 'Excelente';
  let badgeColor = 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
  let textColor = 'text-emerald-700';
  let borderColor = 'border-emerald-500';
  let bgColor = 'bg-emerald-50';

  if (score >= 90) {
    label = 'Excelente';
    badgeColor = 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
    textColor = 'text-emerald-700';
    borderColor = 'border-emerald-500';
    bgColor = 'bg-emerald-50';
  } else if (score >= 75) {
    label = 'Muy Bueno';
    badgeColor = 'bg-blue-500/10 text-blue-700 border-blue-500/30';
    textColor = 'text-blue-700';
    borderColor = 'border-blue-500';
    bgColor = 'bg-blue-50';
  } else if (score >= 50) {
    label = 'Atención';
    badgeColor = 'bg-amber-500/10 text-amber-800 border-amber-500/30';
    textColor = 'text-amber-800';
    borderColor = 'border-amber-500';
    bgColor = 'bg-amber-50';
  } else if (score >= 30) {
    label = 'Riesgo';
    badgeColor = 'bg-orange-500/10 text-orange-800 border-orange-500/30';
    textColor = 'text-orange-800';
    borderColor = 'border-orange-500';
    bgColor = 'bg-orange-50';
  } else {
    label = 'Crítico';
    badgeColor = 'bg-red-500/10 text-red-800 border-red-500/30';
    textColor = 'text-red-800';
    borderColor = 'border-red-500';
    bgColor = 'bg-red-50';
  }

  return {
    score,
    label,
    badgeColor,
    textColor,
    borderColor,
    bgColor,
    factors,
    daysSinceLastPurchase,
    daysSinceLastPayment,
    debtPercentage,
  };
}
