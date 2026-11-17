import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { Network, ConnectionStatus } from '@capacitor/network';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Device, DeviceInfo } from '@capacitor/device';

export const isNative = () => Capacitor.isNativePlatform();

/**
 * Configure native status bar to match Sahara warm theme (#faf5ee)
 */
export async function configureStatusBar() {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#faf5ee' });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (err) {
    console.warn('[NativeStatusBar] Failed to configure:', err);
  }
}

/**
 * Hide native splash screen once initial auth/UI resolves
 */
export async function hideAppSplash() {
  if (!isNative()) return;
  try {
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (err) {
    console.warn('[NativeSplash] Failed to hide:', err);
  }
}

/**
 * Capture photo via Camera or select from Gallery
 */
export async function captureQuestionImage(source: 'camera' | 'gallery' = 'camera'): Promise<string | null> {
  try {
    if (isNative()) {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        quality: 90,
        allowEditing: false,
      });
      return photo.dataUrl || null;
    } else {
      // Web fallback: return simulated camera textbook capture
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuB8WyVlLqaRcQUCKVI78hoHIKJn263wGU93wGekWxqxio7BwWHTZOKqEmdUat70jN979QbsJekamSopgMvCFHssCZadf1RcDcvFmlwV7lTG5Bk07pe-qKzRpv0yFaJNIgCXWbliAlenLwpy85r5EFVitXCB5P8BHAuCD8IiZY-5-6Tbl6q1DLh-QSiR__r5LRn_xs6S1I24ot8O-vp3PicNOTCswvFQpufI2nPivO63';
    }
  } catch (err) {
    console.warn('[NativeCamera] Capture cancelled or failed:', err);
    return null;
  }
}

export const captureQuestionPhoto = captureQuestionImage;

/**
 * Haptic feedback triggers
 */
export async function triggerHaptic(style: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') {
  try {
    if (isNative()) {
      if (style === 'success') {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (style === 'error') {
        await Haptics.notification({ type: NotificationType.Error });
      } else {
        const impact = style === 'heavy' ? ImpactStyle.Heavy : style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light;
        await Haptics.impact({ style: impact });
      }
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(style === 'success' ? [30, 40, 30] : style === 'error' ? [50, 50, 50] : 15);
    }
  } catch {
    // Graceful no-op
  }
}

/**
 * Share scorecard or question link
 */
export async function shareScorecard(title: string, text: string, url: string): Promise<boolean> {
  try {
    if (isNative()) {
      await Share.share({ title, text, url, dialogTitle: 'Share StatXam Scorecard' });
      return true;
    } else if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title, text, url });
      return true;
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(`${title} - ${text} (${url})`);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[NativeShare] Share dismissed or unsupported:', err);
    return false;
  }
}

/**
 * Network monitor
 */
export async function checkNetworkStatus(): Promise<ConnectionStatus> {
  try {
    if (isNative()) {
      return await Network.getStatus();
    }
    return {
      connected: typeof navigator !== 'undefined' ? navigator.onLine : true,
      connectionType: 'wifi',
    };
  } catch {
    return { connected: true, connectionType: 'unknown' };
  }
}

/**
 * Get device platform information
 */
export async function getDeviceInfo(): Promise<DeviceInfo | { platform: string; model: string; operatingSystem: string }> {
  try {
    if (isNative()) {
      return await Device.getInfo();
    }
    return {
      platform: 'web',
      model: typeof navigator !== 'undefined' ? navigator.userAgent : 'Browser',
      operatingSystem: 'windows',
    };
  } catch {
    return { platform: 'unknown', model: 'unknown', operatingSystem: 'unknown' };
  }
}