import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CustomerWithBalance,
  CustomerBranch,
  Product,
  PriceListType,
  BoletaItem,
  VirtualBoleta,
  AppUser,
} from '../types';
import {
  getStoredProducts,
  getStockSummaryForPeriod,
  finalizeVirtualBoleta,
} from '../utils/stockAndBoletasManager';
import { generateBoletaImage } from '../utils/boletaImageGenerator';
import { formatCurrency } from '../utils/formatters';
import { VirtualBoletaModal } from './VirtualBoletaModal';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  X,
  RefreshCw,
  Layers,
  FileCheck,
  Edit3,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  User,
  Building2,
  Calendar,
  Lock,
} from 'lucide-react';

interface VirtualBoletaScreenProps {
  customers: CustomerWithBalance[];
  currentUser: AppUser;
  onSaleCompleted: () => void;
  preselectedCustomer?: CustomerWithBalance;
  onViewImage?: (url: string, title: string) => void;
}

const DRAFT_KEY_V4 = 'cyc_boleta_physical_sheet_v4';

// EXACT 24 CANONICAL PRODUCTS IN EXACT REQUESTED ORDER
const CANONICAL_24_NAMES = [
  'Higado',
  'Corazon',
  'Lengua',
  'Quijada',
  'Rabo',
  'Riñon',
  'Bofe',
  'Centro',
  'Chinchulin',
  'Mondongo',
  'Tripa',
  'Rueda',
  'Seso',
  'Molleja',
  'Gañote',
  'Pechito',
  'Carre',
  'Bondiola Fresca',
  'Bondiola Congelada',
  'Nuez',
  'Cuajo Crudo',
  'Cuajo Cocinado',
  'Pajarilla',
  'Tendones',
];

