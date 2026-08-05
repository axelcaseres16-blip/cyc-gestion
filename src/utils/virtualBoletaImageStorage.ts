import { Movement, VirtualBoleta } from '../types';
import { getStoredMovements, saveMovements } from './storage';
import { getStoredVirtualBoletas, saveVirtualBoletas } from './stockAndBoletasManager';
import { idbGetImageBlob, idbSaveEntity, idbSaveImageBlob } from './indexedDBEngine';

export const getVirtualBoletaImageId = (boletaId: string) => `virtual_boleta_${boletaId}`;

const toBlob = async (imageDataUrl: string) => (await fetch(imageDataUrl)).blob();

export async function getPersistedVirtualBoletaImageUrl(imageId?: string): Promise<string | null> {
  if (!imageId) return null;
  const entry = await idbGetImageBlob(imageId);
  if (!entry?.blob) return null;
  return typeof entry.blob === 'string' ? entry.blob : URL.createObjectURL(entry.blob);
}

export async function persistVirtualBoletaImage(
  boleta: VirtualBoleta,
  imageDataUrl: string,
  movementIdPrincipal?: string
): Promise<VirtualBoleta> {
  const imageId = getVirtualBoletaImageId(boleta.id);
  const fileName = `Boleta-CYC-${boleta.numeroBoleta}.png`;
  const blob = await toBlob(imageDataUrl);
  const now = new Date().toISOString();
  const storedMovements = getStoredMovements();
  const relatedMovement = storedMovements.find(
    (movement) =>
      movement.boletaVirtualId === boleta.id ||
      (movement.tipo === 'BOLETA' &&
        movement.customerId === boleta.customerId &&
        movement.numeroBoleta === boleta.numeroBoleta)
  );
  const movementId = movementIdPrincipal || boleta.movementIdPrincipal || relatedMovement?.id;

  await idbSaveImageBlob({
    imageId,
    entityId: boleta.id,
    entityType: 'VIRTUAL_BOLETA',
    blob,
    fileName,
    pathName: `virtual-boletas/${boleta.customerId}/${imageId}.png`,
    status: 'GUARDADA',
    createdAt: now,
    createdBy: boleta.registradoPor,
    retryCount: 0,
    boletaVirtualId: boleta.id,
    numeroBoleta: boleta.numeroBoleta,
    customerId: boleta.customerId,
    branchId: boleta.branchId,
    movementIdPrincipal: movementId,
    mimeType: 'image/png',
    source: 'VIRTUAL_BOLETA',
    isAnulada: boleta.isAnulado,
  });

  const persistedBoleta: VirtualBoleta = {
    ...boleta,
    // La imagen se conserva exclusivamente en IndexedDB. La referencia estable
    // permite recuperarla tras reiniciar la aplicación sin duplicar el PNG en localStorage.
    comprobanteImagenUrl: undefined,
    imageId,
    imageFileName: fileName,
    imageMimeType: 'image/png',
    hasGeneratedImage: true,
    movementIdPrincipal: movementId,
  };
  Object.assign(boleta, persistedBoleta);

  const boletas = getStoredVirtualBoletas();
  const index = boletas.findIndex((current) => current.id === boleta.id);
  if (index >= 0) {
    boletas[index] = persistedBoleta;
  } else {
    boletas.unshift(persistedBoleta);
  }
  saveVirtualBoletas(boletas);
  await idbSaveEntity('boletas', persistedBoleta);

  if (movementId) {
    const movementIndex = storedMovements.findIndex((movement) => movement.id === movementId);
    if (movementIndex >= 0) {
      const updatedMovement: Movement = {
        ...storedMovements[movementIndex],
        boletaVirtualId: boleta.id,
        imageId,
        hasAttachment: true,
        attachmentType: 'GENERATED_VIRTUAL_BOLETA',
      };
      storedMovements[movementIndex] = updatedMovement;
      saveMovements(storedMovements);
      await idbSaveEntity('movements', updatedMovement);
    }
  }

  return persistedBoleta;
}
