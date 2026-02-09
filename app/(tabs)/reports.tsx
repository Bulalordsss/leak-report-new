import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import LeafletMap from '@/components/ui/maps';
import { useReportsStore } from '@/utils/reportsStore';

export default function NearestMetersScreen() {
  const insets = useSafeAreaInsets();
  
  // Zustand store
  const {
    center,
    userLocation,
    meters,
    selectedId,
    isLoading,
    isFindingMeters,
    dataStatus,
    setSelectedId,
    initialize,
    refreshLocation,
    findNearestMeters,
  } = useReportsStore();

  // Compute selected meter from subscribed state (this ensures re-render when selectedId changes)
  const selected = selectedId ? meters.find(m => m.id === selectedId) || null : null;

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, []);

  const handleRefreshLocation = async () => {
    const success = await refreshLocation();
    if (!success) {
      Alert.alert('Location unavailable', 'Unable to fetch your current location.');
    }
  };

  const handleFindMeters = async () => {
    if (!userLocation) {
      Alert.alert('Location unavailable', 'Please enable location services to find nearby meters.');
      return;
    }
    await findNearestMeters();
  };

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

      {/* Make screen non-scrollable */}
      <View style={{ paddingBottom: 24 }}>
        {/* Map */}
        <View style={[styles.mapCard, selected && { marginBottom: 12 }]}>
          <LeafletMap
            center={selected ? { lat: selected.lat, lng: selected.lng } : center}
            zoom={16}
            markers={
              selected 
                ? [{ id: selected.id, position: { lat: selected.lat, lng: selected.lng }, title: selected.title }]
                : meters.map(m => ({ id: m.id, position: { lat: m.lat, lng: m.lng }, title: `#${m.rank} ${m.id}` }))
            }
            userLocation={userLocation ?? undefined}
            style={{ flex: 1, width: '100%' }}
          />
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
              onPress={() => router.push({
                pathname: '/screens/reportForm',
                params: {
                  id: selected.id,
                  address: selected.address,
                  account: selected.account,
                  dma: selected.dma,
                  coords: `${selected.lat.toFixed(6)}, ${selected.lng.toFixed(6)}`
                }
              })}
            >
              <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.reportBtnText}>Report Meter</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select a nearest meter</Text>
            <Text style={styles.sheetSubtitle}>Up to 3 closest meters to your GPS. Choose from the list below.</Text>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1f3a8a" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : dataStatus === 'empty' ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#f59e0b" />
                <Text style={styles.emptyTitle}>No Customer Data</Text>
                <Text style={styles.emptyText}>Please download customer data from the Settings tab first.</Text>
              </View>
            ) : meters.length === 0 ? (
              <View style={styles.emptyContainer}>
                {!userLocation ? (
                  <>
                    <Ionicons name="location-outline" size={48} color="#6b7280" />
                    <Text style={styles.emptyTitle}>Location Not Available</Text>
                    <Text style={styles.emptyText}>Enable location services to find nearby meters.</Text>
                    <TouchableOpacity style={styles.loadBtn} onPress={handleRefreshLocation}>
                      <Ionicons name="navigate-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.loadBtnText}>Enable Location</Text>
                    </TouchableOpacity>
                  </>
                ) : isFindingMeters ? (
                  <>
                    <ActivityIndicator size="large" color="#1f3a8a" />
                    <Text style={styles.loadingText}>Finding nearest meters...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="search-outline" size={48} color="#1f3a8a" />
                    <Text style={styles.emptyTitle}>Ready to Search</Text>
                    <Text style={styles.emptyText}>Tap the button below to find the 3 nearest meters to your location.</Text>
                    <TouchableOpacity style={styles.loadBtn} onPress={handleFindMeters}>
                      <Ionicons name="locate-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.loadBtnText}>Find Nearest Meters</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : (
              <>
                <View style={styles.inlineStatus}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  <Text style={styles.statusText}>Found {meters.length} nearest meters</Text>
                </View>

                {meters.map((m, index) => (
                  <TouchableOpacity key={`${m.id}-${index}`} style={styles.itemCard} activeOpacity={0.8} onPress={() => setSelectedId(m.id)}>
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
              </>
            )}
          </View>
        )}

        <View style={{ height: 12 }} />
      </View>
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

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptyText: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  loadBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f3a8a',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    shadowColor: '#1f3a8a',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  loadBtnText: { 
    color: '#fff', 
    fontWeight: '700',
    fontSize: 15,
  },
});