export const VirtualBoletaScreen: React.FC<VirtualBoletaScreenProps> = ({
  customers,
  currentUser,
  onSaleCompleted,
  preselectedCustomer,
  onViewImage,
}) => {
  const isDuenoOrAdmin = currentUser.role === 'DUENO' || currentUser.role === 'ADMINISTRADOR';

  // Customer Selection State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithBalance | null>(
    preselectedCustomer || null
  );
  const [selectedBranch, setSelectedBranch] = useState<CustomerBranch | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(!preselectedCustomer);
  const [customerSearch, setCustomerSearch] = useState<string>('');

  // Mode: Edition (inputs) vs Full Paper View (paper sheet preview)
  const [viewMode, setViewMode] = useState<'EDITION' | 'FULL_VIEW'>('EDITION');

  // Sheet Zoom Scale (80%, 100%, 120%, 140%)
  const [zoomScale, setZoomScale] = useState<number>(100);

  // Map of productId -> { unidades: string, kilaje: string }
  const [valuesMap, setValuesMap] = useState<Record<string, { unidades: string; kilaje: string }>>({});

  // Financial Summary Drawer
  const [showFinancialSummaryDrawer, setShowFinancialSummaryDrawer] = useState<boolean>(false);

  // Payment Inputs
  const [paymentMode, setPaymentMode] = useState<'NO_PAGO' | 'EFECTIVO' | 'TRANSFERENCIA' | 'MIXTO'>('NO_PAGO');
  const [pagoEfectivoStr, setPagoEfectivoStr] = useState<string>('');
  const [pagoTransfStr, setPagoTransfStr] = useState<string>('');

  // Overpayment authorization
  const [overpaymentAuthorized, setOverpaymentAuthorized] = useState<boolean>(false);

  // Auto-save draft toast indicator
  const [draftLoadedNotice, setDraftLoadedNotice] = useState<boolean>(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdBoleta, setCreatedBoleta] = useState<VirtualBoleta | null>(null);

  // Input refs for keyboard navigation [productIndex][0: und, 1: kg]
  const undInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const kgInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Resolve Canonical 24 Products mapped to stored products
  const canonicalProducts: Product[] = useMemo(() => {
    const dbProducts = getStoredProducts().filter((p) => p.activo !== false);

    return CANONICAL_24_NAMES.map((name, index) => {
      const normName = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      const found = dbProducts.find((p) => {
        const normP = p.nombre
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();
        return normP === normName || normP.includes(normName) || normName.includes(normP);
      });

      if (found) {
        return {
          ...found,
          orden: index + 1,
        };
      }

      // Fallback product if not present in DB
      const isKg = !normName.includes('seso');
      return {
        id: `canonical_prod_${index}_${normName}`,
        codigo: `CAN-${index + 1}`,
        nombre: name,
        tipoVenta: isKg ? 'UNIDADES_INFORMATIVAS_COBRO_POR_KILO' : 'POR_UNIDAD',
        tipoControlStock: isKg ? 'UNIDADES_INFORMATIVAS_COBRO_POR_KILO' : 'SOLO_UNIDADES',
        unidadMedida: isKg ? 'kg' : 'u',
        cobroPor: isKg ? 'KG' : 'UNIDAD',
        precios: { GENERAL: 0, MAYORISTA: 0, ESPECIAL: 0, PERSONALIZADA: 0 },
        stockMinimoUnidades: 0,
        stockMinimoKg: 0,
        orden: index + 1,
        activo: true,
        usaUnidades: true,
        usaKilogramos: isKg,
      };
    });
  }, []);

  // Filtered Customers for Modal
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.alias && c.alias.toLowerCase().includes(q)) ||
        (c.cuitDni && c.cuitDni.includes(q)) ||
        (c.direccion && c.direccion.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

  // Load saved draft for selected customer
  useEffect(() => {
    if (!selectedCustomer) return;

    try {
      const rawDraft = localStorage.getItem(DRAFT_KEY_V4);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (draft.customerId === selectedCustomer.id) {
          if (draft.valuesMap) setValuesMap(draft.valuesMap);
          if (draft.paymentMode) setPaymentMode(draft.paymentMode);
          if (draft.pagoEfectivoStr !== undefined) setPagoEfectivoStr(draft.pagoEfectivoStr);
          if (draft.pagoTransfStr !== undefined) setPagoTransfStr(draft.pagoTransfStr);
          if (draft.selectedBranchId && selectedCustomer.sucursales) {
            const branch = selectedCustomer.sucursales.find((b) => b.id === draft.selectedBranchId);
            if (branch) setSelectedBranch(branch);
          }
          setDraftLoadedNotice(true);
          setTimeout(() => setDraftLoadedNotice(false), 3000);
        }
      }
    } catch (e) {
      console.warn('Error reading boleta draft:', e);
    }
  }, [selectedCustomer?.id]);

  // Auto-save draft on change
  useEffect(() => {
    if (!selectedCustomer) return;

    const hasData =
      Object.values(valuesMap).some((v) => v.unidades !== '' || v.kilaje !== '') ||
      pagoEfectivoStr !== '' ||
      pagoTransfStr !== '';

    if (hasData) {
      const draftObj = {
        customerId: selectedCustomer.id,
        selectedBranchId: selectedBranch?.id,
        valuesMap,
        paymentMode,
        pagoEfectivoStr,
        pagoTransfStr,
        timestamp: Date.now(),
      };
      localStorage.setItem(DRAFT_KEY_V4, JSON.stringify(draftObj));
    }
  }, [valuesMap, paymentMode, pagoEfectivoStr, pagoTransfStr, selectedCustomer, selectedBranch]);

  // Helper to parse numeric values safely
  const parseNum = (val: string): number => {
    if (!val) return 0;
    const clean = val.replace(/\s/g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  };

  // Unit price lookup according to customer price list
  const getProductPrice = (product: Product): number => {
    if (!selectedCustomer) return product.precios?.GENERAL || 0;

    const priceList: PriceListType = selectedCustomer.listaPrecioTipo || 'GENERAL';

    if (priceList === 'PERSONALIZADA' && selectedCustomer.preciosPersonalizados) {
      const customPrice = selectedCustomer.preciosPersonalizados[product.id];
      if (customPrice !== undefined && customPrice > 0) {
        return customPrice;
      }
    }

    if (product.precios && product.precios[priceList] && product.precios[priceList]! > 0) {
      return product.precios[priceList]!;
    }

    return product.precios?.GENERAL || 0;
  };

  // Helper to determine if product is sold by unit vs weight
  const isSoldByUnit = (product: Product): boolean => {
    return (
      product.cobroPor === 'UNIDAD' ||
      product.tipoVenta === 'POR_UNIDAD' ||
      product.unidadMedida === 'u'
    );
  };

  // Calculate row values and subtotals for all 24 canonical products
  const calculatedRows = useMemo(() => {
    return canonicalProducts.map((product, index) => {
      const vals = valuesMap[product.id] || { unidades: '', kilaje: '' };
      const u = parseNum(vals.unidades);
      const kg = parseNum(vals.kilaje);
      const price = getProductPrice(product);

      const isUnitProduct = isSoldByUnit(product);
      const isKgProduct = !isUnitProduct;

      let subtotal = 0;
      let missingKgWarning = false;

      if (isUnitProduct) {
        // COBRADO POR UNIDAD
        subtotal = u * price;
      } else {
        // COBRADO POR KILOGRAMO (O CONTROL UNIDADES Y KG COBRO POR KG)
        // REGLA CRÍTICA: IMPORTE = KILOGRAMOS x PRECIO POR KG
        // Las unidades son solo informativas y NO calculan el importe.
        if (kg > 0) {
          subtotal = kg * price;
        } else {
          subtotal = 0; // Se fuerza a $0 si no hay kilaje
        }

        // Advertencia discreta si ingresó unidades pero no ingresó kg
        if (u > 0 && kg === 0) {
          missingKgWarning = true;
        }
      }

      const hasValue = isKgProduct ? kg > 0 || u > 0 : u > 0;

      return {
        index,
        product,
        price,
        unidadesStr: vals.unidades,
        kilajeStr: vals.kilaje,
        u,
        kg,
        subtotal,
        isUnitProduct,
        isKgProduct,
        missingKgWarning,
        hasValue,
      };
    });
  }, [canonicalProducts, valuesMap, selectedCustomer]);

  // Financial Totals
  const totalBoleta = useMemo(() => {
    return calculatedRows.reduce((sum, r) => sum + r.subtotal, 0);
  }, [calculatedRows]);

  const saldoAnterior = useMemo(() => {
    return selectedCustomer ? selectedCustomer.saldoActual : 0;
  }, [selectedCustomer]);

  const totalGeneral = useMemo(() => {
    return totalBoleta + saldoAnterior;
  }, [totalBoleta, saldoAnterior]);

  const pagoEfectivo = useMemo(() => parseNum(pagoEfectivoStr), [pagoEfectivoStr]);
  const pagoTransferencia = useMemo(() => parseNum(pagoTransfStr), [pagoTransfStr]);
  const totalPagado = useMemo(() => pagoEfectivo + pagoTransferencia, [pagoEfectivo, pagoTransferencia]);

  const saldoActualizado = useMemo(() => {
    return totalGeneral - totalPagado;
  }, [totalGeneral, totalPagado]);

  const isAlDia = Math.abs(saldoActualizado) < 0.01;
  const isOverpaid = totalPagado > totalGeneral + 0.01;

  const soldItemsCount = useMemo(() => {
    return calculatedRows.filter((r) => r.hasValue).length;
  }, [calculatedRows]);

  // Helper validation status for finalization button
  const finalizeValidation = useMemo(() => {
    if (!selectedCustomer) {
      return { canFinalize: false, reason: 'Debe seleccionar un cliente antes de finalizar' };
    }
    const missingKgItems = calculatedRows.filter((r) => r.isKgProduct && r.u > 0 && r.kg === 0);
    if (missingKgItems.length > 0) {
      return {
        canFinalize: false,
        reason: `Falta cargar kilogramos en ${missingKgItems[0].product.nombre}`,
      };
    }
    const soldRows = calculatedRows.filter((r) => (r.isKgProduct ? r.kg > 0 : r.u > 0));
    if (soldRows.length === 0) {
      return { canFinalize: false, reason: 'Ingrese al menos 1 producto con kilaje o unidades' };
    }
    if (totalBoleta <= 0) {
      return { canFinalize: false, reason: 'El total de la boleta debe ser mayor a $0' };
    }
    if (isOverpaid && !overpaymentAuthorized && !isDuenoOrAdmin) {
      return { canFinalize: false, reason: 'El pago supera el saldo total. Requiere autorización' };
    }
    return { canFinalize: true, reason: '' };
  }, [selectedCustomer, calculatedRows, totalBoleta, isOverpaid, overpaymentAuthorized, isDuenoOrAdmin]);

  // Handle cell input change
  const handleInputChange = (productId: string, field: 'unidades' | 'kilaje', val: string) => {
    setValuesMap((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || { unidades: '', kilaje: '' }),
        [field]: val,
      },
    }));
  };

  // Keyboard navigation on Enter or Down Arrow
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: 'unidades' | 'kilaje'
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const product = canonicalProducts[index];

      if (field === 'unidades' && (product.cobroPor !== 'UNIDAD' && product.unidadMedida !== 'u') && kgInputRefs.current[index]) {
        kgInputRefs.current[index]?.focus();
        kgInputRefs.current[index]?.select();
      } else {
        const nextIndex = index + 1;
        if (nextIndex < canonicalProducts.length) {
          if (undInputRefs.current[nextIndex]) {
            undInputRefs.current[nextIndex]?.focus();
            undInputRefs.current[nextIndex]?.select();
          }
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (field === 'kilaje' && undInputRefs.current[index]) {
        undInputRefs.current[index]?.focus();
        undInputRefs.current[index]?.select();
      } else {
        const prevIndex = index - 1;
        if (prevIndex >= 0) {
          const prevProduct = canonicalProducts[prevIndex];
          if ((prevProduct.cobroPor !== 'UNIDAD' && prevProduct.unidadMedida !== 'u') && kgInputRefs.current[prevIndex]) {
            kgInputRefs.current[prevIndex]?.focus();
            kgInputRefs.current[prevIndex]?.select();
          } else if (undInputRefs.current[prevIndex]) {
            undInputRefs.current[prevIndex]?.focus();
            undInputRefs.current[prevIndex]?.select();
          }
        }
      }
    }
  };

  // Clear sheet data
  const handleResetForm = () => {
    setValuesMap({});
    setPaymentMode('NO_PAGO');
    setPagoEfectivoStr('');
    setPagoTransfStr('');
    setErrorMessage(null);
    setOverpaymentAuthorized(false);
    localStorage.removeItem(DRAFT_KEY_V4);
  };

  // Customer Selection Handler
  const handleSelectCustomer = (customer: CustomerWithBalance) => {
    setSelectedCustomer(customer);
    setSelectedBranch(null);
    setShowCustomerModal(false);
    setCustomerSearch('');
    handleResetForm();
  };

  // Payment Mode Change
  const handlePaymentModeChange = (mode: 'NO_PAGO' | 'EFECTIVO' | 'TRANSFERENCIA' | 'MIXTO') => {
    setPaymentMode(mode);
    setOverpaymentAuthorized(false);
    if (mode === 'NO_PAGO') {
      setPagoEfectivoStr('');
      setPagoTransfStr('');
    } else if (mode === 'EFECTIVO') {
      setPagoEfectivoStr(totalBoleta > 0 ? totalBoleta.toString() : '');
      setPagoTransfStr('');
    } else if (mode === 'TRANSFERENCIA') {
      setPagoEfectivoStr('');
      setPagoTransfStr(totalBoleta > 0 ? totalBoleta.toString() : '');
    }
  };

  // Finalize Venta
  const handleFinalizeSale = async () => {
    if (!selectedCustomer) {
      setErrorMessage('Debe seleccionar un cliente antes de emitir la boleta.');
      setShowCustomerModal(true);
      return;
    }

    // PRE-CHECK REGLA 7 & PRUEBA 4:
    // Si hay productos vendidos por kg que tienen unidades cargadas (u > 0) pero no tienen kilogramos (kg === 0),
    // se debe impedir la finalización con el mensaje exacto especificado.
    const missingKgItems = calculatedRows.filter((r) => r.isKgProduct && r.u > 0 && r.kg === 0);

    if (missingKgItems.length > 0) {
      if (missingKgItems.length === 1) {
        setErrorMessage(`El producto ${missingKgItems[0].product.nombre} tiene unidades cargadas pero no tiene kilogramos.`);
      } else {
        const names = missingKgItems.map((r) => r.product.nombre).join(', ');
        setErrorMessage(`Los siguientes productos tienen unidades cargadas pero les falta el kilaje: ${names}.`);
      }
      return;
    }

    // Solamente se consideran vendidos los renglones válidos:
    // Para productos por peso: requiere kg > 0 (las unidades son informativas).
    // Para productos por unidad: requiere u > 0.
    const soldRows = calculatedRows.filter((r) => (r.isKgProduct ? r.kg > 0 : r.u > 0));

    if (soldRows.length === 0) {
      setErrorMessage('La boleta debe incluir al menos 1 producto con kilogramos o unidades cargadas.');
      return;
    }

    if (totalBoleta <= 0) {
      setErrorMessage('El total de la boleta no puede ser $0.');
      return;
    }

    if (isOverpaid && !overpaymentAuthorized && !isDuenoOrAdmin) {
      setErrorMessage(
        `El pago ingresado (${formatCurrency(totalPagado)}) supera el total adeudado (${formatCurrency(
          totalGeneral
        )}). Se requiere autorización administrativa.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setShowFinancialSummaryDrawer(false);

    try {
      const boletaItems: BoletaItem[] = soldRows.map((r, i) => ({
        id: `item_${r.product.id}_${Date.now()}_${i}`,
        productId: r.product.id,
        productName: r.product.nombre,
        tipoVenta: r.product.tipoVenta,
        unidades: r.u,
        kilajeReal: r.kg,
        unidadMedida: r.product.unidadMedida,
        precioAplicado: r.price,
        subtotal: r.subtotal,
      }));

      const boletaNum = `B-${Date.now().toString().slice(-6)}`;
      const result = finalizeVirtualBoleta({
        numeroBoleta: boletaNum,
        customer: selectedCustomer,
        branchId: selectedBranch?.id,
        branchName: selectedBranch?.nombre,
        listaPrecioAplicada: selectedCustomer.listaPrecioTipo || 'GENERAL',
        items: boletaItems,
        subtotal: totalBoleta,
        descuento: 0,
        recargo: 0,
        total: totalBoleta,
        pagoEfectivo,
        pagoTransferencia,
        pagoOtros: 0,
        usuario: currentUser.nombre || currentUser.username,
      });

      const boleta = result.virtualBoleta;

      localStorage.removeItem(DRAFT_KEY_V4);

      try {
        await generateBoletaImage(boleta);
      } catch (imgErr) {
        console.warn('Image pre-generation warning:', imgErr);
      }

      setCreatedBoleta(boleta);
      onSaleCompleted();
    } catch (err: any) {
      console.error('Error finalizando venta:', err);
      setErrorMessage(err.message || 'Ocurrió un error al registrar la boleta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-1.5 sm:px-4 py-2 pb-44 sm:pb-36 text-slate-900 relative">
      {/* Draft Loaded Notice */}
      {draftLoadedNotice && (
        <div className="mb-2 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-emerald-800 text-xs font-semibold shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
            <span>Se cargó el borrador previo guardado para este cliente.</span>
          </div>
          <button onClick={() => setDraftLoadedNotice(false)} className="p-1 hover:text-emerald-950">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-2 p-2.5 bg-red-50 border border-red-300 rounded-xl flex items-center justify-between text-red-800 text-xs font-bold shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:text-red-950">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* CUSTOMER HEADER & SELECTION BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3 mb-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div>
            <h1 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
              <FileCheck className="w-4 h-4 text-blue-600" />
              <span>Boleta Digital de Venta (Hoja Física Completa)</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              24 renglones permanentes con precios automáticos por cliente
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCustomerModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-xl font-extrabold text-xs transition border border-blue-200 cursor-pointer active:scale-95 shrink-0"
          >
            <Search className="w-3.5 h-3.5 text-blue-600" />
            <span>{selectedCustomer ? 'Cambiar Cliente' : 'Seleccionar Cliente'}</span>
          </button>
        </div>

        {selectedCustomer ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Cliente</span>
              <span className="font-extrabold text-slate-900 text-xs truncate block">
                {selectedCustomer.alias || selectedCustomer.nombre}
              </span>
            </div>

            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Lista Precios</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-900 rounded font-black text-[10px]">
                <Layers className="w-3 h-3" />
                {selectedCustomer.listaPrecioTipo || 'GENERAL'}
              </span>
            </div>

            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Saldo Anterior</span>
              <span
                className={`font-black text-xs block ${
                  selectedCustomer.saldoActual > 0
                    ? 'text-red-600'
                    : selectedCustomer.saldoActual < 0
                    ? 'text-emerald-600'
                    : 'text-slate-700'
                }`}
              >
                {formatCurrency(selectedCustomer.saldoActual)}
              </span>
            </div>

            {selectedCustomer.sucursales && selectedCustomer.sucursales.length > 0 && (
              <div>
                <span className="text-[9px] font-bold uppercase text-slate-400 block">Sucursal</span>
                <select
                  value={selectedBranch?.id || ''}
                  onChange={(e) => {
                    const b = selectedCustomer.sucursales?.find((sb) => sb.id === e.target.value);
                    setSelectedBranch(b || null);
                  }}
                  className="w-full mt-0.5 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800"
                >
                  <option value="">Casa Central</option>
                  {selectedCustomer.sucursales.map((br) => (
                    <option key={br.id} value={br.id}>
                      {br.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Por favor seleccione un cliente para cargar la boleta.</span>
            </div>
            <button
              onClick={() => setShowCustomerModal(true)}
              className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-bold text-xs hover:bg-amber-700 transition"
            >
              Seleccionar
            </button>
          </div>
        )}
      </div>

      {/* BOLETA TOOLBAR: MODE TOGGLE & ZOOM CONTROLS */}
      <div className="bg-slate-900 text-white rounded-t-2xl p-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        {/* MODE TOGGLE BUTTONS */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => setViewMode('EDITION')}
            className={`px-2.5 py-1 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'EDITION'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Modo Edición</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('FULL_VIEW')}
            className={`px-2.5 py-1 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'FULL_VIEW'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Vista Completa (Papel)</span>
          </button>
        </div>

        {/* ZOOM CONTROLS & RESET */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700 text-xs font-bold">
            <span className="text-slate-400 text-[10px] uppercase mr-1">Zoom:</span>
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.max(75, z - 15))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
              title="Alejar"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center font-black text-emerald-400 text-xs">{zoomScale}%</span>
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.min(150, z + 15))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
              title="Acercar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {soldItemsCount > 0 && (
            <button
              type="button"
              onClick={handleResetForm}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition"
              title="Limpiar campos"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* PHYSICAL DIGITAL SHEET CONTAINER */}
      <div className="bg-slate-200 p-1 sm:p-2.5 rounded-b-2xl border border-slate-300 overflow-x-auto shadow-inner">
        <div
          className="bg-white rounded-xl shadow-md border border-slate-300 transition-all duration-200 mx-auto max-w-2xl"
          style={{
            transform: zoomScale !== 100 ? `scale(${zoomScale / 100})` : 'none',
            transformOrigin: 'top center',
          }}
        >
          {/* SHEET HEADER */}
          <div className="p-2 sm:p-3 bg-slate-900 text-white rounded-t-xl border-b border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="font-black text-sm text-white tracking-wide block uppercase">
                MENUDENCIAS C&C
              </span>
              <span className="text-[10px] text-emerald-400 font-bold block">
                Boleta de Venta - Hoja Física
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">
                Fecha: {new Date().toLocaleDateString('es-AR')}
              </span>
              <span className="font-bold text-amber-400 text-xs">
                Items cargados: {soldItemsCount}/24
              </span>
            </div>
          </div>

          {/* ULTRA HIGH DENSITY 24 PRODUCT TABLE */}
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-slate-100 border-b border-slate-300 text-[10px] font-black text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="py-1 px-1 text-center w-[12%]">UND.</th>
                <th className="py-1 px-1 sm:px-2 w-[38%]">PRODUCTO</th>
                <th className="py-1 px-1 text-center w-[16%]">KGS.</th>
                <th className="py-1 px-1 sm:px-2 text-right w-[17%]">PRECIO</th>
                <th className="py-1 px-1 sm:px-2 text-right w-[17%]">IMPORTE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {calculatedRows.map((r) => {
                const isKgProduct = r.isKgProduct;

                return (
                  <tr
                    key={r.product.id}
                    className={`h-8 sm:h-9 transition-colors ${
                      r.hasValue
                        ? r.missingKgWarning
                          ? 'bg-amber-50/90 font-bold border-l-4 border-l-amber-500'
                          : 'bg-blue-50/90 font-bold border-l-4 border-l-blue-600'
                        : r.index % 2 === 0
                        ? 'bg-white'
                        : 'bg-slate-50/60'
                    }`}
                  >
                    {/* UND. CELL */}
                    <td className="py-0.5 px-0.5 text-center">
                      {viewMode === 'EDITION' ? (
                        <input
                          ref={(el) => {
                            undInputRefs.current[r.index] = el;
                          }}
                          type="text"
                          inputMode="decimal"
                          value={r.unidadesStr}
                          onChange={(e) =>
                            handleInputChange(r.product.id, 'unidades', e.target.value)
                          }
                          onKeyDown={(e) => handleKeyDown(e, r.index, 'unidades')}
                          placeholder="0"
                          className={`w-full text-center font-black text-xs py-0.5 px-0 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none transition ${
                            r.u > 0
                              ? r.missingKgWarning
                                ? 'border-amber-500 bg-amber-50 text-amber-900 font-extrabold shadow-2xs'
                                : 'border-blue-600 bg-white text-blue-900 font-extrabold shadow-2xs'
                              : 'border-slate-300 bg-slate-50 text-slate-800'
                          }`}
                        />
                      ) : (
                        <span className="font-bold text-slate-900">{r.unidadesStr || '-'}</span>
                      )}
                    </td>

                    {/* PRODUCT NAME CELL */}
                    <td className="py-0.5 px-1 sm:px-2 truncate font-bold text-slate-900 text-[11px] sm:text-xs">
                      <span className="text-slate-400 text-[9px] mr-1 select-none font-extrabold">
                        {r.index + 1}.
                      </span>
                      <span>{r.product.nombre}</span>
                    </td>

                    {/* KGS. CELL */}
                    <td className="py-0.5 px-0.5 text-center">
                      {viewMode === 'EDITION' ? (
                        <input
                          ref={(el) => {
                            kgInputRefs.current[r.index] = el;
                          }}
                          type="text"
                          inputMode="decimal"
                          value={r.kilajeStr}
                          onChange={(e) =>
                            handleInputChange(r.product.id, 'kilaje', e.target.value)
                          }
                          onKeyDown={(e) => handleKeyDown(e, r.index, 'kilaje')}
                          placeholder={isKgProduct ? '0,0' : '-'}
                          disabled={!isKgProduct}
                          className={`w-full text-center font-black text-xs py-0.5 px-0 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none transition ${
                            !isKgProduct
                              ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed'
                              : r.missingKgWarning
                              ? 'border-amber-500 bg-amber-50 text-amber-900 font-extrabold shadow-2xs animate-pulse ring-1 ring-amber-400'
                              : r.kg > 0
                              ? 'border-emerald-600 bg-white text-emerald-900 font-extrabold shadow-2xs'
                              : 'border-slate-300 bg-slate-50 text-slate-800'
                          }`}
                        />
                      ) : (
                        <span className="font-bold text-slate-900">
                          {isKgProduct ? r.kilajeStr || '-' : 'N/A'}
                        </span>
                      )}
                    </td>

                    {/* PRECIO AUTOMÁTICO CELL */}
                    <td className="py-0.5 px-1 sm:px-2 text-right font-extrabold text-[11px] sm:text-xs">
                      {r.price > 0 ? (
                        <span className="text-slate-800">{formatCurrency(r.price)}</span>
                      ) : (
                        <span className="text-red-600 font-bold text-[10px]">Sin precio</span>
                      )}
                    </td>

                    {/* IMPORTE CALCULADO CELL */}
                    <td className="py-0.5 px-1 sm:px-2 text-right font-black text-[11px] sm:text-xs">
                      {r.missingKgWarning ? (
                        <span
                          className="inline-flex items-center justify-end gap-0.5 text-amber-700 font-bold text-[10px]"
                          title="Falta ingresar el kilaje"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>$0 (Falta kg)</span>
                        </span>
                      ) : r.subtotal > 0 ? (
                        <span className="text-blue-700 font-black">
                          {formatCurrency(r.subtotal)}
                        </span>
                      ) : (
                        <span className="text-slate-300">$0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* FOOTER TOTAL ON SHEET */}
          <div className="p-2.5 bg-slate-100 rounded-b-xl border-t border-slate-300 flex items-center justify-between text-xs font-black">
            <span className="text-slate-600 uppercase">SUBTOTAL HOJA BOLETA:</span>
            <span className="text-blue-700 text-sm sm:text-base font-black">
              {formatCurrency(totalBoleta)}
            </span>
          </div>
        </div>
      </div>

      {/* SECCIÓN EN PÁGINA: RESUMEN FINANCIERO, FORMAS DE PAGO Y FINALIZACIÓN */}
      <div className="mt-4 bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-md space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          <h3 className="font-black text-slate-900 text-base sm:text-lg uppercase">
            Resumen Financiero y Forma de Pago
          </h3>
        </div>

        {/* FINANCIAL SUMMARY CARDS */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          {/* 1. TOTAL BOLETA */}
          <div className="flex items-center justify-between font-black text-slate-900 text-sm sm:text-base">
            <span>1. TOTAL DE LA BOLETA:</span>
            <span className="text-blue-700 text-lg sm:text-xl font-black">
              {formatCurrency(totalBoleta)}
            </span>
          </div>

          {/* 2. SALDO ANTERIOR */}
          <div className="flex items-center justify-between font-bold text-slate-600 text-xs sm:text-sm">
            <span>2. SALDO ANTERIOR:</span>
            <span
              className={
                saldoAnterior > 0
                  ? 'text-red-600 font-extrabold'
                  : saldoAnterior < 0
                  ? 'text-emerald-600 font-extrabold'
                  : 'text-slate-700'
              }
            >
              {formatCurrency(saldoAnterior)}
            </span>
          </div>

          <div className="border-t border-slate-200 my-1" />

          {/* 3. TOTAL GENERAL */}
          <div className="flex items-center justify-between font-black text-slate-900 text-base sm:text-lg bg-slate-200/80 p-2.5 rounded-xl">
            <span>3. TOTAL GENERAL:</span>
            <span className="text-slate-900">{formatCurrency(totalGeneral)}</span>
          </div>

          {/* PAYMENT MODE SELECTION */}
          <div className="pt-2">
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">
              Forma de Pago Hoy:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handlePaymentModeChange('NO_PAGO')}
                className={`py-2 px-2.5 rounded-xl font-extrabold text-xs transition-all border cursor-pointer ${
                  paymentMode === 'NO_PAGO'
                    ? 'bg-red-600 text-white border-red-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                No pagó
              </button>
              <button
                type="button"
                onClick={() => handlePaymentModeChange('EFECTIVO')}
                className={`py-2 px-2.5 rounded-xl font-extrabold text-xs transition-all border cursor-pointer ${
                  paymentMode === 'EFECTIVO'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Efectivo
              </button>
              <button
                type="button"
                onClick={() => handlePaymentModeChange('TRANSFERENCIA')}
                className={`py-2 px-2.5 rounded-xl font-extrabold text-xs transition-all border cursor-pointer ${
                  paymentMode === 'TRANSFERENCIA'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Transferencia
              </button>
              <button
                type="button"
                onClick={() => handlePaymentModeChange('MIXTO')}
                className={`py-2 px-2.5 rounded-xl font-extrabold text-xs transition-all border cursor-pointer ${
                  paymentMode === 'MIXTO'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Efectivo + Transf.
              </button>
            </div>
          </div>

          {/* PAYMENT INPUT FIELDS */}
          {(paymentMode === 'EFECTIVO' || paymentMode === 'MIXTO') && (
            <div className="pt-2 animate-fade-in">
              <label className="block text-xs font-bold text-emerald-800 mb-1">
                4. PAGÓ EN EFECTIVO ($):
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={pagoEfectivoStr}
                onChange={(e) => setPagoEfectivoStr(e.target.value)}
                placeholder="0"
                className="w-full text-lg font-black p-2.5 border-2 border-emerald-400 bg-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          )}

          {(paymentMode === 'TRANSFERENCIA' || paymentMode === 'MIXTO') && (
            <div className="pt-2 animate-fade-in">
              <label className="block text-xs font-bold text-blue-800 mb-1">
                5. PAGÓ EN TRANSFERENCIA ($):
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={pagoTransfStr}
                onChange={(e) => setPagoTransfStr(e.target.value)}
                placeholder="0"
                className="w-full text-lg font-black p-2.5 border-2 border-blue-400 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}

          {/* TOTAL PAGADO */}
          <div className="flex items-center justify-between font-extrabold text-slate-800 text-xs sm:text-sm pt-1">
            <span>TOTAL PAGADO:</span>
            <span className="text-emerald-700 font-black text-sm sm:text-base">
              {formatCurrency(totalPagado)}
            </span>
          </div>

          {/* SALDO ACTUALIZADO */}
          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between font-black text-slate-900 text-sm sm:text-base">
              <span>6. SALDO ACTUALIZADO:</span>
              <span
                className={
                  isAlDia
                    ? 'text-emerald-600'
                    : saldoActualizado > 0
                    ? 'text-red-600'
                    : 'text-emerald-600'
                }
              >
                {formatCurrency(saldoActualizado)}
              </span>
            </div>

            <div className="mt-2 text-center">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  isAlDia
                    ? 'bg-emerald-100 text-emerald-800'
                    : saldoActualizado > 0
                    ? 'bg-red-100 text-red-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isAlDia ? 'AL DÍA' : saldoActualizado > 0 ? 'DEBE SALDO' : 'A FAVOR DEL CLIENTE'}
              </span>
            </div>
          </div>
        </div>

        {/* IN-PAGE FINALIZE BUTTON WITH STATUS REASON */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={handleFinalizeSale}
            disabled={isSubmitting || !finalizeValidation.canFinalize}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
              isSubmitting || !finalizeValidation.canFinalize
                ? 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black active:scale-98'
            }`}
          >
            {isSubmitting ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            <span>FINALIZAR VENTA Y EMITIR BOLETA VIRTUAL</span>
          </button>

          {!finalizeValidation.canFinalize && finalizeValidation.reason && (
            <p className="text-center text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2 flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{finalizeValidation.reason}</span>
            </p>
          )}
        </div>
      </div>

      {/* STICKY BOTTOM BAR (POSICIONADA POR ENCIMA DE LA NAVEGACIÓN MÓVIL bottom-14 md:bottom-0) */}
      <div className="fixed bottom-14 md:bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-2.5 sm:p-3 z-40 shadow-2xl flex items-center justify-between gap-2">
        <div>
          <span className="text-[9px] uppercase font-bold text-slate-400 block">
            TOTAL BOLETA
          </span>
          <span className="text-base sm:text-xl font-black text-emerald-400">
            {formatCurrency(totalBoleta)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* VER RESUMEN BUTTON */}
          <button
            type="button"
            onClick={() => setShowFinancialSummaryDrawer(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 transition border border-slate-700 cursor-pointer active:scale-95"
          >
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Ver Resumen</span>
          </button>

          {/* EMITIR VENTA BUTTON */}
          <button
            type="button"
            onClick={handleFinalizeSale}
            disabled={isSubmitting || !finalizeValidation.canFinalize}
            className={`px-4 sm:px-5 py-2 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition-all cursor-pointer active:scale-95 ${
              isSubmitting || !finalizeValidation.canFinalize
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black'
            }`}
            title={finalizeValidation.reason || 'Finalizar Venta'}
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Finalizar</span>
          </button>
        </div>
      </div>

      {/* CUSTOMER SELECTION MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-blue-400" />
                  Seleccionar Cliente
                </h3>
                <p className="text-[11px] text-slate-400">
                  Busque un cliente para cargar su lista de precios
                </p>
              </div>

              {selectedCustomer && (
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* SEARCH INPUT */}
            <div className="p-3 border-b border-slate-200 bg-slate-50">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Buscar por nombre, alias o CUIT..."
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  autoFocus
                />
                {customerSearch && (
                  <button
                    onClick={() => setCustomerSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* CUSTOMERS LIST */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                  No se encontraron clientes coincidentes.
                </div>
              ) : (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCustomer(c)}
                    className="w-full text-left p-2.5 hover:bg-blue-50 rounded-xl transition flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <span className="font-extrabold text-slate-900 text-xs sm:text-sm block">
                        {c.alias || c.nombre}
                      </span>
                      {c.alias && c.nombre !== c.alias && (
                        <span className="text-[10px] text-slate-400 block">{c.nombre}</span>
                      )}
                      <span className="text-[10px] text-slate-500 font-medium">
                        Lista: <strong>{c.listaPrecioTipo || 'GENERAL'}</strong>
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-black text-xs sm:text-sm block ${
                          c.saldoActual > 0
                            ? 'text-red-600'
                            : c.saldoActual < 0
                            ? 'text-emerald-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {formatCurrency(c.saldoActual)}
                      </span>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">
                        Saldo
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* FINANCIAL SUMMARY DRAWER */}
      {showFinancialSummaryDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-w-2xl w-full mx-auto p-4 sm:p-6 shadow-2xl border-t border-slate-200 overflow-y-auto max-h-[88vh] animate-slide-up space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-900 text-base uppercase">
                  Resumen Financiero y Cobro
                </h3>
              </div>
              <button
                onClick={() => setShowFinancialSummaryDrawer(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FINANCIAL SUMMARY BOX */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              {/* 1. TOTAL BOLETA */}
              <div className="flex items-center justify-between font-black text-slate-900 text-base sm:text-lg">
                <span>1. TOTAL DE LA BOLETA:</span>
                <span className="text-blue-700 text-xl">{formatCurrency(totalBoleta)}</span>
              </div>

              {/* 2. SALDO ANTERIOR */}
              <div className="flex items-center justify-between font-bold text-slate-600 text-sm sm:text-base">
                <span>2. SALDO ANTERIOR:</span>
                <span
                  className={
                    saldoAnterior > 0
                      ? 'text-red-600'
                      : saldoAnterior < 0
                      ? 'text-emerald-600'
                      : ''
                  }
                >
                  {formatCurrency(saldoAnterior)}
                </span>
              </div>

              <div className="border-t border-slate-200 my-1" />

              {/* 3. TOTAL GENERAL */}
              <div className="flex items-center justify-between font-black text-slate-900 text-lg sm:text-xl bg-slate-200/70 p-2.5 rounded-xl">
                <span>3. TOTAL GENERAL:</span>
                <span className="text-slate-900">{formatCurrency(totalGeneral)}</span>
              </div>

              {/* PAYMENT MODE TOGGLE */}
              <div className="pt-2">
                <label className="block text-xs font-extrabold uppercase text-slate-500 mb-2">
                  Forma de Pago Hoy:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePaymentModeChange('NO_PAGO')}
                    className={`py-2 px-2.5 rounded-xl font-extrabold text-xs transition-all border cursor-pointer ${
                      paymentMode === 'NO_PAGO'
                        ? 'bg-red-600 text-white border-red-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    No pagó
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentModeChange('EFECTIVO')}
                    className={`py-2 px-2.5 rounded-xl font-extrabold text-xs transition-all border cursor-pointer ${
                      paymentMode === 'EFECTIVO'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentModeChange('TRANSFERENCIA')}
                    className={`py-2 px-2.5 rounded-xl font-extrabold text-xs transition-all border cursor-pointer ${
                      paymentMode === 'TRANSFERENCIA'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Transferencia
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaymentModeChange('MIXTO')}
                    className={`py-2 px-2.5 rounded-xl font-extrabold text-xs transition-all border cursor-pointer ${
                      paymentMode === 'MIXTO'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Efectivo + Transf.
                  </button>
                </div>
              </div>

              {/* PAYMENT INPUT FIELDS */}
              {(paymentMode === 'EFECTIVO' || paymentMode === 'MIXTO') && (
                <div className="pt-2 animate-fade-in">
                  <label className="block text-xs font-bold text-emerald-800 mb-1">
                    4. PAGÓ EN EFECTIVO ($):
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={pagoEfectivoStr}
                    onChange={(e) => setPagoEfectivoStr(e.target.value)}
                    placeholder="0"
                    className="w-full text-lg font-black p-2.5 border-2 border-emerald-400 bg-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {(paymentMode === 'TRANSFERENCIA' || paymentMode === 'MIXTO') && (
                <div className="pt-2 animate-fade-in">
                  <label className="block text-xs font-bold text-blue-800 mb-1">
                    5. PAGÓ EN TRANSFERENCIA ($):
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={pagoTransfStr}
                    onChange={(e) => setPagoTransfStr(e.target.value)}
                    placeholder="0"
                    className="w-full text-lg font-black p-2.5 border-2 border-blue-400 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {/* SALDO ACTUALIZADO SUMMARY */}
              <div className="border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between font-black text-slate-900 text-base sm:text-lg">
                  <span>6. SALDO ACTUALIZADO:</span>
                  <span
                    className={
                      isAlDia
                        ? 'text-emerald-600'
                        : saldoActualizado > 0
                        ? 'text-red-600'
                        : 'text-emerald-600'
                    }
                  >
                    {formatCurrency(saldoActualizado)}
                  </span>
                </div>

                <div className="mt-2 text-center">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      isAlDia
                        ? 'bg-emerald-100 text-emerald-800'
                        : saldoActualizado > 0
                        ? 'bg-red-100 text-red-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isAlDia ? 'AL DÍA' : saldoActualizado > 0 ? 'DEBE SALDO' : 'A FAVOR DEL CLIENTE'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleFinalizeSale}
                disabled={isSubmitting || !finalizeValidation.canFinalize}
                className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                  isSubmitting || !finalizeValidation.canFinalize
                    ? 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black'
                }`}
              >
                {isSubmitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                <span>Finalizar y Emitir Boleta</span>
              </button>

              {!finalizeValidation.canFinalize && finalizeValidation.reason && (
                <p className="text-center text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2 flex items-center justify-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{finalizeValidation.reason}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED BOLETA MODAL */}
      {createdBoleta && (
        <VirtualBoletaModal
          boleta={createdBoleta}
          currentUser={currentUser}
          onClose={() => setCreatedBoleta(null)}
          onViewImage={onViewImage}
        />
      )}
    </div>
  );
};
