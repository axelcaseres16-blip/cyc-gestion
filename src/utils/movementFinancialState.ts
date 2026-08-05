import { Movement } from '../types';

/**
 * Fuente única de verdad para decidir si un movimiento participa de cálculos
 * financieros y operativos. Los registros anulados se conservan como
 * historial, pero no modifican saldo, riesgo, reportes ni métricas.
 */
export function isMovementFinanciallyActive(movement: Movement): boolean {
  return !movement.isAnulado && !movement.anulacionEnProceso;
}
