import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const getBase64Payload = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result || '');
    const payload = result.split(',')[1];
    if (!payload) {
      reject(new Error('No se pudo preparar la imagen para compartir'));
      return;
    }
    resolve(payload);
  };
  reader.onerror = () => reject(reader.error || new Error('No se pudo leer la imagen'));
  reader.readAsDataURL(file);
});

interface ShareImageOptions {
  file: File;
  title: string;
  text?: string;
}

/**
 * Shares an invoice image through Android's native sheet when running inside
 * Capacitor, while preserving the Web Share API flow in the browser/PWA.
 */
export async function shareInvoiceImage({ file, title, text }: ShareImageOptions): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const base64 = await getBase64Payload(file);
      const { uri } = await Filesystem.writeFile({
        path: file.name,
        data: base64,
        directory: Directory.Cache,
      });
      const { value: canShare } = await Share.canShare();
      if (!canShare) return false;
      await Share.share({
        title,
        text,
        files: [uri],
        dialogTitle: 'Compartir boleta',
      });
      return true;
    } catch (error) {
      console.error('No se pudo compartir la imagen mediante Android:', error);
      return false;
    }
  }

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title, text });
    return true;
  }

  return false;
}

/** Saves a PNG to Android's Documents directory, with the browser download kept as a fallback. */
export async function saveInvoiceImage(file: File): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const permissions = await Filesystem.checkPermissions();
    const granted = permissions.publicStorage === 'granted'
      ? permissions
      : await Filesystem.requestPermissions();
    if (granted.publicStorage !== 'granted') return false;

    await Filesystem.writeFile({
      path: `C&C Gestion Prueba/${file.name}`,
      data: await getBase64Payload(file),
      directory: Directory.Documents,
      recursive: true,
    });
    return true;
  } catch (error) {
    console.error('No se pudo guardar la imagen mediante Android:', error);
    return false;
  }
}
