import React, { useEffect, useMemo, useState } from 'react';
import { Movement, CustomerWithBalance } from '../types';
import { formatDate, formatCurrency } from '../utils/formatters';
import { getStoredVirtualBoletas } from '../utils/stockAndBoletasManager';
import { idbGetAllImages } from '../utils/indexedDBEngine';
import { Camera, Search, Eye, Download, Share2 } from 'lucide-react';

interface BoletaGalleryProps {
  movements: Movement[];
  customers: CustomerWithBalance[];
  onViewImage: (imageUrl: string, title: string) => void;
  onSelectCustomer: (customerId: string) => void;
}

interface GalleryBoleta {
  id: string;
  imageUrl: string;
  customerId: string;
  numeroBoleta?: string;
  fecha: string;
  monto: number;
  descripcion: string;
  registradoPor: string;
  isVirtual: boolean;
  isAnulada?: boolean;
}

const saveImage = (imageUrl: string, numeroBoleta?: string) => {
  const download = document.createElement('a');
  download.href = imageUrl;
  download.download = `Boleta-CYC-${numeroBoleta || 'sin-numero'}.png`;
  document.body.appendChild(download);
  download.click();
  download.remove();
};

export const BoletaGallery: React.FC<BoletaGalleryProps> = ({
  movements,
  customers,
  onViewImage,
  onSelectCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [virtualBoletaImages, setVirtualBoletaImages] = useState<GalleryBoleta[]>([]);

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];

    const loadVirtualBoletaImages = async () => {
      const [boletas, images] = await Promise.all([
        Promise.resolve(getStoredVirtualBoletas()),
        idbGetAllImages(),
      ]);
      const imagesById = new Map(images.map((image) => [image.imageId, image]));
      const galleryItems = boletas.flatMap((boleta) => {
        if (!boleta.imageId) return [];
        const image = imagesById.get(boleta.imageId);
        if (!image?.blob) return [];
        const imageUrl = typeof image.blob === 'string' ? image.blob : URL.createObjectURL(image.blob);
        if (imageUrl.startsWith('blob:')) objectUrls.push(imageUrl);
        return [{
          id: boleta.id,
          imageUrl,
          customerId: boleta.customerId,
          numeroBoleta: boleta.numeroBoleta,
          fecha: boleta.fechaHora,
          monto: boleta.total,
          descripcion: `Boleta Virtual ${boleta.isAnulado ? 'anulada' : 'generada'}`,
          registradoPor: boleta.registradoPor,
          isVirtual: true,
          isAnulada: boleta.isAnulado,
        }];
      });
      if (active) setVirtualBoletaImages(galleryItems);
    };

    loadVirtualBoletaImages();
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [movements]);

  const boletaPhotos = useMemo<GalleryBoleta[]>(() => {
    const physicalBoletas = movements
      .filter((movement) => movement.fotoUrl?.trim() && !movement.boletaVirtualId)
      .map((movement) => ({
        id: movement.id,
        imageUrl: movement.fotoUrl!,
        customerId: movement.customerId,
        numeroBoleta: movement.numeroBoleta,
        fecha: movement.fecha,
        monto: movement.monto,
        descripcion: movement.descripcion,
        registradoPor: movement.registradoPor,
        isVirtual: false,
        isAnulada: movement.isAnulado,
      }));
    return [...virtualBoletaImages, ...physicalBoletas].sort(
      (left, right) => new Date(right.fecha).getTime() - new Date(left.fecha).getTime()
    );
  }, [movements, virtualBoletaImages]);

  const filteredPhotos = boletaPhotos.filter((boleta) => {
    const customer = customers.find((current) => current.id === boleta.customerId);
    const term = searchTerm.toLowerCase();
    return (
      (boleta.numeroBoleta && boleta.numeroBoleta.toLowerCase().includes(term)) ||
      (customer && (customer.nombre.toLowerCase().includes(term) || customer.alias.toLowerCase().includes(term))) ||
      boleta.descripcion.toLowerCase().includes(term)
    );
  });

  const handleShare = async (boleta: GalleryBoleta) => {
    try {
      const imageBlob = await (await fetch(boleta.imageUrl)).blob();
      const imageFile = new File([imageBlob], `Boleta-CYC-${boleta.numeroBoleta || boleta.id}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [imageFile] })) {
        await navigator.share({ files: [imageFile], title: `Boleta C&C ${boleta.numeroBoleta || ''}` });
        return;
      }
    } catch (error) {
      console.error('No se pudo compartir la imagen de la boleta:', error);
    }
    saveImage(boleta.imageUrl, boleta.numeroBoleta);
  };

  return (
    <div id="boleta-gallery-container" className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Camera className="w-6 h-6 text-blue-600" />
            <span>Galería de Fotos de Boletas ({boletaPhotos.length})</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Comprobantes físicos y boletas virtuales resguardados localmente
          </p>
        </div>
        <div className="relative sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por N° Boleta o Cliente..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {filteredPhotos.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 space-y-2">
          <Camera className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800">No hay comprobantes para mostrar</h3>
          <p className="text-xs text-slate-500">Los comprobantes generados y las fotos de boletas aparecerán aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((boleta) => {
            const customer = customers.find((current) => current.id === boleta.customerId);
            const title = `Boleta ${boleta.numeroBoleta || ''} - ${customer ? customer.alias || customer.nombre : ''}`;
            return (
              <div key={`${boleta.isVirtual ? 'virtual' : 'fisica'}-${boleta.id}`} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between group">
                <div className="relative aspect-3/4 bg-slate-100 overflow-hidden cursor-pointer" onClick={() => onViewImage(boleta.imageUrl, title)}>
                  <img src={boleta.imageUrl} alt={`Boleta ${boleta.numeroBoleta}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-bold text-xs">
                    <span className="flex items-center space-x-1 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-white/20"><Eye className="w-4 h-4" /><span>Ver comprobante</span></span>
                  </div>
                  <span className="absolute top-2 left-2 bg-slate-900/80 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-md backdrop-blur-xs">{boleta.numeroBoleta || 'S/N'}</span>
                  <span className={`absolute top-2 right-2 text-[9px] font-black px-2 py-0.5 rounded-md ${boleta.isVirtual ? 'bg-blue-600 text-white' : 'bg-amber-400 text-amber-950'}`}>{boleta.isVirtual ? 'BOLETA VIRTUAL' : 'BOLETA FÍSICA'}</span>
                  {boleta.isAnulada && <span className="absolute bottom-2 left-2 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md">ANULADA</span>}
                </div>
                <div className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-extrabold text-xs text-slate-900 hover:text-blue-600 transition cursor-pointer truncate max-w-[150px]" onClick={() => customer && onSelectCustomer(customer.id)}>{customer ? customer.alias || customer.nombre : 'Cliente Desconocido'}</p>
                      <p className="text-[10px] text-slate-500">{formatDate(boleta.fecha, true)} · {boleta.registradoPor}</p>
                    </div>
                    <span className="font-mono font-black text-sm text-red-600">{formatCurrency(boleta.monto)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
                    <button onClick={() => onViewImage(boleta.imageUrl, title)} className="flex items-center justify-center gap-1 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50"><Eye className="w-3 h-3" />Ver</button>
                    <button onClick={() => handleShare(boleta)} className="flex items-center justify-center gap-1 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50"><Share2 className="w-3 h-3" />Compartir</button>
                    <button onClick={() => saveImage(boleta.imageUrl, boleta.numeroBoleta)} className="flex items-center justify-center gap-1 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50"><Download className="w-3 h-3" />Guardar</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
