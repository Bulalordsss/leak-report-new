import * as Location from 'expo-location';
import { InteractionManager } from 'react-native';

export type LatLng = { lat: number; lng: number };

export async function getCurrentLocation(): Promise<LatLng | null> {
  try {
    // Defer to allow UI to render first
    await new Promise(resolve => {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(resolve, 50);
      });
    });

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
