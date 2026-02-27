import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nutriqualia.app',
  appName: 'NutriQuali IA',
  webDir: 'dist',
  // bundledWebRuntime: false (padrão). Para dev com live reload use server.url no ambiente.
};

export default config;
