import { api } from './api';

// Types for the API response
export interface CustomerApiItem {
  gid: number;
  accountNumber: string;
  name: string;
  dma: string;
  wss: string;
  address: string;
  meterNumber: string;
  connectionClass: string;
  status: string;
  wssCode: number;
  geometry: string;
  latitude: number;
  longitude: number;
}

// The API returns data directly (not nested under a 'data' property)
export interface CustomerPaginateData {
  pageIndex: number;
  pageSize: number;
  count: number;  // This is the actual total count
  data: CustomerApiItem[];
  totalCount: number;  // This seems to always be 0
}

export interface CustomerPaginateResponse {
  statusCode: number;
  message: string;
  data: CustomerPaginateData;
}

export interface FetchCustomerPageParams {
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
}

/**
 * Fetch a single page of customer data from the API
 */
export async function fetchCustomerPage(params: FetchCustomerPageParams = {}): Promise<CustomerPaginateResponse> {
  const {
    pageIndex = 1,
    pageSize = 2000,
    search,
    startDate,
    endDate,
    sortBy,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.append('PageIndex', pageIndex.toString());
  queryParams.append('PageSize', pageSize.toString());
  
  if (search) queryParams.append('Search', search);
  if (startDate) queryParams.append('StartDate', startDate);
  if (endDate) queryParams.append('EndDate', endDate);
  if (sortBy) queryParams.append('SortBy', sortBy);

  const url = `/dcwd-gis/api/v1/admin/customer/paginate?${queryParams.toString()}`;

  try {
    const response = await api.get<CustomerPaginateResponse>(url);
    return response.data;
  } catch (error: any) {
    console.error('[CustomerData API] Error:', error?.message);
    throw error;
  }
}

/**
 * Fetch all customer data with pagination, yielding batches as they arrive
 */
export async function* fetchAllCustomerPages(
  pageSize: number = 1000,
  onProgress?: (fetched: number, total: number) => void
): AsyncGenerator<CustomerApiItem[], void, unknown> {
  let pageIndex = 1;
  let totalCount = 0;
  let fetchedCount = 0;

  // First request to get total count
  const firstPage = await fetchCustomerPage({ pageIndex, pageSize });
  totalCount = firstPage.data.totalCount;
  
  if (firstPage.data.data.length > 0) {
    fetchedCount += firstPage.data.data.length;
    onProgress?.(fetchedCount, totalCount);
    yield firstPage.data.data;
  }

  // Continue fetching remaining pages
  while (fetchedCount < totalCount) {
    pageIndex++;
    const page = await fetchCustomerPage({ pageIndex, pageSize });
    ``
    if (page.data.data.length === 0) {
      break; // No more data
    }

    fetchedCount += page.data.data.length;
    onProgress?.(fetchedCount, totalCount);
    yield page.data.data;
  }
}

