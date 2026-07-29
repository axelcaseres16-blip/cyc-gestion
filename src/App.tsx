import React, { useState, useEffect } from 'react';
import { CustomerWithBalance, Movement, Customer, CustomerVisit, WhatsAppTemplates } from './types';
import { AlertCircle } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import {
  getCustomersWithBalances,
  getStoredMovements,
  getStoredVisits,
  getWhatsAppTemplates,
  getActivityLogs,
  getSmartReminders,
  addCustomer,
  updateCustomer,
  addMovement,
  addVisit,
} from './utils/storage';

import { Navbar } from './components/Navbar';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { CustomerList } from './components/CustomerList';
import { CustomerDetail } from './components/CustomerDetail';
import { CobranzasScreen } from './components/CobranzasScreen';
import { BoletaGallery } from './components/BoletaGallery';
import { CuentaCorrienteScreen } from './components/CuentaCorrienteScreen';
import { HoyRepartidorScreen } from './components/HoyRepartidorScreen';
import { ActivityLogScreen } from './components/ActivityLogScreen';
import { FinalizarVentaScreen } from './components/FinalizarVentaScreen';

import { CustomerModal } from './components/CustomerModal';
import { RegisterBoletaModal } from './components/RegisterBoletaModal';
import { RegisterPagoModal } from './components/RegisterPagoModal';
import { RegisterAjusteModal } from './components/RegisterAjusteModal';
import { RegistrarVisitaModal } from './components/RegistrarVisitaModal';
import { SettingsModal } from './components/SettingsModal';
import { DataBackupModal } from './components/DataBackupModal';
import { ImageViewerModal } from './components/ImageViewerModal';
import { OfflineSyncModal } from './components/OfflineSyncModal';

