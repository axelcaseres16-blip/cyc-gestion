import React, { useState, useEffect, useRef } from 'react';
import {
  StockPeriod,
  MataderoIngreso,
  StockMovement,
  ProductStockSummary,
  AppUser,
  Product,
} from '../types';
import {
  getActiveStockPeriod,
  getStoredStockPeriods,
  saveStockPeriods,
  getStockSummaryForPeriod,
  getStoredMataderoIngresos,
  getStoredStockMovements,
  getStoredProducts,
  registerMataderoIngreso,
  registerStockAdjustment,
} from '../utils/stockAndBoletasManager';
import { formatCurrency, formatDate } from '../utils/formatters';
import { recordAuditLog } from '../utils/auditLogger';
import {
  Package,
  PlusCircle,
  Truck,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileText,
  Camera,
  Layers,
  Search,
  Filter,
  X,
  Lock,
  RefreshCw,
  Sparkles,
  Download,
  Eye,
  ShieldCheck,
} from 'lucide-react';

interface WeeklyStockScreenProps {
  currentUser: AppUser;
  onViewImage?: (url: string, title: string) => void;
}

export const WeeklyStockScreen: React.FC<WeeklyStockScreenProps> = ({
  currentUser,
  onViewImage,
}) => {
  const isDueno = currentUser.role === 'DUENO';
  const isDuenoOrAdmin = currentUser.role === 'DUENO' || currentUser.role === 'ADMINISTRADOR';

  // Active Period and Summaries
  const [activePeriod, setActivePeriod] = useState<StockPeriod>(getActiveStockPeriod());
  const [stockSummary, setStockSummary] = useState<ProductStockSummary[]>(
    getStockSummaryForPeriod(activePeriod.id)
  );
  const [mataderoIngresos, setMataderoIngresos] = useState<MataderoIngreso[]>(
    getStoredMataderoIngresos()
  );
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(
    getStoredStockMovements()
  );

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'STOCK' | 'INGRESOS' | 'MOVIMIENTOS' | 'GALERIA'>('STOCK');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isIngresoModalOpen, setIsIngresoModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isConteoModalOpen, setIsConteoModalOpen] = useState(false);

  // Form State: Matadero Ingreso
  const [ingresoProveedor, setIngresoProveedor] = useState('Frigorífico Morón');
  const [ingresoRemito, setIngresoRemito] = useState('');
  const [ingresoObservaciones, setIngresoObservaciones] = useState('');
  const [ingresoPhotos, setIngresoPhotos] = useState<string[]>([]);
  const [ingresoItems, setIngresoItems] = useState<
    { productId: string; unidades: string; kilogramos: string }[]
  >([{ productId: getStoredProducts()[0]?.id || '', unidades: '', kilogramos: '' }]);

  // Form State: Adjustment / Merma
  const [adjProductId, setAdjProductId] = useState(getStoredProducts()[0]?.id || '');
  const [adjTipo, setAdjTipo] = useState<'MERMA' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO'>('MERMA');
  const [adjUnidades, setAdjUnidades] = useState('');
  const [adjKg, setAdjKg] = useState('');
  const [adjMotivo, setAdjMotivo] = useState('');

  // Form State: Physical Count
  const [conteoProductId, setConteoProductId] = useState(getStoredProducts()[0]?.id || '');
  const [conteoUnidades, setConteoUnidades] = useState('');
  const [conteoKg, setConteoKg] = useState('');
  const [conteoMotivo, setConteoMotivo] = useState('Conteo físico semanal de stock');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh summaries
  const refreshData = () => {
    const period = getActiveStockPeriod();
    setActivePeriod(period);
    setStockSummary(getStockSummaryForPeriod(period.id));
    setMataderoIngresos(getStoredMataderoIngresos());
    setStockMovements(getStoredStockMovements());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Filtered Stock Items
  const filteredStock = stockSummary.filter((item) =>
    item.product.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.product.codigo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockCount = stockSummary.filter(
    (s) => s.estadoSemaforo === 'ROJO' || s.estadoSemaforo === 'AMARILLO'
  ).length;

  const outOfStockCount = stockSummary.filter((s) => s.estadoSemaforo === 'GRIS').length;

  // Handle Photo Upload for Matadero Load
  const handleIngresoPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setIngresoPhotos((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate Sample Photo for Matadero Load testing
  const handleGenerateSampleIngresoPhoto = () => {
    const remitoNum = ingresoRemito || `R-${String(Date.now()).slice(-5)}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
      <rect width="600" height="800" fill="#f8fafc" rx="16"/>
      <rect x="20" y="20" width="560" height="760" fill="none" stroke="#0f172a" stroke-width="3" stroke-dasharray="6,6"/>
      <text x="300" y="70" font-family="sans-serif" font-size="22" font-weight="900" fill="#0f172a" text-anchor="middle">REMITO DE INGRESO FRIGORÍFICO MATADERO</text>
      <text x="300" y="100" font-family="sans-serif" font-size="16" font-weight="bold" fill="#2563eb" text-anchor="middle">N° ${remitoNum} - ${ingresoProveedor}</text>
      <line x1="40" y1="120" x2="560" y2="120" stroke="#cbd5e1" stroke-width="2"/>
      
      <text x="50" y="160" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0f172a">FECHA DE CARGA: ${new Date().toLocaleDateString('es-AR')}</text>
      <text x="50" y="190" font-family="sans-serif" font-size="14" fill="#64748b">TRANSPORTE: Camión Refrigerado C&amp;C</text>
      
      <rect x="40" y="230" width="520" height="400" fill="#ffffff" stroke="#e2e8f0" rx="10"/>
      <text x="60" y="270" font-family="monospace" font-size="15" fill="#1e293b">• HÍGADO VACUNO FRESCO ...... 40 UNIDADES (200 KG)</text>
      <text x="60" y="310" font-family="monospace" font-size="15" fill="#1e293b">• CHINCHULÍN SELECCIONADO ... 150 KG REALES</text>
      <text x="60" y="350" font-family="monospace" font-size="15" fill="#1e293b">• CENTRO MOLLEJAS CORAZÓN ... 15 UNIDADES (60 KG)</text>
      <text x="60" y="390" font-family="monospace" font-size="15" fill="#1e293b">• CORAZÓN FRESCO VACUNO ..... 25 UNIDADES (90 KG)</text>

      <text x="300" y="700" font-family="sans-serif" font-size="16" font-weight="extrabold" fill="#059669" text-anchor="middle">✓ MERCADERÍA RECIBIDA Y CONFORMADA</text>
    </svg>`;

    setIngresoPhotos((prev) => [...prev, `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`]);
  };

  // Submit Matadero Load
  const handleSubmitMataderoIngreso = () => {
    if (!ingresoRemito.trim()) {
      alert('Por favor ingrese el número de boleta o remito del matadero.');
      return;
    }

    if (ingresoPhotos.length === 0) {
      alert('Es obligatorio adjuntar al menos una fotografía de la boleta del matadero.');
      return;
    }

    const itemsToSave = ingresoItems
      .map((it) => {
        const prod = getStoredProducts().find((p) => p.id === it.productId);
        const u = parseFloat(it.unidades.replace(',', '.')) || 0;
        const kg = parseFloat(it.kilogramos.replace(',', '.')) || 0;
        if (!prod || (u <= 0 && kg <= 0)) return null;
        return {
          id: `item_ing_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          productId: prod.id,
          productName: prod.nombre,
          unidades: u,
          kilogramos: kg,
        };
      })
      .filter(Boolean) as any[];

    if (itemsToSave.length === 0) {
      alert('Debe cargar al menos un producto con unidades o kilogramos recibidos.');
      return;
    }

    registerMataderoIngreso({
      proveedor: ingresoProveedor,
      numeroRemito: ingresoRemito,
      usuario: currentUser.nombre,
      fechaHora: new Date().toISOString(),
      observaciones: ingresoObservaciones,
      fotosUrls: ingresoPhotos,
      items: itemsToSave,
    });

    setIsIngresoModalOpen(false);
    setIngresoRemito('');
    setIngresoObservaciones('');
    setIngresoPhotos([]);
    refreshData();
    alert('¡Carga de mercadería del matadero registrada con éxito!');
  };

  // Submit Stock Adjustment / Merma
  const handleSubmitAdjustment = () => {
    const prod = getStoredProducts().find((p) => p.id === adjProductId);
    if (!prod) return;

    const u = parseFloat(adjUnidades.replace(',', '.')) || 0;
    const kg = parseFloat(adjKg.replace(',', '.')) || 0;

    if (u <= 0 && kg <= 0) {
      alert('Ingrese una cantidad válida de unidades o kilogramos.');
      return;
    }

    if (!adjMotivo.trim()) {
      alert('El motivo de la merma/ajuste es obligatorio.');
      return;
    }

    registerStockAdjustment({
      productId: prod.id,
      productName: prod.nombre,
      tipo: adjTipo,
      unidades: u,
      kilogramos: kg,
      motivo: adjMotivo,
      usuario: currentUser.nombre,
    });

    setIsAdjustmentModalOpen(false);
    setAdjUnidades('');
    setAdjKg('');
    setAdjMotivo('');
    refreshData();
    alert('Ajuste de stock registrado con éxito.');
  };

  // Submit Conteo Físico
  const handleSubmitConteo = () => {
    const prod = getStoredProducts().find((p) => p.id === conteoProductId);
    if (!prod) return;

    const u = parseFloat(conteoUnidades.replace(',', '.')) || 0;
    const kg = parseFloat(conteoKg.replace(',', '.')) || 0;

    registerStockAdjustment({
      productId: prod.id,
      productName: prod.nombre,
      tipo: 'CONTEO_FISICO',
      unidades: u,
      kilogramos: kg,
      motivo: conteoMotivo || 'Ajuste por conteo físico semanal',
      usuario: currentUser.nombre,
    });

    setIsConteoModalOpen(false);
    setConteoUnidades('');
    setConteoKg('');
    refreshData();
    alert('Conteo físico de stock actualizado con éxito.');
  };

  // Close Stock Period (Cierre de Semana)
  const handleCloseStockPeriod = () => {
    if (!isDueno) {
      alert('Solo el Dueño está autorizado para realizar el cierre de la semana de stock.');
      return;
    }

    if (confirm(`¿Confirma cerrar definitivamente la ${activePeriod.semanaNombre}?`)) {
      const periods = getStoredStockPeriods();
      const idx = periods.findIndex((p) => p.id === activePeriod.id);
      if (idx !== -1) {
        periods[idx].estado = 'CERRADA';
        periods[idx].cerradaPor = currentUser.nombre;
        periods[idx].fechaCierre = new Date().toISOString();

        // Create Next Week
        const nextPeriod: StockPeriod = {
          id: `sem_${Date.now()}`,
          semanaNombre: `Semana Siguiente (${new Date().toLocaleDateString('es-AR')})`,
          fechaInicio: new Date().toISOString().split('T')[0],
          fechaFin: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          estado: 'ABIERTA',
          abiertaPor: currentUser.nombre,
          fechaApertura: new Date().toISOString(),
          observaciones: 'Traspaso de saldo de la semana anterior.',
        };

        periods.unshift(nextPeriod);
        saveStockPeriods(periods);
        refreshData();
        alert('Semana de stock cerrada correctamente y nueva semana abierta.');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Package className="w-3.5 h-3.5" /> Depósito & Control
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Control de Stock Semanal
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {activePeriod.semanaNombre} - Estado:{' '}
            <strong className="text-emerald-400 font-extrabold">{activePeriod.estado}</strong>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isDuenoOrAdmin && (
            <button
              onClick={() => setIsIngresoModalOpen(true)}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3.5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>Ingresar Mercadería</span>
            </button>
          )}

          {isDuenoOrAdmin && (
            <button
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl border border-slate-700 transition cursor-pointer"
            >
              <TrendingDown className="w-4 h-4 text-amber-400" />
              <span>Merma / Ajuste</span>
            </button>
          )}

          {isDueno && (
            <button
              onClick={handleCloseStockPeriod}
              className="flex items-center space-x-1.5 bg-red-600/80 hover:bg-red-700 text-white text-xs font-extrabold px-3 py-2.5 rounded-xl transition cursor-pointer"
              title="Cerrar semana y traspasar saldos"
            >
              <Lock className="w-4 h-4" />
              <span>Cerrar Semana</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            Total Productos
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stockSummary.length}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            Stock Bajo / Advertencia
          </p>
          <p className="text-2xl font-black text-amber-600 mt-1">{lowStockCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            Sin Stock (Agotado)
          </p>
          <p className="text-2xl font-black text-red-600 mt-1">{outOfStockCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            Cargas Matadero
          </p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{mataderoIngresos.length}</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('STOCK')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'STOCK' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Stock de Productos</span>
        </button>

        <button
          onClick={() => setActiveTab('INGRESOS')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'INGRESOS' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Ingresos Matadero ({mataderoIngresos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('MOVIMIENTOS')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'MOVIMIENTOS' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Historial Movimientos</span>
        </button>

        <button
          onClick={() => setActiveTab('GALERIA')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'GALERIA' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Galería Remitos Matadero</span>
        </button>
      </div>

      {/* TAB 1: STOCK DE PRODUCTOS */}
      {activeTab === 'STOCK' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar producto por nombre o código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm font-medium bg-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStock.map((item) => (
              <div
                key={item.product.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 relative overflow-hidden"
              >
                {/* Semáforo Top Line Accent */}
                <div
                  className={`h-1.5 w-full absolute top-0 left-0 ${
                    item.estadoSemaforo === 'VERDE'
                      ? 'bg-emerald-500'
                      : item.estadoSemaforo === 'AMARILLO'
                      ? 'bg-amber-500'
                      : item.estadoSemaforo === 'ROJO'
                      ? 'bg-red-500'
                      : 'bg-slate-400'
                  }`}
                />

                <div className="flex items-start justify-between pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {item.product.codigo}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-base">{item.product.nombre}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                      item.estadoSemaforo === 'VERDE'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : item.estadoSemaforo === 'AMARILLO'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : item.estadoSemaforo === 'ROJO'
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {item.estadoSemaforo}
                  </span>
                </div>

                {/* Available Quantities Card */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Disponibles (u)</span>
                    <span className="text-lg font-black text-slate-900">{item.unidadesDisponibles}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Disponibles (kg)</span>
                    <span className="text-lg font-black text-emerald-700">
                      {item.kilogramosDisponibles.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>

                {/* Received / Sold Breakdown */}
                <div className="grid grid-cols-3 gap-1 text-[11px] font-medium text-slate-600 bg-slate-100/70 p-2 rounded-lg">
                  <div>
                    <span className="block text-slate-400 text-[9px] uppercase font-bold">Ingresó</span>
                    <span className="font-bold text-slate-800">
                      {item.unidadesIngresadas}u / {item.kilogramosIngresados}kg
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-[9px] uppercase font-bold">Vendido</span>
                    <span className="font-bold text-slate-800">
                      {item.unidadesVendidas}u / {item.kilogramosVendidos}kg
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-[9px] uppercase font-bold">Mermas</span>
                    <span className="font-bold text-red-700">
                      {item.unidadesMermas}u / {item.kilogramosMermas}kg
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                {isDuenoOrAdmin && (
                  <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setConteoProductId(item.product.id);
                        setConteoUnidades(String(item.unidadesDisponibles));
                        setConteoKg(String(item.kilogramosDisponibles));
                        setIsConteoModalOpen(true);
                      }}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition cursor-pointer flex-1 text-center"
                    >
                      Conteo Físico
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: INGRESOS DEL MATADERO */}
      {activeTab === 'INGRESOS' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center space-x-2">
              <Truck className="w-5 h-5 text-emerald-600" />
              <span>Cargas Recibidas del Matadero ({mataderoIngresos.length})</span>
            </h3>

            {isDuenoOrAdmin && (
              <button
                onClick={() => setIsIngresoModalOpen(true)}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3.5 py-2 rounded-xl transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nueva Carga</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {mataderoIngresos.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No se registraron ingresos del matadero en esta semana de stock.
              </div>
            ) : (
              mataderoIngresos.map((ing) => (
                <div key={ing.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        Remito #{ing.numeroRemito}
                      </span>
                      <h4 className="font-extrabold text-slate-900 text-base mt-1">{ing.proveedor}</h4>
                      <p className="text-xs text-slate-500">
                        Fecha: {new Date(ing.fechaHora).toLocaleString('es-AR')} - Registrado por: <strong>{ing.usuario}</strong>
                      </p>
                    </div>

                    {ing.fotosUrls.length > 0 && (
                      <button
                        onClick={() => onViewImage && onViewImage(ing.fotosUrls[0], `Remito #${ing.numeroRemito}`)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-300 transition cursor-pointer flex items-center space-x-1"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Ver Foto ({ing.fotosUrls.length})</span>
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-200/80 text-slate-700 font-bold uppercase">
                        <tr>
                          <th className="px-3 py-2">Producto</th>
                          <th className="px-3 py-2 text-center">Unidades</th>
                          <th className="px-3 py-2 text-center">Kilogramos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium">
                        {ing.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-bold text-slate-900">{it.productName}</td>
                            <td className="px-3 py-2 text-center font-bold text-slate-700">{it.unidades} u</td>
                            <td className="px-3 py-2 text-center font-bold text-emerald-700">{it.kilogramos} kg</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: HISTORIAL DE MOVIMIENTOS */}
      {activeTab === 'MOVIMIENTOS' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-4">
          <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center space-x-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>Libro Inmutable de Movimientos de Stock</span>
          </h3>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Fecha / Hora</th>
                  <th className="px-3 py-2.5">Tipo</th>
                  <th className="px-3 py-2.5">Producto</th>
                  <th className="px-3 py-2.5 text-center">Dir.</th>
                  <th className="px-3 py-2.5 text-center">Cantidades</th>
                  <th className="px-3 py-2.5">Usuario / Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {stockMovements.map((sm) => (
                  <tr key={sm.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-slate-500 font-mono">
                      {new Date(sm.fechaHora).toLocaleDateString('es-AR')}{' '}
                      {new Date(sm.fechaHora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                        {sm.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-black text-slate-900">{sm.productName}</td>
                    <td className="px-3 py-2.5 text-center font-bold">
                      {sm.direccion === 'ENTRADA' ? (
                        <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          + ENTRADA
                        </span>
                      ) : (
                        <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                          - SALIDA
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                      {sm.unidades > 0 && `${sm.unidades}u `}
                      {sm.kilogramos > 0 && `${sm.kilogramos}kg`}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      <strong>{sm.usuario}</strong> - {sm.motivo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GALERÍA REMITOS */}
      {activeTab === 'GALERIA' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-4">
          <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center space-x-2">
            <Camera className="w-5 h-5 text-emerald-600" />
            <span>Galería de Documentos y Remitos del Matadero</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {mataderoIngresos.flatMap((ing) =>
              ing.fotosUrls.map((url, idx) => (
                <div
                  key={`${ing.id}_${idx}`}
                  className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs group hover:border-blue-500 transition"
                >
                  <div className="h-48 overflow-hidden bg-slate-200 relative">
                    <img src={url} alt="Remito" className="w-full h-full object-cover group-hover:scale-105 transition" />
                    <button
                      onClick={() => onViewImage && onViewImage(url, `Remito #${ing.numeroRemito}`)}
                      className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-xs transition cursor-pointer"
                    >
                      <Eye className="w-5 h-5 mr-1" /> Ampliar Imagen
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="font-extrabold text-slate-900 text-xs">{ing.proveedor}</p>
                    <p className="text-[11px] text-slate-500 font-medium">Remito #{ing.numeroRemito}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: INGRESAR MERCADERÍA MATADERO */}
      {isIngresoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <span>Ingresar Carga del Matadero</span>
              </h3>
              <button
                onClick={() => setIsIngresoModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Matadero / Proveedor</label>
                <input
                  type="text"
                  value={ingresoProveedor}
                  onChange={(e) => setIngresoProveedor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">N° Remito o Boleta Física</label>
                <input
                  type="text"
                  placeholder="Ej: R-98201"
                  value={ingresoRemito}
                  onChange={(e) => setIngresoRemito(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                />
              </div>
            </div>

            {/* Items Rows */}
            <div className="space-y-2">
              <label className="font-extrabold text-slate-700 text-xs block">
                Lista de Productos Recibidos:
              </label>

              {ingresoItems.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                  <div className="col-span-5">
                    <select
                      value={it.productId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setIngresoItems((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, productId: val } : item))
                        );
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                    >
                      {getStoredProducts().map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Unidades"
                      value={it.unidades}
                      onChange={(e) => {
                        const val = e.target.value;
                        setIngresoItems((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, unidades: val } : item))
                        );
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900 text-center"
                    />
                  </div>

                  <div className="col-span-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Kilogramos"
                      value={it.kilogramos}
                      onChange={(e) => {
                        const val = e.target.value;
                        setIngresoItems((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, kilogramos: val } : item))
                        );
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-emerald-800 text-center"
                    />
                  </div>

                  <div className="col-span-1 text-center">
                    {ingresoItems.length > 1 && (
                      <button
                        onClick={() => setIngresoItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button
                onClick={() =>
                  setIngresoItems((prev) => [
                    ...prev,
                    { productId: getStoredProducts()[0]?.id || '', unidades: '', kilogramos: '' },
                  ])
                }
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 cursor-pointer transition flex items-center space-x-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Agregar Producto a la Carga</span>
              </button>
            </div>

            {/* Photos Upload */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="font-extrabold text-slate-700 text-xs block">
                Fotografía del Remito o Boleta del Matadero (Obligatoria):
              </label>

              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleIngresoPhotoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5"
                >
                  <Camera className="w-4 h-4" />
                  <span>Subir Foto Remito</span>
                </button>

                <button
                  onClick={handleGenerateSampleIngresoPhoto}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-3.5 py-2 rounded-xl border border-emerald-300 transition cursor-pointer flex items-center space-x-1.5"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Generar Foto Digital</span>
                </button>
              </div>

              {ingresoPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {ingresoPhotos.map((url, i) => (
                    <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-slate-300 relative">
                      <img src={url} alt="Remito" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
              <button
                onClick={() => setIsIngresoModalOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitMataderoIngreso}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2 rounded-xl shadow-xs transition cursor-pointer"
              >
                Guardar Carga de Matadero
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MERMA / AJUSTE */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-amber-500" />
                <span>Registrar Merma o Ajuste de Stock</span>
              </h3>
              <button
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Producto</label>
                <select
                  value={adjProductId}
                  onChange={(e) => setAdjProductId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                >
                  {getStoredProducts().map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Tipo de Ajuste</label>
                <select
                  value={adjTipo}
                  onChange={(e) => setAdjTipo(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                >
                  <option value="MERMA">Merma / Mercadería Deteriorada (-)</option>
                  <option value="AJUSTE_NEGATIVO">Ajuste Negativo (-)</option>
                  <option value="AJUSTE_POSITIVO">Ajuste Positivo (+)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Unidades</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={adjUnidades}
                    onChange={(e) => setAdjUnidades(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Kilogramos</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={adjKg}
                    onChange={(e) => setAdjKg(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Motivo Obligatorio</label>
                <input
                  type="text"
                  placeholder="Ej: Mercadería con pérdida de vacío..."
                  value={adjMotivo}
                  onChange={(e) => setAdjMotivo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
              <button
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitAdjustment}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2 rounded-xl transition cursor-pointer"
              >
                Registrar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONTEO FÍSICO */}
      {isConteoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <span>Actualizar Conteo Físico Real</span>
              </h3>
              <button
                onClick={() => setIsConteoModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Producto:</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {getStoredProducts().find((p) => p.id === conteoProductId)?.nombre}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Unidades Reales Físicas</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={conteoUnidades}
                    onChange={(e) => setConteoUnidades(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Kilogramos Reales Físicos</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={conteoKg}
                    onChange={(e) => setConteoKg(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
              <button
                onClick={() => setIsConteoModalOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitConteo}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-5 py-2 rounded-xl shadow-xs transition cursor-pointer"
              >
                Ajustar a Conteo Físico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
