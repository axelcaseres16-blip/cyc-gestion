import { VirtualBoleta } from '../types';
import { formatCurrency } from './formatters';

/**
 * Generates a high-resolution (1080px wide) PNG image data URL of a Virtual Boleta
 * styled as a traditional digital sheet and optimized for mobile/WhatsApp sharing.
 */
export async function generateBoletaImage(boleta: VirtualBoleta): Promise<string> {
  return new Promise((resolve) => {
    const width = 1080;
    
    // Dynamic height calculation
    const headerHeight = 220;
    const metaHeight = 180;
    const itemHeight = 60;
    const tableHeaderHeight = 55;
    const itemsCount = Math.max(1, boleta.items.length);
    const tableTotalHeight = tableHeaderHeight + itemsCount * itemHeight;

    // Financial totals box height
    let totalsBoxHeight = 360;
    if (boleta.pagoEfectivo > 0) totalsBoxHeight += 35;
    if (boleta.pagoTransferencia > 0) totalsBoxHeight += 35;

    const footerHeight = 120;
    
    const totalCanvasHeight = headerHeight + metaHeight + tableTotalHeight + totalsBoxHeight + footerHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = totalCanvasHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }

    // 1. Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, totalCanvasHeight);

    // Outer border
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, width - 24, totalCanvasHeight - 24);

    // 2. Header Banner
    ctx.fillStyle = '#0F172A'; // Slate 900
    ctx.fillRect(20, 20, width - 40, 170);

    // Brand Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'black 48px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MENUDENCIAS C&C', width / 2, 82);

    // Subtitle
    ctx.fillStyle = '#10B981'; // Emerald 500
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('DISTRIBUIDORA DE CARNES Y SUBPRODUCTOS', width / 2, 120);

    // Document Title
    ctx.fillStyle = '#94A3B8'; // Slate 400
    ctx.font = '600 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('BOLETA VIRTUAL DE VENTA', width / 2, 150);

    // 3. Metadata Box
    const metaY = 205;
    ctx.fillStyle = '#F8FAFC'; // Slate 50
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(40, metaY, width - 80, 160, 12);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';

    // Left Metadata
    ctx.fillText('CLIENTE:', 65, metaY + 42);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'black 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(boleta.customerName, 160, metaY + 42);

    if (boleta.branchName) {
      ctx.fillStyle = '#047857';
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.fillText(`SUCURSAL: ${boleta.branchName}`, 65, metaY + 76);
    }

    ctx.fillStyle = '#475569';
    ctx.font = '600 18px system-ui, -apple-system, sans-serif';
    const fechaFormatted = new Date(boleta.fechaHora).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const horaFormatted = new Date(boleta.fechaHora).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    ctx.fillText(`FECHA Y HORA: ${fechaFormatted} - ${horaFormatted} hs`, 65, metaY + 112);
    ctx.fillText(`REGISTRADO POR: ${boleta.registradoPor}`, 65, metaY + 142);

    // Right Metadata
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'black 26px system-ui, -apple-system, sans-serif';
    ctx.fillText(`BOLETA N° ${boleta.numeroBoleta}`, width - 65, metaY + 42);

    ctx.fillStyle = '#475569';
    ctx.font = '600 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(`LISTA: ${boleta.listaPrecioAplicada}`, width - 65, metaY + 80);

    // 4. Product Detail Table
    const tableY = metaY + 180;

    // Table Header
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.roundRect(40, tableY, width - 80, tableHeaderHeight, [8, 8, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('UND.', 60, tableY + 35);
    ctx.fillText('PRODUCTO', 140, tableY + 35);

    ctx.textAlign = 'center';
    ctx.fillText('KGS.', 580, tableY + 35);
    ctx.fillText('PRECIO', 760, tableY + 35);

    ctx.textAlign = 'right';
    ctx.fillText('IMPORTE', width - 60, tableY + 35);

    // Table Rows
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

      // UND.
      ctx.textAlign = 'left';
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(item.unidades > 0 ? `${item.unidades}` : '-', 65, currentY + 36);

      // PRODUCTO
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(item.productName, 140, currentY + 36);

      // KGS.
      ctx.textAlign = 'center';
      ctx.fillStyle = '#334155';
      ctx.font = '600 19px system-ui, -apple-system, sans-serif';
      const kgsStr = item.kilajeReal > 0 ? item.kilajeReal.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 3 }) : '-';
      ctx.fillText(kgsStr, 580, currentY + 36);

      // PRECIO
      ctx.fillText(`$ ${item.precioAplicado.toLocaleString('es-AR')}`, 760, currentY + 36);

      // IMPORTE
      ctx.textAlign = 'right';
      ctx.fillStyle = '#0F172A';
      ctx.font = 'black 21px system-ui, -apple-system, sans-serif';
      ctx.fillText(`$ ${item.subtotal.toLocaleString('es-AR')}`, width - 60, currentY + 36);

      currentY += itemHeight;
    });

    // 5. Financial Breakdown (Exact Order required in specs)
    const totalsY = currentY + 20;

    const totalBoleta = boleta.total;
    const saldoAnterior = boleta.saldoAnteriorCuenta || 0;
    const totalGeneral = totalBoleta + saldoAnterior;
    const pagoEfectivo = boleta.pagoEfectivo || 0;
    const pagoTransferencia = boleta.pagoTransferencia || 0;
    const totalPagado = boleta.totalPagado || (pagoEfectivo + pagoTransferencia);
    const saldoActualizado = boleta.nuevoSaldoCuenta;
    const isAlDia = Math.abs(saldoActualizado) < 0.01;

    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(40, totalsY, width - 80, totalsBoxHeight, 12);
    ctx.fill();
    ctx.stroke();

    let ty = totalsY + 40;

    // 1. TOTAL DE LA BOLETA
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'black 24px system-ui, -apple-system, sans-serif';
    ctx.fillText('TOTAL DE LA BOLETA', 65, ty);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#2563EB'; // Blue
    ctx.font = 'black 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(`$ ${totalBoleta.toLocaleString('es-AR')}`, width - 65, ty);

    ty += 38;

    // 2. SALDO ANTERIOR
    ctx.textAlign = 'left';
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.fillText('SALDO ANTERIOR', 65, ty);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(`$ ${saldoAnterior.toLocaleString('es-AR')}`, width - 65, ty);

    ty += 38;

    // Divider
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(65, ty - 12);
    ctx.lineTo(width - 65, ty - 12);
    ctx.stroke();

    // 3. TOTAL GENERAL
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'black 24px system-ui, -apple-system, sans-serif';
    ctx.fillText('TOTAL GENERAL', 65, ty);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'black 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(`$ ${totalGeneral.toLocaleString('es-AR')}`, width - 65, ty);

    ty += 38;

    // 4. PAGÓ EN EFECTIVO (if applicable)
    if (pagoEfectivo > 0) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#059669';
      ctx.font = '600 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('PAGÓ EN EFECTIVO', 65, ty);

      ctx.textAlign = 'right';
      ctx.fillText(`- $ ${pagoEfectivo.toLocaleString('es-AR')}`, width - 65, ty);

      ty += 35;
    }

    // 5. PAGÓ EN TRANSFERENCIA (if applicable)
    if (pagoTransferencia > 0) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#059669';
      ctx.font = '600 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('PAGÓ EN TRANSFERENCIA', 65, ty);

      ctx.textAlign = 'right';
      ctx.fillText(`- $ ${pagoTransferencia.toLocaleString('es-AR')}`, width - 65, ty);

      ty += 35;
    }

    // 6. TOTAL PAGADO
    ctx.textAlign = 'left';
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('TOTAL PAGADO', 65, ty);

    ctx.textAlign = 'right';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(`$ ${totalPagado.toLocaleString('es-AR')}`, width - 65, ty);

    ty += 42;

    // Divider
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(65, ty - 16);
    ctx.lineTo(width - 65, ty - 16);
    ctx.stroke();

    // 7. SALDO ACTUALIZADO
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'black 26px system-ui, -apple-system, sans-serif';
    ctx.fillText('SALDO ACTUALIZADO', 65, ty);

    ctx.textAlign = 'right';
    ctx.fillStyle = isAlDia ? '#059669' : '#DC2626';
    ctx.font = 'black 30px system-ui, -apple-system, sans-serif';
    ctx.fillText(`$ ${saldoActualizado.toLocaleString('es-AR')}`, width - 65, ty);

    ty += 48;

    // 8. ESTADO FINAL
    const statusBg = isAlDia ? '#059669' : '#DC2626';
    const statusLabel = isAlDia ? 'ESTADO: AL DÍA' : `ESTADO: DEBE $ ${saldoActualizado.toLocaleString('es-AR')}`;

    ctx.fillStyle = statusBg;
    ctx.beginPath();
    ctx.roundRect(65, ty - 32, width - 130, 50, 10);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'black 24px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(statusLabel, width / 2, ty + 2);

    // 6. Footer
    const footerY = totalsY + totalsBoxHeight + 30;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('¡Muchas gracias por su compra!', width / 2, footerY + 25);

    ctx.fillStyle = '#64748B';
    ctx.font = '500 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('Menudencias C&C - Documento Digital Oficial', width / 2, footerY + 55);

    resolve(canvas.toDataURL('image/png'));
  });
}
