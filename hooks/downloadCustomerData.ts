import { useState, useCallback } from 'react';
import { fetchCustomerPage, CustomerApiItem } from '@/services/customerData';
import { encryptName } from '@/services/customerInterceptor';
import { 
  Customer, 
  clearForBatchImport, 
  saveBatchCustomerData, 
  initializeDatabase,
  getCustomerCount
} from '@/utils/allCustomerData';

export type FetchCustomerDataResult = {
  success: boolean;
  count: number;
  error?: string;
};

export type DownloadProgress = {
  isDownloading: boolean;
  fetched: number;
  saved: number;
  total: number;
  phase: 'idle' | 'initializing' | 'fetching' | 'saving' | 'complete' | 'error';
  error?: string;
};

/**
 * Convert API customer item to local Customer format
 * Encrypts the customer name before storing locally
 */
function mapApiCustomerToLocal(apiCustomer: CustomerApiItem): Customer {
  return {
    meterNumber: apiCustomer.meterNumber || '',
    accountNumber: apiCustomer.accountNumber || '',
    address: apiCustomer.address || '',
    dma: apiCustomer.dma || '',
    latitude: apiCustomer.latitude || 0,
    longitude: apiCustomer.longitude || 0,
    name: encryptName(apiCustomer.name || ''),
    wss: apiCustomer.wss || '',
    connectionClass: apiCustomer.connectionClass || '',
    status: apiCustomer.status || '',
  };
}

// Number of concurrent requests for parallel downloading
const CONCURRENT_REQUESTS = 10; // Fetch 10 pages in parallel
const PAGE_SIZE = 2000;
const INSERT_BATCH_SIZE = 5000; // Insert 5000 records per transaction

/**
 * Fetch and save customer data from the API endpoint with parallel fetching
 * and batched inserts for optimal performance.
 */
export async function fetchAndSaveCustomerData(
  onProgress?: (current: number, total: number) => void
): Promise<FetchCustomerDataResult> {
  try {
    // Pre-initialize the local database
    await initializeDatabase();

    onProgress?.(0, 100);

    // First, get the total count from the first page
    const firstPage = await fetchCustomerPage({ pageIndex: 1, pageSize: PAGE_SIZE });
    // Use 'count' field as totalCount seems to always be 0
    const totalCount = firstPage.data.count || firstPage.data.totalCount;

    if (totalCount === 0) {
      return {
        success: false,
        count: 0,
        error: 'No customer data available from the server.',
      };
    }

    onProgress?.(5, 100);

    // Clear existing data before import
    await clearForBatchImport();

    onProgress?.(10, 100);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    
    let totalFetched = 0;
    let totalSaved = 0;
    let pendingInserts: Customer[] = [];

    // Save first page immediately
    if (firstPage.data.data.length > 0) {
      const customers = firstPage.data.data.map(mapApiCustomerToLocal);
      pendingInserts.push(...customers);
      totalFetched += customers.length;
    }

    // Process remaining pages in parallel batches
    if (totalPages > 1) {
      const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      
      // Process pages in parallel batches
      for (let i = 0; i < remainingPages.length; i += CONCURRENT_REQUESTS) {
        const batch = remainingPages.slice(i, i + CONCURRENT_REQUESTS);
        
        // Fetch all pages in this batch concurrently
        const pagePromises = batch.map(pageIndex => 
          fetchCustomerPage({ pageIndex, pageSize: PAGE_SIZE })
            .then(page => ({ 
              pageIndex, 
              data: page.data.data.map(mapApiCustomerToLocal), // Map and encrypt immediately
              error: null 
            }))
            .catch(error => ({ 
              pageIndex, 
              data: [], 
              error 
            }))
        );
        
        const results = await Promise.all(pagePromises);
        
        // Collect all fetched data
        for (const result of results) {
          if (result.error) {
            continue;
          }
          
          if (result.data.length > 0) {
            totalFetched += result.data.length;
            pendingInserts.push(...result.data);
          }
        }

        // Insert when batch size reached or last batch
        if (pendingInserts.length >= INSERT_BATCH_SIZE || (i + CONCURRENT_REQUESTS) >= remainingPages.length) {
          await saveBatchCustomerData(pendingInserts, true);
          totalSaved += pendingInserts.length;
          
          // Clear pending inserts
          pendingInserts = [];
        }
        
        // Update progress (10-95% range for fetching and saving)
        const progress = 10 + Math.floor((totalSaved / totalCount) * 85);
        onProgress?.(Math.min(progress, 95), 100);
      }
    }

    // Insert any remaining records
    if (pendingInserts.length > 0) {
      await saveBatchCustomerData(pendingInserts, true);
      totalSaved += pendingInserts.length;
    }

    onProgress?.(100, 100);

    return { 
      success: true, 
      count: totalSaved 
    };

  } catch (error: any) {
    console.error('[CustomerData] Failed to fetch customer data:', error);
    return {
      success: false,
      count: 0,
      error: error?.message ?? 'Unknown error occurred while fetching customer data.',
    };
  }
}