export default function App() {
  const [currentUserRole, setCurrentUserRole] = useState<string>('DUENO');
  const [activeView, setActiveView] = useState<string>('finalizarventa'); // Defecto express para facil acceso
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const [customers, setCustomers] = useState<CustomerWithBalance[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [visits, setVisits] = useState<CustomerVisit[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplates>(getWhatsAppTemplates());

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [isBoletaModalOpen, setIsBoletaModalOpen] = useState<boolean>(false);
  const [isPagoModalOpen, setIsPagoModalOpen] = useState<boolean>(false);
  const [isAjusteModalOpen, setIsAjusteModalOpen] = useState<boolean>(false);
  const [isVisitaModalOpen, setIsVisitaModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  const [preselectedCustomerForVisita, setPreselectedCustomerForVisita] = useState<CustomerWithBalance | undefined>(undefined);
  const [preselectedCustomerIdForModal, setPreselectedCustomerIdForModal] = useState<string | undefined>(undefined);
  const [preselectedCustomerForSale, setPreselectedCustomerForSale] = useState<CustomerWithBalance | undefined>(undefined);

  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);

  const [imageViewerData, setImageViewerData] = useState<{
    isOpen: boolean;
    imageUrl: string;
    title: string;
  }>({ isOpen: false, imageUrl: '', title: '' });

  // Cargar todos los datos
  const refreshData = () => {
    const custs = getCustomersWithBalances();
    const movs = getStoredMovements();
    const vis = getStoredVisits();
    const tmpl = getWhatsAppTemplates();

    setCustomers(custs);
    setMovements(movs);
    setVisits(vis);
    setTemplates(tmpl);
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Al cambiar el rol, redirigir suavemente a la pantalla óptima si corresponde
  const handleRoleChange = (role: string) => {
    setCurrentUserRole(role);
    if (role === 'REPARTIDOR') {
      setActiveView('finalizarventa');
    } else if (role === 'COBRANZAS') {
      setActiveView('cobranzas');
    } else if (role === 'DUENO' || role === 'ADMINISTRADOR') {
      setActiveView('dashboard');
    }
  };

  // Handlers para abrir modales
  const handleOpenNewBoleta = (cust = undefined) => {
    setPreselectedCustomerIdForModal(cust);
    setIsBoletaModalOpen(true);
  };

  const handleOpenNewPago = (cust = undefined) => {
    setPreselectedCustomerIdForModal(cust);
    setIsPagoModalOpen(true);
  };

  const handleOpenNewAjuste = (cust = undefined) => {
    setPreselectedCustomerIdForModal(cust);
    setIsAjusteModalOpen(true);
  };

  const handleOpenNewCustomer = () => {
    setEditingCustomer(null);
    setIsCustomerModalOpen(true);
  };

  const handleEditCustomer = (cust: Customer) => {
    setEditingCustomer(cust);
    setIsCustomerModalOpen(true);
  };

  const handleOpenRegistrarVisita = (cust?: CustomerWithBalance) => {
    setPreselectedCustomerForVisita(cust);
    setIsVisitaModalOpen(true);
  };

  const handleStartSaleForCustomer = (cust: CustomerWithBalance) => {
    setPreselectedCustomerForSale(cust);
    setActiveView('finalizarventa');
  };

  // Guardado de entidades
  const handleSaveCustomer = (
    custData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>,
    initialBalance: number = 0
  ) => {
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, custData, currentUserRole);
    } else {
      addCustomer(custData, initialBalance, currentUserRole);
    }
    refreshData();
  };

  const handleSaveBoleta = (movData: Omit<Movement, 'id' | 'createdAt'>) => {
    addMovement(movData, currentUserRole);
    refreshData();
  };

  const handleSavePago = (movData: Omit<Movement, 'id' | 'createdAt'>) => {
    addMovement(movData, currentUserRole);
    refreshData();
  };

  const handleSaveAjuste = (movData: Omit<Movement, 'id' | 'createdAt'>) => {
    addMovement(movData, currentUserRole);
    refreshData();
  };

  const handleSaveVisita = (visitData: Omit<CustomerVisit, 'id' | 'createdAt'>) => {
    addVisit(visitData, currentUserRole);
    refreshData();
  };

  const handleSelectCustomer = (param: any) => {
    if (!param) return;
    let id: string | undefined = undefined;
    if (typeof param === 'string') {
      id = param;
    } else if (typeof param === 'object') {
      id = param.id || param.customerId;
    }
    if (!id) return;
    setSelectedCustomerId(id);
    setActiveView('fichacliente');
  };

  const selectedCustomer = customers.find(
    (c) => c && String(c.id) === String(selectedCustomerId)
  );

  // Cálculos rápidos para la barra de navegación
  const totalDeudaGlobal = customers.reduce((sum, c) => sum + Math.max(0, c.saldoActual), 0);
  const riskyCount = customers.filter((c) => {
    const level = c.evaluacionRiesgo?.level || (c.evaluacionRiesgo as any)?.nivel;
    return level === 'ALTO' || level === 'CRITICO';
  }).length;

  const availableRoutes = Array.from(new Set(customers.map((c) => c.zonaRuta))).filter(Boolean);
  const activityLogs = getActivityLogs();
  const reminders = getSmartReminders(customers, movements, visits);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* PWA Install Banner & Offline Notification */}
      <PwaInstallBanner />

      {/* Header Principal */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenNewBoleta={handleOpenNewBoleta}
        onOpenNewPago={handleOpenNewPago}
        onOpenNewCustomer={handleOpenNewCustomer}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        currentUserRole={currentUserRole}
        setCurrentUserRole={handleRoleChange}
        totalDeudaGlobal={totalDeudaGlobal}
      />

      {/* Navegación por Pestañas Adaptativa */}
      <Navigation
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenNewCustomer={handleOpenNewCustomer}
        currentUserRole={currentUserRole}
        riskyCount={riskyCount}
      />

      {/* Content Body Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <ErrorBoundary key={activeView} onReset={() => setActiveView('finalizarventa')}>
          {activeView === 'finalizarventa' && (
            <FinalizarVentaScreen
              customers={customers}
              onSaleCompleted={refreshData}
              currentUserRole={currentUserRole}
              preselectedCustomer={preselectedCustomerForSale}
              onClearPreselectedCustomer={() => setPreselectedCustomerForSale(undefined)}
              onViewImage={(url, title) =>
                setImageViewerData({ isOpen: true, imageUrl: url, title })
              }
            />
          )}

          {activeView === 'hoy' && (
            <HoyRepartidorScreen
              customers={customers}
              movements={movements}
              visits={visits}
              reminders={reminders}
              templates={templates}
              onOpenRegistrarVisita={handleOpenRegistrarVisita}
              onSelectCustomer={handleSelectCustomer}
              onStartSale={handleStartSaleForCustomer}
              currentUserRole={currentUserRole}
            />
          )}

          {activeView === 'dashboard' && (
            <Dashboard
              customers={customers}
              movements={movements}
              onSelectCustomer={handleSelectCustomer}
              onOpenNewBoleta={handleOpenNewBoleta}
              onOpenNewPago={handleOpenNewPago}
              onGoToCobranzas={() => setActiveView('cobranzas')}
              onGoToClientes={() => setActiveView('clientes')}
            />
          )}

          {activeView === 'cobranzas' && (
            <CobranzasScreen
              customers={customers}
              movements={movements}
              onOpenNewPago={handleOpenNewPago}
              onOpenNewBoleta={handleOpenNewBoleta}
              onSelectCustomer={handleSelectCustomer}
            />
          )}

          {activeView === 'clientes' && (
            <CustomerList
              customers={customers}
              onSelectCustomer={handleSelectCustomer}
              onOpenNewCustomer={handleOpenNewCustomer}
              onOpenNewBoleta={handleOpenNewBoleta}
              onOpenNewPago={handleOpenNewPago}
            />
          )}

          {activeView === 'fichacliente' && (
            selectedCustomer ? (
              <CustomerDetail
                customer={selectedCustomer}
                movements={movements}
                visits={visits}
                templates={templates}
                currentUserRole={currentUserRole}
                onBack={() => setActiveView('clientes')}
                onEditCustomer={handleEditCustomer}
                onOpenNewBoleta={handleOpenNewBoleta}
                onOpenNewPago={handleOpenNewPago}
                onOpenNewAjuste={handleOpenNewAjuste}
                onOpenRegistrarVisita={handleOpenRegistrarVisita}
                onViewImage={(url, title) =>
                  setImageViewerData({ isOpen: true, imageUrl: url, title })
                }
              />
            ) : (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-4 max-w-md mx-auto my-12 shadow-sm">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Cliente no seleccionado</h2>
                <p className="text-xs text-slate-500">
                  Seleccioná un cliente de la nómina para ver su ficha técnica detallada.
                </p>
                <button
                  onClick={() => setActiveView('clientes')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
                >
                  Ir a Lista de Clientes
                </button>
              </div>
            )
          )}

          {activeView === 'cuentacorriente' && (
            <CuentaCorrienteScreen
              movements={movements}
              customers={customers}
              onSelectCustomer={handleSelectCustomer}
              onViewImage={(url, title) =>
                setImageViewerData({ isOpen: true, imageUrl: url, title })
              }
            />
          )}

          {activeView === 'boletas' && (
            <BoletaGallery
              movements={movements}
              customers={customers}
              onViewImage={(url, title) =>
                setImageViewerData({ isOpen: true, imageUrl: url, title })
              }
              onSelectCustomer={handleSelectCustomer}
            />
          )}

          {activeView === 'auditoria' && (
            <ActivityLogScreen
              logs={activityLogs}
              onSelectCustomer={handleSelectCustomer}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Modales */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={handleSaveCustomer}
        initialCustomer={editingCustomer}
        availableRoutes={availableRoutes}
      />

      <RegisterBoletaModal
        isOpen={isBoletaModalOpen}
        onClose={() => setIsBoletaModalOpen(false)}
        onSave={handleSaveBoleta}
        customers={customers}
        preselectedCustomerId={preselectedCustomerIdForModal}
        currentUserRole={currentUserRole}
      />

      <RegisterPagoModal
        isOpen={isPagoModalOpen}
        onClose={() => setIsPagoModalOpen(false)}
        onSave={handleSavePago}
        customers={customers}
        preselectedCustomerId={preselectedCustomerIdForModal}
        currentUserRole={currentUserRole}
      />

      <RegisterAjusteModal
        isOpen={isAjusteModalOpen}
        onClose={() => setIsAjusteModalOpen(false)}
        onSave={handleSaveAjuste}
        customers={customers}
        preselectedCustomerId={preselectedCustomerIdForModal}
        currentUserRole={currentUserRole}
      />

      <RegistrarVisitaModal
        isOpen={isVisitaModalOpen}
        onClose={() => setIsVisitaModalOpen(false)}
        onSave={handleSaveVisita}
        customer={preselectedCustomerForVisita}
        customers={customers}
        currentUserRole={currentUserRole}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onTemplatesUpdated={refreshData}
      />

      <DataBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onRefreshData={refreshData}
      />

      <OfflineSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onRefreshData={refreshData}
        onViewImage={(url, title) =>
          setImageViewerData({ isOpen: true, imageUrl: url, title })
        }
      />

      <ImageViewerModal
        isOpen={imageViewerData.isOpen}
        imageUrl={imageViewerData.imageUrl}
        title={imageViewerData.title}
        onClose={() => setImageViewerData({ isOpen: false, imageUrl: '', title: '' })}
      />
    </div>
  );
}
