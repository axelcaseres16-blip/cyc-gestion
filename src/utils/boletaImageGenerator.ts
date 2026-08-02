import { VirtualBoleta } from '../types';
import { formatCurrency } from './formatters';

/**
 * Generates a high-resolution (1080px wide) PNG image data URL of a Virtual Boleta
 * optimized for mobile devices and WhatsApp sharing.
 */
export async function generateBoletaImage(boleta: VirtualBoleta): Promise<string> {
  return new Promise((resolve) => {
    // 1080px wide canvas for mobile optimization
    const width = 1080;
    
    // Calculate required height dynamically based on item count
    const headerHeight = 360;
    const metaHeight = 220;
    const itemHeight = 65;
    const tableHeaderHeight = 60;
    const itemsCount = Math.max(1, boleta.items.length);
    const tableTotalHeight = tableHeaderHeight + itemsCount * itemHeight;
    const totalsHeight = 320;
    const footerHeight = 140;
    
    const totalCanvasHeight = headerHeight + metaHeight + tableTotalHeight + totalsHeight + footerHeight;

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
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, width - 20, totalCanvasHeight - 20);

    // 2. Header Banner
    ctx.fillStyle = '#0F172A'; // Slate 900
    ctx.fillRect(20, 20, width - 40, 180);

    // Brand Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'black 46px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MENUDENCIAS C&C', width / 2, 85);

    // Subtitle
    ctx.fillStyle = '#10B981'; // Emerald 500
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('DISTRIBUIDORA DE CARNES Y SUBPRODUCTOS', width / 2, 125);

    // Document Title
    ctx.fillStyle = '#94A3B8'; // Slate 400
    ctx.font = '600 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('COMPROBANTE DIGITAL DE VENTA', width / 2, 155);

    // 3. Payment Status Banner (PAGADO / PAGO PARCIAL / DEBE)
    let statusText = 'PAGADO';
    let statusBg = '#059669'; // Emerald 600
    if (boleta.saldoRestanteBoleta > 0 && boleta.totalPagado > 0) {
      statusText = 'PAGO PARCIAL';
      statusBg = '#D97706'; // Amber 600
    } else if (boleta.saldoRestanteBoleta > 0 && boleta.totalPagado === 0) {
      statusText = 'DEBE (A CUENTA CORRIENTE)';
      statusBg = '#DC2626'; // Red 600
    }

    // Draw status rectangle
    ctx.fillStyle = statusBg;
    ctx.beginPath();
    ctx.roundRect(40, 220, width - 80, 80, 16);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'black 34px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`ESTADO: ${statusText}`, width / 2, 272);

    // 4. Metadata Box
    const metaY = 320;
    ctx.fillStyle = '#F8FAFC'; // Slate 50
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(40, metaY, width - 80, 180, 12);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748B'; // Slate 500
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';

    // Left Metadata
    ctx.fillText('CLIENTE:', 70, metaY + 45);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'black 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(boleta.customerName, 170, metaY + 45);

    if (boleta.branchName) {
      ctx.fillStyle = '#047857';
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.fillText(`SUCURSAL: ${boleta.branchName}`, 70, metaY + 80);
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
    ctx.fillText(`FECHA Y HORA: ${fechaFormatted} - ${horaFormatted} hs`, 70, metaY + 120);
    ctx.fillText(`REGISTRADO POR: ${boleta.registradoPor}`, 70, metaY + 152);

    // Right Metadata
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'black 26px system-ui, -apple-system, sans-serif';
    ctx.fillText(`BOLETA N° ${boleta.numeroBoleta}`, width - 70, metaY + 45);

    ctx.fillStyle = '#475569';
    ctx.font = '600 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(`LISTA: ${boleta.listaPrecioAplicada}`, width - 70, metaY + 85);

    // 5. Product Detail Table
    const tableY = metaY + 210;

    // Table Header
    ctx.fillStyle = '#1E293B'; // Slate 800
    ctx.beginPath();
    ctx.roundRect(40, tableY, width - 80, tableHeaderHeight, [8, 8, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PRODUCTO / DETALLE', 60, tableY + 38);

    ctx.textAlign = 'center';
    ctx.fillText('CANT / KILAJE', 530, tableY + 38);
    ctx.fillText('PRECIO UN.', 750, tableY + 38);

    ctx.textAlign = 'right';
    ctx.fillText('SUBTOTAL', width - 60, tableY + 38);

    // Table Rows
    let currentY = tableY + tableHeaderHeight;
    boleta.items.forEach((item, index) => {
      // Row Background
      ctx.fillStyle = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      ctx.fillRect(40, currentY, width - 80, itemHeight);

      // Divider line
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, currentY + itemHeight);
      ctx.lineTo(width - 40, currentY + itemHeight);
      ctx.stroke();

      // Product Name
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(item.productName, 60, currentY + 38);

      // Cant / Kilaje
      ctx.textAlign = 'center';
      ctx.fillStyle = '#334155';
      ctx.font = '600 19px system-ui, -apple-system, sans-serif';

      let qtyStr = '';
      if (item.unidades > 0 && item.kilajeReal > 0) {
        qtyStr = `${item.unidades} u / ${item.kilajeReal.toLocaleString('es-AR')} kg`;
      } else if (item.kilajeReal > 0) {
        qtyStr = `${item.kilajeReal.toLocaleString('es-AR')} kg`;
      } else {
        qtyStr = `${item.unidades} u`;
      }
      ctx.fillText(qtyStr, 530, currentY + 38);

      // Precio Un
      ctx.fillText(`$ ${item.precioAplicado.toLocaleString('es-AR')}`, 750, currentY + 38);

      // Subtotal
      ctx.textAlign = 'right';
      ctx.fillStyle = '#0F172A';
      ctx.font = 'black 21px system-ui, -apple-system, sans-serif';
      ctx.fillText(`$ ${item.subtotal.toLocaleString('es-AR')}`, width - 60, currentY + 38);

      currentY += itemHeight;
    });

    // 6. Totals Box
    const totalsY = currentY + 30;

    ctx.fillStyle = '#F1F5F9'; // Slate 100
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(40, totalsY, width - 80, 270, 16);
    ctx.fill();
    ctx.stroke();

    // Line 1: Subtotal and Total
    ctx.textAlign = 'left';
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.fillText('SUBTOTAL PRODUCTOS:', 70, totalsY + 45);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(`$ ${boleta.subtotal.toLocaleString('es-AR')}`, width - 70, totalsY + 45);

    let offset = 0;
    if (boleta.descuento > 0) {
      offset += 30;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#059669';
      ctx.font = '600 18px system-ui, -apple-system, sans-serif';
      ctx.fillText('DESCUENTO APLICADO:', 70, totalsY + 45 + offset);

      ctx.textAlign = 'right';
      ctx.fillText(`-$ ${boleta.descuento.toLocaleString('es-AR')}`, width - 70, totalsY + 45 + offset);
    }

    if (boleta.recargo > 0) {
      offset += 30;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#D97706';
      ctx.font = '600 18px system-ui, -apple-system, sans-serif';
      ctx.fillText('RECARGO APLICADO:', 70, totalsY + 45 + offset);

      ctx.textAlign = 'right';
      ctx.fillText(`+$ ${boleta.recargo.toLocaleString('es-AR')}`, width - 70, totalsY + 45 + offset);
    }

    // Divider
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(70, totalsY + 60 + offset);
    ctx.lineTo(width - 70, totalsY + 60 + offset);
    ctx.stroke();

    // Highlighted Total
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'black 28px system-ui, -apple-system, sans-serif';
    ctx.fillText('TOTAL BOLETA:', 70, totalsY + 105 + offset);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#059669';
    ctx.font = 'black 34px system-ui, -apple-system, sans-serif';
    ctx.fillText(`$ ${boleta.total.toLocaleString('es-AR')}`, width - 70, totalsY + 105 + offset);

    // Payments & Balances
    const payY = totalsY + 150 + offset;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.roundRect(60, payY, width - 120, 100, 10);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#334155';
    ctx.font = '600 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(`PAGADO HOY: $ ${boleta.totalPagado.toLocaleString('es-AR')}`, 80, payY + 40);

    let efecTransStr = [];
    if (boleta.pagoEfectivo > 0) efecTransStr.push(`Efectivo: $${boleta.pagoEfectivo.toLocaleString('es-AR')}`);
    if (boleta.pagoTransferencia > 0) efecTransStr.push(`Transf: $${boleta.pagoTransferencia.toLocaleString('es-AR')}`);
    if (boleta.pagoOtros > 0) efecTransStr.push(`Otros: $${boleta.pagoOtros.toLocaleString('es-AR')}`);
    
    if (efecTransStr.length > 0) {
      ctx.fillStyle = '#64748B';
      ctx.font = '500 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(`(${efecTransStr.join(' | ')})`, 80, payY + 70);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = boleta.saldoRestanteBoleta > 0 ? '#DC2626' : '#059669';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.fillText(`SALDO BOLETA: $ ${boleta.saldoRestanteBoleta.toLocaleString('es-AR')}`, width - 80, payY + 40);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'black 20px system-ui, -apple-system, sans-serif';
    ctx.fillText(`SALDO TOTAL CTE: $ ${boleta.nuevoSaldoCuenta.toLocaleString('es-AR')}`, width - 80, payY + 75);

    // 7. Footer
    const footerY = totalsY + 290;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('¡Muchas gracias por su compra!', width / 2, footerY + 30);

    ctx.fillStyle = '#64748B';
    ctx.font = '500 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('Menudencias C&C - Documento Digital Oficial', width / 2, footerY + 60);

    // Output Data URL
    resolve(canvas.toDataURL('image/png'));
  });
}
