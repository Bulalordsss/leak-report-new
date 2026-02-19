import * as Network from 'expo-network';
import { Alert } from 'react-native';

/**
 * Check if device has internet connection
 */
export async function checkNetworkConnection(): Promise<boolean> {
  try {
    const networkState = await Network.getNetworkStateAsync();
    const isConnected = !!(networkState.isConnected && networkState.isInternetReachable);
    
    console.log('[NetworkUtils] Network state:', {
      isConnected: networkState.isConnected,
      isInternetReachable: networkState.isInternetReachable,
      type: networkState.type,
    });
    
    return isConnected;
  } catch (error) {
    console.error('[NetworkUtils] Error checking network:', error);
    return false;
  }
}

/**
 * Show network error alert to user
 */
export function showNetworkErrorAlert(customMessage?: string) {
  Alert.alert(
    'No Internet Connection',
    customMessage || 'Please check your internet connection and try again.',
    [{ text: 'OK' }]
  );
}

/**
 * Test API server connectivity
 */
export async function testApiConnection(baseUrl: string): Promise<boolean> {
  try {
    console.log('[NetworkUtils] Testing connection to:', baseUrl);
    const response = await fetch(baseUrl, {
      method: 'HEAD',
      timeout: 5000,
    } as any);
    
    const isReachable = response.ok || response.status === 404; // 404 is fine, means server is reachable
    console.log('[NetworkUtils] API reachable:', isReachable, 'Status:', response.status);
    return isReachable;
  } catch (error) {
    console.error('[NetworkUtils] API not reachable:', error);
    return false;
  }
}

/**
 * Get user-friendly network error message
 */
export function getNetworkErrorMessage(error: any): string {
  if (error.message?.includes('No internet connection')) {
    return 'No internet connection. Please check your network settings.';
  }
  
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'Request timed out. The server took too long to respond.';
  }
  
  if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
    return 'Network error. Cannot reach the server.';
  }
  
  if (error.response?.status === 500) {
    return 'Server error. Please try again later.';
  }
  
  if (error.response?.status === 404) {
    return 'The requested resource was not found.';
  }
  
  if (error.response?.status === 403) {
    return 'Access denied. You do not have permission to access this resource.';
  }
  
  return error.message || 'An unexpected error occurred. Please try again.';
}
