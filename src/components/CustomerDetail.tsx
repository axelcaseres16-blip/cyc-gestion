import React, { useState } from 'react';
import { CustomerWithBalance, Movement, CustomerVisit, WhatsAppTemplates, TimelineItem } from '../types';
import {
  formatCurrency,
  formatDate,
  CATEGORY_LABELS,
  FREQUENCY_LABELS,
  buildCustomWhatsAppUrl,
  VISIT_RESULT_LABELS,
} from '../utils/formatters';
import { getCustomerTimeline, getActivityLogs, addActivityLog } from '../utils/storage';
import {
  ArrowLeft,
  Edit,
  Phone,
  MapPin,
  MessageSquare,
  FileText,
  DollarSign,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Camera,
  SlidersHorizontal,
  Building2,
  Zap,
  Package,
  History,
  Lock,
  ExternalLink,
} from 'lucide-react';

interface CustomerDetailProps {
  customer: CustomerWithBalance;
  movements: Movement[];
  visits: CustomerVisit[];
  templates: WhatsAppTemplates;
  currentUserRole: string;
  onBack: () => void;
  onEditCustomer: (customer: CustomerWithBalance) => void;
  onOpenNewBoleta: (customerId: string) => void;
  onOpenNewPago: (customerId: string) => void;
  onOpenNewAjuste: (customerId: string) => void;
  onOpenRegistrarVisita: (customer: CustomerWithBalance) => void;
  onViewImage: (imageUrl: string, title: string) => void;
}

