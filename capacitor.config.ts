import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.statxam.app',
  appName: 'StatXam',
  webDir: 'out',
  server: {
    // Connect to production Vercel deployment so the mobile app always receives live AI & UI updates
    url: process.env.CAPACITOR_SERVER_URL || 'https://statxam.vercel.app',
    cleartext: true,
  },
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
