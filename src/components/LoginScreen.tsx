import React, { useState } from 'react';
import { loginUser } from '../utils/userStorage';
import { AppUser } from '../types';
import { Lock, User, LogIn, ShieldAlert, Sparkles, Truck, ShieldCheck, UserCheck } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: AppUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      const result = loginUser(username, password);
      setIsLoading(false);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMsg(result.error || 'Error al iniciar sesión.');
      }
    }, 200);
  };

  const handleQuickLogin = (userLogin: string, pass: string) => {
    setUsername(userLogin);
    setPassword(pass);
    setErrorMsg('');
    const result = loginUser(userLogin, pass);
    if (result.success && result.user) {
      onLoginSuccess(result.user);
    } else {
      setErrorMsg(result.error || 'Error al iniciar sesión.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Visual Ambient Glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-900 to-blue-950 rounded-3xl border-2 border-blue-500/40 shadow-2xl shadow-blue-900/50 mb-1">
            <span className="text-white font-black text-2xl tracking-tighter">C&C</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              C&C Gestión
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Sistema de Distribución, Cuentas Corrientes y Reparto
            </p>
          </div>
        </div>

        {/* Card Formulario */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Lock className="w-5 h-5 text-blue-400" />
              <span>Iniciar Sesión</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Ingrese sus credenciales asignadas por la administración.
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 bg-red-950/80 border border-red-500/50 rounded-2xl text-red-200 text-xs font-bold flex items-start space-x-2.5 animate-shake">
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                Usuario
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej: axel, martin, braian"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-2xl text-sm font-bold text-white placeholder-slate-600 focus:outline-none transition"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-2xl text-sm font-bold text-white placeholder-slate-600 focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer mt-2"
            >
              <LogIn className="w-5 h-5" />
              <span>{isLoading ? 'Ingresando...' : 'Ingresar al Sistema'}</span>
            </button>
          </form>

          {/* Acceso Rápido de Demostración */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <p className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
              <span>Usuarios iniciales preconfigurados:</span>
              <span className="text-blue-400">Clave: 123456</span>
            </p>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('axel', '123456')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-amber-500/30 text-left transition flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">Axel (👑 Dueño)</span>
                </div>
                <span className="text-[10px] text-amber-300 font-mono">axel</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('martin', '123456')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-blue-500/30 text-left transition flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-white">Martín (🛠️ Administrador)</span>
                </div>
                <span className="text-[10px] text-blue-300 font-mono">martin</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('braian', '123456')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-emerald-500/30 text-left transition flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Braian (🚚 Repartidor)</span>
                </div>
                <span className="text-[10px] text-emerald-300 font-mono">braian</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500 font-medium">
          C&C Gestión v3.0 • Sistema Mayorista & Cuentas Corrientes
        </p>
      </div>
    </div>
  );
};
