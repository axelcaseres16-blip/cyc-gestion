import React from 'react';
import { UserRole } from '../types';
import { ROLE_LABELS } from '../utils/formatters';
import { UserCheck, Shield, Truck, DollarSign, Eye } from 'lucide-react';

interface UserRoleSelectorProps {
  currentRole: string;
  onRoleChange: (role: string) => void;
}

const ROLES_CONFIG: { id: UserRole; label: string; icon: any; color: string; bg: string }[] = [
  { id: 'DUENO', label: '👑 Dueño', icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  { id: 'ADMINISTRADOR', label: '⚙️ Administrador', icon: UserCheck, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { id: 'REPARTIDOR', label: '🚚 Repartidor', icon: Truck, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
];

export const UserRoleSelector: React.FC<UserRoleSelectorProps> = ({
  currentRole,
  onRoleChange,
}) => {
  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200">
        <span className="text-slate-400 font-bold hidden sm:inline">Perfil:</span>
        <select
          value={currentRole}
          onChange={(e) => onRoleChange(e.target.value)}
          className="bg-transparent font-extrabold text-white focus:outline-none cursor-pointer text-xs"
        >
          {ROLES_CONFIG.map((r) => (
            <option key={r.id} value={r.id} className="bg-slate-900 text-white font-bold">
              {r.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
