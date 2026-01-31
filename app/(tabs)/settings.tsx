import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Switch, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { fetchAndSaveCustomerData } from '@/hooks/downloadCustomerData';
import { hasCustomerData, loadCustomerData, clearCustomerData } from '@/utils/allCustomerData';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [onlineMaps, setOnlineMaps] = useState(true);
  const [customerDataStatus, setCustomerDataStatus] = useState<'checking' | 'not_downloaded' | 'downloaded'>('checking');
  const [customerCount, setCustomerCount] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    checkCustomerData();
  }, []);

  const checkCustomerData = async () => {
    const exists = await hasCustomerData();
    if (exists) {
      const data = await loadCustomerData();
      setCustomerCount(data.length);
      setCustomerDataStatus('downloaded');
    } else {
      setCustomerDataStatus('not_downloaded');
    }
  };

  const handleDownloadClientData = async () => {
    setDownloading(true);
    setDownloadProgress({ current: 0, total: 0 });

    const result = await fetchAndSaveCustomerData((current, total) => {
      setDownloadProgress({ current, total });
    });

    setDownloading(false);

    if (result.success) {
      setCustomerCount(result.count);
      setCustomerDataStatus('downloaded');
      Alert.alert('Success', `Downloaded ${result.count} customer records.`);
    } else {
      Alert.alert('Error', result.error ?? 'Failed to download customer data.');
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
            await clearCustomerData();
            setCustomerDataStatus('not_downloaded');
            setCustomerCount(0);
            Alert.alert('Cleared', 'Customer data has been cleared.');
          },
        },
      ]
    );
  };

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
            <View style={[styles.pillDanger, { marginLeft: 'auto' }]}> 
              <Text style={styles.pillDangerText}>{onlineMaps ? 'Online Mode' : 'Offline Mode'}</Text>
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <Row label="Status:" value={onlineMaps ? 'Online' : 'Offline'} />
            <Row label="Cached Tiles:" value={onlineMaps ? '—' : '0'} />
            <Row label="Storage Used:" value={onlineMaps ? '—' : '0.0 MB'} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, justifyContent: 'space-between' }}>
            <Text style={{ color: '#374151', fontWeight: '600' }}>Use Online Maps</Text>
            <Switch value={onlineMaps} onValueChange={setOnlineMaps} />
          </View>

          {!onlineMaps && (
            <>
              <PrimaryButton title="Download Offline Maps" onPress={() => { /* TODO: implement */ }} />
              <View style={{ height: 8 }} />
              <PrimaryButton title="Clear Cache" onPress={() => { /* TODO: clear cached tiles */ }} />
            </>
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
              <PrimaryButton title="Download Client Data" onPress={handleDownloadClientData} />
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

        {/* General Settings Card */}
        <View style={styles.sheet}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.detailIcon}><Ionicons name="construct-outline" size={18} color="#1f3a8a" /></View>
            <Text style={styles.sheetTitle}>General Settings</Text>
          </View>
          <View style={{ marginTop: 8 }}>
            <Row label="App Version" value="1.0.0" />
            <Row label="Build Number" value="2024.1" />
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

function PrimaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={onPress}>
      <Ionicons name="download-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
      <Text style={styles.primaryBtnText}>{title}</Text>
    </TouchableOpacity>
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
  primaryBtnText: { color: '#fff', fontWeight: '700' },

  pillDanger: {
    marginLeft: 'auto',
    backgroundColor: '#FDE7EA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  pillDangerText: { color: '#D84A4A', fontWeight: '600' },

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
});
