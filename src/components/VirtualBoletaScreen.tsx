import React, { useState, useEffect, useRef } from 'react';
import {
  CustomerWithBalance,
  CustomerBranch,
  Product,
  PriceListType,
  BoletaItem,
  VirtualBoleta,
  AppUser,
  PaymentMethod,
} from '../types';
import {
  getStoredProducts,
  getStockSummaryForPeriod,
  finalizeVirtualBoleta,
  saveProducts,
  OFFICIAL_BOLETA_CATALOG,
} from '../utils/stockAndBoletasManager';
import { generateBoletaImage } from '../utils/boletaImageGenerator';
import { persistVirtualBoletaImage } from '../utils/virtualBoletaImageStorage';
import {
  saveSaleDraft,
  getSaleDraft,
  clearSaleDraft,
} from '../utils/storage';
import { formatCurrency, formatDate } from '../utils/formatters';
import { VirtualBoletaModal } from './VirtualBoletaModal';
import {
  Search,
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  UserCheck,
  Zap,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

const normalizeProductName = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

interface VirtualBoletaScreenProps {
  customers: CustomerWithBalance[];
  currentUser: AppUser;
  onSaleCompleted: () => void;
  preselectedCustomer?: CustomerWithBalance;
  onViewImage?: (url: string, title: string) => void;
}

export const VirtualBoletaScreen: React.FC<VirtualBoletaScreenProps> = ({
  customers,
  currentUser,
  onSaleCompleted,
  preselectedCustomer,
  onViewImage,
}) => {
  const isRepartidor = currentUser.role === 'REPARTIDOR';
  const isDuenoOrAdmin = currentUser.role === 'DUENO' || currentUser.role === 'ADMINISTRADOR';

  // Products and Stock Data
  const [products, setProducts] = useState<Product[]>(getStoredProducts());
  const [stockSummary, setStockSummary] = useState(getStockSummaryForPeriod());

  // Customer Selection State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithBalance | null>(
    preselectedCustomer || null
  );
  const [selectedBranch, setSelectedBranch] = useState<CustomerBranch | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Active Price List State
  const [activePriceList, setActivePriceList] = useState<PriceListType>('GENERAL');

  // Boleta Items State
  const [items, setItems] = useState<
    {
      id: string;
      productId: string;
      unidadesInput: string;
      kilajeInput: string;
      precioOverride: string;
      observacion: string;
    }[]
  >([]);

  const [showProductCreator, setShowProductCreator] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [catalogProductId, setCatalogProductId] = useState<string>('');
  const [catalogPriceInput, setCatalogPriceInput] = useState('');
  const [unpricedProductNotice, setUnpricedProductNotice] = useState('');

  // Financial Overrides
  const [descuentoInput, setDescuentoInput] = useState<string>('0');
  const [recargoInput, setRecargoInput] = useState<string>('0');

  // Payment Selection State
  const [pagoTipo, setPagoTipo] = useState<
    'DEBE' | 'EFECTIVO' | 'TRANSFERENCIA' | 'MIXTO'
  >('DEBE');

  const [pagoEfectivoInput, setPagoEfectivoInput] = useState<string>('0');
  const [pagoTransferenciaInput, setPagoTransferenciaInput] = useState<string>('0');
  const [pagoOtrosInput, setPagoOtrosInput] = useState<string>('0');

  // Physical Photo State
  const [fotoUrl, setFotoUrl] = useState<string>('');
  const [photoError, setPhotoError] = useState<boolean>(false);

  // Stock Warning Override Justification
  const [stockJustification, setStockJustification] = useState<string>('');

  // Generated Boleta Modal
  const [completedBoleta, setCompletedBoleta] = useState<VirtualBoleta | null>(null);

  // Draft Notice
  const [restoredDraftNotice, setRestoredDraftNotice] = useState<boolean>(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-load Customer details when selected
  useEffect(() => {
    if (selectedCustomer) {
      const listType = selectedCustomer.listaPrecioTipo || 'GENERAL';
      setActivePriceList(listType);

      // Default payment mode if customary
      if (selectedCustomer.formaPagoHabitual === 'EFECTIVO') setPagoTipo('EFECTIVO');
      else if (selectedCustomer.formaPagoHabitual === 'TRANSFERENCIA') setPagoTipo('TRANSFERENCIA');
      else if (selectedCustomer.formaPagoHabitual === 'MIXTO') setPagoTipo('MIXTO');
      else setPagoTipo('DEBE');

      // Select default branch if available
      if (selectedCustomer.sucursales && selectedCustomer.sucursales.length > 0) {
        setSelectedBranch(selectedCustomer.sucursales[0]);
      } else {
        setSelectedBranch(null);
      }
    }
  }, [selectedCustomer]);

  // Restore Draft on mount if available
  useEffect(() => {
    const draft = getSaleDraft();
    if (draft && !preselectedCustomer) {
      if (draft.customerId) {
        const found = customers.find((c) => c.id === draft.customerId);
        if (found) setSelectedCustomer(found);
      }
      if (draft.fotoUrl) setFotoUrl(draft.fotoUrl);
      setRestoredDraftNotice(true);
    }
  }, [customers, preselectedCustomer]);

  // Save Draft automatically
  useEffect(() => {
    if (selectedCustomer || items.length > 1 || fotoUrl) {
      saveSaleDraft({
        customerId: selectedCustomer?.id,
        fotoUrl,
      });
    }
  }, [selectedCustomer, items, fotoUrl]);

  const updateProductItem = (
    productId: string,
    field: 'unidadesInput' | 'kilajeInput',
    value: string
  ) => {
    setItems((previous) => {
      const existing = previous.find((item) => item.productId === productId);
      if (existing) {
        return previous.map((item) =>
          item.productId === productId ? { ...item, [field]: value } : item
        );
      }
      return [
        ...previous,
        {
          id: `item_${Date.now()}_${productId}`,
          productId,
          unidadesInput: field === 'unidadesInput' ? value : '',
          kilajeInput: field === 'kilajeInput' ? value : '',
          precioOverride: '',
          observacion: '',
        },
      ];
    });
  };

  const handleCreateProduct = () => {
    const name = newProductName.trim();
    const price = parseFloat(newProductPrice.replace(',', '.'));
    if (!name || !Number.isFinite(price) || price < 0) return;
    if (products.some((product) => normalizeProductName(product.nombre) === normalizeProductName(name))) {
      setUnpricedProductNotice('Ese producto ya existe en el catálogo. Configurá su precio desde esta administración.');
      return;
    }

    const product: Product = {
      id: `prod_${normalizeProductName(name).replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`,
      codigo: `MAN-${String(Date.now()).slice(-5)}`,
      nombre: name,
      tipoVenta: 'POR_KILO',
      tipoControlStock: 'UNIDADES_Y_KILOS',
      unidadMedida: 'kg',
      precios: { GENERAL: price, MAYORISTA: price, ESPECIAL: price, PERSONALIZADA: price },
      stockMinimoUnidades: 0,
      stockMinimoKg: 0,
      activo: true,
    };
    const updatedProducts = [...products, product];
    saveProducts(updatedProducts);
    setProducts(updatedProducts);
    setNewProductName('');
    setNewProductPrice('');
    setShowProductCreator(false);
  };

  const handleSelectCatalogProduct = (product: Product) => {
    setCatalogProductId(product.id);
    setCatalogPriceInput(String(product.precios[activePriceList] ?? 0));
  };

  const handleSaveCatalogPrice = () => {
    const price = parseFloat(catalogPriceInput.replace(',', '.'));
    if (!catalogProductId || !Number.isFinite(price) || price < 0) return;

    const updatedProducts = products.map((product) =>
      product.id === catalogProductId
        ? { ...product, precios: { ...product.precios, [activePriceList]: price } }
        : product
    );
    saveProducts(updatedProducts);
    setProducts(updatedProducts);
    setUnpricedProductNotice('Precio actualizado para la lista actual.');
  };

  const getProductPrice = (product: Product) => {
    if (selectedCustomer?.preciosPersonalizados?.[product.id] !== undefined) {
      return selectedCustomer.preciosPersonalizados[product.id];
    }
    return product.precios[activePriceList] ?? 0;
  };

  // Calculate Subtotal for an Item
  const calculateItemSubtotal = (
    productId: string,
    uInput: string,
    kgInput: string,
    precioOverride: string
  ) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return { subtotal: 0, precioAplicado: 0, unidades: 0, kilajeReal: 0 };

    const unidades = parseFloat(uInput.replace(',', '.')) || 0;
    const kilajeReal = parseFloat(kgInput.replace(',', '.')) || 0;

    let precioAplicado = getProductPrice(prod);

    // Custom customer prices
    if (
      selectedCustomer?.preciosPersonalizados &&
      selectedCustomer.preciosPersonalizados[prod.id] !== undefined
    ) {
      precioAplicado = selectedCustomer.preciosPersonalizados[prod.id];
    }

    // Owner/Admin manual override
    if (isDuenoOrAdmin && precioOverride.trim() !== '') {
      const parsedOverride = parseFloat(precioOverride.replace(',', '.'));
      if (!isNaN(parsedOverride) && parsedOverride >= 0) {
        precioAplicado = parsedOverride;
      }
    }

    let subtotal = 0;
    if (prod.tipoVenta === 'POR_UNIDAD') {
      subtotal = unidades * precioAplicado;
    } else {
      // POR_KILO or UNIDADES_INFORMATIVAS_COBRO_POR_KILO
      subtotal = kilajeReal * precioAplicado;
    }

    return { subtotal, precioAplicado, unidades, kilajeReal };
  };

  // Computed Totals
  let itemsSubtotalSum = 0;
  const processedItems: BoletaItem[] = items.map((it) => {
    const prod = products.find((p) => p.id === it.productId);
    const { subtotal, precioAplicado, unidades, kilajeReal } = calculateItemSubtotal(
      it.productId,
      it.unidadesInput,
      it.kilajeInput,
      it.precioOverride
    );

    itemsSubtotalSum += subtotal;

    return {
      id: it.id,
      productId: it.productId,
      productName: prod ? prod.nombre : 'Producto',
      tipoVenta: prod ? prod.tipoVenta : 'POR_KILO',
      unidades,
      kilajeReal,
      unidadMedida: prod ? prod.unidadMedida : 'kg',
      precioAplicado,
      subtotal,
      observacion: it.observacion,
    };
  });

  const descuento = parseFloat(descuentoInput.replace(',', '.')) || 0;
  const recargo = parseFloat(recargoInput.replace(',', '.')) || 0;

  const totalBoleta = Math.max(0, itemsSubtotalSum - descuento + recargo);

  // Payment mode only determines the visible fields; received amounts are always entered manually.
  useEffect(() => {
    if (pagoTipo === 'EFECTIVO') {
      setPagoTransferenciaInput('0');
    } else if (pagoTipo === 'TRANSFERENCIA') {
      setPagoEfectivoInput('0');
    } else if (pagoTipo === 'DEBE') {
      setPagoEfectivoInput('0');
      setPagoTransferenciaInput('0');
    }
    setPagoOtrosInput('0');
  }, [pagoTipo]);

  const efecNum = parseFloat(pagoEfectivoInput.replace(',', '.')) || 0;
  const transNum = parseFloat(pagoTransferenciaInput.replace(',', '.')) || 0;
  const otrosNum = parseFloat(pagoOtrosInput.replace(',', '.')) || 0;

  const totalPagado = efecNum + transNum + otrosNum;
  const saldoRestante = Math.max(0, totalBoleta - totalPagado);

  // Check Stock Exceeded Warning
  let hasStockExceeded = false;
  const stockExceededList: { productName: string; requested: string; available: string }[] = [];

  processedItems.forEach((it) => {
    const summary = stockSummary.find((s) => s.product.id === it.productId);
    if (summary) {
      if (summary.product.tipoControlStock === 'SOLO_UNIDADES') {
        if (it.unidades > summary.unidadesDisponibles) {
          hasStockExceeded = true;
          stockExceededList.push({
            productName: summary.product.nombre,
            requested: `${it.unidades} u`,
            available: `${summary.unidadesDisponibles} u`,
          });
        }
      } else {
        if (it.kilajeReal > summary.kilogramosDisponibles) {
          hasStockExceeded = true;
          stockExceededList.push({
            productName: summary.product.nombre,
            requested: `${it.kilajeReal} kg`,
            available: `${summary.kilogramosDisponibles} kg`,
          });
        }
      }
    }
  });

  // Photo Handling
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

  // Generate Sample Photo for Fast Testing
  const handleGenerateSampleBoletaPhoto = () => {
    if (!selectedCustomer) return;
    const custName = selectedCustomer.alias || selectedCustomer.nombre;
    const num = `B-${String(Date.now()).slice(-5)}`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
      <rect width="600" height="800" fill="#fcfbf7" rx="16"/>
      <rect x="20" y="20" width="560" height="760" fill="none" stroke="#0f172a" stroke-width="3" stroke-dasharray="8,8"/>
      <text x="300" y="70" font-family="sans-serif" font-size="24" font-weight="900" fill="#0f172a" text-anchor="middle">C&amp;C DISTRIBUIDORA DE CARNES</text>
      <text x="300" y="100" font-family="sans-serif" font-size="16" font-weight="bold" fill="#059669" text-anchor="middle">BOLETA FÍSICA FOTO-CONFORMADA N° ${num}</text>
      <line x1="40" y1="120" x2="560" y2="120" stroke="#cbd5e1" stroke-width="2"/>
      
      <text x="50" y="160" font-family="sans-serif" font-size="16" font-weight="bold" fill="#0f172a">CLIENTE: ${custName}</text>
      <text x="50" y="190" font-family="sans-serif" font-size="14" fill="#64748b">DIRECCIÓN: ${selectedCustomer.direccion}</text>
      <text x="50" y="215" font-family="sans-serif" font-size="14" fill="#64748b">FECHA: ${new Date().toLocaleDateString('es-AR')}</text>
      
      <rect x="40" y="240" width="520" height="340" fill="#ffffff" stroke="#e2e8f0" rx="10"/>
      <text x="60" y="280" font-family="monospace" font-size="15" fill="#1e293b">• VENTA BOLETA VIRTUAL C&amp;C</text>
      <text x="60" y="320" font-family="monospace" font-size="15" fill="#1e293b">• MONTO TOTAL: $ ${totalBoleta.toLocaleString('es-AR')}</text>
      <text x="60" y="360" font-family="monospace" font-size="15" fill="#059669">• TOTAL ABONADO: $ ${totalPagado.toLocaleString('es-AR')}</text>

      <circle cx="480" cy="650" r="60" fill="#059669" opacity="0.15"/>
      <text x="480" y="655" font-family="sans-serif" font-size="16" font-weight="bold" fill="#047857" text-anchor="middle">RECIBIDO OK</text>
    </svg>`;

    setFotoUrl(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
    setPhotoError(false);
  };

  // Finalize Boleta Transaction
  const handleFinalize = async () => {
    if (!selectedCustomer) {
      alert('Por favor seleccione un cliente.');
      return;
    }

    if (processedItems.length === 0 || totalBoleta <= 0) {
      alert('Debe agregar al menos un producto con importe superior a $0.');
      return;
    }

    if (hasStockExceeded && isRepartidor && !stockJustification.trim()) {
      alert('Esta venta supera el stock registrado. Ingrese una justificación obligatoria para continuar.');
      return;
    }

    const numeroBoleta = `B-${String(Date.now()).slice(-6)}`;

    const { virtualBoleta, movementBoleta } = finalizeVirtualBoleta({
      numeroBoleta,
      customer: selectedCustomer,
      branchId: selectedBranch?.id,
      branchName: selectedBranch?.nombre,
      items: processedItems,
      subtotal: itemsSubtotalSum,
      descuento,
      recargo,
      total: totalBoleta,
      pagoEfectivo: efecNum,
      pagoTransferencia: transNum,
      pagoOtros: otrosNum,
      fotoBoletaFisicaUrl: fotoUrl, // optional
      usuario: currentUser.nombre,
      listaPrecioAplicada: activePriceList,
    });

    // Generate 1080px mobile-optimized image automatically
    try {
      const generatedImageUrl = await generateBoletaImage(virtualBoleta);
      await persistVirtualBoletaImage(virtualBoleta, generatedImageUrl, movementBoleta.id);
    } catch (err) {
      console.error('Error generando imagen de boleta:', err);
    }

    clearSaleDraft();
    setCompletedBoleta(virtualBoleta);
    onSaleCompleted();
  };

  const orderedProductRows = OFFICIAL_BOLETA_CATALOG.map((definition) => ({
    rowName: definition.nombre,
    product: products.find((product) => product.nombre === definition.nombre),
  }));
  const orderedProductIds = new Set(
    orderedProductRows.flatMap((row) => (row.product ? [row.product.id] : []))
  );
  const additionalProductRows = products
    .filter((product) => !orderedProductIds.has(product.id) && product.codigo.startsWith('MAN-'))
    .map((product) => ({ rowName: product.nombre, product }));
  const saldoAnterior = selectedCustomer?.saldoActual || 0;
  const totalGeneral = saldoAnterior + totalBoleta;
  const saldoActualizado = totalGeneral - totalPagado;
  const estadoCuenta = saldoActualizado === 0
    ? 'AL DÍA'
    : saldoActualizado > 0
      ? `DEBE ${formatCurrency(saldoActualizado)}`
      : `A FAVOR ${formatCurrency(Math.abs(saldoActualizado))}`;
  const estadoBoleta = saldoRestante <= 0
    ? 'Boleta pagada'
    : totalPagado > 0
      ? 'Boleta con pago parcial'
      : 'Boleta no pagada';
  const catalogProduct = products.find((product) => product.id === catalogProductId);
  const formatTableCurrency = (value: number) =>
    value > 0 ? `$${value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : '—';

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-10">
      {/* Header Banner */}
      <div className="border-b-2 border-slate-900 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black uppercase px-2.5 py-0.5 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> Módulo Express
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Boleta Virtual C&C
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Generación de comprobante digital, cálculo automático por lista de precios y descuento de stock semanal.
          </p>
        </div>

        {restoredDraftNotice && (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 text-xs px-3 py-1.5 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Borrador autoguardado recuperado</span>
          </div>
        )}
      </div>

      {/* 1. SELECCIÓN DE CLIENTE Y SUCURSAL */}
      <section className="border-b border-slate-300 pb-4 space-y-4">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center space-x-2">
          <UserCheck className="w-5 h-5 text-blue-600" />
          <span>1. Selección de Cliente y Condición de Venta</span>
        </h2>

        {!selectedCustomer ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cliente por nombre, fantasía, dirección o zona..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {customers
                .filter(
                  (c) =>
                    c.nombre.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                    (c.alias && c.alias.toLowerCase().includes(customerSearchQuery.toLowerCase())) ||
                    c.direccion.toLowerCase().includes(customerSearchQuery.toLowerCase())
                )
                .map((cust) => (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomer(cust)}
                    className="p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <p className="font-extrabold text-slate-900 text-sm">
                        {cust.alias || cust.nombre}
                      </p>
                      <p className="text-xs text-slate-500">{cust.direccion} - {cust.zonaRuta}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                        Lista: {cust.listaPrecioTipo || 'GENERAL'}
                      </span>
                      <p className="text-xs font-black text-slate-900 mt-1">
                        Deuda: {formatCurrency(cust.saldoActual)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  Cliente Seleccionado
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {selectedCustomer.alias || selectedCustomer.nombre}
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  {selectedCustomer.direccion} ({selectedCustomer.localidad}) - {selectedCustomer.zonaRuta}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                Cambiar Cliente
              </button>
            </div>

            {/* Branch Picker if Multiple Sucursales Exist */}
            {selectedCustomer.sucursales && selectedCustomer.sucursales.length > 0 && (
              <div className="pt-2 border-t border-slate-200">
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  Sucursal / Local de Entrega:
                </label>
                <select
                  value={selectedBranch?.id || ''}
                  onChange={(e) => {
                    const b = selectedCustomer.sucursales?.find((br) => br.id === e.target.value);
                    setSelectedBranch(b || null);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option value="">-- Local Principal / Casa Central --</option>
                  {selectedCustomer.sucursales.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre} - {b.direccion} (Deuda local: {formatCurrency(b.saldoActual)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Commercial Info Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2 border-t border-slate-200/80">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-bold block">Lista Asignada:</span>
                <span className="font-black text-slate-900">{activePriceList}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-bold block">Saldo Actual Cuenta:</span>
                <span className="font-black text-slate-900">{formatCurrency(selectedCustomer.saldoActual)}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-bold block">Forma Pago Habitual:</span>
                <span className="font-black text-slate-900">{selectedCustomer.formaPagoHabitual || 'DEBE'}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-bold block">Contacto:</span>
                <span className="font-bold text-slate-900 truncate block">{selectedCustomer.telefono || 'Sin tel'}</span>
              </div>
            </div>

            {/* Owner / Admin List Override */}
            {isDuenoOrAdmin && (
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900">
                  👑 Permiso Especial: Cambiar Lista de Precios
                </span>
                <select
                  value={activePriceList}
                  onChange={(e) => setActivePriceList(e.target.value as PriceListType)}
                  className="bg-white border border-amber-300 font-bold text-amber-900 rounded-lg px-2.5 py-1"
                >
                  <option value="GENERAL">Lista General</option>
                  <option value="MAYORISTA">Lista Mayorista</option>
                  <option value="ESPECIAL">Lista Especial</option>
                  <option value="PERSONALIZADA">Lista Personalizada</option>
                </select>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. DETALLE DE PRODUCTOS */}
      <section className="border-y border-slate-300 py-3 sm:py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" /> Detalle de mercadería
            </h2>
            <p className="text-[11px] text-slate-500">Cargá únicamente unidades y kilos. El precio e importe se calculan automáticamente.</p>
          </div>
          {isDuenoOrAdmin && (
            <button
              onClick={() => setShowProductCreator((visible) => !visible)}
              className="text-[11px] font-black uppercase text-emerald-800 border border-emerald-300 px-2.5 py-1.5 hover:bg-emerald-50 transition"
            >
              {showProductCreator ? 'Cerrar administración' : 'Administrar productos'}
            </button>
          )}
        </div>

        {showProductCreator && isDuenoOrAdmin && (
          <div className="space-y-3 border-y border-slate-300 bg-slate-50 py-3">
            <p className="text-[11px] font-semibold text-slate-600">Configurá el precio de la lista {activePriceList}. Los productos sin precio quedan bloqueados para reparto.</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {orderedProductRows.map(({ rowName, product }) => (
                <button
                  key={product?.id || rowName}
                  type="button"
                  onClick={() => product && handleSelectCatalogProduct(product)}
                  className={`border px-2 py-1.5 text-left text-[11px] font-bold ${catalogProductId === product?.id ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-slate-300 bg-white text-slate-700'}`}
                >
                  <span className="block truncate">{rowName}</span>
                  <span className="text-[10px] font-medium text-slate-500">{product ? formatTableCurrency(getProductPrice(product)) : '—'}</span>
                </button>
              ))}
            </div>
            {catalogProduct && (
              <div className="grid grid-cols-1 gap-2 border-t border-slate-200 pt-3 sm:grid-cols-[1fr_170px_auto]">
                <span className="self-center text-xs font-black text-slate-800">{catalogProduct.nombre}</span>
                <input value={catalogPriceInput} onChange={(e) => setCatalogPriceInput(e.target.value)} inputMode="decimal" placeholder="Precio por kg" className="border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold" />
                <button onClick={handleSaveCatalogPrice} className="bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-700">Guardar precio</button>
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 border-t border-slate-200 pt-3 sm:grid-cols-[1fr_150px_auto]">
              <input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} placeholder="Nuevo producto" className="border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold" />
              <input value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} inputMode="decimal" placeholder="Precio por kg" className="border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold" />
              <button onClick={handleCreateProduct} className="border border-slate-900 bg-white px-3 py-2 text-xs font-black text-slate-900 hover:bg-slate-900 hover:text-white">Agregar al catálogo</button>
            </div>
          </div>
        )}

        <div className="overflow-hidden border border-slate-300">
          <table className="w-full table-fixed border-collapse text-[10px] sm:text-xs">
            <colgroup>
              <col className="w-[39%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[18%]" />
              <col className="w-[19%]" />
            </colgroup>
            <thead className="bg-slate-900 text-white uppercase tracking-wide text-[8px] sm:text-[10px]">
              <tr>
                <th className="px-1 py-1.5 text-left sm:px-3">Prod.</th>
                <th className="px-0.5 py-1.5 text-center sm:px-2">Und.</th>
                <th className="px-0.5 py-1.5 text-center sm:px-2">Kg</th>
                <th className="px-1 py-1.5 text-right sm:px-3">Precio</th>
                <th className="px-1 py-1.5 text-right sm:px-3">Imp.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[...orderedProductRows, ...additionalProductRows].map(({ rowName, product }, index) => {
                const item = product ? items.find((current) => current.productId === product.id) : undefined;
                const calculation = product
                  ? calculateItemSubtotal(product.id, item?.unidadesInput || '', item?.kilajeInput || '', '')
                  : { subtotal: 0, precioAplicado: 0 };
                const hasPrice = Boolean(product && getProductPrice(product) > 0);

                return (
                  <tr
                    key={product?.id || rowName}
                    onClick={() => !hasPrice && setUnpricedProductNotice(`${rowName} no tiene precio en la lista ${activePriceList}.${isDuenoOrAdmin ? ' Configuralo desde Administrar productos.' : ''}`)}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} h-11 ${!hasPrice ? 'cursor-pointer' : ''}`}
                  >
                    <td className="break-words px-1 py-1 font-bold leading-tight text-slate-800 sm:px-3">
                      {rowName}
                    </td>
                    <td className="p-0.5 sm:p-1">
                      <input disabled={!hasPrice} value={item?.unidadesInput || ''} onChange={(e) => product && updateProductItem(product.id, 'unidadesInput', e.target.value)} inputMode="decimal" placeholder="0" className="h-7 min-w-0 w-full border border-slate-300 bg-white px-0.5 text-center text-[10px] font-bold text-slate-900 disabled:bg-slate-100 sm:px-2 sm:text-xs" />
                    </td>
                    <td className="p-0.5 sm:p-1">
                      <input disabled={!hasPrice} value={item?.kilajeInput || ''} onChange={(e) => product && updateProductItem(product.id, 'kilajeInput', e.target.value)} inputMode="decimal" placeholder="0" className="h-7 min-w-0 w-full border border-slate-300 bg-white px-0.5 text-center text-[10px] font-bold text-emerald-800 disabled:bg-slate-100 sm:px-2 sm:text-xs" />
                    </td>
                    <td className="whitespace-nowrap px-1 py-1 text-right text-[9px] font-semibold text-slate-600 sm:px-3 sm:text-xs">{hasPrice ? formatTableCurrency(calculation.precioAplicado) : '—'}</td>
                    <td className="whitespace-nowrap px-1 py-1 text-right text-[9px] font-black text-slate-900 sm:px-3 sm:text-xs">{hasPrice ? formatTableCurrency(calculation.subtotal) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {unpricedProductNotice && (
          <p className="text-[11px] font-medium text-slate-600">{unpricedProductNotice}</p>
        )}

        {/* Warning if Sale exceeds Stock */}
        {hasStockExceeded && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2 text-red-800 font-extrabold text-xs">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
              <span>ADVERTENCIA: Esta venta supera el stock semanal disponible en depósito</span>
            </div>
            <ul className="text-xs text-red-700 list-disc list-inside space-y-1 font-medium">
              {stockExceededList.map((st, i) => (
                <li key={i}>
                  <strong>{st.productName}</strong> - Solicitado: {st.requested} | Disponible: {st.available}
                </li>
              ))}
            </ul>
            {isRepartidor && (
              <div className="pt-2">
                <label className="text-xs font-bold text-red-900 block mb-1">
                  Justificación obligatoria del Repartidor para continuar:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Se retiró mercadería fresca directo de frigorífico..."
                  value={stockJustification}
                  onChange={(e) => setStockJustification(e.target.value)}
                  className="w-full bg-white border border-red-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                />
              </div>
            )}
          </div>
        )}

        {/* 3. RESUMEN Y TOTAL DE LA BOLETA */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border border-slate-300 bg-white text-slate-900">
          <div className="border-b sm:border-b-0 sm:border-r border-slate-200 px-3 py-2">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Subtotal</p>
              <p className="text-sm font-black text-slate-900">{formatCurrency(itemsSubtotalSum)}</p>
            </div>

            <div className="contents text-xs">
              <div className="border-b sm:border-b-0 sm:border-r border-slate-200 px-3 py-2">
                <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Descuento</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={descuentoInput}
                  onChange={(e) => setDescuentoInput(e.target.value)}
                  className="mt-1 w-full border-b border-slate-300 bg-transparent px-0 py-0.5 text-sm text-emerald-700 font-black outline-none"
                />
              </div>
              <div className="border-b sm:border-b-0 sm:border-r border-slate-200 px-3 py-2">
                <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Recargo</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={recargoInput}
                  onChange={(e) => setRecargoInput(e.target.value)}
                  className="mt-1 w-full border-b border-slate-300 bg-transparent px-0 py-0.5 text-sm text-amber-700 font-black outline-none"
                />
              </div>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-slate-900 px-3 py-2 text-white">
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-300">
              Total de la boleta
            </span>
            <span className="text-lg font-black text-emerald-400 tracking-tight">
              {formatCurrency(totalBoleta)}
            </span>
          </div>
        </div>
      </section>

      {/* 4. FORMA DE PAGO Y DEUDAS */}
      <div className="border-b border-slate-300 pb-3 space-y-3">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-3">
          <DollarSign className="w-4 h-4 text-emerald-700" />
          <span>3. Selección de Forma de Pago</span>
        </h2>

        {/* Selector Modos de Pago */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'DEBE', label: 'No pagó', color: 'border-red-300 bg-red-50 text-red-800' },
            { id: 'EFECTIVO', label: 'Pagó en efectivo', color: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
            { id: 'TRANSFERENCIA', label: 'Pagó en transferencia', color: 'border-blue-300 bg-blue-50 text-blue-800' },
            { id: 'MIXTO', label: 'Efectivo y transferencia', color: 'border-purple-300 bg-purple-50 text-purple-800' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setPagoTipo(mode.id as any)}
              className={`border px-2 py-2 text-[11px] font-extrabold text-center transition cursor-pointer ${
                pagoTipo === mode.id
                  ? `${mode.color} ring-2 ring-slate-900 shadow-sm`
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {pagoTipo !== 'DEBE' && (
          <div className={`border border-slate-200 bg-slate-50 p-3 grid gap-3 text-xs ${pagoTipo === 'MIXTO' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            {(pagoTipo === 'EFECTIVO' || pagoTipo === 'MIXTO') && (
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Efectivo recibido ($)</label>
              <input
                type="text"
                inputMode="decimal"
                value={pagoEfectivoInput}
                onChange={(e) => setPagoEfectivoInput(e.target.value)}
                className="w-full bg-white border border-slate-300 px-3 py-2 font-bold text-slate-900"
              />
              </div>
            )}
            {(pagoTipo === 'TRANSFERENCIA' || pagoTipo === 'MIXTO') && (
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Transferencia recibida ($)</label>
              <input
                type="text"
                inputMode="decimal"
                value={pagoTransferenciaInput}
                onChange={(e) => setPagoTransferenciaInput(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
              />
              </div>
            )}
          </div>
        )}

        {/* Total Pagado vs Saldo Pendiente Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border border-slate-300 text-xs">
          <div className="border-b border-r border-slate-200 px-3 py-2">
            <span className="block text-[10px] font-bold uppercase text-slate-500">Total de la boleta</span>
            <span className="font-black text-slate-900">{formatCurrency(totalBoleta)}</span>
          </div>
          <div className="border-b sm:border-r border-slate-200 px-3 py-2">
            <span className="block text-[10px] font-bold uppercase text-slate-500">Saldo anterior</span>
            <span className="font-black text-slate-900">{formatCurrency(saldoAnterior)}</span>
          </div>
          <div className="border-b border-r sm:border-b-0 border-slate-200 px-3 py-2">
            <span className="block text-[10px] font-bold uppercase text-slate-500">Total general</span>
            <span className="font-black text-slate-900">{formatCurrency(totalGeneral)}</span>
          </div>
          <div className="border-b sm:border-b-0 border-slate-200 px-3 py-2">
            <span className="block text-[10px] font-bold uppercase text-slate-500">Pago en efectivo</span>
            <span className="font-black text-emerald-700">{formatCurrency(efecNum)}</span>
          </div>
          <div className="border-r sm:border-r border-slate-200 px-3 py-2">
            <span className="block text-[10px] font-bold uppercase text-slate-500">Pago en transferencia</span>
            <span className="font-black text-blue-700">{formatCurrency(transNum)}</span>
          </div>
          <div className="border-r border-slate-200 px-3 py-2">
            <span className="block text-[10px] font-bold uppercase text-slate-500">Total pagado</span>
            <span className="font-black text-slate-900">{formatCurrency(totalPagado)}</span>
          </div>
          <div className="border-r border-slate-200 px-3 py-2">
            <span className="block text-[10px] font-bold uppercase text-slate-500">Saldo actualizado</span>
            <span className="font-black text-slate-900">{formatCurrency(saldoActualizado)}</span>
          </div>
          <div className="bg-slate-900 px-3 py-2 text-white">
            <span className="block text-[10px] font-bold uppercase text-slate-300">Estado final</span>
            <span className={`font-black ${saldoActualizado === 0 ? 'text-emerald-300' : saldoActualizado > 0 ? 'text-amber-300' : 'text-blue-300'}`}>{estadoCuenta}</span>
          </div>
        </div>
        <p className="text-xs font-bold text-slate-700">Estado de la boleta: <span className="text-slate-900">{estadoBoleta}</span></p>
        <div className="hidden">
          <div className="border-b sm:border-b-0 sm:border-r border-slate-200 px-3 py-2">
            <span className="block text-[10px] font-bold uppercase text-slate-500">Saldo anterior</span>
            <span className="font-black text-slate-900">{formatCurrency(saldoAnterior)}</span>
          </div>
          <div className="border-b sm:border-b-0 sm:border-r border-slate-200 px-3 py-2">
            <span className="block text-[10px] font-bold uppercase text-slate-500">Total de esta boleta</span>
            <span className="font-black text-slate-900">{formatCurrency(totalBoleta)}</span>
          </div>
          <div className="border-b sm:border-b-0 sm:border-r border-slate-200 px-3 py-2">
            <span className="block text-[10px] font-bold uppercase text-slate-500">Pago efectivo</span>
            <span className="font-black text-emerald-700">{formatCurrency(efecNum)}</span>
          </div>
          <div className="border-b sm:border-b-0 sm:border-r border-slate-200 px-3 py-2">
            <span className="block text-[10px] font-bold uppercase text-slate-500">Pago transferencia</span>
            <span className="font-black text-blue-700">{formatCurrency(transNum)}</span>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-slate-900 px-3 py-2 text-white">
            <span className="block text-[10px] font-bold uppercase text-slate-300">Saldo actualizado</span>
            <span className="font-black text-emerald-400">{formatCurrency(saldoActualizado)}</span>
            <span className={`mt-1 block text-[10px] font-black uppercase ${saldoActualizado === 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
              {saldoActualizado === 0 ? '🟢 AL DÍA' : 'Saldo pendiente'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. ADJUNTAR DOCUMENTO U OBSERVACIÓN (OPCIONAL) */}
      <div className="border-b border-slate-300 pb-4 space-y-3">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-blue-600" />
            <span>4. Adjuntar Documento u Observación (Opcional - Excepcional)</span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase">
            No Obligatorio
          </span>
        </h2>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {!fotoUrl ? (
            <div className="w-full sm:w-auto flex flex-wrap gap-2">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-300 transition cursor-pointer"
              >
                <Camera className="w-4 h-4 text-slate-600" />
                <span>Tomar Foto Adjunta</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoCapture}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-300 transition cursor-pointer"
              >
                <span>Subir de Galería</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-300 shrink-0 bg-slate-200">
                  <img src={fotoUrl} alt="Adjunto" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Documento Adjunto
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">Se incluirá como referencia en la boleta</p>
                </div>
              </div>

              <button
                onClick={() => setFotoUrl('')}
                className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition cursor-pointer"
              >
                Quitar Adjunto
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FINALIZAR BOTÓN */}
      <div className="pt-2">
        <button
          onClick={handleFinalize}
          disabled={!selectedCustomer || totalBoleta <= 0}
          className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-black text-base py-4 rounded-2xl shadow-xl transition cursor-pointer flex items-center justify-center space-x-3"
        >
          <CheckCircle2 className="w-6 h-6" />
          <span>FINALIZAR VENTA Y EMITIR BOLETA VIRTUAL</span>
        </button>
      </div>

      {/* RENDER VIRTUAL BOLETA MODAL AFTER COMPLETION */}
      {completedBoleta && (
        <VirtualBoletaModal
          boleta={completedBoleta}
          customerPhone={selectedCustomer?.telefono}
          onClose={() => {
            setCompletedBoleta(null);
            setSelectedCustomer(null);
            setSelectedBranch(null);
            setItems([]);
            setPagoEfectivoInput('0');
            setPagoTransferenciaInput('0');
            setPagoOtrosInput('0');
            setFotoUrl('');
            setStockJustification('');
          }}
          onViewImage={onViewImage}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};
