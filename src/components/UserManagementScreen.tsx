import React, { useState, useEffect } from 'react';
import { AppUser, UserRole } from '../types';
import {
  getStoredUsers,
  upsertUser,
} from '../utils/userStorage';
import { formatDate } from '../utils/formatters';
import {
  Users,
  UserPlus,
  Edit2,
  Lock,
  Check,
  X,
  ShieldCheck,
  UserCheck,
  Truck,
  AlertCircle,
  Key,
  Calendar,
  Clock,
  Search,
} from 'lucide-react';

interface UserManagementScreenProps {
  currentUser: AppUser;
}

export const UserManagementScreen: React.FC<UserManagementScreenProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Form State
  const [formNombre, setFormNombre] = useState('');
  const [formApellido, setFormApellido] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('REPARTIDOR');
  const [formActivo, setFormActivo] = useState(true);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const refreshUsers = () => {
    setUsers(getStoredUsers());
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  if (currentUser.role !== 'DUENO') {
    return (
      <div className="bg-red-50 border-2 border-red-300 text-red-900 rounded-3xl p-8 text-center space-y-3 my-8">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
        <h2 className="text-xl font-black">Acceso denegado</h2>
        <p className="text-sm font-medium">
          No posee permisos para acceder a esta sección. Exclusivo para el Dueño del sistema.
        </p>
      </div>
    );
  }

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormNombre('');
    setFormApellido('');
    setFormUsername('');
    setFormPassword('');
    setFormRole('REPARTIDOR');
    setFormActivo(true);
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: AppUser) => {
    setEditingUser(u);
    setFormNombre(u.nombre);
    setFormApellido(u.apellido);
    setFormUsername(u.username);
    setFormPassword(''); // Vacío para mantener contraseña previa si no cambia
    setFormRole(u.role);
    setFormActivo(u.activo);
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleToggleStatus = (u: AppUser) => {
    if (u.id === currentUser.id) {
      alert('No podés desactivar tu propio usuario activo.');
      return;
    }
    const res = upsertUser(
      {
        id: u.id,
        nombre: u.nombre,
        apellido: u.apellido,
        username: u.username,
        role: u.role,
        activo: !u.activo,
      },
      currentUser.role
    );
    if (res.success) {
      refreshUsers();
    } else {
      alert(res.error || 'Error cambiando estado');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const res = upsertUser(
      {
        id: editingUser?.id,
        nombre: formNombre,
        apellido: formApellido,
        username: formUsername,
        plainPassword: formPassword || undefined,
        role: formRole,
        activo: formActivo,
      },
      currentUser.role
    );

    if (res.success) {
      setFormSuccess(editingUser ? 'Usuario actualizado con éxito.' : 'Usuario creado con éxito.');
      refreshUsers();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1000);
    } else {
      setFormError(res.error || 'Error al guardar el usuario.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.nombre.toLowerCase().includes(q) ||
      u.apellido.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    );
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'DUENO':
        return (
          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1 inline-flex">
            <span>👑 Dueño</span>
          </span>
        );
      case 'ADMINISTRADOR':
        return (
          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-blue-100 text-blue-900 border border-blue-300 flex items-center space-x-1 inline-flex">
            <span>🛠️ Administrador</span>
          </span>
        );
      case 'REPARTIDOR':
        return (
          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center space-x-1 inline-flex">
            <span>🚚 Repartidor</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xl shrink-0 shadow-md">
            👑
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Administración de Usuarios
            </h1>
            <p className="text-xs text-slate-300 font-medium">
              Módulo exclusivo del Dueño para crear, editar y gestionar permisos de personal.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="w-full sm:w-auto min-h-[48px] py-3 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center justify-center space-x-2 shrink-0 cursor-pointer active:scale-98"
        >
          <UserPlus className="w-4 h-4" />
          <span>Crear Nuevo Usuario</span>
        </button>
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-20 right-4 z-40 sm:hidden">
        <button
          onClick={handleOpenCreateModal}
          className="bg-amber-500 text-slate-950 p-4 rounded-full shadow-2xl flex items-center justify-center space-x-2 font-black border-2 border-amber-300 active:scale-95"
          title="Crear Nuevo Usuario"
        >
          <UserPlus className="w-6 h-6" />
          <span className="text-xs font-black uppercase pr-1">Nuevo Usuario</span>
        </button>
      </div>

      {/* Control / Buscador */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, apellido o usuario..."
            className="w-full pl-11 pr-4 py-3 min-h-[48px] bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600"
          />
        </div>
        <span className="text-xs font-bold text-slate-500 shrink-0 self-end sm:self-center">
          {filteredUsers.length} usuario(s)
        </span>
      </div>

      {/* Vista Móvil (Tarjetas) */}
      <div className="block md:hidden space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-slate-500 font-bold text-xs border border-slate-200">
            No se encontraron usuarios
          </div>
        ) : (
          filteredUsers.map((u) => (
            <div
              key={u.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {u.nombre} {u.apellido}
                  </h3>
                  <p className="text-xs font-mono font-bold text-blue-600">
                    @{u.username}
                  </p>
                </div>
                <div className="shrink-0">{getRoleBadge(u.role)}</div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                <div>
                  Estado:{' '}
                  {u.activo ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ ACTIVO
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-300">
                      🔴 INACTIVO
                    </span>
                  )}
                </div>
                <div>Creado: <span className="font-mono">{formatDate(u.createdAt, true)}</span></div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEditModal(u)}
                  className="flex-1 min-h-[44px] py-2 px-3 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-extrabold text-xs rounded-xl border border-slate-200 transition flex items-center justify-center space-x-1.5"
                >
                  <Edit2 className="w-4 h-4 text-blue-600" />
                  <span>Editar</span>
                </button>

                <button
                  onClick={() => handleToggleStatus(u)}
                  disabled={u.id === currentUser.id}
                  className={`flex-1 min-h-[44px] py-2 px-3 text-xs font-extrabold rounded-xl transition border flex items-center justify-center ${
                    u.activo
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                  }`}
                >
                  {u.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Vista Escritorio (Tabla) */}
      <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-300 text-[11px] font-black uppercase tracking-wider">
                <th className="p-4">Usuario</th>
                <th className="p-4">Rol</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Fecha Creación</th>
                <th className="p-4">Último Acceso</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-4">
                    <div>
                      <p className="font-extrabold text-sm text-slate-900">
                        {u.nombre} {u.apellido}
                      </p>
                      <p className="text-xs font-mono font-bold text-blue-600">
                        @{u.username}
                      </p>
                    </div>
                  </td>

                  <td className="p-4">{getRoleBadge(u.role)}</td>

                  <td className="p-4">
                    {u.activo ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ✓ ACTIVO
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-300">
                        🔴 INACTIVO
                      </span>
                    )}
                  </td>

                  <td className="p-4 text-slate-500 font-mono text-[11px]">
                    {formatDate(u.createdAt, true)}
                  </td>

                  <td className="p-4 text-slate-500 font-mono text-[11px]">
                    {u.lastAccessAt ? formatDate(u.lastAccessAt, true) : 'Nunca'}
                  </td>

                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(u)}
                      className="p-2.5 min-h-[40px] min-w-[40px] text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-xl transition inline-flex items-center justify-center cursor-pointer"
                      title="Editar usuario"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleStatus(u)}
                      disabled={u.id === currentUser.id}
                      className={`px-3 py-2 min-h-[40px] text-xs font-bold rounded-xl transition cursor-pointer ${
                        u.activo
                          ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-[95vw] sm:w-full my-auto shadow-2xl border border-slate-200 overflow-hidden max-h-[92dvh] flex flex-col">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h2 className="font-extrabold text-base">
                  {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-800 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    placeholder="Ej: Martín"
                    className="w-full p-3 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Apellido</label>
                  <input
                    type="text"
                    required
                    value={formApellido}
                    onChange={(e) => setFormApellido(e.target.value)}
                    placeholder="Ej: Gómez"
                    className="w-full p-3 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nombre de Usuario (Único)
                </label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Ej: mgomez"
                  className="w-full p-3 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Contraseña {editingUser && '(Dejar en blanco para no cambiar)'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-3 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Rol</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full p-3 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                >
                  <option value="REPARTIDOR">🚚 Repartidor (Interfaz Simplificada)</option>
                  <option value="ADMINISTRADOR">🛠️ Administrador (Operación Diaria Total)</option>
                  <option value="DUENO">👑 Dueño (Acceso Total + Usuarios)</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2 min-h-[44px]">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formActivo}
                  onChange={(e) => setFormActivo(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <label htmlFor="activo" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Usuario Activo (Permitir inicio de sesión)
                </label>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:flex-1 py-3 min-h-[48px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 py-3 min-h-[48px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition"
                >
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
