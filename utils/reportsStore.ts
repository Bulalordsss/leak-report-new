import { create } from 'zustand';
import { Meter, getNearestMetersFromCustomers } from '@/hooks/nearestMeter';
import { loadCustomerData, searchCustomers } from '@/utils/allCustomerData';
import { getCurrentLocation } from '@/hooks/getLocation';

export type LatLng = { lat: number; lng: number };

type DataStatus = 'loading' | 'loaded' | 'empty';

interface ReportsState {
  // Location state
  center: LatLng;
  userLocation: LatLng | null;
  
  // Meters state
  meters: Meter[];
  selectedId: string | null;
  customerCount: number;
  
  // Loading states
  isLoading: boolean;
  isFindingMeters: boolean;
  dataStatus: DataStatus;
  
  // Actions
  setCenter: (center: LatLng) => void;
  setUserLocation: (location: LatLng | null) => void;
  setSelectedId: (id: string | null) => void;
  setMeters: (meters: Meter[]) => void;
  
  // Async actions
  initialize: () => Promise<void>;
  refreshLocation: () => Promise<boolean>;
  findNearestMeters: () => Promise<void>;
  recheckCustomerData: () => Promise<void>; // Add function to recheck data
  searchMeter: (query: string) => Promise<{ found: boolean; message: string }>; // Search by meter/account number
  
  // Computed
  getSelectedMeter: () => Meter | null;
}

const DEFAULT_CENTER: LatLng = { lat: 7.0731, lng: 125.613 };

export const useReportsStore = create<ReportsState>((set, get) => ({
  // Initial state
  center: DEFAULT_CENTER,
  userLocation: null,
  meters: [],
  selectedId: null,
  customerCount: 0,
  isLoading: true,
  isFindingMeters: false,
  dataStatus: 'loading',
  
  // Simple setters
  setCenter: (center) => set({ center }),
  setUserLocation: (location) => set({ userLocation: location }),
  setSelectedId: (id) => set({ selectedId: id }),
  setMeters: (meters) => set({ meters }),
  
  // Initialize app - only check location, do NOT load customer data to avoid freeze
  initialize: async () => {
    set({ isLoading: true });
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    try {
      // Only check if customer data exists (fast metadata check, no full load)
      const data = await loadCustomerData();
      const customerCount = data.length;
      const dataStatus: DataStatus = customerCount > 0 ? 'loaded' : 'empty';
      
      // Get current location
      const loc = await getCurrentLocation();
      
      set({
        customerCount,
        dataStatus,
        userLocation: loc,
        center: loc || DEFAULT_CENTER,
      });
    } catch (error) {
      console.error('Error initializing reports:', error);
      set({ dataStatus: 'empty' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Refresh user location
  refreshLocation: async () => {
    const loc = await getCurrentLocation();
    if (loc) {
      set({ userLocation: loc, center: loc });
      return true;
    }
    return false;
  },
  
  // Find nearest meters based on current location
  findNearestMeters: async () => {
    const { userLocation, isFindingMeters } = get();
    
    // Prevent multiple simultaneous requests
    if (isFindingMeters) {
      console.log('[ReportsStore] Already finding meters, ignoring duplicate request');
      return;
    }
    
    if (!userLocation) {
      return;
    }
    
    set({ isFindingMeters: true });
    
    // Add small delay to allow UI to update (show loading state)
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
      const data = await loadCustomerData();
      set({ customerCount: data.length });
      
      if (data.length === 0) {
        set({ dataStatus: 'empty', isFindingMeters: false });
        return;
      }
      
      set({ dataStatus: 'loaded' });
      
      // Process the computation in the next frame to keep UI responsive
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            const nearestMeters = getNearestMetersFromCustomers(userLocation, data, 3);
            set({ meters: nearestMeters });
            resolve();
          }, 0);
        });
      });
    } catch (error) {
      console.error('Error finding nearest meters:', error);
      set({ dataStatus: 'empty' });
    } finally {
      set({ isFindingMeters: false });
    }
  },

  // Recheck if customer data exists (useful after download)
  recheckCustomerData: async () => {
    set({ isLoading: true });
    try {
      const data = await loadCustomerData();
      const customerCount = data.length;
      const dataStatus: DataStatus = customerCount > 0 ? 'loaded' : 'empty';
      
      console.log('[ReportsStore] Rechecked customer data:', { customerCount, dataStatus });
      
      set({
        customerCount,
        dataStatus,
      });
    } catch (error) {
      console.error('Error rechecking customer data:', error);
      set({ dataStatus: 'empty' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Get currently selected meter
  getSelectedMeter: () => {
    const { meters, selectedId } = get();
    return meters.find(m => m.id === selectedId) || null;
  },

  // Search for a meter by meter number or account number and select it
  searchMeter: async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      return { found: false, message: 'Please enter a meter or account number.' };
    }

    try {
      const results = await searchCustomers(trimmed, 1);
      if (results.length === 0) {
        return { found: false, message: `No meter found for "${trimmed}".` };
      }

      const c = results[0];

      // Build a Meter object from the customer record
      const meter: Meter = {
        rank: 1,
        id: c.meterNumber,
        title: c.name ?? c.address,
        distance: '',
        color: '#1f3a8a',
        account: c.accountNumber,
        address: c.address,
        dma: c.dma,
        wss: c.wssCode ?? 0,
        lat: c.latitude,
        lng: c.longitude,
      };

      // Add to meters list if not already present, then select it
      const { meters } = get();
      const exists = meters.some(m => m.id === meter.id);
      if (!exists) {
        set({ meters: [meter, ...meters] });
      }

      // Center map and select
      set({
        selectedId: meter.id,
        center: { lat: meter.lat, lng: meter.lng },
      });

      return { found: true, message: '' };
    } catch (error) {
      console.error('[ReportsStore] searchMeter error:', error);
      return { found: false, message: 'An error occurred while searching.' };
    }
  },
}));
