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

// Notification icon — set via expo-notifications plugin in app.json (produces @drawable/ic_notification)
const NOTIFICATION_ICON = 'ic_notification';
const NOTIFICATION_COLOR = '#1a73e8';

// Configure notification behavior
if (Platform.OS === 'android' && isNotificationsAvailable) {
  Notifications.setNotificationChannelAsync('downloads', {
    name: 'Downloads',
    importance: Notifications.AndroidImportance.LOW, // LOW = no sound/vibration on updates
    vibrationPattern: [0],
    lightColor: NOTIFICATION_COLOR,
    enableVibrate: false,
    showBadge: false,
  });
}

/**
 * Per-notification-ID update lock.
 * Prevents concurrent scheduleNotificationAsync calls for the same ID,
 * which would create duplicate notifications instead of updating one.
 */
const updateLocks = new Map<string, boolean>();

/**
 * Post (or update in-place) a single notification for the given ID.
 * On Android, scheduling with the same identifier replaces the existing notification.
 * The lock ensures only one update is in-flight at a time per ID.
 */
async function postNotification(
  id: string,
  title: string,
  body: string,
  options: { sticky?: boolean; progress?: number } = {},
): Promise<void> {
  if (!isNotificationsAvailable) return;
  if (updateLocks.get(id)) return; // skip if an update is already in-flight

  updateLocks.set(id, true);
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title,
        body,
        data: options.progress !== undefined ? { progress: options.progress } : {},
        ...(Platform.OS === 'android' && {
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          channelId: 'downloads',
          sticky: options.sticky ?? false,
          color: NOTIFICATION_COLOR,
          smallIcon: NOTIFICATION_ICON,
          // Hide the timestamp so it doesn't look like a new notification on each update
          showTimestamp: false,
        }),
      },
      trigger: null,
    });
  } catch (error) {
    console.error('[NotificationService] Error posting notification:', error);
  } finally {
    updateLocks.set(id, false);
  }
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
 * Show the initial progress notification.
 * Creates a sticky notification that will be updated in-place as progress advances.
 */
export async function showDownloadNotification(
  id: string,
  title: string,
  progress: number,
  message: string
): Promise<void> {
  // Clear any stale lock before starting a fresh notification
  updateLocks.set(id, false);
  await postNotification(id, title, message, { sticky: true, progress });
}

/**
 * Update an existing progress notification in-place.
 * Skipped automatically if a previous update for this ID is still in-flight.
 */
export async function updateDownloadNotification(
  id: string,
  title: string,
  progress: number,
  message: string
): Promise<void> {
  await postNotification(id, title, message, { sticky: true, progress });
}

/**
 * Show a download complete notification (replaces the progress notification).
 */
export async function showDownloadCompleteNotification(
  title: string,
  message: string,
  id?: string,
): Promise<void> {
  const notifId = id ?? `complete-${Date.now()}`;
  updateLocks.set(notifId, false);
  await postNotification(notifId, title, message, { sticky: false });
}

/**
 * Show a download error notification.
 */
export async function showDownloadErrorNotification(
  title: string,
  message: string,
  id?: string,
): Promise<void> {
  const notifId = id ?? `error-${Date.now()}`;
  updateLocks.set(notifId, false);
  await postNotification(notifId, title, message, { sticky: false });
}

/**
 * Dismiss a notification by identifier and clean up its lock.
 */
export async function dismissNotification(id: string): Promise<void> {
  if (!isNotificationsAvailable) return;
  
  updateLocks.delete(id);
  try {
    await Notifications.dismissNotificationAsync(id);
  } catch (error) {
    console.error('[NotificationService] Error dismissing notification:', error);
  }
}

/**
 * Get current notification permission state (granted or not)
 */
export async function getNotificationPermissions(): Promise<boolean> {
  if (!isNotificationsAvailable) return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[NotificationService] Error checking permissions:', error);
    return false;
  }
}
