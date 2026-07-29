import React, { useState } from 'react';
import { Movement, CustomerWithBalance } from '../types';
import { formatDate, formatCurrency } from '../utils/formatters';
import { Camera, Search, Eye, FileText, Calendar, Filter } from 'lucide-react';

interface BoletaGalleryProps {
  movements: Movement[];
  customers: CustomerWithBalance[];
  onViewImage: (imageUrl: string, title: string) => void;
  onSelectCustomer: (customerId: string) => void;
}

export const BoletaGallery: React.FC<BoletaGalleryProps> = ({
  movements,
  customers,
  onViewImage,
  onSelectCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar únicamente movimientos con foto de boleta
  const boletaPhotos = movements.filter((m) => m.fotoUrl && m.fotoUrl.trim() !== '');

  const filteredPhotos = boletaPhotos.filter((m) => {
    const cust = customers.find((c) => c.id === m.customerId);
    const term = searchTerm.toLowerCase();

    const matchesSearch =
      (m.numeroBoleta && m.numeroBoleta.toLowerCase().includes(term)) ||
      (cust && (cust.nombre.toLowerCase().includes(term) || cust.alias.toLowerCase().includes(term))) ||
      (m.descripcion && m.descripcion.toLowerCase().includes(term));

    return matchesSearch;
  });

  return (
    <div id="boleta-gallery-container" className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Camera className="w-6 h-6 text-blue-600" />
            <span>Galería de Fotos de Boletas ({boletaPhotos.length})</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Resguardo fotográfico de comprobantes manuscritos entregados en ruta
          </p>
        </div>

        {/* Búsqueda */}
        <div className="relative sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por N° Boleta o Cliente..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Grid de Imágenes */}
      {filteredPhotos.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 space-y-2">
          <Camera className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800">No hay fotos de boletas para mostrar</h3>
          <p className="text-xs text-slate-500">Registrá una boleta con foto desde la acción rápida o ficha de cliente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((mov) => {
            const cust = customers.find((c) => c.id === mov.customerId);

            return (
              <div
                key={mov.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between group"
              >
                {/* Imagen Preview */}
                <div
                  className="relative aspect-3/4 bg-slate-100 overflow-hidden cursor-pointer"
                  onClick={() =>
                    onViewImage(
                      mov.fotoUrl!,
                      `Boleta ${mov.numeroBoleta || ''} - ${cust ? cust.alias || cust.nombre : ''}`
                    )
                  }
                >
                  <img
                    src={mov.fotoUrl}
                    alt={`Boleta ${mov.numeroBoleta}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-bold text-xs">
                    <div className="flex items-center space-x-1 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-white/20">
                      <Eye className="w-4 h-4" />
                      <span>Ver Completa</span>
                    </div>
                  </div>

                  <span className="absolute top-2 left-2 bg-slate-900/80 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-md backdrop-blur-xs">
                    {mov.numeroBoleta || 'S/N'}
                  </span>
                </div>

                {/* Info Pie */}
                <div className="p-3.5 space-y-1.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p
                        className="font-extrabold text-xs text-slate-900 hover:text-blue-600 transition cursor-pointer truncate max-w-[160px]"
                        onClick={() => cust && onSelectCustomer(cust.id)}
                      >
                        {cust ? cust.alias || cust.nombre : 'Cliente Desconocido'}
                      </p>
                      <p className="text-[10px] text-slate-500">{formatDate(mov.fecha, true)}</p>
                    </div>

                    <span className="font-mono font-black text-sm text-red-600">
                      {formatCurrency(mov.monto)}
                    </span>
                  </div>

                  {mov.descripcion && (
                    <p className="text-[11px] text-slate-600 line-clamp-1 italic">{mov.descripcion}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
