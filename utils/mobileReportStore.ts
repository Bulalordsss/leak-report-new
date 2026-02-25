import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CachedLeakReport, LeakReportPayload, submitLeakReportWithFiles } from '@/services/mobileReport';

const CACHE_KEY = 'leak_reports_cache';

// Generate a unique ID for cached reports
function generateId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

interface MobileReportState {
  // Cached reports
  cachedReports: CachedLeakReport[];
  
  // Loading states
  isLoading: boolean;
  isSyncing: boolean;
  
  // Actions
  loadCachedReports: () => Promise<void>;
  addReport: (payload: LeakReportPayload) => Promise<CachedLeakReport>;
  removeReport: (id: string) => Promise<void>;
  clearSyncedReports: () => Promise<void>;
  
  // Sync actions
  syncReport: (id: string) => Promise<boolean>;
  syncAllPending: () => Promise<{ success: number; failed: number }>;
  
  // Getters
  getPendingCount: () => number;
  getSyncedCount: () => number;
  getFailedCount: () => number;
}

export const useMobileReportStore = create<MobileReportState>((set, get) => ({
  // Initial state
  cachedReports: [],
  isLoading: false,
  isSyncing: false,
  
  // Load cached reports from AsyncStorage
  loadCachedReports: async () => {
    set({ isLoading: true });
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const reports: CachedLeakReport[] = JSON.parse(cached);
        set({ cachedReports: reports });
        console.log(`[MobileReportStore] Loaded ${reports.length} cached reports`);
      }
    } catch (error) {
      console.error('[MobileReportStore] Error loading cached reports:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Add a new report to cache
  addReport: async (payload: LeakReportPayload): Promise<CachedLeakReport> => {
    const newReport: CachedLeakReport = {
      ...payload,
      id: generateId(),
      createdAt: new Date().toISOString(),
      syncStatus: 'pending',
    };
    
    const { cachedReports } = get();
    const updatedReports = [...cachedReports, newReport];
    
    // Save to AsyncStorage
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updatedReports));
    set({ cachedReports: updatedReports });
    
    console.log(`[MobileReportStore] Added report ${newReport.id} to cache`);
    return newReport;
  },
  
  // Remove a report from cache
  removeReport: async (id: string) => {
    const { cachedReports } = get();
    const updatedReports = cachedReports.filter(r => r.id !== id);
    
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updatedReports));
    set({ cachedReports: updatedReports });
    
    console.log(`[MobileReportStore] Removed report ${id} from cache`);
  },
  
  // Clear all synced reports
  clearSyncedReports: async () => {
    const { cachedReports } = get();
    const updatedReports = cachedReports.filter(r => r.syncStatus !== 'synced');
    
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updatedReports));
    set({ cachedReports: updatedReports });
    
    console.log('[MobileReportStore] Cleared all synced reports');
  },
  
  // Sync a single report to the server
  syncReport: async (id: string): Promise<boolean> => {
    const { cachedReports } = get();
    const reportIndex = cachedReports.findIndex(r => r.id === id);
    
    if (reportIndex === -1) {
      console.error(`[MobileReportStore] Report ${id} not found`);
      return false;
    }
    
    const report = cachedReports[reportIndex];
    
    // Update status to syncing
    const updatingReports = [...cachedReports];
    updatingReports[reportIndex] = { ...report, syncStatus: 'syncing' };
    set({ cachedReports: updatingReports });
    
    try {
      // Submit to server using form data (API requires multipart/form-data)
      const response = await submitLeakReportWithFiles({
        meterNumber: report.meterNumber,
        accountNumber: report.accountNumber,
        address: report.address,
        dma: report.dma,
        coordinates: report.coordinates,
        leakType: report.leakType,
        location: report.location,
        contactPerson: report.contactPerson,
        contactNumber: report.contactNumber,
        landmark: report.landmark,
        leakPhotos: report.leakPhotos,
        landmarkPhotos: report.landmarkPhotos,
        reportedAt: report.reportedAt,
        empId: report.empId,
        wss: report.wss,
      });
      
      // Update status to synced
      const syncedReports = [...get().cachedReports];
      const currentIndex = syncedReports.findIndex(r => r.id === id);
      if (currentIndex !== -1) {
        syncedReports[currentIndex] = {
          ...syncedReports[currentIndex],
          syncStatus: 'synced',
          serverReferenceNumber: response.data?.refNo,
          syncError: undefined,
        };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(syncedReports));
        set({ cachedReports: syncedReports });
      }
      
      console.log(`[MobileReportStore] Report ${id} synced successfully`);
      return true;
      
    } catch (error: any) {
      // Update status to failed
      const failedReports = [...get().cachedReports];
      const currentIndex = failedReports.findIndex(r => r.id === id);
      if (currentIndex !== -1) {
        failedReports[currentIndex] = {
          ...failedReports[currentIndex],
          syncStatus: 'failed',
          syncError: error?.message || 'Unknown error',
        };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(failedReports));
        set({ cachedReports: failedReports });
      }
      
      console.error(`[MobileReportStore] Report ${id} sync failed:`, error?.message);
      return false;
    }
  },
  
  // Sync all pending reports
  syncAllPending: async (): Promise<{ success: number; failed: number }> => {
    const { cachedReports, syncReport } = get();
    const pendingReports = cachedReports.filter(r => r.syncStatus === 'pending' || r.syncStatus === 'failed');
    
    if (pendingReports.length === 0) {
      console.log('[MobileReportStore] No pending reports to sync');
      return { success: 0, failed: 0 };
    }
    
    set({ isSyncing: true });
    
    let success = 0;
    let failed = 0;
    
    for (const report of pendingReports) {
      const result = await syncReport(report.id);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }
    
    set({ isSyncing: false });
    
    console.log(`[MobileReportStore] Sync complete: ${success} success, ${failed} failed`);
    return { success, failed };
  },
  
  // Getters
  getPendingCount: () => {
    return get().cachedReports.filter(r => r.syncStatus === 'pending').length;
  },
  
  getSyncedCount: () => {
    return get().cachedReports.filter(r => r.syncStatus === 'synced').length;
  },
  
  getFailedCount: () => {
    return get().cachedReports.filter(r => r.syncStatus === 'failed').length;
  },
}));
