import React, { useState, useEffect } from 'react';
import { WhatsAppTemplates, WhatsAppPostSaleBehavior } from '../types';
import {
  getWhatsAppTemplates,
  saveWhatsAppTemplates,
  getWhatsAppBehavior,
  saveWhatsAppBehavior,
} from '../utils/storage';
import {
  getBoletasGroupPhone,
  saveBoletasGroupPhone,
} from '../utils/userStorage';
import { X, Save, MessageSquare, CheckCircle2, Zap, Users } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplatesUpdated?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onTemplatesUpdated,
}) => {
  const [informarSaldo, setInformarSaldo] = useState('');
  const [solicitarPedido, setSolicitarPedido] = useState('');
  const [waBehavior, setWaBehavior] = useState<WhatsAppPostSaleBehavior>('ALWAYS_AUTO');
  const [boletasGroupPhone, setBoletasGroupPhone] = useState('');
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const templates = getWhatsAppTemplates();
      setInformarSaldo(templates.informarSaldo);
      setSolicitarPedido(templates.solicitarPedido);
      setWaBehavior(getWhatsAppBehavior());
      setBoletasGroupPhone(getBoletasGroupPhone());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveWhatsAppTemplates({
      informarSaldo,
      solicitarPedido,
    });
    saveWhatsAppBehavior(waBehavior);
    saveBoletasGroupPhone(boletasGroupPhone);

    setSavedMsg(true);
    if (onTemplatesUpdated) onTemplatesUpdated();
    setTimeout(() => {
      setSavedMsg(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-lg">Configuración de WhatsApp & Reparto</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto">
          {savedMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Configuración e integración guardada correctamente</span>
            </div>
          )}

          {/* Grupo Oficial de WhatsApp de Boletas */}
          <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-2">
            <div className="flex items-center space-x-2 text-blue-950">
              <Users className="w-4 h-4 text-blue-600" />
              <label className="text-xs font-black uppercase tracking-wider">
                Grupo Oficial de Boletas de WhatsApp
              </label>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              Definí el número o código de grupo al que se enviarán todas las boletas de reparto.
            </p>
            <input
              type="text"
              value={boletasGroupPhone}
              onChange={(e) => setBoletasGroupPhone(e.target.value)}
              placeholder="Ej: 5491155550000 (dejar en blanco para elegir grupo en WhatsApp)"
              className="w-full p-3 bg-white border border-blue-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
            <div className="flex items-center space-x-2 text-emerald-950">
              <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              <label className="text-xs font-black uppercase tracking-wider">
                Comportamiento tras "Finalizar Venta"
              </label>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              Elegí qué debe hacer la aplicación automáticamente al presionar el botón "Finalizar Venta" arriba del camión:
            </p>

            <div className="space-y-1.5 pt-1">
              {[
                {
                  id: 'ALWAYS_AUTO',
                  label: '✓ Enviar siempre automáticamente al grupo de Boletas / WhatsApp',
                  sub: 'Abre el chat de WhatsApp instantáneamente sin toques extra (Recomendado)',
                },
                {
                  id: 'ASK',
                  label: '✓ Preguntar antes de enviar',
                  sub: 'Muestra una ventana modal de confirmación previa',
                },
                {
                  id: 'NONE',
                  label: '✓ No enviar automáticamente',
                  sub: 'Guarda la venta en la app sin abrir WhatsApp',
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`p-3 rounded-xl border flex items-start space-x-2.5 cursor-pointer transition ${
                    waBehavior === opt.id
                      ? 'bg-emerald-600 text-white border-emerald-600 font-extrabold shadow-2xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="waBehavior"
                    value={opt.id}
                    checked={waBehavior === opt.id}
                    onChange={() => setWaBehavior(opt.id as WhatsAppPostSaleBehavior)}
                    className="mt-0.5 accent-emerald-500"
                  />
                  <div>
                    <p className="text-xs font-bold leading-tight">{opt.label}</p>
                    <p className={`text-[10px] mt-0.5 ${waBehavior === opt.id ? 'text-emerald-100' : 'text-slate-500'}`}>
                      {opt.sub}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Plantilla: Mensaje "Informar Saldo"</span>
              <span className="text-[10px] text-slate-400">Usar $MONTO o $XXX como variable</span>
            </label>
            <textarea
              value={informarSaldo}
              onChange={(e) => setInformarSaldo(e.target.value)}
              rows={2}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Plantilla: Mensaje "Solicitar Pedido"</span>
              <span className="text-[10px] text-slate-400">Mensaje automático de preventa</span>
            </label>
            <textarea
              value={solicitarPedido}
              onChange={(e) => setSolicitarPedido(e.target.value)}
              rows={2}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
