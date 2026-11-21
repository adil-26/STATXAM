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
      style: 'LIGHT',
      backgroundColor: '#faf5ee',
    },
    Keyboard: {
      resize: 'body',
      style: 'LIGHT',
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#faf5ee',
      androidSplashResourceName: 'splash',
    },
  },
};

export default config;
