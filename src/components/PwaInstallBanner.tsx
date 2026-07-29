import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share2, PlusSquare, CheckCircle, WifiOff, RefreshCw, X, ShieldCheck } from 'lucide-react';
import {
  promptPwaInstall,
  checkIsStandalone,
  checkIsIos,
  triggerSwUpdate,
  setupInstallPromptListener,
  registerServiceWorker
} from '../utils/pwaManager';

interface PwaInstallProps {
  onDismiss?: () => void;
}

export const PwaInstallBanner: React.FC<PwaInstallProps> = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    setIsStandalone(checkIsStandalone());
    setIsIos(checkIsIos());

    // Register Service Worker and listen for updates
    registerServiceWorker(() => {
      setHasUpdate(true);
    });

    // Listen for install prompt
    setupInstallPromptListener((canInstall) => {
      setIsInstallable(canInstall);
    });

    // Online / Offline status & custom open modal event
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleOpenModal = () => setShowModal(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('open-pwa-modal', handleOpenModal);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('open-pwa-modal', handleOpenModal);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const installed = await promptPwaInstall();
      if (installed) {
        setIsInstallable(false);
        setShowModal(false);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      {/* Offline Alert Bar */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-900 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md animate-fade-in border-b border-amber-600">
          <div className="flex items-center space-x-2 max-w-7xl mx-auto w-full">
            <WifiOff className="w-4 h-4 shrink-0 text-slate-900" />
            <span>Modo Offline Activo — Podés seguir trabajando. Todos los datos se guardan en tu dispositivo.</span>
          </div>
        </div>
      )}

      {/* Auto-Update Banner */}
      {hasUpdate && (
        <div className="bg-blue-600 text-white px-4 py-3 text-xs font-bold flex items-center justify-between shadow-lg border-b border-blue-500 animate-bounce-short">
          <div className="flex items-center space-x-2 max-w-7xl mx-auto w-full justify-between">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>¡Nueva versión disponible de C&C Gestión!</span>
            </div>
            <button
              onClick={() => triggerSwUpdate()}
              className="bg-white text-blue-900 px-3 py-1.5 rounded-lg font-black text-xs hover:bg-slate-100 transition shadow-xs active:scale-95"
            >
              Actualizar Ahora
            </button>
          </div>
        </div>
      )}

      {/* Header Install Trigger Bar (Visible if not standalone and banner not dismissed) */}
      {!isStandalone && !bannerDismissed && (
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 text-xs text-slate-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-[10px] shadow-xs">
                C&C
              </div>
              <span className="font-semibold text-slate-200 text-xs">
                Instalá <strong className="text-white">C&C Gestión</strong> en tu celular como App Nativa
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleInstallClick}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition shadow-xs active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Instalar App</span>
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                className="p-1 text-slate-400 hover:text-white rounded-md transition"
                title="Cerrar notificación"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Instrucciones de Instalación (Android & iPhone) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md ring-4 ring-slate-100">
                C&C
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">C&C Gestión PWA</h3>
                <p className="text-xs text-slate-500 font-medium">Aplicación Web Progresiva Oficial</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 flex items-start space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-blue-900 font-medium leading-relaxed">
                  Podés instalar esta App en la pantalla de inicio de tu teléfono. Funcionará a pantalla completa y sin conexión a internet.
                </p>
              </div>

              {isIos ? (
                /* iOS Safari Instructions */
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Pasos para iPhone / iPad (Safari):</span>
                  </div>
                  <ol className="space-y-2.5 text-slate-600 font-medium pl-1">
                    <li className="flex items-center space-x-2">
                      <span className="w-5 h-5 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center text-[10px]">1</span>
                      <span>Tocá el botón <strong>Compartir</strong> <Share2 className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" /> en la parte inferior de Safari.</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-5 h-5 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center text-[10px]">2</span>
                      <span>Desplazate hacia abajo y seleccioná <strong>"Agregar a inicio"</strong> <PlusSquare className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" />.</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-5 h-5 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center text-[10px]">3</span>
                      <span>Pulsá <strong>"Agregar"</strong> arriba a la derecha. ¡Listo!</span>
                    </li>
                  </ol>
                </div>
              ) : (
                /* Android / Chrome Instructions */
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Pasos para Android / Navegador:</span>
                  </div>
                  <ol className="space-y-2.5 text-slate-600 font-medium pl-1">
                    <li className="flex items-center space-x-2">
                      <span className="w-5 h-5 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center text-[10px]">1</span>
                      <span>Tocá el menú de tres puntos <strong>(⋮)</strong> arriba a la derecha.</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-5 h-5 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center text-[10px]">2</span>
                      <span>Seleccioná <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-5 h-5 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center text-[10px]">3</span>
                      <span>Confirmá la instalación. Se creará un ícono en tu pantalla de inicio.</span>
                    </li>
                  </ol>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition active:scale-95 shadow-md"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
