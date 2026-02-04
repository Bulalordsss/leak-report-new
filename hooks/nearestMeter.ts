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
 * Fast squared distance calculation (avoids expensive trig functions for comparison)
 */
function quickDistanceSquared(a: LatLng, b: LatLng): number {
  const dLat = b.lat - a.lat;
  const dLng = b.lng - a.lng;
  // Approximate correction for longitude at this latitude
  const cosLat = Math.cos(toRad(a.lat));
  return dLat * dLat + (dLng * cosLat) * (dLng * cosLat);
}

/**
 * Find the nearest meters from customer data based on user's location
 * Optimized to avoid sorting the entire array
 */
export function getNearestMetersFromCustomers(
  center: LatLng,
  customers: Customer[],
  max = 3
): Meter[] {
  // Keep track of top N nearest customers using a simple array
  const nearest: { customer: Customer; distSq: number }[] = [];
  const seenMeterNumbers = new Set<string>();

  for (const c of customers) {
    // Skip invalid coordinates or empty meter numbers
    if (c.latitude === 0 || c.longitude === 0 || !c.meterNumber) {
      continue;
    }

    // Skip duplicates
    if (seenMeterNumbers.has(c.meterNumber)) {
      continue;
    }

    const distSq = quickDistanceSquared(center, { lat: c.latitude, lng: c.longitude });

    // If we have fewer than max items, just add it
    if (nearest.length < max) {
      nearest.push({ customer: c, distSq });
      seenMeterNumbers.add(c.meterNumber);
      // Keep sorted
      nearest.sort((a, b) => a.distSq - b.distSq);
    } else if (distSq < nearest[max - 1].distSq) {
      // Replace the farthest one if this is closer
      seenMeterNumbers.delete(nearest[max - 1].customer.meterNumber);
      nearest[max - 1] = { customer: c, distSq };
      seenMeterNumbers.add(c.meterNumber);
      // Re-sort
      nearest.sort((a, b) => a.distSq - b.distSq);
    }
  }

  // Convert to Meter format with actual distances
  return nearest.map((item, index) => {
    const actualDistance = distanceInMeters(center, { 
      lat: item.customer.latitude, 
      lng: item.customer.longitude 
    });
    
    return {
      rank: index + 1,
      id: item.customer.meterNumber,
      title: item.customer.address,
      distance: `${actualDistance.toFixed(0)}m away`,
      color: RANK_COLORS[index] || '#6b7280',
      account: item.customer.accountNumber,
      address: item.customer.address,
      dma: item.customer.dma,
      lat: item.customer.latitude,
      lng: item.customer.longitude,
    };
  });
}
