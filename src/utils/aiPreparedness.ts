import { CustomerWithBalance, Movement, CustomerVisit } from '../types';

export interface AIPredictiveCustomerVector {
  customerId: string;
  customerName: string;
  category: string;
  currentBalance: number;
  creditLimit: number;
  purchaseFrequencyDays: number;
  avgOrderValue: number;
  daysSinceLastPurchase: number;
  daysSinceLastPayment: number;
  churnRiskProbability: number; // 0 to 1
  predictedTomorrowPurchaseProb: number; // 0 to 1
  paymentDelayProbability: number; // 0 to 1
  recommendedVisitDay: string;
}

export interface AIPredictiveDatasetSummary {
  generatedAt: string;
  totalCustomersAnalyzed: number;
  highChurnRiskCount: number;
  highDefaultRiskCount: number;
  expectedTomorrowSalesCount: number;
  topVolumeCategory: string;
  customerVectors: AIPredictiveCustomerVector[];
}

/**
 * Genera el dataset estructurado para futuros modelos predictivos
 */
export function buildAIPredictiveDataset(
  customers: CustomerWithBalance[],
  movements: Movement[] = []
): AIPredictiveDatasetSummary {
  const now = new Date();
  const vectors: AIPredictiveCustomerVector[] = customers.map((c) => {
    const custMovements = movements.filter((m) => m.customerId === c.id && !m.isAnulado);
    const boletas = custMovements.filter((m) => m.tipo === 'BOLETA');
    
    // Cálculo valor promedio de pedido
    const totalMontoBoletas = boletas.reduce((sum, b) => sum + b.monto, 0);
    const avgOrderValue = boletas.length > 0 ? Math.round(totalMontoBoletas / boletas.length) : 0;

    // Días desde última compra
    let daysSinceLastPurchase = 30;
    if (c.fechaUltimaCompra) {
      const diff = Math.abs(now.getTime() - new Date(c.fechaUltimaCompra).getTime());
      daysSinceLastPurchase = Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    // Días desde último pago
    let daysSinceLastPayment = 30;
    if (c.fechaUltimoPago) {
      const diff = Math.abs(now.getTime() - new Date(c.fechaUltimoPago).getTime());
      daysSinceLastPayment = Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    // Frecuencia estimada en días
    let freqDays = 7;
    if (c.frecuenciaVisita === 'DIARIA') freqDays = 1;
    if (c.frecuenciaVisita === 'BISEMANAL') freqDays = 3;
    if (c.frecuenciaVisita === 'SEMANAL') freqDays = 7;
    if (c.frecuenciaVisita === 'QUINCENAL') freqDays = 15;

    // Probabilidad de Churn (abandono)
    const churnRiskProbability = Math.min(
      1.0,
      Math.max(0.05, daysSinceLastPurchase / (freqDays * 3.5))
    );

    // Probabilidad de compra mañana
    const predictedTomorrowPurchaseProb = Math.min(
      0.95,
      Math.max(0.05, daysSinceLastPurchase >= freqDays ? 0.85 : 0.2)
    );

    // Probabilidad de retraso en pago
    const debtRatio = c.limiteCredito > 0 ? c.saldoActual / c.limiteCredito : 0;
    const paymentDelayProbability = Math.min(
      1.0,
      Math.max(0.05, debtRatio * 0.7 + (daysSinceLastPayment > 14 ? 0.3 : 0))
    );

    return {
      customerId: c.id,
      customerName: c.alias || c.nombre,
      category: c.categoria,
      currentBalance: c.saldoActual,
      creditLimit: c.limiteCredito,
      purchaseFrequencyDays: freqDays,
      avgOrderValue,
      daysSinceLastPurchase,
      daysSinceLastPayment,
      churnRiskProbability: parseFloat(churnRiskProbability.toFixed(2)),
      predictedTomorrowPurchaseProb: parseFloat(predictedTomorrowPurchaseProb.toFixed(2)),
      paymentDelayProbability: parseFloat(paymentDelayProbability.toFixed(2)),
      recommendedVisitDay: daysSinceLastPurchase >= freqDays ? 'Mañana' : 'En 2-3 días',
    };
  });

  const highChurnRiskCount = vectors.filter((v) => v.churnRiskProbability >= 0.7).length;
  const highDefaultRiskCount = vectors.filter((v) => v.paymentDelayProbability >= 0.6).length;
  const expectedTomorrowSalesCount = vectors.filter(
    (v) => v.predictedTomorrowPurchaseProb >= 0.7
  ).length;

  return {
    generatedAt: now.toISOString(),
    totalCustomersAnalyzed: customers.length,
    highChurnRiskCount,
    highDefaultRiskCount,
    expectedTomorrowSalesCount,
    topVolumeCategory: 'CARNICERIA',
    customerVectors: vectors,
  };
}
