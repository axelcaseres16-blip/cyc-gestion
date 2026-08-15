import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  ChevronRight,
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  ReceiptText,
  ShieldCheck,
  Tags,
  Truck,
  Users,
  X,
  Zap,
} from 'lucide-react';

interface NavigationProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenNewCustomer: () => void;
  currentUserRole: string;
  riskyCount: number;
}

type NavItem = { id: string; label: string; icon: React.ElementType; badge?: string; tone?: 'success' | 'danger' };

export const Navigation: React.FC<NavigationProps> = ({ activeView, setActiveView, onOpenNewCustomer, currentUserRole, riskyCount }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isRepartidor = currentUserRole === 'REPARTIDOR';
  const isDueno = currentUserRole === 'DUENO';

  const groups = useMemo(() => {
    const operation: NavItem[] = isRepartidor
      ? [
          { id: 'finalizarventa', label: 'Express', icon: Zap, tone: 'success' },
          { id: 'hoy', label: 'Ruta de hoy', icon: Truck },
          { id: 'repartidorpanel', label: 'Mi jornada', icon: ClipboardList },
          { id: 'estadoreparto', label: 'Estado del día', icon: Truck },
        ]
      : [
          { id: 'finalizarventa', label: 'Express', icon: Zap, tone: 'success' },
          { id: 'hoy', label: 'Ruta de hoy', icon: Truck },
          { id: 'stocksemanal', label: 'Stock semanal', icon: Package },
        ];

    const management: NavItem[] = [
      { id: 'clientes', label: 'Clientes', icon: Users, badge: riskyCount ? `${riskyCount} en riesgo` : undefined, tone: riskyCount ? 'danger' : undefined },
      ...(!isRepartidor ? [
        { id: 'cobranzas', label: 'Cobranzas', icon: DollarSign },
        { id: 'cuentacorriente', label: 'Cuenta corriente', icon: ReceiptText },
        { id: 'listasprecios', label: 'Listas de precios', icon: Tags },
      ] : []),
      { id: 'boletas', label: 'Boletas', icon: Camera },
    ];

    const control: NavItem[] = isRepartidor ? [] : [
      { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
      { id: 'alertas', label: 'Alertas', icon: AlertTriangle },
      { id: 'auditoria', label: 'Auditoría', icon: ShieldCheck },
      ...(isDueno ? [{ id: 'usuarios', label: 'Usuarios', icon: Users }] : []),
    ];
    return [{ title: 'Operación', items: operation }, { title: 'Gestión', items: management }, { title: 'Control', items: control }].filter((group) => group.items.length);
  }, [isDueno, isRepartidor, riskyCount]);

  const quickItems = isRepartidor
    ? [
        groups[0].items.find((item) => item.id === 'finalizarventa')!,
        groups[0].items.find((item) => item.id === 'hoy')!,
        groups[0].items.find((item) => item.id === 'repartidorpanel')!,
        groups[1].items.find((item) => item.id === 'clientes')!,
      ]
    : [
        groups[0].items.find((item) => item.id === 'finalizarventa')!,
        groups[0].items.find((item) => item.id === 'hoy')!,
        groups[2].items.find((item) => item.id === 'dashboard')!,
        groups[1].items.find((item) => item.id === 'clientes')!,
      ];

  const select = (id: string) => { setActiveView(id); setIsDrawerOpen(false); };

  return <>
    <nav id="mobile-bottom-nav" aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/96 px-1.5 pb-[calc(0.35rem+env(safe-area-inset-bottom,0px))] pt-1 shadow-[0_-8px_24px_rgba(15,29,53,0.10)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5 gap-0.5">
        {quickItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return <button key={item.id} id={`mobile-nav-${item.id}`} onClick={() => select(item.id)} className={`flex min-h-[54px] flex-col items-center justify-center rounded-xl px-1 text-[10px] font-bold transition ${active ? 'bg-blue-50 text-blue-700' : item.tone === 'success' ? 'text-emerald-700' : 'text-slate-500'}`}>
            <Icon className={`mb-0.5 h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
            <span className="max-w-full truncate">{item.label}</span>
          </button>;
        })}
        <button id="mobile-nav-hamburger" onClick={() => setIsDrawerOpen(true)} className="flex min-h-[54px] flex-col items-center justify-center rounded-xl px-1 text-[10px] font-bold text-slate-500 transition active:scale-95">
          <Menu className="mb-0.5 h-5 w-5" /><span>Menú</span>
        </button>
      </div>
    </nav>

    {isDrawerOpen && <div className="fixed inset-0 z-50 md:hidden">
      <button aria-label="Cerrar menú" onClick={() => setIsDrawerOpen(false)} className="absolute inset-0 h-full w-full bg-slate-950/45 backdrop-blur-[1px]" />
      <aside className="absolute bottom-0 right-0 top-0 flex w-[min(22rem,92vw)] flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div><p className="text-base font-extrabold tracking-[-0.03em] text-slate-900">C&C Gestión</p><p className="mt-0.5 text-xs text-slate-500">Accesos y administración</p></div>
          <button onClick={() => setIsDrawerOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        {!isRepartidor && <div className="px-4 pt-4"><button onClick={() => { setIsDrawerOpen(false); onOpenNewCustomer(); }} className="cc-btn cc-btn-primary w-full"><Plus className="h-4 w-4" />Nuevo cliente</button></div>}
        <div className="cc-scrollbar flex-1 space-y-5 overflow-y-auto px-4 py-5">
          {groups.map((group) => <section key={group.title}>
            <p className="cc-section-label mb-2 px-2">{group.title}</p>
            <div className="space-y-1">
              {group.items.map((item) => { const Icon = item.icon; const active = activeView === item.id; return <button key={item.id} onClick={() => select(item.id)} className={`flex min-h-[50px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold transition ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-blue-600' : item.tone === 'success' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge ? <span className={item.tone === 'danger' ? 'cc-badge cc-badge-danger' : 'cc-badge cc-badge-neutral'}>{item.badge}</span> : <ChevronRight className="h-4 w-4 text-slate-300" />}
              </button>; })}
            </div>
          </section>)}
        </div>
        <p className="border-t border-slate-100 px-5 py-4 text-[11px] font-medium text-slate-400">Versión de prueba · Datos locales del dispositivo</p>
      </aside>
    </div>}
  </>;
};
