import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  /** ISO 8601 UTC timestamp at the exact moment of capture. */
  capturedAt: string;
}

/** Request Android location permissions. Returns true if granted. */
async function requestPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true; // iOS handled via Info.plist
  }
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
    return (
      granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED ||
      granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED
    );
  } catch {
    return false;
  }
}

/**
 * Get the current GPS coordinates + a timestamp captured at this exact moment.
 * Throws if permission is denied or location unavailable.
 */
export async function getCurrentLocation(): Promise<GeoLocation> {
  const hasPermission = await requestPermission();
  if (!hasPermission) {
    throw new Error('Location permission denied. Please enable location permission in app settings.');
  }

  return new Promise<GeoLocation>((resolve, reject) => {
    // Attempt 1: High accuracy GPS
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          capturedAt: new Date().toISOString(),
        });
      },
      (_err) => {
        // Attempt 2: Fallback to cell/Wi-Fi network provider (helpful for indoor testing on physical phones)
        Geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              capturedAt: new Date().toISOString(),
            });
          },
          (networkErr) => {
            reject(new Error(`Unable to get location (${networkErr.message}). Please ensure Location/GPS is turned ON.`));
          },
          {
            enableHighAccuracy: false,
            timeout: 10_000,
            maximumAge: 60_000,
          },
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 8_000,
        maximumAge: 10_000,
        forceRequestLocation: true,
      },
    );
  });
}
