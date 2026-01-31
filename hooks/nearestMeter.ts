import { Customer } from '@/utils/allCustomerData';

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

const RANK_COLORS = ['#10b981', '#f59e0b', '#ef4444']; // green, yellow, red

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
    color: RANK_COLORS[index] || '#6b7280',
  }));
}

/**
 * Find the nearest meters from customer data based on user's location
 */
export function getNearestMetersFromCustomers(
  center: LatLng,
  customers: Customer[],
  max = 3
): Meter[] {
  // Filter out customers with invalid coordinates
  const validCustomers = customers.filter(
    c => c.latitude !== 0 && c.longitude !== 0 && c.meterNumber
  );

  // Deduplicate by meter number (keep the first occurrence)
  const uniqueCustomers = validCustomers.filter(
    (c, index, self) => index === self.findIndex(t => t.meterNumber === c.meterNumber)
  );

  // Calculate distance for each customer
  const withDistance = uniqueCustomers.map(c => ({
    customer: c,
    numericDistance: distanceInMeters(center, { lat: c.latitude, lng: c.longitude }),
  }));

  // Sort by distance
  withDistance.sort((a, b) => a.numericDistance - b.numericDistance);

  // Take top N and convert to Meter format
  return withDistance.slice(0, max).map((item, index) => ({
    rank: index + 1,
    id: item.customer.meterNumber,
    title: item.customer.address,
    distance: `${item.numericDistance.toFixed(0)}m away`,
    color: RANK_COLORS[index] || '#6b7280',
    account: item.customer.accountNumber,
    address: item.customer.address,
    dma: item.customer.dma,
    lat: item.customer.latitude,
    lng: item.customer.longitude,
  }));
}