export const CustomerDetail: React.FC<CustomerDetailProps> = ({
  customer,
  movements,
  visits,
  templates,
  currentUserRole,
  onBack,
  onEditCustomer,
  onOpenNewBoleta,
  onOpenNewPago,
  onOpenNewAjuste,
  onOpenRegistrarVisita,
  onViewImage,
}) => {
  const [activeTab, setActiveTab] = useState<'TIMELINE' | 'MOVIMIENTOS' | 'VISITAS'>('TIMELINE');
  const [movementFilter, setMovementFilter] = useState<string>('TODOS');

  const activityLogs = getActivityLogs();
  const timelineItems = getCustomerTimeline(customer.id, movements, visits, activityLogs);

  const customerMovements = movements
    .filter((m) => m.customerId === customer.id)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const filteredMovements = customerMovements.filter((m) => {
    if (movementFilter === 'BOLETA') return m.tipo === 'BOLETA';
    if (movementFilter === 'PAGO') return m.tipo === 'PAGO';
    if (movementFilter === 'AJUSTE') return m.tipo === 'AJUSTE' || m.tipo === 'SALDO_INICIAL';
    return true;
  });

  const level = customer.evaluacionRiesgo.level;
  const isCritical = level === 'CRITICO';
  const isHigh = level === 'ALTO';

  const isRepartidor = currentUserRole === 'REPARTIDOR';
  const isSoloLectura = currentUserRole === 'SOLO_LECTURA';
  const canEditCustomerAndBalance = !isRepartidor && !isSoloLectura;

  // Log de actividad para envíos de WhatsApp
  const handleWhatsAppClick = (type: 'SALDO' | 'PEDIDO') => {
    const url = buildCustomWhatsAppUrl(type, customer, templates);
    const label = type === 'SALDO' ? 'informando saldo' : 'solicitando pedido';
    addActivityLog(
      `Usuario (${currentUserRole})`,
      `envió WhatsApp ${label} a ${customer.alias || customer.nombre}`,
      'WHATSAPP',
      customer.id,
      customer.alias || customer.nombre
    );
    window.open(url, '_blank');
  };

  return (
    <div id="customer-detail-container" className="space-y-6 pb-20">
      {/* Botón Volver y Acciones de Encabezado */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 transition shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a la nómina</span>
        </button>

        {canEditCustomerAndBalance && (
          <button
            onClick={() => onEditCustomer(customer)}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 transition shadow-2xs"
          >
            <Edit className="w-4 h-4 text-blue-600" />
            <span>Editar Cliente</span>
          </button>
        )}
      </div>

      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {customer.alias || customer.nombre}
              </h1>

              <span
                className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                  isCritical
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : isHigh
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                Riesgo {level}
              </span>

              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                  customer.estado === 'ACTIVO'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {customer.estado}
              </span>
            </div>

            {customer.alias && (
              <p className="text-sm text-slate-600 font-semibold">{customer.nombre}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-medium pt-1">
              <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-bold">
                🏷️ {CATEGORY_LABELS[customer.categoria] || customer.categoria}
              </span>
              <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200 font-bold">
                📍 {customer.zonaRuta}
              </span>
              <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-bold">
                🔄 {FREQUENCY_LABELS[customer.frecuenciaVisita] || customer.frecuenciaVisita}
              </span>
            </div>

            {customer.proximaVisita && (
              <div className="pt-1">
                <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl inline-flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Próxima Visita Agendada: <strong>{customer.proximaVisita.fecha}</strong> ({customer.proximaVisita.motivo})</span>
                </span>
              </div>
            )}
          </div>

          {/* Bloque Destacado de Saldo Actual */}
          <div className="bg-slate-900 text-white p-5 rounded-3xl space-y-2 shrink-0 md:min-w-[260px] shadow-lg">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Saldo Pendiente Actual
            </span>
            <div className="text-3xl font-black font-mono text-emerald-400">
              {formatCurrency(customer.saldoActual)}
            </div>
            <p className="text-xs text-slate-300 font-medium">
              {customer.saldoActual > 0
                ? '🔴 Saldo a cobrar en calle'
                : customer.saldoActual < 0
                ? '🟢 Cliente con saldo a favor'
                : '✅ Cuenta al día ($0)'}
            </p>
          </div>
        </div>

        {/* Acciones Rápidas Unificadas */}
        <div className="space-y-3">
          <p className="text-xs font-black uppercase text-slate-500 tracking-wider">Acciones Rápidas del Cliente</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {/* Informar Saldo WhatsApp */}
            <button
              onClick={() => handleWhatsAppClick('SALDO')}
              className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-xs transition flex flex-col items-center justify-center space-y-1 active:scale-95"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Inf. Saldo WA</span>
            </button>

            {/* Solicitar Pedido WhatsApp */}
            <button
              onClick={() => handleWhatsAppClick('PEDIDO')}
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-xs transition flex flex-col items-center justify-center space-y-1 active:scale-95"
            >
              <Package className="w-5 h-5" />
              <span>Pedir Pedido WA</span>
            </button>

            {/* Registrar Visita Express */}
            <button
              onClick={() => onOpenRegistrarVisita(customer)}
              className="p-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-2xl shadow-xs transition flex flex-col items-center justify-center space-y-1 active:scale-95"
            >
              <Zap className="w-5 h-5 text-amber-400" />
              <span>Registrar Visita</span>
            </button>

            {/* Llamar */}
            <a
              href={`tel:${customer.telefono}`}
              className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-2xl border border-slate-300 transition flex flex-col items-center justify-center space-y-1 active:scale-95"
            >
              <Phone className="w-5 h-5 text-slate-600" />
              <span>Llamar</span>
            </a>

            {/* Maps */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${customer.direccion} ${customer.localidad}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-2xl border border-slate-300 transition flex flex-col items-center justify-center space-y-1 active:scale-95"
            >
              <MapPin className="w-5 h-5 text-blue-600" />
              <span>Ubicación Maps</span>
            </a>

            {/* Acciones exclusivas Admin / Dueño */}
            {canEditCustomerAndBalance ? (
              <button
                onClick={() => onOpenNewBoleta(customer.id)}
                className="p-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-2xl shadow-xs transition flex flex-col items-center justify-center space-y-1 active:scale-95"
              >
                <FileText className="w-5 h-5" />
                <span>+ Boleta</span>
              </button>
            ) : (
              <div className="p-3 bg-slate-50 text-slate-400 font-bold text-xs rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-1">
                <Lock className="w-4 h-4" />
                <span>Edición restringida</span>
              </div>
            )}
          </div>

          {canEditCustomerAndBalance && (
            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => onOpenNewPago(customer.id)}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition flex items-center space-x-1.5"
              >
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>+ Registrar Pago Directo</span>
              </button>

              <button
                onClick={() => onOpenNewAjuste(customer.id)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition flex items-center space-x-1.5"
              >
                <SlidersHorizontal className="w-4 h-4 text-slate-600" />
                <span>Ajuste de Saldo</span>
              </button>
            </div>
          )}
        </div>

        {/* Informes Operativos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <h3 className="font-bold text-slate-500 uppercase tracking-wider">Dirección y Contacto</h3>
            <p className="font-bold text-slate-800">{customer.direccion}, {customer.localidad}</p>
            {customer.referenciaUbicacion && <p className="text-slate-500 italic">"{customer.referenciaUbicacion}"</p>}
            <p className="font-mono text-slate-700 pt-1">📞 {customer.telefono || 'Sin teléfono'}</p>
          </div>

          <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <h3 className="font-bold text-slate-500 uppercase tracking-wider">Crédito y Condiciones</h3>
            <div className="flex justify-between">
              <span>Límite de crédito:</span>
              <strong className="font-mono">{formatCurrency(customer.limiteCredito)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Plazo de pago:</span>
              <strong>{customer.diasTopeCredito || 14} días</strong>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span>Última compra:</span>
              <strong>{customer.fechaUltimaCompra ? formatDate(customer.fechaUltimaCompra) : '-'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs para Alternar entre Línea de Tiempo Comercial Única y Tablas */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('TIMELINE')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center space-x-2 ${
              activeTab === 'TIMELINE' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Línea de Tiempo Comercial Unificada ({timelineItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('MOVIMIENTOS')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center space-x-2 ${
              activeTab === 'MOVIMIENTOS' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Solo Boletas y Pagos ({customerMovements.length})</span>
          </button>
        </div>

        {/* Tab 1: Línea de Tiempo Comercial Unificada */}
        {activeTab === 'TIMELINE' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-medium">
              Historia comercial completa (Boletas, Pagos, Visitas, Observaciones y WhatsApp) en orden cronológico:
            </p>

            {timelineItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-bold">
                No hay registros aún para este cliente.
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-200 pl-6 space-y-6 ml-3">
                {timelineItems.map((item) => {
                  let badgeBg = 'bg-slate-100 text-slate-800';
                  let dotBg = 'bg-slate-400';

                  if (item.tipoItem === 'BOLETA') {
                    badgeBg = 'bg-red-100 text-red-800';
                    dotBg = 'bg-red-500';
                  } else if (item.tipoItem === 'PAGO') {
                    badgeBg = 'bg-emerald-100 text-emerald-800';
                    dotBg = 'bg-emerald-500';
                  } else if (item.tipoItem === 'VISITA') {
                    badgeBg = 'bg-amber-100 text-amber-800';
                    dotBg = 'bg-amber-500';
                  } else if (item.tipoItem === 'WHATSAPP') {
                    badgeBg = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
                    dotBg = 'bg-emerald-600';
                  }

                  return (
                    <div key={item.id} className="relative group">
                      {/* Punto de la línea de tiempo */}
                      <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full ${dotBg} ring-4 ring-white`} />

                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-1.5 hover:bg-slate-100/70 transition">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${badgeBg}`}>
                              {item.tipoItem}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900">{item.titulo}</h4>
                          </div>

                          <span className="text-[11px] font-mono text-slate-400 font-bold">
                            {formatDate(item.fechaHora, true)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 font-medium">{item.subtitulo}</p>

                        {item.monto !== undefined && (
                          <p className={`text-base font-black font-mono ${item.esDebito ? 'text-red-600' : 'text-emerald-600'}`}>
                            {item.esDebito ? '+' : '-'}{formatCurrency(item.monto)}
                          </p>
                        )}

                        {item.detalles && (
                          <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-xl border border-slate-200">
                            "{item.detalles}"
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                          <span>Registrado por: <strong>{item.usuario}</strong></span>
                          {item.fotoUrl && (
                            <button
                              onClick={() => onViewImage(item.fotoUrl!, item.titulo)}
                              className="text-blue-600 font-bold hover:underline flex items-center space-x-1"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Ver Foto Boleta</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Solo Movimientos Financieros */}
        {activeTab === 'MOVIMIENTOS' && (
          <div className="space-y-3">
            {customerMovements.map((mov) => (
              <div key={mov.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <p className="font-bold text-xs text-slate-900">{mov.tipo} - {formatDate(mov.fecha, true)}</p>
                  <p className="text-[11px] text-slate-600">{mov.descripcion}</p>
                </div>
                <span className={`font-mono font-bold text-sm ${mov.esDebito ? 'text-red-600' : 'text-emerald-600'}`}>
                  {mov.esDebito ? '+' : '-'}{formatCurrency(mov.monto)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
