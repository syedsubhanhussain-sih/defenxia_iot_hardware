import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.defenxia.security.guard',
  appName: 'Defenxia Frontline Guard',
  webDir: 'dist',
  server: {
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#030712",
      showSpinner: false
    }
  }
};

export default config;