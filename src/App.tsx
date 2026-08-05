import React, { useState, useEffect } from 'react';
import { CustomerWithBalance, Movement, Customer, CustomerVisit, WhatsAppTemplates, AppUser } from './types';
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
import { getCurrentUser, logoutUser } from './utils/userStorage';

import { LoginScreen } from './components/LoginScreen';
import { UserManagementScreen } from './components/UserManagementScreen';
import { Navbar } from './components/Navbar';
import { Navigation } from './components/Navigation';
import { SidebarDesktop } from './components/SidebarDesktop';
import { Dashboard } from './components/Dashboard';
import { CustomerList } from './components/CustomerList';
import { CustomerDetail } from './components/CustomerDetail';
import { CobranzasScreen } from './components/CobranzasScreen';
import { BoletaGallery } from './components/BoletaGallery';
import { CuentaCorrienteScreen } from './components/CuentaCorrienteScreen';
import { HoyRepartidorScreen } from './components/HoyRepartidorScreen';
import { ActivityLogScreen } from './components/ActivityLogScreen';
import { FinalizarVentaScreen } from './components/FinalizarVentaScreen';
import { VirtualBoletaScreen } from './components/VirtualBoletaScreen';
import { WeeklyStockScreen } from './components/WeeklyStockScreen';
import { SystemAuditScreen } from './components/SystemAuditScreen';
import { DriverPanelScreen } from './components/DriverPanelScreen';
import { AlertCenterScreen } from './components/AlertCenterScreen';
import { ShiftStateScreen } from './components/ShiftStateScreen';
import { AnulacionModal } from './components/AnulacionModal';

import { CustomerModal } from './components/CustomerModal';
import { RegisterBoletaModal } from './components/RegisterBoletaModal';
import { RegisterPagoModal } from './components/RegisterPagoModal';
import { RegisterAjusteModal } from './components/RegisterAjusteModal';
import { RegistrarVisitaModal } from './components/RegistrarVisitaModal';
import { SettingsModal } from './components/SettingsModal';
import { DataBackupModal } from './components/DataBackupModal';
import { ImageViewerModal } from './components/ImageViewerModal';
import { OfflineSyncModal } from './components/OfflineSyncModal';

