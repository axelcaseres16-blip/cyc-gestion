import { Movement, VirtualBoleta } from '../types';
import { getStoredMovements, saveMovements } from './storage';
import { getStoredVirtualBoletas, saveVirtualBoletas } from './stockAndBoletasManager';
import { generateBoletaImage } from './boletaImageGenerator';
import { idbGetImageBlob, idbSaveEntityStrict, idbSaveImageBlobStrict } from './indexedDBEngine';

export const getVirtualBoletaImageId = (boletaId: string) => `virtual_boleta_${boletaId}`;

const toBlob = async (imageDataUrl: string) => (await fetch(imageDataUrl)).blob();

export type VirtualBoletaImageRecoveryStatus = 'READY' | 'REPAIRED_REFERENCE' | 'GENERATED' | 'ERROR';

export interface VirtualBoletaImageRecoveryResult {
  status: VirtualBoletaImageRecoveryStatus;
  boleta: VirtualBoleta;
  imageUrl?: string;
  error?: string;
}

const getPrincipalMovement = (
  movements: Movement[],
  boleta: VirtualBoleta,
  movementIdPrincipal?: string
) => {
  const explicitMovement = movementIdPrincipal
    ? movements.find((movement) => movement.id === movementIdPrincipal && movement.tipo === 'BOLETA')
    : undefined;
  if (explicitMovement) return explicitMovement;

  return movements.find(
    (movement) =>
      movement.tipo === 'BOLETA' &&
      (movement.boletaVirtualId === boleta.id ||
        (movement.customerId === boleta.customerId && movement.numeroBoleta === boleta.numeroBoleta))
  );
};

const getImageMetadata = (boleta: VirtualBoleta, movementIdPrincipal?: string) => {
  const principalMovement = getPrincipalMovement(
    getStoredMovements(),
    boleta,
    movementIdPrincipal || boleta.movementIdPrincipal
  );
  const imageId = boleta.imageId || principalMovement?.imageId || getVirtualBoletaImageId(boleta.id);
  return {
    imageId,
    imageFileName: boleta.imageFileName || `Boleta-CYC-${boleta.numeroBoleta}.png`,
    imageMimeType: 'image/png' as const,
  };
};

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
  if (!imageDataUrl?.startsWith('data:image/')) {
    throw new Error('No se pudo generar el PNG del comprobante.');
  }

  const { imageId, imageFileName: fileName, imageMimeType } = getImageMetadata(boleta, movementIdPrincipal);
  const blob = await toBlob(imageDataUrl);
  const now = new Date().toISOString();
  const storedMovements = getStoredMovements();
  const relatedMovement = getPrincipalMovement(
    storedMovements,
    boleta,
    movementIdPrincipal || boleta.movementIdPrincipal
  );
  const movementId = relatedMovement?.id;

  await idbSaveImageBlobStrict({
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
    imageMimeType,
    hasGeneratedImage: true,
    imageStatus: 'GUARDADA',
    imageLastError: undefined,
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
  await idbSaveEntityStrict('boletas', persistedBoleta);

  if (relatedMovement) {
    const movementIndex = storedMovements.findIndex((movement) => movement.id === relatedMovement.id);
    if (movementIndex >= 0 && storedMovements[movementIndex].tipo === 'BOLETA') {
      const updatedMovement: Movement = {
        ...storedMovements[movementIndex],
        boletaVirtualId: boleta.id,
        imageId,
        hasAttachment: true,
        attachmentType: 'GENERATED_VIRTUAL_BOLETA',
      };
      storedMovements[movementIndex] = updatedMovement;
      saveMovements(storedMovements);
      await idbSaveEntityStrict('movements', updatedMovement);
    }
  }

  return persistedBoleta;
}

/**
 * Deja una venta existente en estado recuperable. No crea ni modifica movimientos
 * contables, pagos o stock: sólo normaliza las referencias del comprobante.
 */
export async function markVirtualBoletaImagePending(
  boleta: VirtualBoleta,
  movementIdPrincipal?: string,
  error?: string
): Promise<VirtualBoleta> {
  const storedMovements = getStoredMovements();
  const principalMovement = getPrincipalMovement(
    storedMovements,
    boleta,
    movementIdPrincipal || boleta.movementIdPrincipal
  );
  const metadata = getImageMetadata(boleta, movementIdPrincipal);
  const pendingBoleta: VirtualBoleta = {
    ...boleta,
    ...metadata,
    hasGeneratedImage: false,
    imageStatus: 'IMAGE_PENDING',
    imageLastError: error,
    movementIdPrincipal: principalMovement?.id || boleta.movementIdPrincipal,
  };
  Object.assign(boleta, pendingBoleta);

  const boletas = getStoredVirtualBoletas();
  const boletaIndex = boletas.findIndex((current) => current.id === boleta.id);
  if (boletaIndex >= 0) boletas[boletaIndex] = pendingBoleta;
  else boletas.unshift(pendingBoleta);
  saveVirtualBoletas(boletas);
  await idbSaveEntityStrict('boletas', pendingBoleta);

  if (principalMovement) {
    const movementIndex = storedMovements.findIndex((movement) => movement.id === principalMovement.id);
    const pendingMovement: Movement = {
      ...storedMovements[movementIndex],
      boletaVirtualId: boleta.id,
      imageId: metadata.imageId,
      hasAttachment: false,
    };
    storedMovements[movementIndex] = pendingMovement;
    saveMovements(storedMovements);
    await idbSaveEntityStrict('movements', pendingMovement);
  }

  return pendingBoleta;
}

/** Repara una referencia existente o reconstruye el PNG histórico sin tocar la contabilidad. */
export async function recoverVirtualBoletaImage(
  boleta: VirtualBoleta
): Promise<VirtualBoletaImageRecoveryResult> {
  const { imageId } = getImageMetadata(boleta);
  const storedImage = await getPersistedVirtualBoletaImageUrl(imageId);

  try {
    if (storedImage) {
      const repaired = await persistVirtualBoletaImage(boleta, storedImage, boleta.movementIdPrincipal);
      return { status: 'REPAIRED_REFERENCE', boleta: repaired, imageUrl: storedImage };
    }

    const generatedImage = await generateBoletaImage(boleta);
    const persisted = await persistVirtualBoletaImage(boleta, generatedImage, boleta.movementIdPrincipal);
    return { status: 'GENERATED', boleta: persisted, imageUrl: generatedImage };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo recuperar el comprobante.';
    const pending = await markVirtualBoletaImagePending(boleta, boleta.movementIdPrincipal, message);
    return { status: 'ERROR', boleta: pending, error: message };
  }
}

export async function recoverVirtualBoletaImageById(
  boletaId: string
): Promise<VirtualBoletaImageRecoveryResult | null> {
  const boleta = getStoredVirtualBoletas().find((current) => current.id === boletaId);
  return boleta ? recoverVirtualBoletaImage(boleta) : null;
}

/** Recupera al iniciar sólo comprobantes marcados pendientes por una venta interrumpida. */
export async function recoverPendingVirtualBoletaImages(): Promise<{
  recoveredCount: number;
  errors: string[];
}> {
  const pendingBoletas = getStoredVirtualBoletas().filter(
    (boleta) => boleta.imageStatus === 'IMAGE_PENDING'
  );
  const results = await Promise.all(pendingBoletas.map((boleta) => recoverVirtualBoletaImage(boleta)));
  return {
    recoveredCount: results.filter((result) => result.status !== 'ERROR').length,
    errors: results.filter((result) => result.status === 'ERROR').map((result) => result.error || 'Error desconocido'),
  };
}
