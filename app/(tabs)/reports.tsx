import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, BackHandler, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import * as Location from 'expo-location';
import LeafletMap from '@/components/ui/maps';
import { useReportsStore } from '@/utils/reportsStore';
import { useMapStore } from '@/utils/mapStore';
import { useSettingsStore } from '@/utils/settingsStore';

export default function NearestMetersScreen() {
  const insets = useSafeAreaInsets();
  const mapKey = useRef(0);
  const navigation = useNavigation();
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const isInitialLocation = useRef(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
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
    setCenter,
    setUserLocation,
    initialize,
    refreshLocation,
    findNearestMeters,
    recheckCustomerData,
    searchMeter,
  } = useReportsStore();

  // Offline map state
  const mapReady = useMapStore((s) => s.isReady);
  const mapTilesPath = useMapStore((s) => s.mapTilesPath);
  const offlineTilesPath = mapReady ? mapTilesPath : null;

  // Compute selected meter from subscribed state (this ensures re-render when selectedId changes)
  const selected = selectedId ? meters.find(m => m.id === selectedId) || null : null;

  // Initialize on mount only if not already initialized
  // The splash screen should have already initialized the store
  // Do NOT auto-load customer data here - only initialize location
  useEffect(() => {
    if (dataStatus === 'loading') {
      const timer = setTimeout(() => {
        initialize();
      }, 100);
      return () => clearTimeout(timer);
    }
    // If dataStatus is already 'loaded' or 'empty', splash screen handled it - do nothing
  }, []); // Run only once on mount, not on every dataStatus change

  // Recheck customer data when screen is focused (after returning from settings)
  useFocusEffect(
    React.useCallback(() => {
      // Only recheck if data status is 'empty' - user might have just downloaded data
      if (dataStatus === 'empty') {
        console.log('[Reports] Screen focused, rechecking customer data...');
        recheckCustomerData();
      }
    }, [dataStatus, recheckCustomerData])
  );

  // Start live location tracking when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const startLocationTracking = async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            console.log('[Reports] Location permission not granted');
            return;
          }
          // Watch location with high accuracy
          locationSubscription.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 5000, // Update every 5 seconds
              distanceInterval: 10, // Or when moved 10 meters
            },
            (location) => {
              if (isActive) {
                const newLocation = {
                  lat: location.coords.latitude,
                  lng: location.coords.longitude,
                };
                setUserLocation(newLocation);
                
                // Only auto-update center on first location or when not viewing a selected meter
                // This prevents map from re-centering when user has manually moved/zoomed the map
                if (isInitialLocation.current && !selectedId) {
                  setCenter(newLocation);
                  isInitialLocation.current = false;
                }
              }
            }
          );
        } catch (error) {
          console.warn('[Reports] Location tracking error:', error);
        }
      };

      startLocationTracking();

      // Cleanup on screen blur
      return () => {
        isActive = false;
        if (locationSubscription.current) {
          locationSubscription.current.remove();
          locationSubscription.current = null;
        }
        isInitialLocation.current = true; // Reset for next time screen is focused
      };
    }, [selectedId, setUserLocation, setCenter])
  );

  // Keep tab bar visible with normal styling
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        height: 60 + insets.bottom,
        paddingBottom: insets.bottom,
        paddingTop: 8,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    });
  }, [navigation, insets.bottom]);

  // Handle Android back button press when meter is selected
  useEffect(() => {
    if (!selected) return;

    // Handle hardware back button on Android
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedId(null);
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, [selected, setSelectedId]);

  const handleRefreshLocation = async () => {
    const success = await refreshLocation();
    if (success) {
      mapKey.current += 1; // Force map re-render with new location
      Alert.alert('Success', 'Location updated successfully.');
    } else {
      Alert.alert('Location unavailable', 'Unable to fetch your current location.');
    }
  };

  const handleFindMeters = async () => {
    // Strictly prevent multiple simultaneous requests
    if (isFindingMeters) {
      console.log('[Reports] Already finding meters, ignoring tap');
      return;
    }
    
    // First, refresh location to get the latest position
    const success = await refreshLocation();
    
    if (!success) {
      Alert.alert('Location unavailable', 'Please enable location services to find nearby meters.');
      return;
    }
    
    // Then find nearest meters with the updated location
    await findNearestMeters();
  };

  const handleRecenterMap = () => {
    // Re-center to user location if available
    if (userLocation) {
      setCenter(userLocation);
      isInitialLocation.current = false; // User manually centered, don't auto-update
      mapKey.current += 1; // Force map re-render with new center
    } else {
      Alert.alert('Location unavailable', 'Please enable location services.');
    }
  };

  const handleLoadCustomerData = () => {
    Alert.alert(
      'Load Customer Data',
      'Please go to Settings screen to download customer data.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go to Settings', onPress: () => router.push('/(tabs)/settings') }
      ]
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    if (dataStatus === 'empty') {
      Alert.alert('No Data', 'Please download customer data from Settings first.');
      return;
    }
    setIsSearching(true);
    try {
      const result = await searchMeter(searchQuery.trim());
      if (!result.found) {
        Alert.alert('Not Found', result.message);
      } else {
        // Center map on found meter
        mapKey.current += 1;
        setSearchQuery('');
      }
    } finally {
      setIsSearching(false);
    }
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

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search meter or account number..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSearching}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.searchBtn, (isSearching || !searchQuery.trim()) && styles.searchBtnDisabled]}
          onPress={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          activeOpacity={0.8}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="search" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Map - Fixed at top */}
      <View style={[styles.mapCard, selected && { marginBottom: 0 }]}>
        <LeafletMap
          key={mapKey.current}
          center={selected ? { lat: selected.lat, lng: selected.lng } : center}
          zoom={16}
          markers={
            selected 
              ? [{ id: selected.id, position: { lat: selected.lat, lng: selected.lng }, title: selected.title }]
              : meters.map(m => ({ id: m.id, position: { lat: m.lat, lng: m.lng }, title: `#${m.rank} ${m.id}` }))
          }
          userLocation={userLocation ?? undefined}
          offlineTilesPath={offlineTilesPath}
          style={{ flex: 1, width: '100%' }}
        />
        
        {/* Floating action buttons on map */}
        <View style={styles.fabColumn}>
          {/* Re-center map button */}
          <TouchableOpacity 
            style={styles.fab} 
            onPress={handleRecenterMap}
            activeOpacity={0.7}
          >
            <Ionicons name="locate" size={20} color="#1f3a8a" />
          </TouchableOpacity>
          
          {/* Reload nearest meters button - only show when meters exist and not selected */}
          {!selected && meters.length > 0 && (
            <TouchableOpacity 
              style={[styles.fab, isFindingMeters && styles.fabDisabled]} 
              onPress={handleFindMeters}
              activeOpacity={0.7}
              disabled={isFindingMeters}
            >
              {isFindingMeters ? (
                <ActivityIndicator size="small" color="#1f3a8a" />
              ) : (
                <Ionicons name="sync-outline" size={20} color="#1f3a8a" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Scrollable content below map */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
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
                  wss: selected.wss,
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
                <Text style={styles.emptyText}>Load customer data from Settings to find nearby meters.</Text>
                <TouchableOpacity style={styles.loadBtn} onPress={handleLoadCustomerData}>
                  <Ionicons name="settings-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.loadBtnText}>Load Customer Data</Text>
                </TouchableOpacity>
              </View>
            ) : meters.length === 0 ? (
              <View style={styles.emptyContainer}>
                {!userLocation ? (
                  <>
                    <Ionicons name="location-outline" size={48} color="#6b7280" />
                    <Text style={styles.emptyTitle}>Location Not Available</Text>
                    <Text style={styles.emptyText}>Enable location services to find nearby meters. Location updates automatically.</Text>
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
                    <TouchableOpacity 
                      style={[styles.loadBtn, isFindingMeters && styles.loadBtnDisabled]} 
                      onPress={handleFindMeters}
                      disabled={isFindingMeters}
                    >
                      {isFindingMeters ? (
                        <>
                          <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                          <Text style={styles.loadBtnText}>Searching...</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="locate-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                          <Text style={styles.loadBtnText}>Find Nearest Meters</Text>
                        </>
                      )}
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

      </ScrollView>

      {/* Full-screen loading overlay when finding meters */}
      {isFindingMeters && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#1f3a8a" />
            <Text style={styles.loadingOverlayTitle}>Finding Nearest Meters</Text>
            <Text style={styles.loadingOverlayText}>Please wait while we search for meters near you...</Text>
          </View>
        </View>
      )}
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
    marginHorizontal: 16,
    marginTop: 16,
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 24,
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
  loadBtnDisabled: {
    opacity: 0.6,
  },
  loadBtnText: { 
    color: '#fff', 
    fontWeight: '700',
    fontSize: 15,
  },
  fabDisabled: {
    opacity: 0.6,
  },
  loadingOverlay: {
    position: 'absolute',
    top: -100, // Extend above the screen
    left: 0,
    right: 0,
    bottom: -100, // Extend below the screen to cover tab bar
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    paddingHorizontal: 24,
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 15 },
    elevation: 15,
  },
  loadingOverlayTitle: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  loadingOverlayText: {
    marginTop: 10,
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 4,
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  searchBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1f3a8a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1f3a8a',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  searchBtnDisabled: {
    opacity: 0.5,
  },
});