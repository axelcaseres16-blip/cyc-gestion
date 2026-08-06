import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cycgestion.prueba',
  appName: 'C&C Gestión Prueba',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
