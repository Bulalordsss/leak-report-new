import { create } from 'zustand';
import { Meter, getNearestMetersFromCustomers } from '@/hooks/nearestMeter';
import { loadCustomerData } from '@/utils/allCustomerData';
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
  
  // Initialize app - load customer data count and get location
  initialize: async () => {
    set({ isLoading: true });
    try {
      // Check if customer data exists
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
    const { userLocation } = get();
    
    if (!userLocation) {
      return;
    }
    
    set({ isFindingMeters: true });
    
    try {
      const data = await loadCustomerData();
      set({ customerCount: data.length });
      
      if (data.length === 0) {
        set({ dataStatus: 'empty', isFindingMeters: false });
        return;
      }
      
      set({ dataStatus: 'loaded' });
      
      // Run computation in next tick to allow UI update
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          const nearestMeters = getNearestMetersFromCustomers(userLocation, data, 3);
          set({ meters: nearestMeters });
          resolve();
        }, 0);
      });
    } catch (error) {
      console.error('Error finding nearest meters:', error);
      set({ dataStatus: 'empty' });
    } finally {
      set({ isFindingMeters: false });
    }
  },
  
  // Get currently selected meter
  getSelectedMeter: () => {
    const { meters, selectedId } = get();
    return meters.find(m => m.id === selectedId) || null;
  },
}));
