import { api } from '@/services/api';
import { saveCustomerData, loadCustomerData, Customer } from '@/utils/allCustomerData';

export type FetchCustomerDataResult = {
  success: boolean;
  count: number;
  error?: string;
};
// Helper to fetch a single page
async function fetchPage(pageIndex: number, pageSize: number): Promise<Customer[]> {
  const res = await api.get('/dcwd-gis/api/v1/admin/customer/paginate', {
    params: { PageIndex: pageIndex, PageSize: pageSize },
    headers: { Accept: 'text/plain' },
  });

  const rawItems: any[] = res.data?.data?.data ?? [];
  
  return rawItems.map(item => ({
    meterNumber: item.meterNumber ?? '',
    accountNumber: item.accountNumber ?? '',
    address: item.address ?? '',
    dma: item.dma ?? '',
    latitude: item.latitude ?? 0,
    longitude: item.longitude ?? 0,
  }));
}

/**
 * Fetch all customer data from the paginated API endpoint and save locally.
 * Uses parallel requests for faster downloading.
 */
export async function fetchAndSaveCustomerData(
  onProgress?: (current: number, total: number) => void
): Promise<FetchCustomerDataResult> {
  const pageSize = 500;
  const CONCURRENT_REQUESTS = 20; // Fetch 20 pages at a time (reduced to save memory)
  let allCustomers: Customer[] = [];

  try {
    // First request to get total count and actual page size
    console.log('Fetching customer data from API...');
    const firstRes = await api.get('/dcwd-gis/api/v1/admin/customer/paginate', {
      params: { PageIndex: 1, PageSize: pageSize },
      headers: { Accept: 'text/plain' },
    });

    const firstData = firstRes.data;
    const totalCount = firstData.data?.count ?? 0;
    const actualPageSize = firstData.data?.pageSize ?? 50;
    const rawItems: any[] = firstData.data?.data ?? [];
    
    // Filter first page
    const firstPageItems: Customer[] = rawItems.map(item => ({
      meterNumber: item.meterNumber ?? '',
      accountNumber: item.accountNumber ?? '',
      address: item.address ?? '',
      dma: item.dma ?? '',
      latitude: item.latitude ?? 0,
      longitude: item.longitude ?? 0,
    }));
    
    allCustomers.push(...firstPageItems);
    
    const totalPages = Math.ceil(totalCount / actualPageSize);
    console.log(`Total: ${totalCount} records, ${totalPages} pages. Fetching ${CONCURRENT_REQUESTS} pages at a time...`);
    
    onProgress?.(allCustomers.length, totalCount);

    // Fetch remaining pages in parallel batches
    for (let batchStart = 2; batchStart <= totalPages; batchStart += CONCURRENT_REQUESTS) {
      const batchEnd = Math.min(batchStart + CONCURRENT_REQUESTS - 1, totalPages);
      const pageNumbers = [];
      
      for (let p = batchStart; p <= batchEnd; p++) {
        pageNumbers.push(p);
      }
      
      console.log(`Fetching pages ${batchStart}-${batchEnd} of ${totalPages}...`);
      
      // Fetch all pages in this batch concurrently
      const results = await Promise.all(
        pageNumbers.map(p => fetchPage(p, pageSize))
      );
      
      // Combine results
      for (const pageItems of results) {
        allCustomers.push(...pageItems);
      }
      
      onProgress?.(allCustomers.length, totalCount);
    }

    console.log(`Total customers fetched: ${allCustomers.length}`);

    // Save to local storage
    await saveCustomerData(allCustomers);

    return { success: true, count: allCustomers.length };
  } catch (error: any) {
    console.error('Failed to fetch customer data', error);
    return {
      success: false,
      count: 0,
      error: error?.message ?? 'Unknown error',
    };
  }
}

/**
 * Get the current download status
 */
export async function getCustomerDataStatus(): Promise<{ downloaded: boolean; count: number }> {
  const data = await loadCustomerData();
  return {
    downloaded: data.length > 0,
    count: data.length,
  };
}
