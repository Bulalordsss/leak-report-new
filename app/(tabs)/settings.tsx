import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, Switch, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSettingsStore } from '@/utils/settingsStore';
import { useMapStore } from '@/utils/mapStore';
import { requestNotificationPermissions, getNotificationPermissions } from '@/services/notificationService';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  
  // Zustand store
  const {
    customerDataStatus,
    customerCount,
    downloading,
    downloadProgress,
    loadOfflineMapPreference,
    checkCustomerData,
    downloadCustomerData,
    clearCustomerDataAction,
  } = useSettingsStore();

  // Map store
  const {
    isDownloading: mapDownloading,
    isUnzipping: mapUnzipping,
    isReady: mapReady,
    downloadProgress: mapDownloadProgress,
    statusMessage: mapStatusMessage,
    error: mapError,
    checkExistingMap,
    initializeMap,
    clearMapData,
    setError: setMapError,
  } = useMapStore();

  const [isEnabled, setIsEnabled] = useState(false);
  /**
   * Handle toggle: when enabling, request notification permission; when disabling, open app settings
   * since apps cannot programmatically revoke permissions on behalf of the user.
   */
  const handleToggle = async (value: boolean) => {
    if (value) {
      // Request permissions
      try {
        const granted = await requestNotificationPermissions();
        if (granted) {
          setIsEnabled(true);
        } else {
          setIsEnabled(false);
          Alert.alert(
            'Notifications Disabled',
            'Notification permissions were not granted. You can enable them in the app settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        }
      } catch (error) {
        console.error('Error requesting notification permissions', error);
        Alert.alert('Error', 'Unable to request notification permissions. Please check your system settings.');
        setIsEnabled(false);
      }
    } else {
      // Can't programmatically revoke — open settings so the user can turn it off
      Alert.alert(
        'Disable Notifications',
        'To disable notifications, turn them off in the app settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      // Optimistically update UI; actual permission remains until user acts
      setIsEnabled(false);
    }
  };

  useEffect(() => {
    checkCustomerData();
    checkExistingMap();
    loadOfflineMapPreference();

    // Initialize notification toggle state from current permissions
    (async () => {
      try {
        const granted = await getNotificationPermissions();
        setIsEnabled(granted);
      } catch (error) {
        console.warn('Unable to read notification permissions', error);
      }
    })();
  }, []);

  const handleDownloadClientData = async () => {
    // Prevent downloading if map is being downloaded
    if (mapDownloading || mapUnzipping) {
      Alert.alert(
        'Download in Progress',
        'Please wait for the map download to complete before downloading customer data.'
      );
      return;
    }

    const result = await downloadCustomerData();
    if (result.success) {
      Alert.alert('Success', result.message);
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleClearClientData = async () => {
    Alert.alert(
      'Clear Client Data',
      'Are you sure you want to clear all downloaded customer data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCustomerDataAction();
              Alert.alert('Cleared', 'Customer data has been cleared.');
            } catch (error: any) {
              console.error('Error in handleClearClientData:', error);
              Alert.alert(
                'Error', 
                error?.message || 'Failed to clear customer data. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  // ─── Offline Map handlers ───────────────────────────────────────

  const handleDownloadMap = () => {
    // Prevent downloading if customer data is being downloaded
    if (downloading) {
      Alert.alert(
        'Download in Progress',
        'Please wait for the customer data download to complete before downloading the map.'
      );
      return;
    }

    Alert.alert(
      'Download Map',
      'This will download the offline map. You can continue using the app while it downloads.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: () => {
            initializeMap();
          },
        },
      ],
    );
  };

  const handleClearMap = () => {
    Alert.alert(
      'Clear Map Data',
      'This will delete all downloaded map files. You will need to download again to use offline maps.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearMapData();
              Alert.alert('Cleared', 'All offline map data has been removed.');
            } catch (error: any) {
              console.error('Error clearing map data:', error);
              Alert.alert('Error', error?.message || 'Failed to clear map data. Please try again.');
            }
          },
        },
      ],
    );
  };

  // Show map error
  useEffect(() => {
    if (mapError) {
      Alert.alert('Map Error', mapError, [
        { text: 'Retry', onPress: handleDownloadMap },
        { text: 'OK', onPress: () => setMapError(null) },
      ]);
    }
  }, [mapError]);

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}> 
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>App configuration and preferences</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Offline Maps Card */}
        <View style={styles.sheet}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.detailIcon}><Ionicons name="map-outline" size={18} color="#1f3a8a" /></View>
            <Text style={styles.sheetTitle}>Offline Maps</Text>
          </View>

          <View style={{ marginTop: 8 }}>
            <Row label="Map Status:" value={mapReady ? 'Downloaded' : 'Not Downloaded'} />
          </View>

          {/* Download / Extraction progress */}
          {mapDownloading && (
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>{mapStatusMessage}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${mapDownloadProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>{mapDownloadProgress}%</Text>
            </View>
          )}

          {mapUnzipping && (
            <View style={styles.progressSection}>
              <ActivityIndicator size="small" color="#1f3a8a" style={{ marginBottom: 6 }} />
              <Text style={styles.progressLabel}>{mapStatusMessage}</Text>
            </View>
          )}

          {/* Action buttons */}
          {!mapDownloading && !mapUnzipping && !mapReady && (
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.primaryBtn, downloading && styles.primaryBtnDisabled]}
                activeOpacity={0.85}
                onPress={handleDownloadMap}
                disabled={downloading}
              >
                <Ionicons name="download-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>
                  {downloading ? 'Download Offline Map (Waiting...)' : 'Download Offline Map'}
                </Text>
              </TouchableOpacity>
              {downloading && (
                <Text style={styles.waitingText}>
                  Please wait for customer data download to complete
                </Text>
              )}
            </View>
          )}

          {/* Clear button - only show when map is ready */}
          {mapReady && !mapDownloading && !mapUnzipping && (
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity
                style={styles.clearBtn}
                activeOpacity={0.85}
                onPress={handleClearMap}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" style={{ marginRight: 8 }} />
                <Text style={styles.clearBtnText}>Clear Map Data</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Offline Meter Search Data Card */}
        <View style={styles.sheet}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.detailIcon}><Ionicons name="cloud-download-outline" size={18} color="#1f3a8a" /></View>
            <Text style={styles.sheetTitle}>Offline Meter Search Data</Text>
          </View>
          <View style={{ marginTop: 8 }}>
            <Row
              label="Status:"
              value={
                customerDataStatus === 'checking'
                  ? 'Checking...'
                  : customerDataStatus === 'downloaded'
                  ? 'Downloaded'
                  : 'Not Downloaded'
              }
            />
            {customerDataStatus === 'downloaded' && (
              <Row label="Records:" value={customerCount.toLocaleString()} />
            )}
            {downloading && downloadProgress.total > 0 && (
              <Row
                label="Progress:"
                value={`${downloadProgress.current.toLocaleString()} / ${downloadProgress.total.toLocaleString()}`}
              />
            )}
          </View>

          {downloading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#1f3a8a" />
              <Text style={styles.loadingText}>Downloading...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity 
                style={[styles.primaryBtn, (mapDownloading || mapUnzipping) && styles.primaryBtnDisabled]} 
                activeOpacity={0.85} 
                onPress={handleDownloadClientData}
                disabled={mapDownloading || mapUnzipping}
              >
                <Ionicons name="download-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>
                  {(mapDownloading || mapUnzipping) ? 'Download Client Data (Waiting...)' : 'Download Client Data'}
                </Text>
              </TouchableOpacity>
              {(mapDownloading || mapUnzipping) && (
                <Text style={styles.waitingText}>
                  Please wait for map download to complete
                </Text>
              )}
              {customerDataStatus === 'downloaded' && (
                <>
                  <View style={{ height: 8 }} />
                  <TouchableOpacity style={styles.clearBtn} activeOpacity={0.85} onPress={handleClearClientData}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" style={{ marginRight: 8 }} />
                    <Text style={styles.clearBtnText}>Clear Client Data</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>

        {/* `Notification` Settings Card */}
        <View style={styles.sheet}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="notifications-outline" size={18} color="#1f3a8a" />
            </View>
            <Text style={styles.sheetTitle}>Notifications</Text>
          </View>

          <View style={{ marginTop: 8 }}>
            {/* We use itemRow for the background and itemLabel for the text style */}
            <View style={[styles.itemRow, { justifyContent: 'space-between' }]}>
              <Text style={styles.itemLabel}>Notification Permission</Text>
              <Switch
                trackColor={{ false: "#767577", true: "#1f3a8a" }}
                thumbColor={isEnabled ? "#ffffff" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={handleToggle}
                value={isEnabled}
                // Small scale adjustment to make the switch fit perfectly in the row height
                style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }], marginRight: -4 }}
              />
            </View>
          </View>
        </View>

        {/* General Settings Card */}
        <View style={styles.sheet}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.detailIcon}><Ionicons name="construct-outline" size={18} color="#1f3a8a" /></View>
            <Text style={styles.sheetTitle}>General Settings</Text>
          </View>
          <View style={{ marginTop: 8 }}>
            <Row label="App Version" value="1.4" />
          </View>
        </View>

        {/* Logout button at bottom */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.85}
            onPress={() => router.replace('/login')}
          >
            <Ionicons name="log-out-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.itemRow}>
      <Text style={styles.itemLabel}>{label}</Text>
      <Text style={styles.itemValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerTitle: { color: '#000000ff', fontWeight: '700', fontSize: 18 },
  headerSubtitle: { color: '#000000ff' },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  sheet: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    marginTop: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center' },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  itemLabel: { color: '#6b7280', width: 140, fontSize: 12 },
  itemValue: { color: '#111827', fontWeight: '700' },

  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  // Toggle row for switches and their labels
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  label: {
    color: '#6b7280',
    fontSize: 14,
  },

  primaryBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f3a8a',
    borderRadius: 14,
    paddingVertical: 12,
    shadowColor: '#1f3a8a',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },

  primaryBtnDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  waitingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // New logout button styles
  logoutBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 12,
    shadowColor: '#ef4444',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  logoutBtnText: { color: '#fff', fontWeight: '700' },

  // Loading and clear button styles
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: '#1f3a8a',
    fontWeight: '600',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 14,
    paddingVertical: 12,
  },
  clearBtnText: { color: '#ef4444', fontWeight: '700' },

  // Progress styles for map download
  progressSection: {
    marginTop: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
  },
  progressLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1f3a8a',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    fontWeight: '600',
  },
});
