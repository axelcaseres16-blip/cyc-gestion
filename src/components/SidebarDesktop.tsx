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
  ShieldCheck,
  Building2,
} from 'lucide-react';

interface SidebarDesktopProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenNewCustomer: () => void;
  currentUserRole: string;
  riskyCount: number;
  totalDeudaGlobal: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  isZap?: boolean;
  badge?: string;
  badgeColor?: string;
}

export const SidebarDesktop: React.FC<SidebarDesktopProps> = ({
  activeView,
  setActiveView,
  onOpenNewCustomer,
  currentUserRole,
  riskyCount,
  totalDeudaGlobal,
}) => {
  const isRepartidor = currentUserRole === 'REPARTIDOR';
  const isDueno = currentUserRole === 'DUENO';
  const canCreateCustomer = !isRepartidor;

  let mainGroup: NavItem[] = [
    {
      id: 'finalizarventa',
      label: 'Finalizar Venta Express',
      icon: Zap,
      isZap: true,
      badge: 'Rápido',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'boletavirtual',
      label: 'Boleta Virtual por Cliente',
      icon: Receipt,
      badge: 'Nuevo',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    {
      id: 'stocksemanal',
      label: 'Control de Stock Semanal',
      icon: Building2,
      badge: 'Semáforo',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    },
    {
      id: 'hoy',
      label: 'HOY (Ruta de Reparto)',
      icon: Truck,
    },
    {
      id: 'estadoreparto',
      label: 'Estado Reparto / Turno',
      icon: Truck,
    },
  ];

  if (isRepartidor) {
    mainGroup = [
      {
        id: 'repartidorpanel',
        label: 'Módulo de Camión',
        icon: Truck,
      },
      {
        id: 'finalizarventa',
        label: 'Finalizar Venta',
        icon: Zap,
        isZap: true,
        badge: '1 Paso',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      },
      {
        id: 'hoy',
        label: 'Panel HOY (Ruta)',
        icon: Truck,
      },
      {
        id: 'estadoreparto',
        label: 'Estado del Reparto',
        icon: Truck,
      },
    ];
  }

  let adminGroup: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard General',
      icon: LayoutDashboard,
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: Users,
      badge: riskyCount > 0 ? `${riskyCount} riesgo` : undefined,
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
    },
    {
      id: 'cobranzas',
      label: 'Gestión de Cobranzas',
      icon: DollarSign,
    },
    {
      id: 'cuentacorriente',
      label: 'Cuentas Corrientes',
      icon: Receipt,
    },
    {
      id: 'boletas',
      label: 'Fotos de Boletas',
      icon: Camera,
    },
  ];

  if (isRepartidor) {
    adminGroup = [
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

  const controlGroup: NavItem[] = [
    {
      id: 'alertas',
      label: 'Alertas y Morosos',
      icon: ShieldAlert,
    },
    {
      id: 'auditoria',
      label: 'Auditoría del Sistema',
      icon: ShieldCheck,
    },
  ];

  if (isDueno) {
    controlGroup.push({
      id: 'usuarios',
      label: 'Administrar Usuarios',
      icon: Users,
      badge: 'Dueño',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    });
  }

  return (
    <aside className="hidden md:flex flex-col w-64 xl:w-72 bg-[#0F172A] text-white border-r border-slate-800 shrink-0 sticky top-0 h-screen overflow-y-auto select-none z-30">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center space-x-3 shrink-0 bg-slate-950/60">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center font-black text-white shadow-inner text-xl shrink-0">
          C&C
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h1 className="font-black text-base tracking-tight text-white truncate">C&C Gestión</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
              Distribuidora
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate">Panel Desktop Profesional</p>
        </div>
      </div>

      {/* Botón "+ Nuevo Cliente" en el Sidebar */}
      {canCreateCustomer && (
        <div className="p-3 border-b border-slate-800/80">
          <button
            onClick={onOpenNewCustomer}
            className="w-full py-2.5 px-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-sm border border-blue-400/30 flex items-center justify-center space-x-2 transition cursor-pointer active:scale-98"
          >
            <PlusCircle className="w-4 h-4 text-white shrink-0" />
            <span>Registrar Nuevo Cliente</span>
          </button>
        </div>
      )}

      {/* Navigation Sections */}
      <div className="flex-1 p-3 space-y-5 overflow-y-auto">
        {/* GRUPO 1: OPERACIONES Y REPARTO */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 mb-1.5">
            Ventas y Reparto
          </p>
          <div className="space-y-1">
            {mainGroup.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-between cursor-pointer ${
                    isActive
                      ? item.isZap
                        ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
                        : 'bg-blue-600 text-white shadow-md'
                      : item.isZap
                      ? 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/50'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.isZap ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${item.badgeColor} shrink-0`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* GRUPO 2: CLIENTES Y COBRANZAS */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 mb-1.5">
            Gestión Comercial
          </p>
          <div className="space-y-1">
            {adminGroup.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${item.badgeColor} shrink-0`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* GRUPO 3: CONTROL Y AUDITORÍA (Si aplica) */}
        {!isRepartidor && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 mb-1.5">
              Control & Auditoría
            </p>
            <div className="space-y-1">
              {controlGroup.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-between cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${item.badgeColor} shrink-0`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer del Sidebar */}
      {!isRepartidor && (
        <div className="p-3 border-t border-slate-800 bg-slate-950/80">
          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
            <p className="text-[10px] uppercase font-bold text-slate-400">Deuda Total en Calle</p>
            <p className="text-sm font-black text-emerald-400 font-mono mt-0.5">
              {totalDeudaGlobal.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};
