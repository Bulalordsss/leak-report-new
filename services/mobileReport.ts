import { api } from './api';

// Types for the leak report API - matching the expected request body
export interface LeakReportPayload {
  meterNumber: string;
  accountNumber: string;
  address: string;
  dma: string;
  coordinates: string;  // "lat, lng" format
  leakType: string;
  location: string;
  contactPerson: string;
  contactNumber: string;
  landmark: string;
  leakPhotos: string[];  // Base64 encoded images or file URIs
  landmarkPhotos: string[];  // Base64 encoded images or file URIs
  reportedAt: string;  // ISO date string
}

// API request body structure
export interface LeakReportApiRequest {
  geom: string;  // Stringified GeoJSON format: '{ "type": "Point", "coordinates": [longitude, latitude] }'
  refNo?: string;
  reportedBy?: string;
  referenceMtr: string;  // Meter number
  referenceRecaddrs: string;  // Address
  reportedLocation: string;  // Location type (Surface/Non-Surface)
  reportedLandmark: string;  // Landmark description
  leakTypeId: number;  // 0=Unidentified, 1=Serviceline, 2=Mainline, 3=Others
  leakIndicator: number;  // 0=Surface, 1=Non-Surface
  reporterName: string;
  reportedNumber: string;  // Contact number
  image1?: string;  // Base64 image
  image2?: string;  // Base64 image
  landmark?: string;  // Landmark photo
}

export interface LeakReportResponse {
  statusCode: number;
  message: string;
  data?: {
    id: string;
    geom: string;
    refNo: string;
    reportedBy: string;
    referenceMtr: string;
    referenceRecaddrs: string;
    reportedLocation: string;
    reportedLandmark: string;
    leakTypeId: number;
    leakIndicator: number;
    reporterName: string;
    reportedNumber: string;
    image1: string;
    image2: string;
    landmark: string;
  };
}

export interface CachedLeakReport extends LeakReportPayload {
  id: string;  // Local cache ID
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  syncError?: string;
  serverReferenceNumber?: string;
}

// Map leak type string to ID
function getLeakTypeId(leakType: string): number {
  switch (leakType.toLowerCase()) {
    case 'serviceline': return 1;
    case 'mainline': return 2;
    case 'others': return 3;
    case 'unidentified':
    default: return 0;
  }
}

// Map location to leak indicator
function getLeakIndicator(location: string): number {
  return location.toLowerCase() === 'non-surface' ? 1 : 0;
}

// Extract the middle 6 digits from account number format "XX-XXXXXX-X"
// Example: "12-029121-9" -> "029121"
function extractReferenceRecaddrs(accountNumber: string): string {
  if (!accountNumber) return '';
  
  // Try to extract the middle part between dashes
  const parts = accountNumber.split('-');
  if (parts.length >= 2 && parts[1].length === 6) {
    return parts[1];
  }
  
  // Fallback: take first 6 characters if format doesn't match
  return accountNumber.replace(/[^0-9]/g, '').substring(0, 6).padStart(6, '0');
}

// Convert coordinates string "lat, lng" to WKT format "POINT(lng lat)"
function coordinatesToWkt(coordinates: string): string {
  const parts = coordinates.split(',').map(s => s.trim());
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return `POINT(${lng} ${lat})`;
    }
  }
  // Fallback - return a default point if parsing fails
  console.warn('[MobileReport API] Could not parse coordinates:', coordinates);
  return `POINT(125.613 7.0731)`;  // Default to Davao City center
}

// Convert coordinates string "lat, lng" to GeoJSON format
function coordinatesToGeoJson(coordinates: string): object {
  const parts = coordinates.split(',').map(s => s.trim());
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return {
        type: "Point",
        coordinates: [lng, lat]
      };
    }
  }
  // Fallback - return a default point if parsing fails
  console.warn('[MobileReport API] Could not parse coordinates:', coordinates);
  return {
    type: "Point",
    coordinates: [125.613, 7.0731]
  };
}

// Convert our payload to API request format
function convertToApiRequest(payload: LeakReportPayload): LeakReportApiRequest {
  return {
    geom: JSON.stringify(coordinatesToGeoJson(payload.coordinates)),
    referenceMtr: payload.meterNumber,
    referenceRecaddrs: payload.address,
    reportedLocation: payload.location,
    reportedLandmark: payload.landmark,
    leakTypeId: getLeakTypeId(payload.leakType),
    leakIndicator: getLeakIndicator(payload.location),
    reporterName: payload.contactPerson,
    reportedNumber: payload.contactNumber,
    image1: payload.leakPhotos[0] || '',
    image2: payload.leakPhotos[1] || '',
    landmark: payload.landmarkPhotos[0] || '',
  };
}

/**
 * Submit a leak report to the server
 */
