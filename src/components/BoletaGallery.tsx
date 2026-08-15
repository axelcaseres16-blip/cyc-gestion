import React, { useEffect, useMemo, useState } from 'react';
import { Movement, CustomerWithBalance } from '../types';
import { formatDate, formatCurrency } from '../utils/formatters';
import {
  getPersistedVirtualBoletaImageUrl,
  recoverVirtualBoletaImageById,
} from '../utils/virtualBoletaImageStorage';
import { saveInvoiceImage, shareInvoiceImage } from '../utils/imageShare';
import { Camera, Search, Eye, Download, Share2 } from 'lucide-react';

interface BoletaGalleryProps {
  movements: Movement[];
  customers: CustomerWithBalance[];
  onViewImage: (imageUrl: string, title: string) => void;
  onSelectCustomer: (customerId: string) => void;
  onRefreshData: () => void;
}

interface GalleryBoleta {
  id: string;
  imageUrl?: string;
  customerId: string;
  numeroBoleta?: string;
  fecha: string;
  monto: number;
  descripcion: string;
  registradoPor: string;
  isVirtual: boolean;
  boletaVirtualId?: string;
  needsImageRecovery: boolean;
  isAnulada?: boolean;
}

const saveImage = async (imageUrl: string, numeroBoleta?: string) => {
  try {
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const imageFile = new File(
      [imageBlob],
      `Boleta-CYC-${numeroBoleta || 'sin-numero'}.png`,
      { type: 'image/png' }
    );
    if (await saveInvoiceImage(imageFile)) return;
  } catch (error) {
    console.error('No se pudo preparar la imagen para guardar:', error);
  }
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
  onRefreshData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'TODAS' | 'VIRTUAL' | 'FISICA'>('TODAS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'GENERADA' | 'PENDIENTE' | 'ANULADA'>('TODOS');
  const [persistedImageUrls, setPersistedImageUrls] = useState<Record<string, string>>({});
  const [recoveringBoletaId, setRecoveringBoletaId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];

    const loadPersistedImages = async () => {
      const imageMovements = movements.filter((movement) => movement.imageId);
      const resolvedImages = await Promise.all(
        imageMovements.map(async (movement) => ({
          imageId: movement.imageId!,
          imageUrl: await getPersistedVirtualBoletaImageUrl(movement.imageId),
        }))
      );
      const nextImageUrls: Record<string, string> = {};
      resolvedImages.forEach(({ imageId, imageUrl }) => {
        if (!imageUrl) return;
        nextImageUrls[imageId] = imageUrl;
        if (imageUrl.startsWith('blob:')) objectUrls.push(imageUrl);
      });
      if (active) setPersistedImageUrls(nextImageUrls);
    };

    loadPersistedImages();
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [movements]);

  const boletaPhotos = useMemo<GalleryBoleta[]>(() => {
    return movements
      .filter((movement) => movement.tipo === 'BOLETA')
      .flatMap((movement) => {
        const imageUrl = movement.imageId
          ? persistedImageUrls[movement.imageId]
          : movement.fotoUrl;
        const isVirtual = Boolean(movement.boletaVirtualId);
        if (!imageUrl && !isVirtual) return [];
        return [{
          id: movement.id,
          imageUrl,
          customerId: movement.customerId,
          numeroBoleta: movement.numeroBoleta,
          fecha: movement.fecha,
          monto: movement.monto,
          descripcion: movement.descripcion,
          registradoPor: movement.registradoPor,
          isVirtual,
          boletaVirtualId: movement.boletaVirtualId,
          needsImageRecovery: isVirtual && !imageUrl,
          isAnulada: movement.isAnulado,
        }];
      })
      .sort(
        (left, right) => new Date(right.fecha).getTime() - new Date(left.fecha).getTime()
      );
  }, [movements, persistedImageUrls]);

  const filteredPhotos = boletaPhotos.filter((boleta) => {
    const customer = customers.find((current) => current.id === boleta.customerId);
    const term = searchTerm.toLowerCase();
    const matchesText = (
      (boleta.numeroBoleta && boleta.numeroBoleta.toLowerCase().includes(term)) ||
      (customer && (customer.nombre.toLowerCase().includes(term) || customer.alias.toLowerCase().includes(term))) ||
      boleta.descripcion.toLowerCase().includes(term)
    );
    const matchesType = typeFilter === 'TODAS' || (typeFilter === 'VIRTUAL' ? boleta.isVirtual : !boleta.isVirtual);
    const currentStatus = boleta.isAnulada ? 'ANULADA' : boleta.needsImageRecovery ? 'PENDIENTE' : 'GENERADA';
    return matchesText && matchesType && (statusFilter === 'TODOS' || statusFilter === currentStatus);
  });

  const handleShare = async (boleta: GalleryBoleta) => {
    if (!boleta.imageUrl) return;
    try {
      const imageBlob = await (await fetch(boleta.imageUrl)).blob();
      const imageFile = new File([imageBlob], `Boleta-CYC-${boleta.numeroBoleta || boleta.id}.png`, { type: 'image/png' });
      if (await shareInvoiceImage({
        file: imageFile,
        title: `Boleta C&C ${boleta.numeroBoleta || ''}`,
      })) {
        return;
      }
    } catch (error) {
      console.error('No se pudo compartir la imagen de la boleta:', error);
    }
    await saveImage(boleta.imageUrl, boleta.numeroBoleta);
  };

  const handleRecoverImage = async (boleta: GalleryBoleta) => {
    if (!boleta.boletaVirtualId) return;
    setRecoveringBoletaId(boleta.boletaVirtualId);
    try {
      const result = await recoverVirtualBoletaImageById(boleta.boletaVirtualId);
      if (!result || result.status === 'ERROR') {
        alert(result?.error || 'No se encontró la boleta virtual para recuperar el comprobante.');
        return;
      }
      if (result.imageUrl) {
        setPersistedImageUrls((current) => ({ ...current, [result.boleta.imageId!]: result.imageUrl! }));
      }
      onRefreshData();
    } finally {
      setRecoveringBoletaId(null);
    }
  };

  return (
    <div id="boleta-gallery-container" className="cc-page space-y-4">
      <div className="cc-page-header mb-0">
        <div>
          <h1 className="cc-page-title flex items-center space-x-2">
            <Camera className="h-5 w-5 text-blue-600" />
            <span>Galería de Fotos de Boletas ({boletaPhotos.length})</span>
          </h1>
          <p className="cc-page-subtitle">
            Comprobantes físicos y boletas virtuales resguardados localmente
          </p>
        </div>
        <div className="relative w-44 sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por N° Boleta o Cliente..."
            className="cc-input min-h-11 pl-9 text-xs"
            inputMode="search"
          />
        </div>
      </div>

      <div className="cc-card grid gap-2 p-3 sm:grid-cols-2">
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} className="cc-input min-h-11 text-xs">
          <option value="TODAS">Todos los tipos</option><option value="VIRTUAL">Virtuales</option><option value="FISICA">Físicas</option>
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="cc-input min-h-11 text-xs">
          <option value="TODOS">Todos los estados</option><option value="GENERADA">Generadas</option><option value="PENDIENTE">Pendientes</option><option value="ANULADA">Anuladas</option>
        </select>
      </div>

      {filteredPhotos.length === 0 ? (
        <div className="cc-card p-12 text-center text-slate-500 space-y-2">
          <Camera className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800">No hay comprobantes para mostrar</h3>
          <p className="text-xs text-slate-500">Los comprobantes generados y las fotos de boletas aparecerán aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPhotos.map((boleta) => {
            const customer = customers.find((current) => current.id === boleta.customerId);
            const title = `Boleta ${boleta.numeroBoleta || ''} - ${customer ? customer.alias || customer.nombre : ''}`;
            return (
              <div key={`${boleta.isVirtual ? 'virtual' : 'fisica'}-${boleta.id}`} className="cc-card-compact overflow-hidden transition hover:shadow-md flex flex-col justify-between group">
                <div className={`relative aspect-3/4 bg-slate-100 overflow-hidden ${boleta.imageUrl ? 'cursor-pointer' : ''}`} onClick={() => boleta.imageUrl && onViewImage(boleta.imageUrl, title)}>
                  {boleta.imageUrl ? <>
                    <img src={boleta.imageUrl} alt={`Boleta ${boleta.numeroBoleta}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-bold text-xs">
                      <span className="flex items-center space-x-1 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-white/20"><Eye className="w-4 h-4" /><span>Ver comprobante</span></span>
                    </div>
                  </> : <div className="h-full flex flex-col items-center justify-center gap-3 p-5 text-center text-slate-600"><Camera className="w-10 h-10 text-amber-500" /><p className="text-xs font-black">Comprobante pendiente de generar</p><button onClick={(event) => { event.stopPropagation(); void handleRecoverImage(boleta); }} disabled={recoveringBoletaId === boleta.boletaVirtualId} className="rounded-lg bg-amber-500 px-3 py-2 text-[10px] font-black text-white disabled:opacity-60">{recoveringBoletaId === boleta.boletaVirtualId ? 'Generando…' : 'Generar y guardar comprobante'}</button></div>}
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
                  {boleta.imageUrl ? <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
                    <button onClick={() => onViewImage(boleta.imageUrl, title)} className="flex items-center justify-center gap-1 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50"><Eye className="w-3 h-3" />Ver</button>
                    <button onClick={() => handleShare(boleta)} className="flex items-center justify-center gap-1 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50"><Share2 className="w-3 h-3" />Compartir</button>
                    <button onClick={() => { void saveImage(boleta.imageUrl, boleta.numeroBoleta); }} className="flex items-center justify-center gap-1 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50"><Download className="w-3 h-3" />Guardar</button>
                  </div> : <p className="text-[10px] font-bold text-amber-700">La venta está registrada; falta sólo el PNG.</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
