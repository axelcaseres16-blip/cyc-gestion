import React, { useState, useEffect } from 'react';
import { VirtualBoleta, AppUser } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  normalizeArgentineWhatsAppNumber,
  buildValidatedWhatsAppUrl,
  NormalizedPhoneResult,
} from '../utils/whatsappUtils';
import {
  savePendingCompletedSale,
  updatePendingSaleEnvioEstado,
  clearPendingCompletedSale,
  PendingCompletedSale,
  EnvioEstado,
} from '../utils/completedSaleStorage';
import { getStoredCustomers, saveCustomers } from '../utils/storage';
import { getPersistedVirtualBoletaImageUrl, persistVirtualBoletaImage } from '../utils/virtualBoletaImageStorage';
import { generateBoletaImage } from '../utils/boletaImageGenerator';
import {
  X,
  CheckCircle2,
  FileText,
  User,
  Calendar,
  MessageSquare,
  Eye,
  ArrowRight,
  Paperclip,
  AlertTriangle,
  Edit3,
  Copy,
  Check,
} from 'lucide-react';

const buildShortInvoiceMessage = (boleta: VirtualBoleta) =>
  `Hola ${boleta.customerName}, te enviamos el comprobante de la compra realizada hoy.\n` +
  `Total de la boleta: ${formatCurrency(boleta.total)}\n` +
  `Saldo actualizado: ${formatCurrency(boleta.nuevoSaldoCuenta)}\n\nMuchas gracias.`;

interface VirtualBoletaModalProps {
  boleta: VirtualBoleta;
  onClose: () => void;
  onViewImage?: (url: string, title: string) => void;
  currentUser: AppUser;
  customerPhone?: string;
  initialEnvioEstado?: EnvioEstado;
  activeViewName?: string;
}

