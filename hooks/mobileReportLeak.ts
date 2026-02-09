import { useState, useCallback, useEffect } from 'react';
import { useMobileReportStore } from '@/utils/mobileReportStore';
import { LeakReportPayload } from '@/services/mobileReport';
import * as Network from 'expo-network';

export interface UseLeakReportOptions {
  autoSync?: boolean;  // Automatically sync when online
  syncOnMount?: boolean;  // Sync pending reports on mount
}

export interface SubmitResult {
  success: boolean;
  cached: boolean;
  message: string;
  reportId?: string;
}

/**
 * Check if device is online
 */
async function checkIsOnline(): Promise<boolean> {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.isConnected ?? false;
  } catch {
    return false;
  }
}

/**
 * React hook for managing leak reports with offline support
 */
export function useLeakReport(options: UseLeakReportOptions = {}) {
  const { autoSync = true, syncOnMount = true } = options;
  
  const [isOnline, setIsOnline] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    cachedReports,
    isLoading,
    isSyncing,
    loadCachedReports,
    addReport,
    removeReport,
    clearSyncedReports,
    syncReport,
    syncAllPending,
    getPendingCount,
    getSyncedCount,
    getFailedCount,
  } = useMobileReportStore();
  
  // Check network connectivity periodically
  useEffect(() => {
    const checkNetwork = async () => {
      const online = await checkIsOnline();
      const wasOffline = !isOnline;
      setIsOnline(online);
      
      // Auto-sync when coming back online
      if (online && wasOffline && autoSync && getPendingCount() > 0) {
        console.log('[useLeakReport] Back online, syncing pending reports...');
        syncAllPending();
      }
    };
    
    // Check immediately
    checkNetwork();
    
    // Check every 10 seconds
    const interval = setInterval(checkNetwork, 10000);
    
    return () => clearInterval(interval);
  }, [autoSync, isOnline]);
  
  // Load cached reports and optionally sync on mount
  useEffect(() => {
    loadCachedReports().then(async () => {
      if (syncOnMount) {
        const online = await checkIsOnline();
        if (online) {
          syncAllPending();
        }
      }
    });
  }, []);
  
  /**
   * Submit a leak report
   * - If online: tries to submit directly, caches on failure
   * - If offline: caches for later sync
   */
  const submitReport = useCallback(async (
    payload: LeakReportPayload
  ): Promise<SubmitResult> => {
    setIsSubmitting(true);
    
    try {
      // Always cache the report first
      const cachedReport = await addReport(payload);
      
      if (!isOnline) {
        console.log('[useLeakReport] Offline, report cached for later sync');
        return {
          success: true,
          cached: true,
          message: 'Report saved offline. Will sync when connection is available.',
          reportId: cachedReport.id,
        };
      }
      
      // Try to sync immediately
      const synced = await syncReport(cachedReport.id);
      
      if (synced) {
        return {
          success: true,
          cached: false,
          message: 'Report submitted successfully!',
          reportId: cachedReport.id,
        };
      } else {
        return {
          success: true,
          cached: true,
          message: 'Report saved. Will retry sync later.',
          reportId: cachedReport.id,
        };
      }
      
    } catch (error: any) {
      console.error('[useLeakReport] Submit error:', error);
      return {
        success: false,
        cached: false,
        message: error?.message || 'Failed to submit report',
      };
    } finally {
      setIsSubmitting(false);
    }
  }, [isOnline, addReport, syncReport]);
  
  /**
   * Retry syncing a failed report
   */
  const retrySync = useCallback(async (reportId: string): Promise<boolean> => {
    if (!isOnline) {
      console.log('[useLeakReport] Cannot retry sync while offline');
      return false;
    }
    return syncReport(reportId);
  }, [isOnline, syncReport]);
  
  /**
   * Retry syncing all failed/pending reports
   */
  const retryAllFailed = useCallback(async () => {
    if (!isOnline) {
      console.log('[useLeakReport] Cannot retry sync while offline');
      return { success: 0, failed: 0 };
    }
    return syncAllPending();
  }, [isOnline, syncAllPending]);
  
  /**
   * Delete a cached report
   */
  const deleteReport = useCallback(async (reportId: string) => {
    await removeReport(reportId);
  }, [removeReport]);
  
  /**
   * Clear all successfully synced reports from cache
   */
  const clearCompleted = useCallback(async () => {
    await clearSyncedReports();
  }, [clearSyncedReports]);
  
  return {
    // State
    isOnline,
    isSubmitting,
    isLoading,
    isSyncing,
    cachedReports,
    
    // Counts
    pendingCount: getPendingCount(),
    syncedCount: getSyncedCount(),
    failedCount: getFailedCount(),
    totalCached: cachedReports.length,
    
    // Actions
    submitReport,
    retrySync,
    retryAllFailed,
    deleteReport,
    clearCompleted,
    refreshReports: loadCachedReports,
  };
}

/**
 * Helper to create a LeakReportPayload from form data
 */
export function createLeakReportPayload(params: {
  meterNumber: string;
  accountNumber: string;
  address: string;
  dma: string;
  coordinates: string;
  leakType: string;
  location: string;
  contactPerson: string;
  contactNumber: string;
  landmark: string;
  leakPhotos: string[];
  landmarkPhotos: string[];
}): LeakReportPayload {
  return {
    ...params,
    reportedAt: new Date().toISOString(),
  };
}
