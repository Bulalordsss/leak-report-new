import { Platform } from 'react-native';

// Dynamically import notifications to handle Expo Go limitations
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (error) {
  console.warn('[NotificationService] expo-notifications not available. Notifications will be disabled.');
  console.warn('[NotificationService] Use a development build for full notification support.');
}

// Check if notifications are available
const isNotificationsAvailable = !!Notifications;

// Configure notification behavior
if (Platform.OS === 'android' && isNotificationsAvailable) {
  Notifications.setNotificationChannelAsync('downloads', {
    name: 'Downloads',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!isNotificationsAvailable) {
    console.warn('[NotificationService] Notifications not available');
    return false;
  }
  
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[NotificationService] Notification permissions not granted');
      return false;
    }

    return true;
  } catch (error) {
    console.error('[NotificationService] Error requesting permissions:', error);
    return false;
  }
}

/**
 * Show a download progress notification
 */
export async function showDownloadNotification(
  id: string,
  title: string,
  progress: number,
  message: string
): Promise<void> {
  if (!isNotificationsAvailable) return;
  
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title,
        body: message,
        data: { progress },
        ...(Platform.OS === 'android' && {
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: 'downloads',
          sticky: true,
        }),
      },
      trigger: null,
    });
  } catch (error) {
    console.error('[NotificationService] Error showing notification:', error);
  }
}

/**
 * Update an existing download notification
 */
export async function updateDownloadNotification(
  id: string,
  title: string,
  progress: number,
  message: string
): Promise<void> {
  if (!isNotificationsAvailable) return;
  
  // Same as showDownloadNotification - it will update if identifier matches
  await showDownloadNotification(id, title, progress, message);
}

/**
 * Show a download complete notification
 */
export async function showDownloadCompleteNotification(
  title: string,
  message: string
): Promise<void> {
  if (!isNotificationsAvailable) return;
  
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        ...(Platform.OS === 'android' && {
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: 'downloads',
        }),
      },
      trigger: null,
    });
  } catch (error) {
    console.error('[NotificationService] Error showing completion notification:', error);
  }
}

/**
 * Show a download error notification
 */
export async function showDownloadErrorNotification(
  title: string,
  message: string
): Promise<void> {
  if (!isNotificationsAvailable) return;
  
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        ...(Platform.OS === 'android' && {
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: 'downloads',
        }),
      },
      trigger: null,
    });
  } catch (error) {
    console.error('[NotificationService] Error showing error notification:', error);
  }
}

/**
 * Dismiss a notification by identifier
 */
export async function dismissNotification(id: string): Promise<void> {
  if (!isNotificationsAvailable) return;
  
  try {
    await Notifications.dismissNotificationAsync(id);
  } catch (error) {
    console.error('[NotificationService] Error dismissing notification:', error);
  }
}
