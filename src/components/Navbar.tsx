import React, { useState } from 'react';
import { AppUser } from '../types';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { checkIsStandalone, promptPwaInstall } from '../utils/pwaManager';
import { Download, FilePlus2, LogOut, Menu, MessageSquare, Plus, ReceiptText, Settings, Smartphone, UserRound, X, Zap } from 'lucide-react';

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

const viewTitles: Record<string, string> = {
  finalizarventa: 'Express', boletavirtual: 'Express', dashboard: 'Inicio', hoy: 'Ruta de hoy', estadoreparto: 'Estado del día',
  clientes: 'Clientes', fichacliente: 'Cliente', cobranzas: 'Cobranzas', cuentacorriente: 'Cuenta corriente', boletas: 'Boletas',
  listasprecios: 'Listas de precios', stocksemanal: 'Stock semanal', alertas: 'Alertas', auditoria: 'Auditoría', usuarios: 'Usuarios', repartidorpanel: 'Mi jornada',
};

export const Navbar: React.FC<NavbarProps> = ({ activeView, setActiveView, onOpenNewBoleta, onOpenNewPago, onOpenNewCustomer, onOpenBackupModal, onOpenSettingsModal, onOpenSyncModal, currentUser, onLogout, totalDeudaGlobal }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isRepartidor = currentUser.role === 'REPARTIDOR';
  const initials = currentUser.nombre.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const pageTitle = viewTitles[activeView] || 'C&C Gestión';
  const closeThen = (action: () => void) => { setMenuOpen(false); action(); };

  return <header id="app-header" className="sticky top-0 z-30 w-full border-b border-slate-800 bg-[#0f1d35]/98 text-white shadow-[0_2px_14px_rgba(15,29,53,.18)] backdrop-blur">
    <div className="mx-auto flex h-[calc(3.7rem+env(safe-area-inset-top,0px))] max-w-7xl items-end justify-between gap-3 px-3 pb-2.5 pt-[env(safe-area-inset-top,0px)] sm:px-6">
      <button onClick={() => setActiveView(isRepartidor ? 'finalizarventa' : 'dashboard')} className="flex min-h-10 min-w-0 items-center gap-2 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-[13px] font-black tracking-[-0.09em] text-slate-950">C&C</span>
        <span className="min-w-0"><span className="block truncate text-sm font-extrabold tracking-[-0.025em]">{pageTitle}</span><span className="hidden text-[10px] font-medium text-slate-400 sm:block">C&C Gestión</span></span>
      </button>

      <div className="flex items-center gap-2">
        <span className="hidden rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[9px] font-extrabold tracking-[0.08em] text-amber-200 sm:inline">TEST</span>
        <div className="hidden md:block"><ConnectionStatusBadge onOpenSyncModal={onOpenSyncModal} /></div>
        <button onClick={() => setMenuOpen(true)} className="flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-2 text-xs font-bold text-white transition hover:bg-white/16" aria-label="Abrir opciones">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500 text-[9px] font-black">{initials}</span><Menu className="h-4 w-4 text-slate-300" />
        </button>
      </div>
    </div>

    {menuOpen && <div className="fixed inset-0 z-50">
      <button aria-label="Cerrar opciones" onClick={() => setMenuOpen(false)} className="absolute inset-0 h-full w-full bg-slate-950/45 backdrop-blur-[1px]" />
      <section className="absolute right-3 top-[max(4.25rem,calc(4rem+env(safe-area-inset-top)))] w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-2xl sm:right-6">
        <div className="flex items-center justify-between border-b border-slate-100 px-2 pb-3">
          <div><p className="text-sm font-extrabold">{currentUser.nombre}</p><p className="mt-0.5 text-xs text-slate-500">{currentUser.role}</p></div>
          <button onClick={() => setMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        {!isRepartidor && <div className="m-2 rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Deuda total</p><p className="cc-money mt-0.5 text-lg font-extrabold text-slate-900">{totalDeudaGlobal.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}</p></div>}
        <div className="space-y-1 p-1">
          <button onClick={() => closeThen(() => setActiveView('finalizarventa'))} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-emerald-700 hover:bg-emerald-50"><Zap className="h-4 w-4" />Nueva venta Express</button>
          {!isRepartidor && <>
            <button onClick={() => closeThen(onOpenNewPago)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold hover:bg-slate-50"><ReceiptText className="h-4 w-4 text-emerald-600" />Registrar cobro</button>
            <button onClick={() => closeThen(onOpenNewBoleta)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold hover:bg-slate-50"><FilePlus2 className="h-4 w-4 text-blue-600" />Registrar boleta</button>
            <button onClick={() => closeThen(onOpenNewCustomer)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold hover:bg-slate-50"><Plus className="h-4 w-4 text-blue-600" />Nuevo cliente</button>
          </>}
          <button onClick={() => closeThen(onOpenBackupModal)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold hover:bg-slate-50"><Download className="h-4 w-4 text-slate-500" />Respaldos</button>
          {!isRepartidor && <button onClick={() => closeThen(onOpenSettingsModal)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold hover:bg-slate-50"><Settings className="h-4 w-4 text-slate-500" />Configuración</button>}
          {!checkIsStandalone() && <button onClick={() => { void promptPwaInstall().then((installed) => { if (!installed) window.dispatchEvent(new CustomEvent('open-pwa-modal')); }); setMenuOpen(false); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold hover:bg-slate-50"><Smartphone className="h-4 w-4 text-blue-600" />Instalar en este dispositivo</button>}
          <button onClick={() => closeThen(onOpenSyncModal)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold hover:bg-slate-50 md:hidden"><MessageSquare className="h-4 w-4 text-slate-500" />Sincronización</button>
        </div>
        <div className="mt-1 border-t border-slate-100 p-1 pt-2"><button onClick={() => closeThen(onLogout)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Cerrar sesión</button></div>
      </section>
    </div>}
  </header>;
};
