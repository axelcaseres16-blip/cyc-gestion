import { VirtualBoleta } from '../types';
import { formatCurrency } from './formatters';

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

/** Generates the shareable PNG using the same financial totals persisted in the virtual boleta. */
export async function generateBoletaImage(boleta: VirtualBoleta): Promise<string> {
  return new Promise((resolve) => {
    const width = 1080;
    const headerHeight = 250;
    const metadataHeight = 170;
    const tableHeaderHeight = 52;
    const itemHeight = 58;
    const financialHeight = 470;
    const footerHeight = 110;
    const itemsCount = Math.max(1, boleta.items.length);
    const height = headerHeight + metadataHeight + tableHeaderHeight + itemsCount * itemHeight + financialHeight + footerHeight;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve('');
      return;
    }

    const saldoAnterior = boleta.saldoAnteriorCuenta;
    const totalGeneral = saldoAnterior + boleta.total;
    const saldoActualizado = boleta.nuevoSaldoCuenta;
    const estadoBoleta = boleta.saldoRestanteBoleta <= 0
      ? 'BOLETA PAGADA'
      : boleta.totalPagado > 0
        ? 'BOLETA CON PAGO PARCIAL'
        : 'BOLETA NO PAGADA';
    const estadoCuenta = saldoActualizado === 0
      ? 'AL DÍA'
      : saldoActualizado > 0
        ? `DEBE ${formatCurrency(saldoActualizado)}`
        : `A FAVOR ${formatCurrency(Math.abs(saldoActualizado))}`;
    const estadoCuentaColor = saldoActualizado === 0 ? '#059669' : saldoActualizado > 0 ? '#DC2626' : '#2563EB';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(20, 20, width - 40, 175);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'black 46px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MENUDENCIAS C&C', width / 2, 85);
    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 21px system-ui, sans-serif';
    ctx.fillText('DISTRIBUIDORA DE CARNES Y SUBPRODUCTOS', width / 2, 124);
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillText('COMPROBANTE DIGITAL DE VENTA', width / 2, 154);

    ctx.fillStyle = estadoCuentaColor;
    ctx.beginPath();
    ctx.roundRect(40, 210, width - 80, 72, 14);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'black 25px system-ui, sans-serif';
    ctx.fillText(`${estadoBoleta}  ·  CUENTA CORRIENTE: ${estadoCuenta}`, width / 2, 256);

    const metaY = 305;
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(40, metaY, width - 80, 135, 12);
    ctx.fill();
    ctx.stroke();
    const fecha = new Date(boleta.fechaHora);
    const fechaFormatted = fecha.toLocaleDateString('es-AR');

    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('CLIENTE', 65, metaY + 35);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'black 24px system-ui, sans-serif';
    ctx.fillText(truncate(boleta.customerName, 42), 65, metaY + 67);
    ctx.fillStyle = '#475569';
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillText(`FECHA: ${fechaFormatted}`, 65, metaY + 105);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'black 25px system-ui, sans-serif';
    ctx.fillText(`BOLETA N° ${boleta.numeroBoleta}`, width - 65, metaY + 48);
    ctx.fillStyle = '#475569';
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillText(`LISTA: ${boleta.listaPrecioAplicada}`, width - 65, metaY + 85);
    if (boleta.branchName) ctx.fillText(`SUCURSAL: ${truncate(boleta.branchName, 28)}`, width - 65, metaY + 115);

    const tableY = metaY + metadataHeight;
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(40, tableY, width - 80, tableHeaderHeight);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PRODUCTO', 60, tableY + 32);
    ctx.textAlign = 'center';
    ctx.fillText('UND.', 500, tableY + 32);
    ctx.fillText('KG', 610, tableY + 32);
    ctx.fillText('PRECIO/KG', 755, tableY + 32);
    ctx.textAlign = 'right';
    ctx.fillText('IMPORTE', width - 60, tableY + 32);

    let currentY = tableY + tableHeaderHeight;
    boleta.items.forEach((item, index) => {
      ctx.fillStyle = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      ctx.fillRect(40, currentY, width - 80, itemHeight);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, currentY + itemHeight);
      ctx.lineTo(width - 40, currentY + itemHeight);
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(truncate(item.productName, 34), 60, currentY + 36);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#334155';
      ctx.font = '600 17px system-ui, sans-serif';
      ctx.fillText(item.unidades > 0 ? String(item.unidades) : '—', 500, currentY + 36);
      ctx.fillText(item.kilajeReal > 0 ? item.kilajeReal.toLocaleString('es-AR') : '—', 610, currentY + 36);
      ctx.fillText(formatCurrency(item.precioAplicado), 755, currentY + 36);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#0F172A';
      ctx.font = 'black 18px system-ui, sans-serif';
      ctx.fillText(formatCurrency(item.subtotal), width - 60, currentY + 36);
      currentY += itemHeight;
    });

    const financialY = currentY + 28;
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(40, financialY, width - 80, financialHeight - 35, 14);
    ctx.fill();
    ctx.stroke();
    const financialRows: Array<[string, number, string]> = [
      ['TOTAL DE LA BOLETA', boleta.total, '#0F172A'],
      ['SALDO ANTERIOR', saldoAnterior, '#0F172A'],
      ['TOTAL GENERAL', totalGeneral, '#0F172A'],
      ['PAGO EN EFECTIVO', boleta.pagoEfectivo, '#047857'],
      ['PAGO EN TRANSFERENCIA', boleta.pagoTransferencia, '#1D4ED8'],
      ['TOTAL PAGADO', boleta.totalPagado, '#0F172A'],
      ['SALDO ACTUALIZADO', saldoActualizado, estadoCuentaColor],
    ];
    financialRows.forEach(([label, value, color], index) => {
      const rowY = financialY + 40 + index * 44;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.fillText(label, 70, rowY);
      ctx.textAlign = 'right';
      ctx.fillStyle = color;
      ctx.font = 'black 20px system-ui, sans-serif';
      ctx.fillText(formatCurrency(value), width - 70, rowY);
    });
    ctx.strokeStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.moveTo(70, financialY + 360);
    ctx.lineTo(width - 70, financialY + 360);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'black 19px system-ui, sans-serif';
    ctx.fillText('ESTADO FINAL DE LA CUENTA', 70, financialY + 400);
    ctx.textAlign = 'right';
    ctx.fillStyle = estadoCuentaColor;
    ctx.font = 'black 24px system-ui, sans-serif';
    ctx.fillText(estadoCuenta, width - 70, financialY + 400);

    const footerY = financialY + financialHeight;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 21px system-ui, sans-serif';
    ctx.fillText('Gracias por su compra', width / 2, footerY + 30);
    ctx.fillStyle = '#64748B';
    ctx.font = '500 16px system-ui, sans-serif';
    ctx.fillText('Menudencias C&C · Documento digital', width / 2, footerY + 60);
    resolve(canvas.toDataURL('image/png'));
  });
}