/**
 * Get the current download status
 */
export async function getCustomerDataStatus(): Promise<{ downloaded: boolean; count: number }> {
  const count = await getCustomerCount();
  return {
    downloaded: count > 0,
    count,
  };
}

/**
 * React hook for downloading customer data with progress tracking (parallel download)
 */
export function useDownloadCustomerData() {
  const [progress, setProgress] = useState<DownloadProgress>({
    isDownloading: false,
    fetched: 0,
    saved: 0,
    total: 0,
    phase: 'idle',
  });

  const downloadCustomerData = useCallback(async (): Promise<FetchCustomerDataResult> => {
    setProgress({
      isDownloading: true,
      fetched: 0,
      saved: 0,
      total: 0,
      phase: 'initializing',
    });

    try {
      // Initialize database
      await initializeDatabase();

      setProgress(prev => ({ ...prev, phase: 'fetching' }));

      // Get total count first
      const firstPage = await fetchCustomerPage({ pageIndex: 1, pageSize: PAGE_SIZE });
      // Use 'count' field as totalCount seems to always be 0
      const totalCount = firstPage.data.count || firstPage.data.totalCount;

      if (totalCount === 0) {
        setProgress({
          isDownloading: false,
          fetched: 0,
          saved: 0,
          total: 0,
          phase: 'error',
          error: 'No customer data available from the server.',
        });
        return { success: false, count: 0, error: 'No customer data available.' };
      }

      setProgress(prev => ({ ...prev, total: totalCount }));

      // Clear existing data
      await clearForBatchImport();

      // Save first page
      let totalSaved = 0;
      let totalFetched = 0;

      if (firstPage.data.data.length > 0) {
        const customers = firstPage.data.data.map(mapApiCustomerToLocal);
        totalFetched += firstPage.data.data.length;
        
        setProgress(prev => ({ 
          ...prev, 
          fetched: totalFetched,
          phase: 'saving' 
        }));

        await saveBatchCustomerData(customers, true);
        totalSaved += customers.length;

        setProgress(prev => ({ 
          ...prev, 
          saved: totalSaved,
          phase: 'fetching'
        }));
      }

      // Calculate remaining pages
      const totalPages = Math.ceil(totalCount / PAGE_SIZE);
      
      if (totalPages > 1) {
        // Create array of remaining page indices
        const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        
        // Process pages in parallel batches
        for (let i = 0; i < remainingPages.length; i += CONCURRENT_REQUESTS) {
          const batch = remainingPages.slice(i, i + CONCURRENT_REQUESTS);
          
          // Fetch all pages in this batch concurrently
          const pagePromises = batch.map(pageIndex => 
            fetchCustomerPage({ pageIndex, pageSize: PAGE_SIZE })
              .then(page => ({ pageIndex, page, error: null }))
              .catch(error => ({ pageIndex, page: null, error }))
          );
          
          const results = await Promise.all(pagePromises);
          
          // Process results
          for (const result of results) {
            if (result.page && result.page.data.data.length > 0) {
              totalFetched += result.page.data.data.length;
            }
          }
          
          setProgress(prev => ({ 
            ...prev, 
            fetched: totalFetched,
            phase: 'saving'
          }));
          
          // Save results
          for (const result of results) {
            if (result.error) {
              console.error(`Error fetching page ${result.pageIndex}:`, result.error?.message);
              continue;
            }
            
            if (result.page && result.page.data.data.length > 0) {
              const customers = result.page.data.data.map(mapApiCustomerToLocal);
              await saveBatchCustomerData(customers, true);
              totalSaved += customers.length;
            }
          }

          setProgress(prev => ({ 
            ...prev, 
            saved: totalSaved,
            phase: 'fetching'
          }));
        }
      }

      setProgress({
        isDownloading: false,
        fetched: totalFetched,
        saved: totalSaved,
        total: totalCount,
        phase: 'complete',
      });

      return { success: true, count: totalSaved };

    } catch (error: any) {
      setProgress({
        isDownloading: false,
        fetched: 0,
        saved: 0,
        total: 0,
        phase: 'error',
        error: error?.message ?? 'Unknown error',
      });

      return {
        success: false,
        count: 0,
        error: error?.message ?? 'Unknown error',
      };
    }
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({
      isDownloading: false,
      fetched: 0,
      saved: 0,
      total: 0,
      phase: 'idle',
    });
  }, []);

  return {
    progress,
    downloadCustomerData,
    resetProgress,
    isDownloading: progress.isDownloading,
  };
}
