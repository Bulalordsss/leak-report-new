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
  empId: string;  // Employee ID of the person reporting
}

// API request body structure
export interface LeakReportApiRequest {
  geom: string;  // Stringified GeoJSON format: '{ "type": "Point", "coordinates": [longitude, latitude] }'
  refNo?: string;
  reportedBy?: string;  // Employee ID of the reporter
  referenceMtr: string;  // Meter number
  referenceRecaddrs: string;  // Address
  reportedLocation: string;  // Meter address (not Surface/Non-Surface)
  reportedLandmark: string;  // Landmark description
  leakTypeId: number;  // Leak type ID (38=Serviceline, 39=Mainline, etc.)
  leakIndicator: number;  // 1=Surface, 2=Non-Surface
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

// Map leak type string to ID, jmsCode, and reportType based on new requirements
function getLeakTypeMapping(leakType: string): { leakTypeId: number; jmsCode: string; reportType: string } {
  switch (leakType.toLowerCase()) {
    case 'serviceline': 
      return { leakTypeId: 38, jmsCode: '0100', reportType: '54' };
    case 'mainline': 
      return { leakTypeId: 39, jmsCode: '0101', reportType: '55' };
    case 'others': 
      return { leakTypeId: 40, jmsCode: '0000', reportType: '' };
    case 'blow-off':
    case 'blow-off valve':
      return { leakTypeId: 64, jmsCode: '0113', reportType: '' };
    case 'fire hydrant':
      return { leakTypeId: 65, jmsCode: '0114', reportType: '' };
    case 'air release':
    case 'air release valve':
      return { leakTypeId: 66, jmsCode: '0115', reportType: '' };
    case 'valve':
      return { leakTypeId: 61, jmsCode: '0116', reportType: '' };
    default: 
      return { leakTypeId: 40, jmsCode: '0000', reportType: '' }; // Default to Others
  }
}

// Legacy function for backward compatibility
function getLeakTypeId(leakType: string): number {
  return getLeakTypeMapping(leakType).leakTypeId;
}

// Map location to leak indicator
// Surface = 1, Non-Surface = 2
function getLeakIndicator(location: string): number {
  return location.toLowerCase() === 'non-surface' ? 2 : 1;
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
    reportedLocation: payload.address,  // Use meter address, not Surface/Non-Surface
    reportedLandmark: payload.landmark,
    leakTypeId: getLeakTypeId(payload.leakType),
    leakIndicator: getLeakIndicator(payload.location),  // 1=Surface, 2=Non-Surface
    reporterName: payload.contactPerson,
    reportedNumber: payload.contactNumber,
    reportedBy: payload.empId,  // Employee ID
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
    const leakTypeMapping = getLeakTypeMapping(payload.leakType);
    
    console.log('[MobileReport API] Payload:', {
      meterNumber: payload.meterNumber,
      accountNumber: payload.accountNumber,
      referenceRecaddrs: referenceRecaddrs,
      address: payload.address?.substring(0, 50),
      location: payload.location,
      landmark: payload.landmark?.substring(0, 50),
      leakType: payload.leakType,
      leakTypeId: leakTypeMapping.leakTypeId,
      jmsCode: leakTypeMapping.jmsCode,
      reportType: leakTypeMapping.reportType,
      leakIndicator: getLeakIndicator(payload.location),
      contactPerson: payload.contactPerson,
      contactNumber: payload.contactNumber,
      empId: payload.empId,
    });
    
    // Add text fields with PascalCase names
    formData.append('ReportedBy', payload.empId || '');
    formData.append('ReferenceMtr', payload.meterNumber || '');
    formData.append('ReferenceRecaddrs', referenceRecaddrs);  // Extract 6-digit code from account number
    formData.append('ReportedLocation', payload.address || '');  // Use meter address, not Surface/Non-Surface
    formData.append('ReportedLandmark', payload.landmark || '');
    formData.append('LeakTypeId', leakTypeMapping.leakTypeId.toString());
    formData.append('JmsCode', leakTypeMapping.jmsCode);
    formData.append('ReportType', leakTypeMapping.reportType);
    formData.append('LeakIndicator', getLeakIndicator(payload.location).toString());  // 1=Surface, 2=Non-Surface
    formData.append('ReporterName', payload.contactPerson || '');
    formData.append('ReportedNumber', payload.contactNumber || '');
    
    // Format DtReported as "YYYY-MM-DD HH:mm:ss.SSSSSS+TZ"
    const reportDate = new Date(payload.reportedAt);
    const year = reportDate.getFullYear();
    const month = String(reportDate.getMonth() + 1).padStart(2, '0');
    const day = String(reportDate.getDate()).padStart(2, '0');
    const hours = String(reportDate.getHours()).padStart(2, '0');
    const minutes = String(reportDate.getMinutes()).padStart(2, '0');
    const seconds = String(reportDate.getSeconds()).padStart(2, '0');
    const milliseconds = String(reportDate.getMilliseconds()).padStart(3, '0');
    const microseconds = milliseconds + '000'; // Extend to 6 digits
    const timezoneOffset = -reportDate.getTimezoneOffset();
    const tzHours = String(Math.floor(Math.abs(timezoneOffset) / 60)).padStart(2, '0');
    const tzSign = timezoneOffset >= 0 ? '+' : '-';
    const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${microseconds}${tzSign}${tzHours}`;
    formData.append('DtReported', formattedDate);
    
    // Generate a UUID v4 format ID for the report (React Native compatible)
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    formData.append('Id', uuid);
    
    // Log all FormData fields for debugging
    console.log('[MobileReport API] FormData fields being sent:');
    console.log('- Geom:', coords);
    console.log('- ReferenceMtr:', payload.meterNumber || '');
    console.log('- ReferenceRecaddrs:', referenceRecaddrs);
    console.log('- ReportedLocation:', payload.address || '');
    console.log('- ReportedLandmark:', payload.landmark || '');
    console.log('- LeakTypeId:', leakTypeMapping.leakTypeId.toString());
    console.log('- JmsCode:', leakTypeMapping.jmsCode);
    console.log('- ReportType:', leakTypeMapping.reportType);
    console.log('- LeakIndicator:', getLeakIndicator(payload.location).toString());
    console.log('- ReporterName:', payload.contactPerson || '');
    console.log('- ReportedNumber:', payload.contactNumber || '');
    console.log('- ReportedBy:', payload.empId || '');
    console.log('- DtReported:', formattedDate);
    console.log('- Id:', uuid);


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
