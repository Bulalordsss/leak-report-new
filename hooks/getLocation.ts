import * as Location from 'expo-location';

export type LatLng = { lat: number; lng: number };

export async function getCurrentLocation(): Promise<LatLng | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const pos = await Location.getCurrentPositionAsync({});
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch (error) {
    console.warn('Location error', error);
    return null;
  }
}
