import React, { useState } from 'react';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { AppUser } from '../types';
import {
  LogOut,
  Download,
  Settings,
  MessageSquare,
  Zap,
  Smartphone,
  ShieldCheck,
  UserCheck,
  Truck,
  User,
  X,
  RefreshCw,
} from 'lucide-react';
import { promptPwaInstall, checkIsStandalone } from '../utils/pwaManager';

interface NavbarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenNewBoleta: () => void;
  onOpenNewPago: () => void;
  onOpenNewCustomer: () => void;
  onOpenBackupModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenSyncModal: () => void;
  currentUser: AppUser;
  onLogout: () => void;
  totalDeudaGlobal: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  onOpenNewBoleta,
  onOpenNewPago,
  onOpenNewCustomer,
  onOpenBackupModal,
  onOpenSettingsModal,
  onOpenSyncModal,
  currentUser,
  onLogout,
  totalDeudaGlobal,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const isRepartidor = currentUser.role === 'REPARTIDOR';
  const isDueno = currentUser.role === 'DUENO';

  const getUserBadge = () => {
    switch (currentUser.role) {
      case 'DUENO':
        return {
          shortLabel: `👑 ${currentUser.nombre}`,
          fullLabel: `👑 ${currentUser.nombre} - Dueño`,
          style: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'ADMINISTRADOR':
        return {
          shortLabel: `🛠️ ${currentUser.nombre}`,
          fullLabel: `🛠️ ${currentUser.nombre} - Administrador`,
          style: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        };
      case 'REPARTIDOR':
        return {
          shortLabel: `🚚 ${currentUser.nombre}`,
          fullLabel: `🚚 ${currentUser.nombre} - Repartidor`,
          style: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
    }
  };

  const userBadgeInfo = getUserBadge();

  return (
    <header id="app-header" className="sticky top-0 z-30 bg-[#0F172A] text-white shadow-md border-b border-slate-800 w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 w-full">
          {/* Logo y Nombre en Móvil (md:hidden) */}
          <div
            className="flex md:hidden items-center space-x-2 cursor-pointer shrink-0 min-w-0"
            onClick={() => setActiveView(isRepartidor ? 'finalizarventa' : 'dashboard')}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center font-black text-white shadow-inner text-base shrink-0">
              C&C
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 min-w-0">
                <span className="font-black text-sm tracking-tight text-white truncate">C&C Gestión</span>
                <span className="text-[8px] uppercase font-black tracking-wider bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-full shrink-0">
                  Prueba
                </span>
                <span className="hidden xs:inline-block text-[9px] uppercase font-bold tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                  Distribuidora
                </span>
              </div>
            </div>
          </div>

          {/* Título de Sección Activa en Escritorio (hidden md:flex) */}
          <div className="hidden md:flex items-center space-x-3 shrink-0">
            <h2 className="text-base lg:text-lg font-black tracking-tight text-white flex items-center space-x-2">
              <span>{
                activeView === 'finalizarventa' ? '⚡ Finalizar Venta Express' :
                activeView === 'dashboard' ? '📊 Dashboard Principal' :
                activeView === 'hoy' ? '🚚 HOY - Ruta de Reparto' :
                activeView === 'estadoreparto' ? '🚛 Estado del Reparto / Turno' :
                activeView === 'clientes' ? '👥 Listado de Clientes' :
                activeView === 'cobranzas' ? '💵 Gestión de Cobranzas' :
                activeView === 'cuentacorriente' ? '🧾 Cuentas Corrientes' :
                activeView === 'boletas' ? '📸 Galería de Boletas' :
                activeView === 'alertas' ? '🛡️ Centro de Alertas' :
                activeView === 'auditoria' ? '🔍 Auditoría del Sistema' :
                activeView === 'usuarios' ? '👑 Administración de Usuarios' :
                activeView === 'repartidorpanel' ? '🚚 Módulo de Camión' :
                activeView === 'fichacliente' ? '📄 Ficha de Cliente' : 'C&C Gestión'
              }</span>
            </h2>
            <span className="text-[9px] uppercase font-black tracking-wider bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full">Versión de prueba</span>
          </div>

          {/* Connection Status Badge (Desktop/Tablet) */}
          <div className="hidden md:block">
            <ConnectionStatusBadge onOpenSyncModal={onOpenSyncModal} />
          </div>

          {/* Quick Stats in Header (Desktop Large) */}
          {!isRepartidor && (
            <div className="hidden lg:flex items-center space-x-6 bg-slate-800/80 px-4 py-1.5 rounded-2xl border border-slate-700/60 shrink-0">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Deuda Total en Calle</p>
                <p className="text-sm font-black text-emerald-400 font-mono">
                  {totalDeudaGlobal.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          )}

          {/* User Badge, Actions & Logout */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            {/* Botón Principal: Finalizar Venta Express */}
            <button
              id="btn-finalizar-venta-nav"
              onClick={() => setActiveView('finalizarventa')}
              className={`flex items-center space-x-1 sm:space-x-1.5 text-xs sm:text-sm font-black px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition shadow-md active:scale-95 cursor-pointer min-h-[38px] ${
                activeView === 'finalizarventa'
                  ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
              }`}
              title="Ir a Finalizar Venta Express"
            >
              <Zap className="w-4 h-4 fill-current shrink-0" />
              <span className="text-xs sm:text-sm">Express</span>
            </button>

            {/* User Badge Button (Desktop: Full label, Mobile: Compact clickable trigger) */}
            <button
              id="btn-user-menu-trigger"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-black flex items-center space-x-1 transition min-h-[38px] cursor-pointer active:scale-95 ${userBadgeInfo.style}`}
              title="Opciones de Usuario"
            >
              <span className="sm:hidden font-extrabold truncate max-w-[85px]">{userBadgeInfo.shortLabel}</span>
              <span className="hidden sm:inline font-black truncate max-w-[200px]">{userBadgeInfo.fullLabel}</span>
            </button>

            {/* Desktop-only action buttons */}
            <div className="hidden sm:flex items-center space-x-2">
              {/* PWA Install Button */}
              {!checkIsStandalone() && (
                <button
                  id="btn-install-pwa-nav"
                  onClick={async () => {
                    const installed = await promptPwaInstall();
                    if (!installed) {
                      window.dispatchEvent(new CustomEvent('open-pwa-modal'));
                    }
                  }}
                  className="p-2 text-blue-300 hover:text-white bg-blue-900/40 hover:bg-blue-800/60 rounded-xl transition border border-blue-700/50 flex items-center space-x-1 cursor-pointer min-h-[38px]"
                  title="Instalar C&C en Pantalla Principal"
                >
                  <Smartphone className="w-4.5 h-4.5 text-blue-400" />
                </button>
              )}

              {/* Configuración (Solo Admin/Dueño) */}
              {!isRepartidor && (
                <button
                  id="btn-open-settings"
                  onClick={onOpenSettingsModal}
                  className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer min-h-[38px]"
                  title="Configuración de WhatsApp"
                >
                  <MessageSquare className="w-4.5 h-4.5 text-emerald-400" />
                </button>
              )}

              {/* Respaldos (Solo Admin/Dueño) */}
              <button
                id="btn-open-backup"
                onClick={onOpenBackupModal}
                className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer min-h-[38px]"
                title="Respaldos y Datos"
              >
                <Download className="w-4.5 h-4.5" />
              </button>

              {/* Botón Cerrar Sesión */}
              <button
                id="btn-logout"
                onClick={onLogout}
                className="p-2 text-red-300 hover:text-white bg-red-950/60 hover:bg-red-900/80 rounded-xl transition border border-red-800/50 flex items-center space-x-1 cursor-pointer min-h-[38px]"
                title="Cerrar sesión"
              >
                <LogOut className="w-4.5 h-4.5 text-red-400" />
                <span className="text-xs font-bold hidden xl:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Popover Menu para Opciones de Usuario (Móvil y Escritorio al hacer click en Badge) */}
      {isUserMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-3 pt-16 sm:pt-20 bg-slate-950/60 backdrop-blur-xs">
          <div
            className="fixed inset-0"
            onClick={() => setIsUserMenuOpen(false)}
          />
          <div className="relative bg-slate-900 border border-slate-700 text-white rounded-2xl p-4 shadow-2xl w-full max-w-xs space-y-3 z-10 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="min-w-0">
                <p className="font-extrabold text-sm text-white truncate">{currentUser.nombre}</p>
                <p className="text-xs text-slate-400 font-medium">{currentUser.role}</p>
              </div>
              <button
                onClick={() => setIsUserMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Deuda Total en Calle */}
            {!isRepartidor && (
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Deuda Total en Calle</p>
                <p className="text-base font-black text-emerald-400 font-mono">
                  {totalDeudaGlobal.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              {/* Sincronización */}
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onOpenSyncModal();
                }}
                className="w-full p-2.5 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center space-x-2 cursor-pointer transition"
              >
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                <span>Estado Sincronización</span>
              </button>

              {/* PWA App */}
              {!checkIsStandalone() && (
                <button
                  onClick={async () => {
                    setIsUserMenuOpen(false);
                    const installed = await promptPwaInstall();
                    if (!installed) {
                      window.dispatchEvent(new CustomEvent('open-pwa-modal'));
                    }
                  }}
                  className="w-full p-2.5 min-h-[44px] bg-blue-900/40 hover:bg-blue-800/60 border border-blue-700/50 text-blue-200 text-xs font-bold rounded-xl flex items-center space-x-2 cursor-pointer transition"
                >
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <span>Instalar App en Celular</span>
                </button>
              )}

              {/* Configuración WhatsApp */}
              {!isRepartidor && (
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenSettingsModal();
                  }}
                  className="w-full p-2.5 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center space-x-2 cursor-pointer transition"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Configurar WhatsApp</span>
                </button>
              )}

              {/* Respaldos */}
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onOpenBackupModal();
                }}
                className="w-full p-2.5 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center space-x-2 cursor-pointer transition"
              >
                <Download className="w-4 h-4 text-blue-400" />
                <span>Respaldos de Datos</span>
              </button>

              {/* Cerrar Sesión */}
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onLogout();
                }}
                className="w-full p-2.5 min-h-[44px] bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-extrabold rounded-xl flex items-center space-x-2 cursor-pointer transition"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