export const VirtualBoletaModal: React.FC<VirtualBoletaModalProps> = ({
  boleta,
  onClose,
  onViewImage,
  currentUser,
  customerPhone = '',
  initialEnvioEstado = 'NO_ENVIADO',
  activeViewName = 'boletavirtual',
}) => {
  const isAnulado = boleta.isAnulado;
  const isCancellationInProgress = boleta.estadoAnulacion === 'ANULACION_EN_PROCESO';

  const [currentPhone, setCurrentPhone] = useState(customerPhone);
  const [phoneResult, setPhoneResult] = useState<NormalizedPhoneResult>(() =>
    normalizeArgentineWhatsAppNumber(customerPhone)
  );

  const [envioEstado, setEnvioEstado] = useState<EnvioEstado>(initialEnvioEstado);
  const [showPhoneErrorModal, setShowPhoneErrorModal] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editedPhoneValue, setEditedPhoneValue] = useState(customerPhone);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [showConfirmReturnPrompt, setShowConfirmReturnPrompt] = useState(false);
  const [persistedImageUrl, setPersistedImageUrl] = useState<string>('');
  const shortMessage = buildShortInvoiceMessage(boleta);
  const imageUrl = persistedImageUrl || boleta.comprobanteImagenUrl || '';

  useEffect(() => {
    let objectUrl = '';
    if (!boleta.imageId) return;
    getPersistedVirtualBoletaImageUrl(boleta.imageId).then((url) => {
      if (url) {
        objectUrl = url.startsWith('blob:') ? url : '';
        setPersistedImageUrl(url);
      }
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [boleta.imageId]);

  // Sync state to persistent storage cc_last_completed_sale
  useEffect(() => {
    const salePayload: PendingCompletedSale = {
      id: boleta.id,
      boleta,
      customerId: boleta.customerId,
      customerName: boleta.customerName,
      customerPhone: currentPhone,
      branchName: boleta.branchName,
      messagePrepared: shortMessage,
      total: boleta.total,
      totalPagado: boleta.totalPagado,
      saldoRestanteBoleta: boleta.saldoRestanteBoleta,
      nuevoSaldoCuenta: boleta.nuevoSaldoCuenta,
      envioEstado,
      activeView: activeViewName,
      timestamp: boleta.fechaHora || new Date().toISOString(),
      usuario: currentUser.nombre,
      isClosed: false,
    };
    savePendingCompletedSale(salePayload);
  }, [boleta, currentPhone, envioEstado, activeViewName, currentUser.nombre, shortMessage, imageUrl]);

  // Listen for visibility changes (returning to app from WhatsApp)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && envioEstado === 'COMPARTIR_ABIERTO') {
        setShowConfirmReturnPrompt(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [envioEstado]);

  useEffect(() => {
    if (initialEnvioEstado === 'COMPARTIR_ABIERTO') {
      setShowConfirmReturnPrompt(true);
    }
  }, [initialEnvioEstado]);

  // Determine Payment Status Badge
  let statusText = 'PAGADO';
  let statusBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  let statusCardColor = 'bg-emerald-50 border-emerald-200 text-emerald-800';

  if (boleta.saldoRestanteBoleta > 0 && boleta.totalPagado > 0) {
    statusText = 'PAGO PARCIAL';
    statusBadgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    statusCardColor = 'bg-amber-50 border-amber-200 text-amber-800';
  } else if (boleta.saldoRestanteBoleta > 0 && boleta.totalPagado === 0) {
    statusText = 'DEBE (A CUENTA CORRIENTE)';
    statusBadgeColor = 'bg-red-500/20 text-red-300 border-red-500/30';
    statusCardColor = 'bg-red-50 border-red-200 text-red-800';
  }

  const handleOpenCustomerChat = () => {
    const norm = normalizeArgentineWhatsAppNumber(currentPhone);
    setPhoneResult(norm);

    if (!norm.isValid) {
      setShowPhoneErrorModal(true);
      return;
    }

    const { url } = buildValidatedWhatsAppUrl(currentPhone, shortMessage);

    if (url) {
      window.open(url, '_blank');
    } else {
      setShowPhoneErrorModal(true);
    }
  };

  // Save edited phone back to customer storage and update local state
  const handleSavePhoneCorrection = () => {
    const norm = normalizeArgentineWhatsAppNumber(editedPhoneValue);
    setPhoneResult(norm);
    setCurrentPhone(editedPhoneValue);

    if (boleta.customerId) {
      const customers = getStoredCustomers();
      const idx = customers.findIndex((c) => c.id === boleta.customerId);
      if (idx !== -1) {
        customers[idx].telefono = editedPhoneValue.trim();
        customers[idx].telefonoOriginal = editedPhoneValue.trim();
        customers[idx].telefonoWhatsAppNormalizado = norm.isValid ? norm.normalized : '';
        customers[idx].updatedAt = new Date().toISOString();
        saveCustomers(customers);
      }
    }

    setIsEditingPhone(false);

    if (norm.isValid) {
      setShowPhoneErrorModal(false);
      const url = `https://wa.me/${norm.normalized}?text=${encodeURIComponent(shortMessage)}`;
      window.open(url, '_blank');
    }
  };

  const ensurePersistedImage = async () => {
    const storedImage = await getPersistedVirtualBoletaImageUrl(boleta.imageId);
    if (storedImage) {
      setPersistedImageUrl(storedImage);
      return storedImage;
    }

    if (imageUrl) {
      await persistVirtualBoletaImage(boleta, imageUrl, boleta.movementIdPrincipal);
      setPersistedImageUrl(imageUrl);
      return imageUrl;
    }

    const generatedImage = await generateBoletaImage(boleta);
    await persistVirtualBoletaImage(boleta, generatedImage, boleta.movementIdPrincipal);
    setPersistedImageUrl(generatedImage);
    return generatedImage;
  };

  const handleSaveImage = async () => {
    const sourceImage = await ensurePersistedImage();
    if (!sourceImage) return;
    const download = document.createElement('a');
    download.href = sourceImage;
    download.download = `Boleta-CYC-${boleta.numeroBoleta}.png`;
    document.body.appendChild(download);
    download.click();
    download.remove();
  };

  const handleShareInvoiceImage = async () => {
    try {
      const sourceImage = await ensurePersistedImage();
      const imageResponse = await fetch(sourceImage);
      const imageBlob = await imageResponse.blob();
      const imageFile = new File(
        [imageBlob],
        `Boleta-CYC-${boleta.numeroBoleta}.png`,
        { type: 'image/png' }
      );
      const shareData = {
        files: [imageFile],
        title: `Boleta C&C ${boleta.numeroBoleta}`,
        text: shortMessage,
      };

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
        setEnvioEstado('COMPARTIR_ABIERTO');
        updatePendingSaleEnvioEstado('COMPARTIR_ABIERTO');
        await navigator.share(shareData);
        setShowConfirmReturnPrompt(true);
        return;
      }

      handleSaveImage();
      handleCopyText();
      setEnvioEstado('PENDIENTE');
      updatePendingSaleEnvioEstado('PENDIENTE');
      alert('Tu navegador no permite adjuntar la imagen automáticamente. La boleta fue guardada en tu dispositivo. Abrí WhatsApp y adjuntala desde Descargas.');
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') {
        setEnvioEstado('PENDIENTE');
        updatePendingSaleEnvioEstado('PENDIENTE');
        return;
      }
      handleSaveImage();
      handleCopyText();
      setEnvioEstado('PENDIENTE');
      updatePendingSaleEnvioEstado('PENDIENTE');
      alert('No se pudo abrir el selector para adjuntar la imagen. La boleta fue guardada y el mensaje quedó copiado.');
    }
  };

  const handleCopyText = () => {
    navigator.clipboard?.writeText(shortMessage);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  // Close & reset sale for next customer
  const handleFinishAndNextCustomer = () => {
    clearPendingCompletedSale();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto border border-slate-200 relative">
        
        {/* Header Modal */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center font-black text-white text-lg shadow-inner">
              C&C
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Boleta Virtual #{boleta.numeroBoleta}
                </h3>
                {isCancellationInProgress ? (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                    ANULACIÓN EN PROCESO
                  </span>
                ) : isAnulado ? (
                  <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                    ANULADA
                  </span>
                ) : (
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${statusBadgeColor}`}>
                    {statusText}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Comprobante Digital Oficial - Menudencias C&C
              </p>
            </div>
          </div>
          <button
            onClick={handleFinishAndNextCustomer}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Cerrar y pasar al siguiente cliente"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Confirmation Banner */}
        <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-inner">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span className="text-sm font-black uppercase tracking-wider">
              Venta registrada correctamente
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {envioEstado === 'ENVIADO_CONFIRMADO' && (
              <span className="text-xs font-black bg-white text-emerald-800 px-2.5 py-1 rounded-full uppercase shadow-xs">
                ✓ Enviado por WA
              </span>
            )}
            <span className="text-xs font-bold bg-emerald-700 px-2.5 py-1 rounded-full text-emerald-100">
              Stock descontado OK
            </span>
          </div>
        </div>

        {/* Return from WhatsApp Confirmation Prompt Banner */}
        {showConfirmReturnPrompt && (
          <div className="bg-amber-50 border-b border-amber-200 p-4 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2 text-amber-900">
              <MessageSquare className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-sm">¿Pudiste enviar el comprobante a {boleta.customerName}?</p>
                <p className="text-amber-700 font-medium">Confirmá el resultado del envío por WhatsApp.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setEnvioEstado('ENVIADO_CONFIRMADO');
                  updatePendingSaleEnvioEstado('ENVIADO_CONFIRMADO');
                  setShowConfirmReturnPrompt(false);
                }}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs transition cursor-pointer"
              >
                Sí, fue enviado
              </button>
              <button
                onClick={() => {
                  setShowConfirmReturnPrompt(false);
                  handleShareInvoiceImage();
                }}
                className="px-3 py-2 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-xl transition cursor-pointer"
              >
                No, volver a compartir
              </button>
              {imageUrl && onViewImage && (
                <button
                  onClick={() => onViewImage(imageUrl, `Comprobante #${boleta.numeroBoleta}`)}
                  className="px-3 py-2 bg-white border border-slate-300 text-slate-800 font-bold rounded-xl transition cursor-pointer"
                >
                  Ver imagen
                </button>
              )}
              <button onClick={handleSaveImage} className="px-3 py-2 bg-white border border-slate-300 text-slate-800 font-bold rounded-xl transition cursor-pointer">
                Guardar imagen
              </button>
              <button onClick={handleFinishAndNextCustomer} className="px-3 py-2 text-slate-600 font-bold transition cursor-pointer">
                Ir al siguiente cliente
              </button>
              <button
                onClick={() => {
                  setEnvioEstado('PENDIENTE');
                  updatePendingSaleEnvioEstado('PENDIENTE');
                  setShowConfirmReturnPrompt(false);
                }}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition cursor-pointer"
              >
                Más tarde
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-slate-800 text-sm">
          
          {/* Main Summary Box */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-600" /> Cliente
                </p>
                <p className="font-black text-slate-900 text-lg">{boleta.customerName}</p>
                
                {/* Display Normalized Phone info */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono font-bold text-slate-700 bg-white border border-slate-300 px-2 py-0.5 rounded-md">
                    Tel: {currentPhone || 'Sin registrar'}
                  </span>
                  {phoneResult.isValid ? (
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      WA: +{phoneResult.normalized}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Formato Teléfono Inválido
                    </span>
                  )}
                </div>

                {boleta.branchName && (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md mt-1 inline-block">
                    Sucursal: {boleta.branchName}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${isCancellationInProgress ? 'bg-amber-50 border-amber-200 text-amber-800' : statusCardColor}`}>
                  ESTADO: {isCancellationInProgress ? 'ANULACIÓN EN PROCESO' : isAnulado ? 'ANULADA' : statusText}
                </span>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {new Date(boleta.fechaHora).toLocaleString('es-AR')}
                </p>
              </div>
            </div>

            {/* Financial Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold block">Total Boleta:</span>
                <span className="font-black text-slate-900 text-base">{formatCurrency(boleta.total)}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold block">Pagado Hoy:</span>
                <span className="font-black text-emerald-700 text-base">{formatCurrency(boleta.totalPagado)}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold block">Saldo Boleta:</span>
                <span className="font-black text-red-600 text-base">{formatCurrency(boleta.saldoRestanteBoleta)}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold block">Saldo Total Cta. Cte.:</span>
                <span className="font-black text-slate-900 text-base">{formatCurrency(boleta.nuevoSaldoCuenta)}</span>
              </div>
            </div>
          </div>

          {/* Generated 1080px Image Preview Container */}
          {imageUrl ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" /> Comprobante Digital Generado (1080px)
                </h4>
                {boleta.hasGeneratedImage && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Imagen guardada</span>
                )}
                <button
                  onClick={() => onViewImage && onViewImage(imageUrl, `Comprobante #${boleta.numeroBoleta}`)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-4 h-4" /> Ver en Grande
                </button>
              </div>

              <div className="bg-slate-900 rounded-2xl p-2 border border-slate-700 overflow-hidden shadow-lg max-h-72 flex justify-center">
                <img
                  src={imageUrl}
                  alt={`Comprobante ${boleta.numeroBoleta}`}
                  className="max-h-68 object-contain rounded-lg cursor-pointer hover:scale-[1.01] transition"
                  onClick={() => onViewImage && onViewImage(imageUrl, `Comprobante #${boleta.numeroBoleta}`)}
                />
              </div>
            </div>
          ) : (
            /* Items Table Fallback */
            <div>
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" /> Detalle de Mercadería ({boleta.items.length} ítems)
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">Producto</th>
                      <th className="px-3 py-2 text-center">Un / Kg</th>
                      <th className="px-3 py-2 text-right">Precio Un.</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {boleta.items.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="px-3 py-2 font-bold text-slate-900">{item.productName}</td>
                        <td className="px-3 py-2 text-center text-slate-700">
                          {item.unidades > 0 ? `${item.unidades}u` : ''} {item.kilajeReal > 0 ? `${item.kilajeReal}kg` : ''}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(item.precioAplicado)}</td>
                        <td className="px-3 py-2 text-right font-black text-slate-900">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Optional Observation File Preview if present */}
          {boleta.fotoBoletaFisicaUrl && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Paperclip className="w-4 h-4 text-blue-600" /> Documento u observación adjunta opcional
              </span>
              <button
                onClick={() => onViewImage && onViewImage(boleta.fotoBoletaFisicaUrl!, `Adjunto #${boleta.numeroBoleta}`)}
                className="font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Ver Adjunto
              </button>
            </div>
          )}
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="bg-slate-100 px-4 sm:px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          <button
            onClick={handleSaveImage}
            className="w-full sm:w-auto flex items-center justify-center space-x-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 rounded-xl border border-slate-300 transition cursor-pointer"
          >
            <Paperclip className="w-4 h-4 text-slate-600" />
            <span>Guardar imagen</span>
          </button>

          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            {!imageUrl && (
              <button
                onClick={handleSaveImage}
                className="w-full sm:w-auto flex items-center justify-center space-x-1.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 px-3.5 py-2.5 rounded-xl border border-amber-300 transition cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Generar y guardar comprobante</span>
              </button>
            )}
            {imageUrl && (
              <button
                onClick={() => onViewImage && onViewImage(imageUrl, `Comprobante #${boleta.numeroBoleta}`)}
                className="w-full sm:w-auto flex items-center justify-center space-x-1.5 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-900 px-3.5 py-2.5 rounded-xl transition cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Ver Comprobante</span>
              </button>
            )}

            <button
              onClick={handleCopyText}
              className="w-full sm:w-auto flex items-center justify-center space-x-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 rounded-xl border border-slate-300 transition cursor-pointer"
            >
              {copiedSuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSuccess ? 'Mensaje copiado' : 'Copiar mensaje'}</span>
            </button>

            <button
              onClick={handleOpenCustomerChat}
              className="w-full sm:w-auto flex items-center justify-center space-x-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 rounded-xl border border-slate-300 transition cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Abrir chat del cliente</span>
            </button>

            <button
              onClick={handleShareInvoiceImage}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Compartir imagen por WhatsApp</span>
            </button>

            <button
              onClick={handleFinishAndNextCustomer}
              className="w-full sm:w-auto flex items-center justify-center space-x-1.5 text-xs font-black bg-slate-900 hover:bg-black text-white px-4 py-2.5 rounded-xl transition cursor-pointer"
            >
              <span>Ir al siguiente cliente</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Error de Teléfono Inválido / Editar Teléfono (Validación Estricta) */}
        {showPhoneErrorModal && (
          <div className="absolute inset-0 z-60 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4">
              <div className="flex items-center space-x-3 text-red-600 border-b border-slate-100 pb-3">
                <div className="p-2 bg-red-100 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Formato de Teléfono Inválido</h3>
                  <p className="text-xs text-slate-500">No se puede abrir WhatsApp directamente</p>
                </div>
              </div>

              <div className="bg-red-50 p-3.5 rounded-xl border border-red-200 text-xs text-red-900 space-y-2">
                <p className="font-extrabold">
                  “El teléfono de este cliente no tiene un formato válido para WhatsApp.”
                </p>
                <p className="text-slate-600 font-medium">
                  Teléfono actual cargado: <span className="font-mono font-bold text-slate-900">{currentPhone || 'Vacío'}</span>
                </p>
                {phoneResult.errorMessage && (
                  <p className="text-red-700 text-[11px] bg-white p-2 rounded-lg border border-red-200 font-medium">
                    {phoneResult.errorMessage}
                  </p>
                )}
              </div>

              {/* Editing inline form */}
              {isEditingPhone ? (
                <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-300">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Ingrese el número correcto con código de área (sin 0 ni 15):
                  </label>
                  <input
                    type="text"
                    value={editedPhoneValue}
                    onChange={(e) => setEditedPhoneValue(e.target.value)}
                    placeholder="Ej: 11 2708-7938 o 011 15-2708-7938"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-500">
                    Sugerencia: 1127087938 → WhatsApp generará automáticamente +54 9 11 2708-7938.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSavePhoneCorrection}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-xl transition cursor-pointer"
                    >
                      Guardar y Probar WhatsApp
                    </button>
                    <button
                      onClick={() => setIsEditingPhone(false)}
                      className="px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs py-2 rounded-xl transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 text-xs font-extrabold pt-1">
                  <button
                    onClick={() => {
                      setEditedPhoneValue(currentPhone);
                      setIsEditingPhone(true);
                    }}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Editar teléfono del cliente</span>
                  </button>

                  <button
                    onClick={handleCopyText}
                    className="w-full flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl border border-slate-300 transition cursor-pointer"
                  >
                    {copiedSuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSuccess ? '¡Comprobante copiado!' : 'Copiar texto del comprobante'}</span>
                  </button>

                  <button
                    onClick={handleSaveImage}
                    className="w-full flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl border border-slate-300 transition cursor-pointer"
                  >
                    <Paperclip className="w-4 h-4" />
                    <span>Guardar imagen</span>
                  </button>

                  <button
                    onClick={() => setShowPhoneErrorModal(false)}
                    className="w-full py-2.5 text-slate-500 hover:text-slate-800 font-bold transition text-center cursor-pointer"
                  >
                    Volver
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
