import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();

  const stats = {
    total: 17,
    repaired: 4,
    afterMeter: 0,
    notFound: 0,
  };

  const recent = [
    { id: '20251163D7', title: 'PRKII BAGO GALLERA TALOMO', meter: '520625901J', date: 'Nov 26' },
    { id: '202511BF45', title: 'PRKII BAGO GALLERA TALOMO', meter: '520625901J', date: 'Nov 25' },
  ];

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header greeting with safe area padding */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}> 
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>A</Text>
        </View>
        <View>
          <Text style={styles.greetingLabel}>Good Afternoon</Text>
          <Text style={styles.greetingName}>ALVIN B. LLENOS</Text>
        </View>
      </View>

      {/* Summary card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{stats.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#7c3aed' }]}>{stats.repaired}</Text>
          <Text style={styles.summaryLabel}>Repaired</Text>
        </View>
      </View>

      {/* Leak Detection Overview */}
      <Text style={styles.sectionTitle}>Leak Detection Overview</Text>

      <View style={styles.card}>
        <View style={[styles.iconBadge, { backgroundColor: '#e0f2fe', borderColor: '#38bdf8' }]}> 
          <Ionicons name="water-outline" size={20} color="#0ea5e9" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Total Reports</Text>
          <Text style={styles.cardSubtitle}>All leak reports</Text>
        </View>
        <Text style={styles.cardValue}>{stats.total}</Text>
      </View>

      <View style={styles.card}>
        <View style={[styles.iconBadge, { backgroundColor: '#f5e9ff', borderColor: '#c084fc' }]}> 
          <Ionicons name="checkmark-circle-outline" size={20} color="#7c3aed" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Repaired</Text>
          <Text style={styles.cardSubtitle}>Completed fixes</Text>
        </View>
        <Text style={[styles.cardValue, { color: '#7c3aed' }]}>{stats.repaired}</Text>
      </View>

      <View style={styles.card}>
        <View style={[styles.iconBadge, { backgroundColor: '#fff7ed', borderColor: '#fb923c' }]}> 
          <Ionicons name="camera-outline" size={20} color="#f59e0b" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>After Meter</Text>
          <Text style={styles.cardSubtitle}>Post-meter leaks</Text>
        </View>
        <Text style={[styles.cardValue, { color: '#f59e0b' }]}>{stats.afterMeter}</Text>
      </View>

      <View style={styles.card}>
        <View style={[styles.iconBadge, { backgroundColor: '#fee2e2', borderColor: '#ef4444' }]}> 
          <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Not Found</Text>
          <Text style={styles.cardSubtitle}>Unlocated leaks</Text>
        </View>
        <Text style={[styles.cardValue, { color: '#ef4444' }]}>{stats.notFound}</Text>
      </View>

      {/* Recent Activity */}
      <View style={styles.recentHeaderRow}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity>
          <Text style={styles.refresh}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {recent.map(item => (
        <View key={item.id} style={styles.activityCard}>
          <View style={styles.activityIconWrap}>
            <Ionicons name="water-outline" size={20} color="#9ca3af" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.activityId}>{item.id}</Text>
            <Text style={styles.activityTitle}>{item.title}</Text>
            <Text style={styles.activityMeter}>Meter: {item.meter}</Text>
          </View>
          <Text style={styles.activityDate}>{item.date}</Text>
        </View>
      ))}

      {/* Bottom nav placeholder (tabs already exist) */}
      <View style={{ height: 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    // Remove top padding here; handled by header with safe area
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    paddingHorizontal: 16,
    // Remove top corner radius to avoid visible gap under dynamic island
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2e539e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '700' },
  greetingLabel: { color: '#060606ff', fontSize: 12 },
  greetingName: { color: '#060606ff', fontWeight: '700' },

  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginTop: -12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '700', color: '#111827' },
  summaryLabel: { color: '#6b7280', marginTop: 4 },
  separator: { width: 1, backgroundColor: '#e5e7eb', marginHorizontal: 12 },

  sectionTitle: { color: '#17336d', fontWeight: '700', marginBottom: 12, fontSize: 16 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  cardTitle: { fontWeight: '600', color: '#1f2937' },
  cardSubtitle: { color: '#6b7280', fontSize: 12 },
  cardValue: { fontWeight: '700', color: '#111827', fontSize: 18 },

  recentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  refresh: { color: '#1f3a8a', fontWeight: '600' },

  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  activityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityId: { fontWeight: '700', color: '#111827' },
  activityTitle: { color: '#374151' },
  activityMeter: { color: '#6b7280', fontSize: 12 },
  activityDate: { color: '#6b7280' },
});