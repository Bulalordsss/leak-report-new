import { create } from 'zustand';
import { fetchAndSaveCustomerData } from '@/hooks/downloadCustomerData';
import { hasCustomerData, loadCustomerData, clearCustomerData } from '@/utils/allCustomerData';

type CustomerDataStatus = 'checking' | 'not_downloaded' | 'downloaded';

interface DownloadProgress {
  current: number;
  total: number;
}

interface SettingsState {
  // Offline maps state
  onlineMaps: boolean;
  
  // Customer data state
  customerDataStatus: CustomerDataStatus;
  customerCount: number;
  downloading: boolean;
  downloadProgress: DownloadProgress;
  
  // Actions
  setOnlineMaps: (value: boolean) => void;
  
  // Async actions
  checkCustomerData: () => Promise<void>;
  downloadCustomerData: () => Promise<{ success: boolean; message: string }>;
  clearCustomerDataAction: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Initial state
  onlineMaps: true,
  customerDataStatus: 'checking',
  customerCount: 0,
  downloading: false,
  downloadProgress: { current: 0, total: 0 },
  
  // Simple setters
  setOnlineMaps: (value) => set({ onlineMaps: value }),
  
  // Check if customer data exists
  checkCustomerData: async () => {
    set({ customerDataStatus: 'checking' });
    try {
      const exists = await hasCustomerData();
      if (exists) {
        const data = await loadCustomerData();
        set({ 
          customerCount: data.length,
          customerDataStatus: 'downloaded',
        });
      } else {
        set({ customerDataStatus: 'not_downloaded' });
      }
    } catch (error) {
      console.error('Error checking customer data:', error);
      set({ customerDataStatus: 'not_downloaded' });
    }
  },
  
  // Download customer data
  downloadCustomerData: async () => {
    set({ 
      downloading: true,
      downloadProgress: { current: 0, total: 0 },
    });
    
    try {
      const result = await fetchAndSaveCustomerData((current, total) => {
        set({ downloadProgress: { current, total } });
      });
      
      if (result.success) {
        set({ 
          customerCount: result.count,
          customerDataStatus: 'downloaded',
        });
        return { 
          success: true, 
          message: `Downloaded ${result.count.toLocaleString()} customer records.`,
        };
      } else {
        return { 
          success: false, 
          message: result.error ?? 'Failed to download customer data.',
        };
      }
    } catch (error) {
      console.error('Error downloading customer data:', error);
      return { 
        success: false, 
        message: 'An unexpected error occurred while downloading.',
      };
    } finally {
      set({ downloading: false });
    }
  },
  
  // Clear customer data
  clearCustomerDataAction: async () => {
    // Don't allow clearing while downloading
    if (get().downloading) {
      console.log('Cannot clear customer data while download is in progress');
      return;
    }
    
    try {
      await clearCustomerData();
      set({ 
        customerDataStatus: 'not_downloaded',
        customerCount: 0,
      });
    } catch (error) {
      console.error('Error clearing customer data:', error);
    }
  },
}));
