import { CustomerWithBalance, Movement } from '../types';

export type AlertPriority = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';

export interface SystemAlert {
  id: string;
  titulo: string;
  descripcion: string;
  prioridad: AlertPriority;
  tipo:
    | 'DEUDA_EXCEDIDA'
    | 'INACTIVO_SIN_COMPRAS'
    | 'MOROSO_SIN_PAGO'
    | 'BOLETA_SIN_FOTO'
    | 'PENDIENTE_SYNC'
    | 'LIMITE_CREDITO';
  customerId?: string;
  customerName?: string;
  fechaCreacion: string;
}

export function generateSystemAlerts(
  customers: CustomerWithBalance[],
  movements: Movement[] = []
): SystemAlert[] {
  const alerts: SystemAlert[] = [];
  const now = new Date();

  // 1. Clientes con Límite de Crédito Superado (Prioridad Crítica)
  customers.forEach((c) => {
    if (c.saldoActual > c.limiteCredito && c.limiteCredito > 0) {
      alerts.push({
        id: `alt_limite_${c.id}`,
        titulo: `Límite Excedido: ${c.alias || c.nombre}`,
        descripcion: `Superó el límite de crédito configurado ($${c.saldoActual.toLocaleString('es-AR')} / $${c.limiteCredito.toLocaleString('es-AR')}).`,
        prioridad: 'CRITICA',
        tipo: 'DEUDA_EXCEDIDA',
        customerId: c.id,
        customerName: c.alias || c.nombre,
        fechaCreacion: now.toISOString(),
      });
    }
  });

  // 2. Boletas sin Fotografía Obligatoria (Prioridad Alta)
  movements.forEach((m) => {
    if (m.tipo === 'BOLETA' && !m.fotoUrl && !m.isAnulado) {
      const cust = customers.find((c) => c.id === m.customerId);
      alerts.push({
        id: `alt_foto_${m.id}`,
        titulo: `Boleta sin Fotografía: ${m.numeroBoleta || m.id}`,
        descripcion: `La venta a ${cust ? cust.alias || cust.nombre : 'Cliente'} no registra imagen de respaldo adjunta.`,
        prioridad: 'ALTA',
        tipo: 'BOLETA_SIN_FOTO',
        customerId: m.customerId,
        customerName: cust ? cust.alias || cust.nombre : undefined,
        fechaCreacion: m.fecha,
      });
    }
  });

  // 3. Clientes Inactivos sin Compras (>20 días) (Prioridad Alta)
  customers.forEach((c) => {
    if (c.estado === 'ACTIVO') {
      let days = 999;
      if (c.fechaUltimaCompra) {
        const diff = Math.abs(now.getTime() - new Date(c.fechaUltimaCompra).getTime());
        days = Math.floor(diff / (1000 * 60 * 60 * 24));
      }
      if (days >= 20 && days < 999) {
        alerts.push({
          id: `alt_inactivo_${c.id}`,
          titulo: `Sin compras hace ${days} días: ${c.alias || c.nombre}`,
          descripcion: `Cliente habitual que no registra ventas activas en las últimas tres semanas.`,
          prioridad: 'ALTA',
          tipo: 'INACTIVO_SIN_COMPRAS',
          customerId: c.id,
          customerName: c.alias || c.nombre,
          fechaCreacion: now.toISOString(),
        });
      }
    }
  });

  // 4. Clientes Morosos con Deuda sin Pagos (>14 días) (Prioridad Media)
  customers.forEach((c) => {
    if (c.saldoActual > 100000) {
      let daysWithoutPayment = 999;
      if (c.fechaUltimoPago) {
        const diff = Math.abs(now.getTime() - new Date(c.fechaUltimoPago).getTime());
        daysWithoutPayment = Math.floor(diff / (1000 * 60 * 60 * 24));
      }
      if (daysWithoutPayment >= 14 && daysWithoutPayment < 999) {
        alerts.push({
          id: `alt_pago_${c.id}`,
          titulo: `Saldo pendiente sin cobro: ${c.alias || c.nombre}`,
          descripcion: `Deuda de $${c.saldoActual.toLocaleString('es-AR')} sin registrar ningún pago hace ${daysWithoutPayment} días.`,
          prioridad: 'MEDIA',
          tipo: 'MOROSO_SIN_PAGO',
          customerId: c.id,
          customerName: c.alias || c.nombre,
          fechaCreacion: now.toISOString(),
        });
      }
    }
  });

  // Ordenar alertas por prioridad: CRITICA -> ALTA -> MEDIA -> BAJA
  const priorityWeight: Record<AlertPriority, number> = {
    CRITICA: 4,
    ALTA: 3,
    MEDIA: 2,
    BAJA: 1,
  };

  return alerts.sort((a, b) => priorityWeight[b.prioridad] - priorityWeight[a.prioridad]);
}
