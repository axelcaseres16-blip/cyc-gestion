/**
 * Detector de dispositivo y navegador para el Registro de Auditoría
 */
export function getDeviceInfo(): string {
  if (typeof window === 'undefined' || !navigator) {
    return 'Servidor / Desconocido';
  }

  const ua = navigator.userAgent || '';
  let platform = 'PC Escritorio';
  let browser = 'Navegador';

  // Detectar plataforma
  if (/android/i.test(ua)) {
    platform = '📱 Android Móvil';
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    platform = '📱 iOS iPhone/iPad';
  } else if (/macintosh|mac os x/i.test(ua)) {
    platform = '💻 Mac OS';
  } else if (/windows/i.test(ua)) {
    platform = '💻 Windows PC';
  } else if (/linux/i.test(ua)) {
    platform = '💻 Linux PC';
  }

  // Detectar navegador
  if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) {
    browser = 'Chrome';
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Firefox';
  } else if (/edg/i.test(ua)) {
    browser = 'Edge';
  }

  const onlineStatus = navigator.onLine ? 'Online' : 'Offline';
  return `${platform} (${browser}) [${onlineStatus}]`;
}
