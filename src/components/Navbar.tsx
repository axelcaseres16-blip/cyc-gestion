import React from 'react';
import { UserRoleSelector } from './UserRoleSelector';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import {
  FileText,
  DollarSign,
  Download,
  Settings,
  MessageSquare,
  Truck,
  Building2,
  ShieldAlert,
  Zap,
} from 'lucide-react';

interface NavbarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenNewBoleta: () => void;
  onOpenNewPago: () => void;
  onOpenNewCustomer: () => void;
  onOpenBackupModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenSyncModal: () => void;
  currentUserRole: string;
  setCurrentUserRole: (role: string) => void;
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
  currentUserRole,
  setCurrentUserRole,
  totalDeudaGlobal,
}) => {
  const isRepartidor = currentUserRole === 'REPARTIDOR';
  const isSoloLectura = currentUserRole === 'SOLO_LECTURA';

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
              <p className="text-xs text-slate-400 hidden sm:block font-medium">Control de Clientes, Cuentas Corrientes y Cobranzas</p>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className="hidden sm:block">
            <ConnectionStatusBadge onOpenSyncModal={onOpenSyncModal} />
          </div>

          {/* Quick Stats in Header (Desktop) */}
          <div className="hidden lg:flex items-center space-x-6 bg-slate-800/80 px-4 py-1.5 rounded-2xl border border-slate-700/60">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Deuda Total en Calle</p>
              <p className="text-sm font-black text-emerald-400 font-mono">
                {totalDeudaGlobal.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Selector de Rol & Acciones */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Botón Principal: Finalizar Venta Express */}
            {!isSoloLectura && (
              <button
                id="btn-finalizar-venta-nav"
                onClick={() => setActiveView('finalizarventa')}
                className={`flex items-center space-x-1.5 text-xs sm:text-sm font-black px-3.5 py-2 rounded-xl transition shadow-md active:scale-95 ${
                  activeView === 'finalizarventa'
                    ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                }`}
                title="Ir a Finalizar Venta Express"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Finalizar Venta</span>
              </button>
            )}

            {/* Selector de Rol Personalizado */}
            <UserRoleSelector currentRole={currentUserRole} onRoleChange={setCurrentUserRole} />

            {/* Plantillas WhatsApp Config */}
            <button
              id="btn-open-settings"
              onClick={onOpenSettingsModal}
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              title="Configuración de WhatsApp"
            >
              <MessageSquare className="w-4.5 h-4.5 text-emerald-400" />
            </button>

            {/* Respaldos */}
            <button
              id="btn-open-backup"
              onClick={onOpenBackupModal}
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition hidden sm:block"
              title="Respaldos y Datos"
            >
              <Download className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
