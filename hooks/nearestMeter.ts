export type LatLng = { lat: number; lng: number };

export type Meter = {
  rank: number;
  id: string;
  title: string;
  distance: string;
  color: string;
  account: string;
  address: string;
  dma: string;
  lat: number;
  lng: number;
};

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function distanceInMeters(a: LatLng, b: LatLng): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const c =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) *
    sinDLng * sinDLng;

  const d = 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
  return R * d;
}

export function getNearestMeters(center: LatLng, meters: Meter[], max = 3): Meter[] {
  const withDistance = meters.map(m => ({
    ...m,
    numericDistance: distanceInMeters(center, { lat: m.lat, lng: m.lng }),
  }));

  withDistance.sort((a, b) => a.numericDistance - b.numericDistance);

  return withDistance.slice(0, max).map((m, index) => ({
    ...m,
    rank: index + 1,
    distance: `${m.numericDistance.toFixed(0)}m away`,
  }));
}
