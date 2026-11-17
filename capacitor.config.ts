import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.statxam.app',
  appName: 'StatXam',
  webDir: 'out',
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#10131a',
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false,
      backgroundColor: '#10131a',
      androidSplashResourceName: 'splash',
    },
  },
};

export default config;
