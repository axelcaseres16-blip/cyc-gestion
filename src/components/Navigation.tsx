import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Truck,
  Receipt,
  Camera,
  PlusCircle,
  DollarSign,
  ShieldAlert,
  Zap,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Download,
  Settings,
  MessageSquare,
} from 'lucide-react';

interface NavigationProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenNewCustomer: () => void;
  currentUserRole: string;
  riskyCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeView,
  setActiveView,
  onOpenNewCustomer,
  currentUserRole,
  riskyCount,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isRepartidor = currentUserRole === 'REPARTIDOR';
  const isDueno = currentUserRole === 'DUENO';

  // Configuración dinámica de items según los 3 roles oficiales
  let navItems = [
    {
      id: 'finalizarventa',
      label: '⚡ Finalizar Venta Express',
      icon: Zap,
      badge: 'Rápido',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    },
    {
      id: 'hoy',
      label: 'HOY (Ruta de Reparto)',
      icon: Truck,
    },
    {
      id: 'dashboard',
      label: 'Dashboard Principal',
      icon: LayoutDashboard,
    },
    {
      id: 'estadoreparto',
      label: 'Estado del Día / Turno',
      icon: Truck,
    },
    {
      id: 'alertas',
      label: 'Centro de Alertas y Morosos',
      icon: ShieldAlert,
    },
    {
      id: 'cobranzas',
      label: 'Gestión de Cobranzas',
      icon: DollarSign,
    },
    {
      id: 'clientes',
      label: 'Listado de Clientes',
      icon: Users,
      badge: riskyCount > 0 ? `${riskyCount} riesgo` : undefined,
      badgeColor: 'bg-red-500/10 text-red-600 border-red-500/20',
    },
    {
      id: 'cuentacorriente',
      label: 'Cuentas Corrientes',
      icon: Receipt,
    },
    {
      id: 'boletas',
      label: 'Galería de Boletas',
      icon: Camera,
    },
    {
      id: 'auditoria',
      label: 'Auditoría del Sistema',
      icon: ShieldAlert,
    },
  ];

  if (isDueno) {
    navItems.push({
      id: 'usuarios',
      label: '👑 Administración de Usuarios',
      icon: Users,
      badge: 'Dueño',
      badgeColor: 'bg-amber-500/20 text-amber-800 border-amber-300',
    });
  }

  if (isRepartidor) {
    navItems = [
      {
        id: 'repartidorpanel',
        label: '🚚 Módulo de Camión',
        icon: Truck,
      },
      {
        id: 'finalizarventa',
        label: '⚡ Finalizar Venta',
        icon: Zap,
        badge: '1 Solo Paso',
        badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      },
      {
        id: 'hoy',
        label: 'Panel HOY (Ruta)',
        icon: Truck,
      },
      {
        id: 'estadoreparto',
        label: 'Estado Reparto del Día',
        icon: Truck,
      },
      {
        id: 'clientes',
        label: 'Clientes',
        icon: Users,
      },
      {
        id: 'boletas',
        label: 'Fotos de Boletas',
        icon: Camera,
      },
    ];
  }

  const canCreateCustomer = !isRepartidor;

  const handleSelectView = (id: string) => {
    setActiveView(id);
    setIsDrawerOpen(false);
  };

  // Íconos principales para la barra inferior móvil
  const mobileBottomQuickItems = isRepartidor
    ? [
        navItems.find((n) => n.id === 'repartidorpanel') || navItems[0],
        navItems.find((n) => n.id === 'finalizarventa') || navItems[1],
        navItems.find((n) => n.id === 'hoy') || navItems[2],
        navItems.find((n) => n.id === 'clientes') || navItems[3],
      ]
    : [
        navItems.find((n) => n.id === 'finalizarventa') || navItems[0],
        navItems.find((n) => n.id === 'hoy') || navItems[1],
        navItems.find((n) => n.id === 'dashboard') || navItems[2],
        navItems.find((n) => n.id === 'clientes') || navItems[3],
      ];

  return (
    <>
      {/* Desktop Navigation handled by SidebarDesktop */}

      {/* Mobile Bottom Navigation Bar */}
      <div id="mobile-bottom-nav" className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-40 md:hidden px-2 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] shadow-2xl">
        <div className="grid grid-cols-5 gap-1 items-center">
          {mobileBottomQuickItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const isZap = item.id === 'finalizarventa';
            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={() => handleSelectView(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition min-h-[48px] active:scale-95 ${
                  isActive
                    ? isZap
                      ? 'text-white bg-emerald-600 font-black shadow-md'
                      : 'text-white bg-blue-600 font-extrabold'
                    : isZap
                    ? 'text-emerald-400 bg-emerald-950/60 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-white' : isZap ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="text-[10px] truncate max-w-full leading-tight font-extrabold">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}

          {/* Botón Menú Completo (Hamburguesa) */}
          <button
            id="mobile-nav-hamburger"
            onClick={() => setIsDrawerOpen(true)}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition min-h-[48px] text-amber-400 bg-slate-800/80 border border-slate-700/80 active:scale-95 cursor-pointer"
          >
            <Menu className="w-5 h-5 mb-0.5 text-amber-400" />
            <span className="text-[10px] truncate max-w-full leading-tight font-black">Menú ☰</span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Slide-Over Navigation */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Sidebar */}
          <div className="relative w-full max-w-xs bg-slate-900 text-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-800 animate-slide-in-right">
            {/* Drawer Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-base">
                  C&C
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Menú C&C Gestión</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Todas las secciones del sistema</p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Quick Action in Drawer */}
            {canCreateCustomer && (
              <div className="p-3 bg-slate-800/50 border-b border-slate-800">
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onOpenNewCustomer();
                  }}
                  className="w-full min-h-[48px] py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Registrar Nuevo Cliente</span>
                </button>
              </div>
            )}

            {/* Navigation Options List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-2 py-1">
                Navegación Principal
              </p>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                const isZap = item.id === 'finalizarventa';
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectView(item.id)}
                    className={`w-full min-h-[48px] px-3.5 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-between cursor-pointer active:scale-98 ${
                      isActive
                        ? 'bg-blue-600 text-white font-extrabold shadow-md'
                        : isZap
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : isZap ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${item.badgeColor} shrink-0`}>
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer info in drawer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 text-center text-[11px] text-slate-400">
              <p className="font-bold text-slate-300">C&C Gestión Distribuidora</p>
              <p className="text-[10px] text-slate-500">Versión Móvil Optimizada Android</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

