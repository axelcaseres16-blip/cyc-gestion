import React from 'react';
import { X, Download } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  imageUrl: string;
  title: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  imageUrl,
  title,
  onClose,
}) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
        {/* Top bar */}
        <div className="w-full flex items-center justify-between p-3 bg-slate-900/90 text-white rounded-t-2xl border border-slate-800">
          <span className="font-bold text-sm truncate">{title}</span>
          <div className="flex items-center space-x-2">
            <a
              href={imageUrl}
              download="boleta_foto.png"
              className="p-1.5 text-slate-300 hover:text-white transition"
              title="Descargar Foto"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div className="w-full bg-black flex items-center justify-center overflow-auto p-2 rounded-b-2xl border-x border-b border-slate-800 max-h-[80vh]">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[75vh] w-auto object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
