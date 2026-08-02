import React, { useState, useEffect } from 'react';
import { VirtualBoleta, AppUser, Customer } from '../types';
import { formatCurrency } from '../utils/formatters';
import { generateCustomerVirtualBoletaWpMessage } from '../utils/stockAndBoletasManager';
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
import {
  X,
  Share2,
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

  // Sync state to persistent storage cc_last_completed_sale
  useEffect(() => {
    const salePayload: PendingCompletedSale = {
      id: boleta.id,
      boleta,
      customerId: boleta.customerId,
      customerName: boleta.customerName,
      customerPhone: currentPhone,
      branchName: boleta.branchName,
      comprobanteImagenUrl: boleta.comprobanteImagenUrl,
      messagePrepared: generateCustomerVirtualBoletaWpMessage(boleta.customerName, boleta),
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
  }, [boleta, currentPhone, envioEstado, activeViewName, currentUser.nombre]);

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

  // Handle WhatsApp button press with phone validation
  const handleSendToCustomerWp = () => {
    const norm = normalizeArgentineWhatsAppNumber(currentPhone);
    setPhoneResult(norm);

    if (!norm.isValid) {
      setShowPhoneErrorModal(true);
      return;
    }

    const text = generateCustomerVirtualBoletaWpMessage(boleta.customerName, boleta);
    const { url } = buildValidatedWhatsAppUrl(currentPhone, text);

    if (url) {
      setEnvioEstado('COMPARTIR_ABIERTO');
      updatePendingSaleEnvioEstado('COMPARTIR_ABIERTO');
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
      // Auto trigger send after editing to valid phone
      const text = generateCustomerVirtualBoletaWpMessage(boleta.customerName, boleta);
      const url = `https://wa.me/${norm.normalized}?text=${encodeURIComponent(text)}`;
      setEnvioEstado('COMPARTIR_ABIERTO');
      updatePendingSaleEnvioEstado('COMPARTIR_ABIERTO');
      window.open(url, '_blank');
    }
  };

  // Share via native Web Share API
  const handleShareOther = async () => {
    const text = generateCustomerVirtualBoletaWpMessage(boleta.customerName, boleta);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Boleta Virtual #${boleta.numeroBoleta} - Menudencias C&C`,
          text: text,
        });
        setEnvioEstado('ENVIADO_CONFIRMADO');
        updatePendingSaleEnvioEstado('ENVIADO_CONFIRMADO');
      } catch (err) {
        // Share cancelled
      }
    } else {
      handleCopyText();
    }
  };

  const handleCopyText = () => {
    const text = generateCustomerVirtualBoletaWpMessage(boleta.customerName, boleta);
    navigator.clipboard?.writeText(text);
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
                {isAnulado ? (
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
            <div className="flex items-center gap-2 w-full sm:w-auto">
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
                  handleSendToCustomerWp();
                }}
                className="px-3 py-2 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-xl transition cursor-pointer"
              >
                Reintentar
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
                <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${statusCardColor}`}>
                  ESTADO: {statusText}
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
          {boleta.comprobanteImagenUrl ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" /> Comprobante Digital Generado (1080px)
                </h4>
                <button
                  onClick={() => onViewImage && onViewImage(boleta.comprobanteImagenUrl!, `Comprobante #${boleta.numeroBoleta}`)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-4 h-4" /> Ver en Grande
                </button>
              </div>

              <div className="bg-slate-900 rounded-2xl p-2 border border-slate-700 overflow-hidden shadow-lg max-h-72 flex justify-center">
                <img
                  src={boleta.comprobanteImagenUrl}
                  alt={`Comprobante ${boleta.numeroBoleta}`}
                  className="max-h-68 object-contain rounded-lg cursor-pointer hover:scale-[1.01] transition"
                  onClick={() => onViewImage && onViewImage(boleta.comprobanteImagenUrl!, `Comprobante #${boleta.numeroBoleta}`)}
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
            onClick={handleShareOther}
            className="w-full sm:w-auto flex items-center justify-center space-x-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 rounded-xl border border-slate-300 transition cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-slate-600" />
            <span>Compartir por otro medio</span>
          </button>

          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            {boleta.comprobanteImagenUrl && (
              <button
                onClick={() => onViewImage && onViewImage(boleta.comprobanteImagenUrl!, `Comprobante #${boleta.numeroBoleta}`)}
                className="w-full sm:w-auto flex items-center justify-center space-x-1.5 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-900 px-3.5 py-2.5 rounded-xl transition cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Ver Comprobante</span>
              </button>
            )}

            <button
              onClick={handleSendToCustomerWp}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Enviar al cliente por WhatsApp</span>
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
                    onClick={handleShareOther}
                    className="w-full flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl border border-slate-300 transition cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Compartir por otro medio</span>
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
