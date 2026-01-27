import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

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
            <View style={styles.pillDanger}><Text style={styles.pillDangerText}>Online Mode</Text></View>
          </View>

          <View style={{ marginTop: 8 }}>
            <Row label="Status:" value="" />
            <Row label="Cached Tiles:" value="0" />
            <Row label="Storage Used:" value="0.0 MB" />
          </View>

          <PrimaryButton title="Download Offline Maps" onPress={() => { /* TODO: implement */ }} />
        </View>

        {/* Offline Meter Search Data Card */}
        <View style={styles.sheet}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.detailIcon}><Ionicons name="cloud-download-outline" size={18} color="#1f3a8a" /></View>
            <Text style={styles.sheetTitle}>Offline Meter Search Data</Text>
          </View>
          <View style={{ marginTop: 8 }}>
            <Row label="Status:" value="Not Downloaded" />
          </View>

          <PrimaryButton title="Download Client Data" onPress={() => { /* TODO: implement */ }} />
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
});
