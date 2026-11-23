import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.statxam.app',
  appName: 'StatXam',
  webDir: 'out',
  backgroundColor: '#faf5ee',
  // Leaving server undefined bundles the UI inside the APK so it works 100% as a standalone native app
  server: process.env.CAPACITOR_SERVER_URL
    ? {
        url: process.env.CAPACITOR_SERVER_URL,
        cleartext: true,
      }
    : undefined,
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#faf5ee',
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      style: KeyboardStyle.Light,
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#faf5ee',
      androidSplashResourceName: 'splash',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
