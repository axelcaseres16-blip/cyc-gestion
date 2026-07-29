import React from 'react';
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
  const isRepartidor = currentUser.role === 'REPARTIDOR';
  const isDueno = currentUser.role === 'DUENO';

  const getUserBadge = () => {
    switch (currentUser.role) {
      case 'DUENO':
        return {
          label: `👑 ${currentUser.nombre} - Dueño`,
          style: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'ADMINISTRADOR':
        return {
          label: `🛠️ ${currentUser.nombre} - Administrador`,
          style: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        };
      case 'REPARTIDOR':
        return {
          label: `🚚 ${currentUser.nombre} - Repartidor`,
          style: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
    }
  };

  const userBadgeInfo = getUserBadge();

  return (
    <header id="app-header" className="sticky top-0 z-30 bg-[#0F172A] text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Nombre */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveView(isRepartidor ? 'finalizarventa' : 'dashboard')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center font-black text-white shadow-inner text-xl">
              C&C
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-lg tracking-tight text-white">C&C Gestión</span>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Distribuidora
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block font-medium">Control de Clientes, Cuentas Corrientes y Reparto</p>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className="hidden sm:block">
            <ConnectionStatusBadge onOpenSyncModal={onOpenSyncModal} />
          </div>

          {/* Quick Stats in Header (Desktop) */}
          {!isRepartidor && (
            <div className="hidden lg:flex items-center space-x-6 bg-slate-800/80 px-4 py-1.5 rounded-2xl border border-slate-700/60">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Deuda Total en Calle</p>
                <p className="text-sm font-black text-emerald-400 font-mono">
                  {totalDeudaGlobal.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          )}

          {/* User Badge, Actions & Logout */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Botón Principal: Finalizar Venta Express */}
            <button
              id="btn-finalizar-venta-nav"
              onClick={() => setActiveView('finalizarventa')}
              className={`flex items-center space-x-1.5 text-xs sm:text-sm font-black px-3 py-2 rounded-xl transition shadow-md active:scale-95 ${
                activeView === 'finalizarventa'
                  ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
              }`}
              title="Ir a Finalizar Venta Express"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span className="hidden sm:inline">Finalizar Venta</span>
            </button>

            {/* Badge Usuario Conectado */}
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center space-x-1.5 ${userBadgeInfo.style}`}>
              <span className="truncate max-w-[150px] sm:max-w-none">{userBadgeInfo.label}</span>
            </div>

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
                className="p-2 text-blue-300 hover:text-white bg-blue-900/40 hover:bg-blue-800/60 rounded-xl transition border border-blue-700/50 flex items-center space-x-1"
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
                className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                title="Configuración de WhatsApp"
              >
                <MessageSquare className="w-4.5 h-4.5 text-emerald-400" />
              </button>
            )}

            {/* Respaldos (Solo Admin/Dueño) */}
            {!isRepartidor && (
              <button
                id="btn-open-backup"
                onClick={onOpenBackupModal}
                className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition hidden sm:block"
                title="Respaldos y Datos"
              >
                <Download className="w-4.5 h-4.5" />
              </button>
            )}

            {/* Botón Cerrar Sesión */}
            <button
              id="btn-logout"
              onClick={onLogout}
              className="p-2 text-red-300 hover:text-white bg-red-950/60 hover:bg-red-900/80 rounded-xl transition border border-red-800/50 flex items-center space-x-1"
              title="Cerrar sesión"
            >
              <LogOut className="w-4.5 h-4.5 text-red-400" />
              <span className="text-xs font-bold hidden xl:inline">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
