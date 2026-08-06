import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';

const TEST_NOTICE_KEY = 'cyc_test_version_notice_acknowledged_v1';

export const TestVersionNotice: React.FC = () => {
  const [isOpen, setIsOpen] = useState(() => localStorage.getItem(TEST_NOTICE_KEY) !== 'true');

  if (!isOpen) return null;

  const acknowledge = () => {
    localStorage.setItem(TEST_NOTICE_KEY, 'true');
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-amber-500 text-slate-950 px-5 py-4 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          <h2 className="font-black">VERSIÓN DE PRUEBA</h2>
        </div>
        <div className="p-5 space-y-4 text-sm text-slate-700">
          <p className="font-semibold leading-relaxed">
            Esta versión guarda los datos únicamente en este dispositivo. No borres los datos del navegador ni desinstales la aplicación durante la prueba.
          </p>
          <button onClick={acknowledge} className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold transition">
            Entendido, comenzar prueba
          </button>
        </div>
      </div>
    </div>
  );
};
