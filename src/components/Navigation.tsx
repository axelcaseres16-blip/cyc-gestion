import React from 'react';
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
  const isRepartidor = currentUserRole === 'REPARTIDOR';
  const isCobranzas = currentUserRole === 'COBRANZAS';
  const isSoloLectura = currentUserRole === 'SOLO_LECTURA';

  // Configuración dinámica de items según el rol seleccionado
  let navItems = [
    {
      id: 'finalizarventa',
      label: '⚡ Finalizar Venta',
      icon: Zap,
      badge: 'Reparto Express',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    },
    {
      id: 'hoy',
      label: 'HOY (Ruta)',
      icon: Truck,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'cobranzas',
      label: 'Cobranzas',
      icon: DollarSign,
    },
    {
      id: 'clientes',
      label: 'Clientes',
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
      label: 'Boletas',
      icon: Camera,
    },
    {
      id: 'auditoria',
      label: 'Auditoría',
      icon: ShieldAlert,
    },
  ];

  if (isRepartidor) {
    navItems = [
      {
        id: 'finalizarventa',
        label: '⚡ Finalizar Venta',
        icon: Zap,
        badge: '1 Solo Paso',
        badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      },
      {
        id: 'hoy',
        label: 'Panel HOY',
        icon: Truck,
      },
      {
        id: 'clientes',
        label: 'Clientes',
        icon: Users,
      },
      {
        id: 'boletas',
        label: 'Fotos Boletas',
        icon: Camera,
      },
    ];
  } else if (isCobranzas) {
    navItems = [
      {
        id: 'cobranzas',
        label: 'Pantalla Cobranzas',
        icon: DollarSign,
        badge: 'Gestión',
        badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      },
      {
        id: 'finalizarventa',
        label: '⚡ Finalizar Venta',
        icon: Zap,
      },
      {
        id: 'clientes',
        label: 'Clientes',
        icon: Users,
      },
      {
        id: 'cuentacorriente',
        label: 'Cuentas Corrientes',
        icon: Receipt,
      },
    ];
  }

  const canCreateCustomer = !isRepartidor && !isSoloLectura;

  return (
    <>
      {/* Desktop Navigation Sub-Header Tabs */}
      <div id="desktop-navigation-bar" className="bg-white border-b border-slate-200 shadow-2xs hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <nav className="flex space-x-1 overflow-x-auto py-2" aria-label="Navegación principal">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                const isZap = item.id === 'finalizarventa';
                return (
                  <button
                    key={item.id}
                    id={`nav-item-${item.id}`}
                    onClick={() => setActiveView(item.id)}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap ${
                      isActive
                        ? isZap
                          ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
                          : 'bg-blue-600 text-white shadow-xs'
                        : isZap
                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isZap ? 'text-emerald-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {canCreateCustomer && (
              <button
                id="btn-add-customer-nav"
                onClick={onOpenNewCustomer}
                className="flex items-center space-x-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-xl border border-slate-300 transition shrink-0 ml-2"
              >
                <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>Nuevo Cliente</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Fixed Navigation Bar */}
      <div id="mobile-bottom-nav" className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-40 md:hidden px-1.5 py-1.5 shadow-lg">
        <div className={`grid gap-1 ${navItems.length <= 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const isZap = item.id === 'finalizarventa';
            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={() => setActiveView(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-center transition ${
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
                <span className="text-[10px] truncate max-w-full leading-tight font-bold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