import { initConnectivitySyncListeners, runFullSyncProcess } from './utils/syncEngine';
import { idbGetPendingQueueItems } from './utils/indexedDBEngine';
import { PendingSaleRecoveryModal } from './components/PendingSaleRecoveryModal';
import { VirtualBoletaModal } from './components/VirtualBoletaModal';
import {
  getPendingCompletedSale,
  clearPendingCompletedSale,
  registerVisibilitySync,
  PendingCompletedSale,
} from './utils/completedSaleStorage';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(getCurrentUser());
  const [activeView, setActiveView] = useState<string>('finalizarventa');
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
  const [movementToAnular, setMovementToAnular] = useState<Movement | null>(null);

  const [imageViewerData, setImageViewerData] = useState<{
    isOpen: boolean;
    imageUrl: string;
    title: string;
  }>({ isOpen: false, imageUrl: '', title: '' });

  // Recovery state for completed sale when app backgrounds or restarts
  const [pendingSaleToRecover, setPendingSaleToRecover] = useState<PendingCompletedSale | null>(null);
  const [recoveredBoletaModalData, setRecoveredBoletaModalData] = useState<PendingCompletedSale | null>(null);
  const [startupRecoveryBanner, setStartupRecoveryBanner] = useState<string | null>(null);

  // Inicialización de escuchadores offline/online y verificación de cola en IndexedDB al arrancar
  useEffect(() => {
    initConnectivitySyncListeners();

    idbGetPendingQueueItems().then((pending) => {
      if (pending && pending.length > 0) {
        setStartupRecoveryBanner(
          `⚡ Se recuperaron ${pending.length} operación(es) pendiente(s) guardadas localmente en este dispositivo.`
        );
        runFullSyncProcess().catch(() => {});
      }
    });
  }, []);

  // Sync and recovery listener
  useEffect(() => {
    if (!currentUser) return;

    const checkPending = () => {
      const sale = getPendingCompletedSale();
      if (sale && !sale.isClosed && !recoveredBoletaModalData) {
        setPendingSaleToRecover(sale);
      }
    };

    checkPending();

    const cleanupVisibility = registerVisibilitySync(() => getPendingCompletedSale());

    const handleVis = () => {
      if (document.visibilityState === 'visible') {
        checkPending();
      }
    };

    document.addEventListener('visibilitychange', handleVis);
    return () => {
      cleanupVisibility();
      document.removeEventListener('visibilitychange', handleVis);
    };
  }, [currentUser, recoveredBoletaModalData]);

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
    if (currentUser) {
      refreshData();
    }
  }, [currentUser]);

  // Diagnostic tool to detect horizontal overflow in development
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      const checkOverflow = () => {
        const vw = window.innerWidth;
        const allElements = document.querySelectorAll('*');
        allElements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.right > vw + 2) {
            console.warn('[Overflow Detected]', {
              elementTag: el.tagName,
              elementId: el.id,
              className: el.className,
              right: rect.right,
              viewportWidth: vw,
            });
          }
        });
      };
      window.addEventListener('resize', checkOverflow);
      const timer = setTimeout(checkOverflow, 1500);
      return () => {
        window.removeEventListener('resize', checkOverflow);
        clearTimeout(timer);
      };
    }
  }, [activeView]);

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === 'REPARTIDOR') {
            setActiveView('finalizarventa');
          } else {
            setActiveView('dashboard');
          }
        }}
      />
    );
  }

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
      updateCustomer(editingCustomer.id, custData, currentUser.role);
    } else {
      addCustomer(custData, initialBalance, currentUser.role);
    }
    refreshData();
  };

  const handleSaveBoleta = (movData: Omit<Movement, 'id' | 'createdAt'>) => {
    addMovement(movData, currentUser.role);
    refreshData();
  };

  const handleSavePago = (movData: Omit<Movement, 'id' | 'createdAt'>) => {
    addMovement(movData, currentUser.role);
    refreshData();
  };

  const handleSaveAjuste = (movData: Omit<Movement, 'id' | 'createdAt'>) => {
    addMovement(movData, currentUser.role);
    refreshData();
  };

  const handleSaveVisita = (visitData: Omit<CustomerVisit, 'id' | 'createdAt'>) => {
    addVisit(visitData, currentUser.role);
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
    <div className="min-h-[100dvh] w-full max-w-full bg-slate-100 text-slate-900 flex flex-col md:flex-row font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">
      {/* PWA Install Banner & Offline Notification */}
      <PwaInstallBanner />

      {/* Sidebar de Escritorio (Exclusivo 1024px+ / md+) */}
      <SidebarDesktop
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenNewCustomer={handleOpenNewCustomer}
        currentUserRole={currentUser.role}
        riskyCount={riskyCount}
        totalDeudaGlobal={totalDeudaGlobal}
      />

      {/* Contenedor Principal (Header + Vistas) */}
      <div className="flex-1 flex flex-col min-w-0 w-full min-h-[100dvh]">
        {/* Banner de Recuperación de Operaciones Offline al Iniciar */}
        {startupRecoveryBanner && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-black flex items-center justify-between shrink-0 shadow-md border-b border-amber-600 animate-fadeIn z-40">
            <div className="flex items-center space-x-2">
              <span className="text-base">⚡</span>
              <span>{startupRecoveryBanner}</span>
            </div>
            <button
              onClick={() => setStartupRecoveryBanner(null)}
              className="px-2.5 py-1 bg-slate-950 text-white rounded-lg hover:bg-black text-[10px] uppercase font-extrabold cursor-pointer transition"
            >
              Entendido
            </button>
          </div>
        )}

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
          currentUser={currentUser}
          onLogout={handleLogout}
          totalDeudaGlobal={totalDeudaGlobal}
        />

        {/* Navegación Móvil (Bottom Bar & Drawer) */}
        <Navigation
          activeView={activeView}
          setActiveView={setActiveView}
          onOpenNewCustomer={handleOpenNewCustomer}
          currentUserRole={currentUser.role}
          riskyCount={riskyCount}
        />

        {/* Content Body Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-20 md:pb-8 overflow-x-hidden">
        <ErrorBoundary key={activeView} onReset={() => setActiveView('finalizarventa')}>
          {activeView === 'finalizarventa' && (
            <VirtualBoletaScreen
              customers={customers}
              onSaleCompleted={refreshData}
              currentUser={currentUser}
              preselectedCustomer={preselectedCustomerForSale}
              onViewImage={(url, title) =>
                setImageViewerData({ isOpen: true, imageUrl: url, title })
              }
            />
          )}

          {activeView === 'boletavirtual' && (
            <VirtualBoletaScreen
              customers={customers}
              onSaleCompleted={refreshData}
              currentUser={currentUser}
              preselectedCustomer={preselectedCustomerForSale}
              onViewImage={(url, title) =>
                setImageViewerData({ isOpen: true, imageUrl: url, title })
              }
            />
          )}

          {activeView === 'stocksemanal' && (
            <WeeklyStockScreen
              currentUser={currentUser}
              onViewImage={(url, title) =>
                setImageViewerData({ isOpen: true, imageUrl: url, title })
              }
            />
          )}

          {activeView === 'repartidorpanel' && (
            <DriverPanelScreen
              currentUser={currentUser}
              customers={customers}
              movements={movements}
              onNavigateTo={(view) => setActiveView(view)}
              onStartSale={(cust) => handleStartSaleForCustomer(cust || customers[0])}
              onOpenNewPago={() => handleOpenNewPago()}
            />
          )}

          {activeView === 'estadoreparto' && (
            <ShiftStateScreen
              currentUser={currentUser}
              customers={customers}
              movements={movements}
              visits={visits}
              onRefreshData={refreshData}
            />
          )}

          {activeView === 'alertas' && (
            <AlertCenterScreen
              customers={customers}
              movements={movements}
              onSelectCustomer={(cust) => handleSelectCustomer(cust.id)}
              onNavigateTo={(view) => setActiveView(view)}
            />
          )}

          {activeView === 'usuarios' && currentUser.role === 'DUENO' && (
            <UserManagementScreen currentUser={currentUser} />
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
              currentUserRole={currentUser.role}
            />
          )}

          {activeView === 'dashboard' && currentUser.role !== 'REPARTIDOR' && (
            <Dashboard
              currentUser={currentUser}
              customers={customers}
              movements={movements}
              onSelectCustomer={handleSelectCustomer}
              onOpenNewBoleta={handleOpenNewBoleta}
              onOpenNewPago={handleOpenNewPago}
              onGoToCobranzas={() => setActiveView('cobranzas')}
              onGoToClientes={() => setActiveView('clientes')}
            />
          )}

          {activeView === 'cobranzas' && currentUser.role !== 'REPARTIDOR' && (
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
                currentUserRole={currentUser.role}
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

          {activeView === 'cuentacorriente' && currentUser.role !== 'REPARTIDOR' && (
            <CuentaCorrienteScreen
              movements={movements}
              customers={customers}
              currentUserRole={currentUser.role}
              onSelectCustomer={handleSelectCustomer}
              onViewImage={(url, title) =>
                setImageViewerData({ isOpen: true, imageUrl: url, title })
              }
              onOpenAnularModal={(mov) => setMovementToAnular(mov)}
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

          {activeView === 'auditoria' && currentUser.role !== 'REPARTIDOR' && (
            <SystemAuditScreen currentUser={currentUser} />
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
        currentUserRole={currentUser.role}
      />

      <RegisterPagoModal
        isOpen={isPagoModalOpen}
        onClose={() => setIsPagoModalOpen(false)}
        onSave={handleSavePago}
        customers={customers}
        preselectedCustomerId={preselectedCustomerIdForModal}
        currentUserRole={currentUser.role}
      />

      <RegisterAjusteModal
        isOpen={isAjusteModalOpen}
        onClose={() => setIsAjusteModalOpen(false)}
        onSave={handleSaveAjuste}
        customers={customers}
        preselectedCustomerId={preselectedCustomerIdForModal}
        currentUserRole={currentUser.role}
      />

      <RegistrarVisitaModal
        isOpen={isVisitaModalOpen}
        onClose={() => setIsVisitaModalOpen(false)}
        onSave={handleSaveVisita}
        customer={preselectedCustomerForVisita}
        customers={customers}
        currentUserRole={currentUser.role}
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

      <AnulacionModal
        isOpen={!!movementToAnular}
        onClose={() => setMovementToAnular(null)}
        movement={movementToAnular}
        customerName={
          movementToAnular
            ? customers.find((c) => c.id === movementToAnular.customerId)?.alias ||
              customers.find((c) => c.id === movementToAnular.customerId)?.nombre
            : undefined
        }
        currentUser={currentUser}
        onSuccess={refreshData}
      />

      {/* Recovery Modal for Unclosed Completed Sales */}
      {pendingSaleToRecover && (
        <PendingSaleRecoveryModal
          pendingSale={pendingSaleToRecover}
          onContinue={() => {
            setRecoveredBoletaModalData(pendingSaleToRecover);
            setActiveView(pendingSaleToRecover.activeView || 'finalizarventa');
            setPendingSaleToRecover(null);
          }}
          onCloseOperation={() => {
            clearPendingCompletedSale();
            setPendingSaleToRecover(null);
          }}
          onViewImage={(url, title) =>
            setImageViewerData({ isOpen: true, imageUrl: url, title })
          }
        />
      )}

      {/* Re-opened Virtual Boleta Modal for recovered sale */}
      {recoveredBoletaModalData && (
        <VirtualBoletaModal
          boleta={recoveredBoletaModalData.boleta}
          customerPhone={recoveredBoletaModalData.customerPhone}
          initialEnvioEstado={recoveredBoletaModalData.envioEstado}
          activeViewName={recoveredBoletaModalData.activeView}
          onClose={() => {
            clearPendingCompletedSale();
            setRecoveredBoletaModalData(null);
          }}
          onViewImage={(url, title) =>
            setImageViewerData({ isOpen: true, imageUrl: url, title })
          }
          currentUser={currentUser}
        />
      )}
      </div>
    </div>
  );
}