export async function submitLeakReport(payload: LeakReportPayload): Promise<LeakReportResponse> {
  const url = '/dcwd-gis/api/v1/admin/LeakReport/MobileLeakReport';
  console.log('[MobileReport API] Submitting leak report...');

  const apiRequest = convertToApiRequest(payload);
  console.log('[MobileReport API] Request body:', JSON.stringify(apiRequest, null, 2));

  try {
    const response = await api.post<LeakReportResponse>(url, apiRequest);
    console.log('[MobileReport API] Response status:', response.status);
    console.log('[MobileReport API] Response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[MobileReport API] Error details:', {
      url,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      message: error?.message,
    });
    throw error;
  }
}

/**
 * Submit a leak report with multipart form data (for file uploads)
 * Uses PascalCase field names as required by the API
 */
export async function submitLeakReportWithFiles(payload: LeakReportPayload): Promise<LeakReportResponse> {
  const url = '/dcwd-gis/api/v1/admin/LeakReport/MobileLeakReport';
  console.log('[MobileReport API] Submitting leak report with form data...');

  try {
    const formData = new FormData();
    
    // Add geometry as simple lat, lng string (API expects this format)
    // Round to fewer decimal places to keep it shorter
    const coords = payload.coordinates.split(',').map(s => {
      const num = parseFloat(s.trim());
      return isNaN(num) ? s.trim() : num.toFixed(6);
    }).join(', ');
    formData.append('Geom', coords);
    console.log('[MobileReport API] Geom:', coords);
    
    // Log all field values for debugging
    const referenceRecaddrs = extractReferenceRecaddrs(payload.accountNumber);
    console.log('[MobileReport API] Payload:', {
      meterNumber: payload.meterNumber,
      accountNumber: payload.accountNumber,
      referenceRecaddrs: referenceRecaddrs,
      address: payload.address?.substring(0, 50),
      location: payload.location,
      landmark: payload.landmark?.substring(0, 50),
      leakType: payload.leakType,
      contactPerson: payload.contactPerson,
      contactNumber: payload.contactNumber,
    });
    
    // Add text fields with PascalCase names
    formData.append('ReferenceMtr', payload.meterNumber || '');
    formData.append('ReferenceRecaddrs', referenceRecaddrs);  // Extract 6-digit code from account number
    formData.append('ReportedLocation', payload.location || '');
    formData.append('ReportedLandmark', payload.landmark || '');
    formData.append('LeakTypeId', getLeakTypeId(payload.leakType).toString());
    formData.append('LeakIndicator', getLeakIndicator(payload.location).toString());
    formData.append('ReporterName', payload.contactPerson || '');
    formData.append('ReportedNumber', payload.contactNumber || '');
    formData.append('ReportedBy', payload.contactPerson || '');  // Same as reporter name
    
    // Generate a UUID v4 format ID for the report (React Native compatible)
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    formData.append('Id', uuid);

    // Add leak photos (Image1, Image2)
    if (payload.leakPhotos[0]) {
      const photo1 = payload.leakPhotos[0];
      if (photo1.startsWith('file://') || photo1.startsWith('content://')) {
        formData.append('Image1', {
          uri: photo1,
          type: 'image/jpeg',
          name: 'leak_photo_1.jpg',
        } as any);
      }
    }

    if (payload.leakPhotos[1]) {
      const photo2 = payload.leakPhotos[1];
      if (photo2.startsWith('file://') || photo2.startsWith('content://')) {
        formData.append('Image2', {
          uri: photo2,
          type: 'image/jpeg',
          name: 'leak_photo_2.jpg',
        } as any);
      }
    }

    // Add landmark photo (Landmark)
    if (payload.landmarkPhotos[0]) {
      const landmarkPhoto = payload.landmarkPhotos[0];
      if (landmarkPhoto.startsWith('file://') || landmarkPhoto.startsWith('content://')) {
        formData.append('Landmark', {
          uri: landmarkPhoto,
          type: 'image/jpeg',
          name: 'landmark_photo.jpg',
        } as any);
      }
    }

    const response = await api.post<LeakReportResponse>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('[MobileReport API] Response status:', response.status);
    console.log('[MobileReport API] Response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[MobileReport API] Error details:', {
      url,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      message: error?.message,
    });
    throw error;
  }
}

/**
 * Submit a leak report as JSON (no file upload, images as base64)
 */
export async function submitLeakReportAsJson(payload: LeakReportPayload): Promise<LeakReportResponse> {
  const url = '/dcwd-gis/api/v1/admin/LeakReport/MobileLeakReport';
  console.log('[MobileReport API] Submitting leak report as JSON...');

  const apiRequest = convertToApiRequest(payload);
  console.log('[MobileReport API] Geom:', JSON.stringify(apiRequest.geom));

  try {
    const response = await api.post<LeakReportResponse>(url, apiRequest);
    console.log('[MobileReport API] Response status:', response.status);
    console.log('[MobileReport API] Response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[MobileReport API] Error details:', {
      url,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      message: error?.message,
    });
    throw error;
  }
}
