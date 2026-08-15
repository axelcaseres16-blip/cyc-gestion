import React, { useState } from 'react';
import { loginUser } from '../utils/userStorage';
import { AppUser } from '../types';
import { Eye, EyeOff, LockKeyhole, LogIn, ShieldAlert, UserRound } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: AppUser) => void;
}

/** Presentation-only access screen. Authentication and session persistence stay in userStorage. */
export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    // Keeps the existing authentication implementation untouched while the
    // button provides a clear pending state for touch users.
    window.setTimeout(() => {
      const result = loginUser(username, password);
      setIsLoading(false);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMsg(result.error || 'No pudimos iniciar sesión. Revisá los datos e intentá nuevamente.');
      }
    }, 160);
  };

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#0f1d35] px-5 py-[max(2rem,env(safe-area-inset-top))] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(25,105,217,.33),transparent_30rem),radial-gradient(circle_at_100%_100%,rgba(7,135,91,.2),transparent_28rem)]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/20 bg-white/10 text-xl font-black tracking-[-0.08em] shadow-2xl backdrop-blur">C&C</div>
          <h1 className="text-2xl font-extrabold tracking-[-0.04em]">C&C Gestión</h1>
          <p className="mt-1 text-sm text-slate-300">Operación diaria de distribución</p>
        </div>

        <section className="rounded-[24px] border border-white/12 bg-white p-5 text-slate-900 shadow-2xl sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Usuario</span>
              <span className="relative block">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Tu usuario"
                  className="cc-input pl-10"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Contraseña</span>
              <span className="relative block">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Ingresá tu contraseña"
                  className="cc-input px-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            <button type="submit" disabled={isLoading} className="cc-btn cc-btn-primary mt-2 w-full text-sm">
              <LogIn className="h-4 w-4" />
              <span>{isLoading ? 'Ingresando…' : 'Ingresar'}</span>
            </button>
          </form>
        </section>
      </div>
    </main>
  );
};
