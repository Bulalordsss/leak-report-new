import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import LeafletMap from '@/components/ui/maps';

export default function NearestMetersScreen() {
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const meters = [
    { rank: 1, id: 'V24044612J', title: 'DURIAN ST., JUNA MATINA', distance: '55m away', color: '#10b981', account: '12-157330-3', address: 'DURIAN ST., JUNA MATINA', dma: 'DM-10P' },
    { rank: 2, id: 'V24044957J', title: 'H-110 DBC  BLDG MATINA', distance: '143m away', color: '#f59e0b', account: '11-234567-8', address: 'H-110 DBC  BLDG MATINA', dma: 'DM-10P' },
    { rank: 3, id: 'V24044350J', title: 'KARPRETAREA BLGO. MATINA', distance: '230m away', color: '#ef4444', account: '10-987654-3', address: 'KARPRETAREA BLGO. MATINA', dma: 'DM-10P' },
  ];

  const selected = meters.find(m => m.id === selectedId) || null;

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}> 
        {selected && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedId(null)}>
            <Ionicons name="arrow-back" size={22} color="#000" />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{selected ? 'Report & Map' : 'Nearest Meters'}</Text>
          <Text style={styles.headerSubtitle}>{selected ? 'Search meter or pick location' : 'Tap a marker or select from list'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Map placeholder / canvas */}
        <View style={[styles.mapCard, selected && { marginBottom: 12 }]}>
          <LeafletMap
            center={{ lat: 7.0731, lng: 125.613 }}
            zoom={15}
            markers={selected ? [{ id: selected.id, position: { lat: 7.0731, lng: 125.613 }, title: selected.id }] : []}
            style={{ flex: 1, width: '100%' }}
          />
          {/* Floating tools mock */}
          {selected && (
            <View style={styles.fabColumn}>
              <View style={styles.fab}><Ionicons name="layers-outline" size={18} color="#1f2937" /></View>
              <View style={styles.fab}><Ionicons name="locate-outline" size={18} color="#1f2937" /></View>
              <View style={styles.fab}><Ionicons name="refresh-outline" size={18} color="#1f2937" /></View>
            </View>
          )}
        </View>

        {/* If a meter is selected, show details sheet; else show selection list */}
        {selected ? (
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Meter Details</Text>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}><Ionicons name="speedometer-outline" size={18} color="#1f3a8a" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Meter Number</Text>
                <Text style={styles.detailValue}>{selected.id}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}><Ionicons name="document-text-outline" size={18} color="#1f3a8a" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Account Number</Text>
                <Text style={styles.detailValue}>{selected.account}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}><Ionicons name="location-outline" size={18} color="#1f3a8a" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={styles.detailValue}>{selected.address}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}><Ionicons name="water-outline" size={18} color="#1f3a8a" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>DMA (District Metered Area)</Text>
                <Text style={styles.detailValue}>{selected.dma}</Text>
              </View>
            </View>

            {/* Report Meter button */}
            <TouchableOpacity
              style={styles.reportBtn}
              activeOpacity={0.85}
              onPress={() => selected && router.push({ pathname: '/screens/report', params: { id: selected.id, address: selected.address, account: selected.account, dma: selected.dma } })}
            >
              <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.reportBtnText}>Report Meter</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select a nearest meter</Text>
            <Text style={styles.sheetSubtitle}>Up to 3 closest meters to your GPS. Choose from the list below.</Text>

            <View style={styles.inlineStatus}>
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              <Text style={styles.statusText}>Using offline customer data</Text>
            </View>

            {meters.map((m) => (
              <TouchableOpacity key={m.id} style={styles.itemCard} activeOpacity={0.8} onPress={() => setSelectedId(m.id)}>
                <View style={[styles.rankBadge, { backgroundColor: m.color }]}> 
                  <Text style={styles.rankText}>{m.rank}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemId}>{m.id}</Text>
                  <Text style={styles.itemTitle}>{m.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="pin" size={14} color="#ef4444" style={{ marginRight: 4 }} />
                    <Text style={styles.itemDistance}>{m.distance}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 12 }} />
      </ScrollView>
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { color: '#000000ff', fontWeight: '700', fontSize: 18 },
  headerSubtitle: { color: '#000000ff' },

  mapCard: {
    height: 240,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    overflow: 'hidden',
  },
  fabColumn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    gap: 10,
  },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
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
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sheetSubtitle: { color: '#6b7280', marginTop: 4 },
  inlineStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  statusText: { marginLeft: 6, color: '#10b981', fontWeight: '600' },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: { color: '#fff', fontWeight: '700' },
  itemId: { fontWeight: '700', color: '#111827' },
  itemTitle: { color: '#374151' },
  itemDistance: { color: '#6b7280', fontSize: 12 },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailLabel: { color: '#6b7280', fontSize: 12 },
  detailValue: { color: '#111827', fontWeight: '700' },

  reportBtn: {
    marginTop: 16,
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
  reportBtnText: { color: '#fff', fontWeight: '700' },
});