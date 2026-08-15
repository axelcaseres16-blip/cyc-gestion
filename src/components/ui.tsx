import React from 'react';
import { AlertCircle, LoaderCircle } from 'lucide-react';

export const cn = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className }) => (
  <div className={cn('cc-page-header', className)}>
    <div className="min-w-0">
      <h1 className="cc-page-title">{title}</h1>
      {subtitle && <p className="cc-page-subtitle">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const SectionHeader: React.FC<{ title: string; action?: React.ReactNode; className?: string }> = ({ title, action, className }) => (
  <div className={cn('flex items-center justify-between gap-3', className)}>
    <h2 className="cc-section-label">{title}</h2>
    {action}
  </div>
);

export const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <section className={cn('cc-card', className)}>{children}</section>
);

export const StatusBadge: React.FC<{ tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'; children: React.ReactNode; className?: string }> = ({ tone = 'neutral', children, className }) => (
  <span className={cn('cc-badge', `cc-badge-${tone}`, className)}>{children}</span>
);

export const MoneyDisplay: React.FC<{ value: number; className?: string; zeroTone?: 'success' | 'neutral'; prefix?: string }> = ({ value, className, zeroTone = 'success', prefix }) => {
  const tone = value > 0 ? 'cc-money-debt' : value < 0 ? 'cc-money-credit' : zeroTone === 'success' ? 'cc-money-clear' : '';
  return <span className={cn('cc-money font-extrabold', tone, className)}>{prefix}{value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}</span>;
};

export const EmptyState: React.FC<{ title: string; description?: string; action?: React.ReactNode }> = ({ title, description, action }) => (
  <div className="cc-card flex min-h-48 flex-col items-center justify-center p-7 text-center">
    <AlertCircle className="mb-3 h-8 w-8 text-slate-300" />
    <p className="font-bold text-slate-800">{title}</p>
    {description && <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const LoadingState: React.FC<{ label?: string }> = ({ label = 'Cargando…' }) => (
  <div className="flex min-h-32 items-center justify-center gap-2 text-sm font-semibold text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />{label}</div>
);
