import { CustomerWithBalance, Movement, CustomerVisit, AppUser } from '../types';
import { calculateShiftStats } from './shiftManager';
import { formatCurrency, formatDate } from './formatters';
import { isMovementFinanciallyActive } from './movementFinancialState';

export function generateDailySummaryHTML(
  currentUser: AppUser,
  customers: CustomerWithBalance[],
  movements: Movement[] = [],
  visits: CustomerVisit[] = [],
  observaciones: string = ''
): string {
  const stats = calculateShiftStats(customers, movements, visits);
  const todayStr = new Date().toISOString().split('T')[0];
  const salesToday = movements.filter((m) => isMovementFinanciallyActive(m) && m.tipo === 'BOLETA' && m.fecha.startsWith(todayStr));
  const paymentsToday = movements.filter((m) => isMovementFinanciallyActive(m) && m.tipo === 'PAGO' && m.fecha.startsWith(todayStr));

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <title>Resumen de Cierre Diario - C&C Gestión</title>
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
        color: #0f172a;
        margin: 0;
        padding: 24px;
        background-color: #ffffff;
      }
      .header {
        border-bottom: 3px solid #0f172a;
        padding-bottom: 12px;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .title {
        font-size: 22px;
        font-weight: 900;
        margin: 0;
        color: #0f172a;
      }
      .subtitle {
        font-size: 13px;
        color: #64748b;
        margin-top: 4px;
      }
      .badge {
        background-color: #0f172a;
        color: #ffffff;
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: bold;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 20px;
      }
      .card {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px;
      }
      .card-title {
        font-size: 11px;
        color: #64748b;
        text-transform: uppercase;
        font-weight: bold;
      }
      .card-value {
        font-size: 18px;
        font-weight: 900;
        margin-top: 4px;
        color: #0f172a;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        font-size: 12px;
      }
      th, td {
        border: 1px solid #e2e8f0;
        padding: 8px 10px;
        text-align: left;
      }
      th {
        background-color: #f1f5f9;
        font-weight: bold;
        text-transform: uppercase;
        font-size: 11px;
      }
      .section-title {
        font-size: 14px;
        font-weight: 800;
        margin-top: 20px;
        margin-bottom: 10px;
        border-left: 4px solid #2563eb;
        padding-left: 8px;
      }
      .footer {
        margin-top: 40px;
        border-top: 1px solid #e2e8f0;
        padding-top: 20px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
      }
      .signature-box {
        width: 220px;
        border-top: 1px dashed #0f172a;
        text-align: center;
        padding-top: 6px;
        font-size: 11px;
        font-weight: bold;
      }
      @media print {
        body { padding: 0; }
        .no-print { display: none; }
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <h1 class="title">C&C DISTRIBUIDORA - RESUMEN DE JORNADA DE REPARTO</h1>
        <div class="subtitle">Fecha: ${formatDate(new Date().toISOString())} | Chofer / Responsable: <strong>${currentUser.nombre} (${currentUser.role})</strong></div>
      </div>
      <div class="badge">TIEMPO REPARTO: ${stats.elapsedFormatted}</div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Clientes Visitados</div>
        <div class="card-value">${stats.clientesVisitados} / ${stats.totalClientesRuta}</div>
      </div>
      <div class="card">
        <div class="card-title">Ventas Totales ($)</div>
        <div class="card-value">${formatCurrency(stats.totalVentasMonto)}</div>
      </div>
      <div class="card">
        <div class="card-title">Total Cobrado en Ruta</div>
        <div class="card-value" style="color: #059669;">${formatCurrency(stats.totalCobradoMonto)}</div>
      </div>
      <div class="card">
        <div class="card-title">Cobro Efectivo en Mano</div>
        <div class="card-value">${formatCurrency(stats.cobradoEfectivo)}</div>
      </div>
      <div class="card">
        <div class="card-title">Cobro Transferencias</div>
        <div class="card-value">${formatCurrency(stats.cobradoTransferencia)}</div>
      </div>
      <div class="card">
        <div class="card-title">Fiado Generado (Saldo Aumentado)</div>
        <div class="card-value" style="color: #dc2626;">${formatCurrency(stats.fiadoGeneradoMonto)}</div>
      </div>
    </div>

    <div class="section-title">DETALLE DE BOLETAS EMITIDAS HOY (${salesToday.length})</div>
    <table>
      <thead>
        <tr>
          <th>N° Boleta</th>
          <th>Cliente</th>
          <th>Importe</th>
          <th>Estado Foto</th>
          <th>Registrado Por</th>
        </tr>
      </thead>
      <tbody>
        ${
          salesToday.length === 0
            ? '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No se registraron ventas en la jornada de hoy.</td></tr>'
            : salesToday
                .map((s) => {
                  const cust = customers.find((c) => c.id === s.customerId);
                  return `
            <tr>
              <td><strong>${s.numeroBoleta || 'S/N'}</strong></td>
              <td>${cust ? cust.alias || cust.nombre : 'Cliente'}</td>
              <td><strong>${formatCurrency(s.monto)}</strong></td>
              <td>${s.fotoUrl ? '✓ Foto Adjunta' : '⚠️ Sin Foto'}</td>
              <td>${s.registradoPor}</td>
            </tr>
          `;
                })
                .join('')
        }
      </tbody>
    </table>

    <div class="section-title">DETALLE DE COBROS Y PAGOS REGISTRADOS HOY (${paymentsToday.length})</div>
    <table>
      <thead>
        <tr>
          <th>Fecha / Hora</th>
          <th>Cliente</th>
          <th>Medio de Pago</th>
          <th>Importe</th>
          <th>Registrado Por</th>
        </tr>
      </thead>
      <tbody>
        ${
          paymentsToday.length === 0
            ? '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No se registraron cobros en la jornada de hoy.</td></tr>'
            : paymentsToday
                .map((p) => {
                  const cust = customers.find((c) => c.id === p.customerId);
                  return `
            <tr>
              <td>${new Date(p.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</td>
              <td>${cust ? cust.alias || cust.nombre : 'Cliente'}</td>
              <td>${p.metodoPago || 'EFECTIVO'}</td>
              <td style="color:#059669;"><strong>${formatCurrency(p.monto)}</strong></td>
              <td>${p.registradoPor}</td>
            </tr>
          `;
                })
                .join('')
        }
      </tbody>
    </table>

    ${
      observaciones
        ? `<div class="section-title">OBSERVACIONES DEL DIA</div>
           <div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; font-size:12px; color:#334155;">
             ${observaciones}
           </div>`
        : ''
    }

    <div class="footer">
      <div>
        <p style="font-size:11px; color:#64748b; margin:0;">C&C Gestión v3.0 - Sistema Oficial de Control de Reparto</p>
        <p style="font-size:11px; color:#64748b; margin:2px 0 0 0;">Generado el ${new Date().toLocaleString('es-AR')}</p>
      </div>
      <div class="signature-box">
        Firma del Chofer / Repartidor
      </div>
    </div>
  </body>
  </html>
  `;
}

export function openPrintableDailySummary(
  currentUser: AppUser,
  customers: CustomerWithBalance[],
  movements: Movement[] = [],
  visits: CustomerVisit[] = [],
  observaciones: string = ''
): void {
  const html = generateDailySummaryHTML(currentUser, customers, movements, visits, observaciones);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  } else {
    alert('Por favor autorice las ventanas emergentes para generar el reporte de impresión.');
  }
}
