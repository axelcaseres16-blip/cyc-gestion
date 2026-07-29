import React, { useState, useRef, useEffect } from 'react';
import {
  CustomerWithBalance,
  PaymentStatus,
  PaymentMethod,
  WhatsAppPostSaleBehavior,
} from '../types';
import {
  finalizeCompleteSaleTransaction,
  getWhatsAppBehavior,
  isSimulatedOffline,
} from '../utils/storage';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Search,
  CheckCircle2,
  Camera,
  Upload,
  MessageSquare,
  AlertCircle,
  DollarSign,
  UserCheck,
  Building2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  Zap,
  Clock,
  X,
  FileText,
} from 'lucide-react';

interface FinalizarVentaScreenProps {
  customers: CustomerWithBalance[];
  onSaleCompleted: () => void;
  currentUserRole: string;
  preselectedCustomer?: CustomerWithBalance;
  onClearPreselectedCustomer?: () => void;
  onViewImage?: (url: string, title: string) => void;
}

export const FinalizarVentaScreen: React.FC<FinalizarVentaScreenProps> = ({
  customers,
  onSaleCompleted,
  currentUserRole,
  preselectedCustomer,
  onClearPreselectedCustomer,
  onViewImage,
}) => {
  // Estado del flujo
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithBalance | null>(
    preselectedCustomer || null
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Datos de la venta
  const [montoTotal, setMontoTotal] = useState<string>('');
  const [estadoPago, setEstadoPago] = useState<PaymentStatus>('DEBE');
  const [montoAbonado, setMontoAbonado] = useState<string>('');
  const [medioPago, setMedioPago] = useState<PaymentMethod>('EFECTIVO');

  // Foto de la boleta (Obligatoria)
  const [fotoUrl, setFotoUrl] = useState<string>('');
  const [photoError, setPhotoError] = useState<boolean>(false);

  // Modal de confirmación y WhatsApp post-venta
  const [lastSaleResult, setLastSaleResult] = useState<{
    customerName: string;
    whatsappUrl: string;
    whatsappMessage: string;
    nuevoSaldo: number;
    isOffline: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (preselectedCustomer) {
      setSelectedCustomer(preselectedCustomer);
    }
  }, [preselectedCustomer]);

  // Filtrado de clientes para el buscador ultra rápido
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.alias && c.alias.toLowerCase().includes(q)) ||
      c.nombre.toLowerCase().includes(q) ||
      c.direccion.toLowerCase().includes(q) ||
      c.localidad.toLowerCase().includes(q) ||
      (c.zonaRuta && c.zonaRuta.toLowerCase().includes(q))
    );
  });

  // Calculados automáticos
  const totalNum = parseFloat(montoTotal) || 0;
  const abonadoNum =
    estadoPago === 'EFECTIVO' || estadoPago === 'TRANSFERENCIA'
      ? totalNum
      : estadoPago === 'DEBE'
      ? 0
      : parseFloat(montoAbonado) || 0;

  const saldoRestante = Math.max(0, totalNum - abonadoNum);
  const currentCustBalance = selectedCustomer ? selectedCustomer.saldoActual : 0;
  const nuevoSaldoEstimado = currentCustBalance + saldoRestante;

  // Manejador de foto capturada desde archivo / cámara
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFotoUrl(event.target.result as string);
          setPhotoError(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Generar muestra de foto de boleta digital para pruebas instantáneas
  const handleGenerateSampleBoletaPhoto = () => {
    if (!selectedCustomer) return;
    const custName = selectedCustomer.alias || selectedCustomer.nombre;
    const num = `B-${String(Date.now()).slice(-5)}`;
    const montoText = formatCurrency(totalNum || 150000);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
      <rect width="600" height="800" fill="#fcfbf7" rx="16"/>
      <rect x="20" y="20" width="560" height="760" fill="none" stroke="#0f172a" stroke-width="3" stroke-dasharray="8,8"/>
      <text x="300" y="70" font-family="monospace" font-size="26" font-weight="black" fill="#0f172a" text-anchor="middle">C&amp;C DISTRIBUIDORA DE CARNES</text>
      <text x="300" y="100" font-family="sans-serif" font-size="16" font-weight="bold" fill="#2563eb" text-anchor="middle">BOLETA OFICIAL DE REPARTO N° ${num}</text>
      <line x1="40" y1="120" x2="560" y2="120" stroke="#cbd5e1" stroke-width="2"/>
      
      <text x="50" y="160" font-family="sans-serif" font-size="16" font-weight="bold" fill="#0f172a">CLIENTE: ${custName}</text>
      <text x="50" y="190" font-family="sans-serif" font-size="14" fill="#64748b">DIRECCIÓN: ${selectedCustomer.direccion} (${selectedCustomer.localidad})</text>
      <text x="50" y="215" font-family="sans-serif" font-size="14" fill="#64748b">FECHA: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</text>
      
      <rect x="40" y="240" width="520" height="340" fill="#ffffff" stroke="#e2e8f0" rx="10"/>
      <text x="60" y="280" font-family="monospace" font-size="15" fill="#1e293b">• 4 CAJONES MOLLEJAS SELECCIONADAS ... $ 180.000</text>
      <text x="60" y="320" font-family="monospace" font-size="15" fill="#1e293b">• 3 CAJONES CHINCHULÍN VACUNO ........ $ 120.000</text>
      <text x="60" y="360" font-family="monospace" font-size="15" fill="#1e293b">• 2 BOLSAS HÍGADO FRESCO DE PRIMERA ... $ 60.000</text>
      <text x="60" y="400" font-family="monospace" font-size="15" fill="#1e293b">• 3 CAJAS MATAMBRE Y ENTRAÑA .......... $ 220.000</text>

      <line x1="40" y1="600" x2="560" y2="600" stroke="#0f172a" stroke-width="3"/>
      <text x="360" y="640" font-family="sans-serif" font-size="24" font-weight="black" fill="#0f172a">TOTAL: ${montoText}</text>
      
      <rect x="60" y="670" width="220" height="60" fill="#ecfdf5" stroke="#059669" stroke-width="3" rx="8" transform="rotate(-4 170 700)"/>
      <text x="170" y="707" font-family="sans-serif" font-size="16" font-weight="black" fill="#047857" text-anchor="middle" transform="rotate(-4 170 700)">✓ CONFORME EN CAMIÓN</text>

      <text x="430" y="740" font-family="sans-serif" font-size="12" font-weight="bold" fill="#64748b">Firmado Chofer: ${currentUserRole}</text>
    </svg>`;

    const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    setFotoUrl(dataUrl);
    setPhotoError(false);
  };

  // Botón Principal: FINALIZAR VENTA
  const handleFinalizarVenta = () => {
    if (!selectedCustomer) return;

    if (!totalNum || totalNum <= 0) {
      alert('Por favor ingrese un importe total válido para la boleta.');
      return;
    }

    if (!fotoUrl) {
      setPhotoError(true);
      return;
    }

    try {
      const result = finalizeCompleteSaleTransaction({
        customer: selectedCustomer,
        montoTotal: totalNum,
        estadoPago,
        montoAbonado: abonadoNum,
        medioPago: estadoPago === 'PARCIAL' ? medioPago : undefined,
        fotoUrl,
        usuarioActual: `Repartidor (${currentUserRole})`,
      });

      const behavior = getWhatsAppBehavior();

      setLastSaleResult({
        customerName: selectedCustomer.alias || selectedCustomer.nombre,
        whatsappUrl: result.whatsappUrl,
        whatsappMessage: result.whatsappMessage,
        nuevoSaldo: result.nuevoSaldo,
        isOffline: result.isOffline,
      });

      // Si la configuración es "ALWAYS_AUTO", abrir WhatsApp automáticamente
      if (behavior === 'ALWAYS_AUTO' && !result.isOffline) {
        window.open(result.whatsappUrl, '_blank');
      }

      onSaleCompleted();
    } catch (err: any) {
      alert(err.message || 'Error finalizando la venta.');
    }
  };

  // Resetear para el siguiente cliente en Modo Reparto
  const handleNextSale = () => {
    setSelectedCustomer(null);
    setSearchQuery('');
    setMontoTotal('');
    setEstadoPago('DEBE');
    setMontoAbonado('');
    setFotoUrl('');
    setPhotoError(false);
    setLastSaleResult(null);
    if (onClearPreselectedCustomer) onClearPreselectedCustomer();
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 animate-fade-in">
      {/* Dynamic Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-blue-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shrink-0">
              <Zap className="w-7 h-7 fill-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Modo Reparto Express (Arriba del Camión)
                </span>
                {isSimulatedOffline() && (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full border border-red-500/30">
                    🔴 Sin Conexión
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                Pantalla Única "Finalizar Venta"
              </h1>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                Venta, cobro, foto de boleta, saldo y WhatsApp en 1 solo paso.
              </p>
            </div>
          </div>

          {selectedCustomer && (
            <button
              onClick={() => setSelectedCustomer(null)}
              className="flex items-center space-x-1.5 self-start md:self-auto bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-extrabold px-3.5 py-2 rounded-xl border border-slate-700 transition"
            >
              <RotateCcw className="w-4 h-4 text-blue-400" />
              <span>Cambiar Cliente</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PASO 1: SELECCIONAR CLIENTE */}
        {!selectedCustomer ? (
          <div className="lg:col-span-12 space-y-4">
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    1
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    Buscar o Seleccionar Cliente
                  </h2>
                </div>
                <span className="text-xs text-slate-500 font-bold">
                  {filteredCustomers.length} clientes disponibles
                </span>
              </div>

              {/* Input Buscador Gigante */}
              <div className="relative mb-4">
                <Search className="w-6 h-6 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Escribí nombre, alias, dirección o ruta..."
                  className="w-full pl-13 pr-4 py-4 bg-slate-50 border-2 border-slate-200 focus:border-blue-600 focus:bg-white rounded-2xl text-sm sm:text-base font-extrabold text-slate-900 placeholder-slate-400 focus:outline-none transition"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Grid de Clientes para Selección Express */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredCustomers.map((c) => {
                  const hasDebt = c.saldoActual > 0;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCustomer(c)}
                      className="p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-600 bg-white hover:bg-blue-50/50 text-left transition-all active:scale-98 flex flex-col justify-between shadow-2xs group relative overflow-hidden"
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-blue-700 leading-snug">
                            {c.alias || c.nombre}
                          </h3>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-black border shrink-0 ${
                              hasDebt
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {hasDebt ? formatCurrency(c.saldoActual) : 'Al Día'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium truncate">
                          📍 {c.direccion}, {c.localidad}
                        </p>
                        <p className="text-[11px] font-bold text-slate-400">
                          🚚 {c.zonaRuta || 'Sin ruta asignada'}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-blue-600 group-hover:translate-x-1 transition">
                        <span>Atender Cliente</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* PASO 2 a 5: OPERACIÓN COMPLETA DE VENTA */
          <>
            {/* Columna Izquierda: Datos de la Venta y Estado de Pago */}
            <div className="lg:col-span-7 space-y-5">
              {/* Card Cliente Seleccionado */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border-2 border-blue-600 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                  Cliente Seleccionado
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 font-black flex items-center justify-center text-xl shrink-0">
                    {(selectedCustomer.alias || selectedCustomer.nombre).charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      {selectedCustomer.alias || selectedCustomer.nombre}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      📍 {selectedCustomer.direccion}, {selectedCustomer.localidad}
                    </p>
                    <div className="flex items-center space-x-3 mt-1 text-xs">
                      <span className="font-bold text-slate-700">
                        Saldo Actual:{' '}
                        <span
                          className={`font-black font-mono ${
                            selectedCustomer.saldoActual > 0 ? 'text-red-600' : 'text-emerald-600'
                          }`}
                        >
                          {formatCurrency(selectedCustomer.saldoActual)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PASO 2: MONTO TOTAL DE LA BOLETA */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    2
                  </span>
                  <label className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Importe Total de la Boleta ($)
                  </label>
                </div>

                <div className="relative">
                  <span className="text-2xl font-black text-slate-400 absolute left-4 top-1/2 -translate-y-1/2">
                    $
                  </span>
                  <input
                    type="number"
                    value={montoTotal}
                    onChange={(e) => setMontoTotal(e.target.value)}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-slate-300 focus:border-blue-600 focus:bg-white rounded-2xl text-2xl sm:text-3xl font-mono font-black text-slate-900 focus:outline-none transition"
                  />
                </div>

                {/* Botones de atajo rápido de montos */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[50000, 100000, 200000, 500000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        const current = parseFloat(montoTotal) || 0;
                        setMontoTotal(String(current + val));
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold rounded-xl transition border border-slate-200"
                    >
                      +${(val / 1000).toFixed(0)}k
                    </button>
                  ))}
                  {montoTotal && (
                    <button
                      type="button"
                      onClick={() => setMontoTotal('')}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-extrabold rounded-xl transition border border-red-200 ml-auto"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* PASO 3: ESTADO DEL PAGO */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Elegir Estado del Pago
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'EFECTIVO', label: 'Pagó efectivo', sub: 'Total abonado', icon: '💵', color: 'border-emerald-500 bg-emerald-50 text-emerald-950' },
                    { id: 'TRANSFERENCIA', label: 'Pagó transf.', sub: 'Total abonado', icon: '🏦', color: 'border-blue-500 bg-blue-50 text-blue-950' },
                    { id: 'PARCIAL', label: 'Pago parcial', sub: 'Efectivo/Transf.', icon: '⚖️', color: 'border-amber-500 bg-amber-50 text-amber-950' },
                    { id: 'DEBE', label: 'Debe todo', sub: 'Queda a saldo', icon: '🔴', color: 'border-red-500 bg-red-50 text-red-950' },
                  ].map((opt) => {
                    const isSelected = estadoPago === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setEstadoPago(opt.id as PaymentStatus)}
                        className={`p-3.5 rounded-2xl border-2 transition-all active:scale-95 text-left flex flex-col justify-between ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-blue-500'
                            : `${opt.color} hover:shadow-xs`
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{opt.icon}</span>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                        </div>
                        <div className="mt-2">
                          <p className="font-black text-xs sm:text-sm leading-tight">{opt.label}</p>
                          <p className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            {opt.sub}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Si elige "Pago parcial", mostrar automáticamente Importe Abonado, Medio de Pago y Saldo Restante */}
                {estadoPago === 'PARCIAL' && (
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3 animate-fade-in">
                    <p className="text-xs font-black uppercase text-amber-900 tracking-wider">
                      Detalle del Pago Parcial
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Importe Abonado ($)
                        </label>
                        <input
                          type="number"
                          value={montoAbonado}
                          onChange={(e) => setMontoAbonado(e.target.value)}
                          placeholder="0"
                          className="w-full p-3 bg-white border border-amber-300 rounded-xl font-mono font-bold text-sm text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Medio de Pago
                        </label>
                        <select
                          value={medioPago}
                          onChange={(e) => setMedioPago(e.target.value as PaymentMethod)}
                          className="w-full p-3 bg-white border border-amber-300 rounded-xl font-bold text-xs text-slate-800"
                        >
                          <option value="EFECTIVO">Efectivo en mano</option>
                          <option value="TRANSFERENCIA">Transferencia bancaria</option>
                          <option value="CHEQUE">Cheque al día / diferido</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resumen de Cálculos Automáticos */}
                {totalNum > 0 && (
                  <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 font-mono">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Total Boleta:</span>
                      <span className="font-bold">{formatCurrency(totalNum)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-400">
                      <span>Importe Abonado:</span>
                      <span className="font-bold">-{formatCurrency(abonadoNum)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-black text-amber-400">
                      <span>Saldo Restante de Venta:</span>
                      <span>{formatCurrency(saldoRestante)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 pt-1">
                      <span>Nuevo Saldo Estimado Cliente:</span>
                      <span className="font-bold text-white">{formatCurrency(nuevoSaldoEstimado)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Columna Derecha: Foto de Boleta Obligatoria y Botón "FINALIZAR VENTA" */}
            <div className="lg:col-span-5 space-y-5">
              {/* PASO 4: FOTO DE LA BOLETA (OBLIGATORIA) */}
              <div
                className={`bg-white rounded-3xl p-5 sm:p-6 shadow-sm border-2 transition-all space-y-4 ${
                  photoError ? 'border-red-500 bg-red-50/20 ring-4 ring-red-100' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                      4
                    </span>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Foto de la Boleta <span className="text-red-600">* Obligatoria</span>
                    </h3>
                  </div>
                  {fotoUrl && (
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                      ✓ FOTO GUARDADA
                    </span>
                  )}
                </div>

                {/* Mensaje de aviso obligatorio */}
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-2 text-xs font-bold text-red-800">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="leading-tight">
                    Para finalizar la venta es obligatorio guardar una fotografía de la boleta.
                  </p>
                </div>

                {/* Contenedor de Vista Previa o Selector de Foto */}
                {fotoUrl ? (
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border-2 border-slate-300 bg-slate-950 group h-56">
                      <img
                        src={fotoUrl}
                        alt="Foto de Boleta"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-2">
                        <button
                          type="button"
                          onClick={() => onViewImage && onViewImage(fotoUrl, 'Boleta del Cliente')}
                          className="px-3 py-1.5 bg-white text-slate-900 font-bold text-xs rounded-xl shadow-md"
                        >
                          Ver grande
                        </button>
                        <button
                          type="button"
                          onClick={() => setFotoUrl('')}
                          className="px-3 py-1.5 bg-red-600 text-white font-bold text-xs rounded-xl shadow-md"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {/* Botón Tomar Foto Cámara */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full py-4 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-black text-sm rounded-2xl shadow-md transition flex items-center justify-center space-x-2.5 border border-slate-700"
                    >
                      <Camera className="w-5 h-5 text-blue-400" />
                      <span>Sacar Foto con Cámara</span>
                    </button>

                    {/* Botón Elegir de Galería */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-2xl transition flex items-center justify-center space-x-2 border border-slate-300"
                    >
                      <Upload className="w-4 h-4 text-slate-600" />
                      <span>Elegir Foto de Galería</span>
                    </button>

                    {/* Botón Muestra Digital Express */}
                    <button
                      type="button"
                      onClick={handleGenerateSampleBoletaPhoto}
                      className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs rounded-xl border border-blue-200 transition flex items-center justify-center space-x-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Generar Foto Muestra de Prueba</span>
                    </button>
                  </div>
                )}

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
              </div>

              {/* PASO 5: BOTÓN PRINCIPAL "FINALIZAR VENTA" */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleFinalizarVenta}
                  disabled={!totalNum || !fotoUrl}
                  className={`w-full py-5 rounded-3xl font-black text-base sm:text-lg uppercase tracking-wider shadow-xl transition-all flex items-center justify-center space-x-3 active:scale-95 ${
                    totalNum > 0 && fotoUrl
                      ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30 ring-4 ring-emerald-200 cursor-pointer animate-pulse'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-7 h-7 shrink-0" />
                  <span>FINALIZAR VENTA</span>
                </button>

                {!fotoUrl && totalNum > 0 && (
                  <p className="text-center text-xs font-bold text-red-600">
                    ⚠️ Debe tomar o cargar la foto de la boleta antes de finalizar.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL / BANNER DE CONFIRMACIÓN DE VENTA & INTEGRACIÓN AUTOMÁTICA CON WHATSAPP */}
      {lastSaleResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 text-center space-y-2">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-1">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-black">¡Venta Finalizada con Éxito!</h2>
              <p className="text-xs text-emerald-100 font-medium">
                Cliente: <span className="font-bold underline">{lastSaleResult.customerName}</span>
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono space-y-1 text-slate-800">
                <p className="font-bold text-slate-900 mb-1">📄 Mensaje preparado para WhatsApp:</p>
                <div className="whitespace-pre-wrap bg-white p-3 rounded-xl border border-slate-200 text-[11px] text-slate-700">
                  {lastSaleResult.whatsappMessage}
                </div>
              </div>

              {lastSaleResult.isOffline && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Registrado sin conexión. Se sincronizará automáticamente.</span>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <a
                  href={lastSaleResult.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg transition flex items-center justify-center space-x-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Enviar por WhatsApp Ahora</span>
                </a>

                <button
                  type="button"
                  onClick={handleNextSale}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition flex items-center justify-center space-x-2"
                >
                  <span>Siguiente Venta (&lt; Buscador)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
