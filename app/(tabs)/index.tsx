import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/utils/authStore';
import { useDashboardStore } from '@/utils/dashboardStore';
import { useMobileReportStore } from '@/utils/mobileReportStore';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { counts, isLoading, error, fetchDashboard } = useDashboardStore();
  const { cachedReports, loadCachedReports, getPendingCount, getFailedCount } = useMobileReportStore();
  const unsyncedCount = getPendingCount() + getFailedCount();

  useEffect(() => {
    loadCachedReports();
    if (user?.empId) {
      fetchDashboard(user.empId);
    }
  }, [user?.empId]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const initials = user
    ? `${user.fName?.charAt(0) ?? ''}${user.lName?.charAt(0) ?? ''}`.toUpperCase()
    : '?';

  const fullName = user
    ? `${user.fName} ${user.mName ? user.mName + ' ' : ''}${user.lName}`.toUpperCase()
    : 'User';

  const handleRefresh = () => {
    if (user?.empId) {
      fetchDashboard(user.empId);
    }
  };

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}> 
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingLabel}>{greeting}</Text>
          <Text style={styles.greetingName}>{fullName}</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={22} color="#1f3a8a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{counts.totalCount}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#10b981' }]}>{counts.repairedCount}</Text>
            <Text style={styles.summaryLabel}>Repaired</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#0ea5e9' }]}>{counts.reportedCount}</Text>
            <Text style={styles.summaryLabel}>Reported</Text>
          </View>
        </View>

        {/* Loading / Error */}
        {isLoading && (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color="#1f3a8a" />
            <Text style={styles.statusText}>Loading reports...</Text>
          </View>
        )}
        {error && !isLoading && (
          <View style={styles.statusRow}>
            <Ionicons name="alert-circle" size={18} color="#ef4444" />
            <Text style={[styles.statusText, { color: '#ef4444' }]}>{error}</Text>
            <TouchableOpacity onPress={handleRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

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
          <Text style={styles.cardValue}>{counts.totalCount}</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.iconBadge, { backgroundColor: '#dbeafe', borderColor: '#60a5fa' }]}> 
            <Ionicons name="document-text-outline" size={20} color="#3b82f6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Reported</Text>
            <Text style={styles.cardSubtitle}>Submitted reports</Text>
          </View>
          <Text style={[styles.cardValue, { color: '#3b82f6' }]}>{counts.reportedCount}</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.iconBadge, { backgroundColor: '#fef3c7', borderColor: '#fbbf24' }]}> 
            <Ionicons name="send-outline" size={20} color="#f59e0b" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Dispatched</Text>
            <Text style={styles.cardSubtitle}>Sent for repair</Text>
          </View>
          <Text style={[styles.cardValue, { color: '#f59e0b' }]}>{counts.dispatchedCount}</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.iconBadge, { backgroundColor: '#d1fae5', borderColor: '#34d399' }]}> 
            <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Repaired</Text>
            <Text style={styles.cardSubtitle}>Completed fixes</Text>
          </View>
          <Text style={[styles.cardValue, { color: '#10b981' }]}>{counts.repairedCount}</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.iconBadge, { backgroundColor: '#ede9fe', borderColor: '#a78bfa' }]}> 
            <Ionicons name="calendar-outline" size={20} color="#7c3aed" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Scheduled</Text>
            <Text style={styles.cardSubtitle}>Pending schedule</Text>
          </View>
          <Text style={[styles.cardValue, { color: '#7c3aed' }]}>{counts.scheduledCount}</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.iconBadge, { backgroundColor: '#fce7f3', borderColor: '#f472b6' }]}> 
            <Ionicons name="swap-horizontal-outline" size={20} color="#ec4899" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Turnover</Text>
            <Text style={styles.cardSubtitle}>Handed over</Text>
          </View>
          <Text style={[styles.cardValue, { color: '#ec4899' }]}>{counts.turnoverCount}</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.iconBadge, { backgroundColor: '#fff7ed', borderColor: '#fb923c' }]}> 
            <Ionicons name="speedometer-outline" size={20} color="#f97316" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>After Meter</Text>
            <Text style={styles.cardSubtitle}>Post-meter leaks</Text>
          </View>
          <Text style={[styles.cardValue, { color: '#f97316' }]}>{counts.afterCount}</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.iconBadge, { backgroundColor: '#fee2e2', borderColor: '#ef4444' }]}> 
            <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Not Found</Text>
            <Text style={styles.cardSubtitle}>Unlocated leaks</Text>
          </View>
          <Text style={[styles.cardValue, { color: '#ef4444' }]}>{counts.notFoundCount}</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.iconBadge, { backgroundColor: '#ecfdf5', borderColor: '#6ee7b7' }]}> 
            <Ionicons name="checkmark-done-outline" size={20} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Already Repaired</Text>
            <Text style={styles.cardSubtitle}>Previously fixed</Text>
          </View>
          <Text style={[styles.cardValue, { color: '#059669' }]}>{counts.alreadyRepaired}</Text>
        </View>

        {/* See Submitted Reports button */}
        <View style={{ marginHorizontal: 16, marginTop: 8 }}>
          <TouchableOpacity
            style={styles.seeReportsBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/screens/submittedReports' as any)}
          >
            <Ionicons name="list-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.seeReportsBtnText}>
              See Submitted Reports ({cachedReports.length})
            </Text>
            {unsyncedCount > 0 && (
              <View style={styles.unsyncedBadge}>
                <Text style={styles.unsyncedBadgeText}>{unsyncedCount}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color="#fff" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    paddingHorizontal: 16,
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
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    marginTop: 8,
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

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  statusText: { color: '#6b7280', fontSize: 13 },
  retryText: { color: '#1f3a8a', fontWeight: '600', fontSize: 13 },

  sectionTitle: { color: '#17336d', fontWeight: '700', marginBottom: 12, fontSize: 16, marginHorizontal: 16 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    marginHorizontal: 16,
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

  seeReportsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f3a8a',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#1f3a8a',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  seeReportsBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  unsyncedBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 22,
    alignItems: 'center',
  },
  unsyncedBadgeText: { color: '#fff', fontWeight: '700', fontSize: 11 },
});