import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/utils/authStore';
import { useDashboardStore } from '@/utils/dashboardStore';
import { useMobileReportStore } from '@/utils/mobileReportStore';
import { useDraftReportsStore } from '@/utils/draftReportsStore';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { counts, reports, isLoading, error, fetchDashboard } = useDashboardStore();
  const { cachedReports, loadCachedReports, getPendingCount, getFailedCount } = useMobileReportStore();
  const { drafts, loadDrafts, getDraftsCount } = useDraftReportsStore();
  const unsyncedCount = getPendingCount() + getFailedCount();
  const draftCount = getDraftsCount();

  // Reload drafts and cached reports when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadCachedReports();
      loadDrafts();
      if (user?.empId) {
        fetchDashboard(user.empId);
      }
    }, [user?.empId])
  );

  useEffect(() => {
    loadCachedReports();
    loadDrafts();
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

  // Get the 3 most recent reports
  const recentReports = useMemo(() => {
    return reports
      .slice()
      .sort((a, b) => new Date(b.dtReported).getTime() - new Date(a.dtReported).getTime())
      .slice(0, 3);
  }, [reports]);

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
        {/* Summary cards in a row */}
        <View style={styles.summaryRow}>
          {/* Submitted Reports Summary */}
          <View style={styles.summaryCardSmall}>
            <View style={styles.summaryIconWrapper}>
              <Ionicons name="list-outline" size={24} color="#1f3a8a" />
            </View>
            <Text style={styles.summaryValueSmall}>{cachedReports.length}</Text>
            <Text style={styles.summaryLabelSmall}>Submitted</Text>
            <View style={styles.subStatsRow}>
              <View style={styles.subStat}>
                <Text style={[styles.subStatValue, { color: '#10b981' }]}>
                  {cachedReports.filter(r => r.syncStatus === 'synced' && r.serverReferenceNumber).length}
                </Text>
                <Text style={styles.subStatLabel}>Synced</Text>
              </View>
              <View style={styles.subStatDivider} />
              <View style={styles.subStat}>
                <Text style={[styles.subStatValue, { color: '#6b7280' }]}>{unsyncedCount}</Text>
                <Text style={styles.subStatLabel}>Pending</Text>
              </View>
            </View>
          </View>

          {/* Draft Reports Summary */}
          <View style={styles.summaryCardSmall}>
            <View style={[styles.summaryIconWrapper, { backgroundColor: '#eef2ff' }]}>
              <Ionicons name="document-outline" size={24} color="#1f3a8a" />
            </View>
            <Text style={styles.summaryValueSmall}>{draftCount}</Text>
            <Text style={styles.summaryLabelSmall}>Drafts</Text>
          </View>
        </View>

        {/* See Submitted Reports button */}
        <View style={{ marginHorizontal: 16, marginTop: 8 }}>
          <TouchableOpacity
            style={styles.seeReportsBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/screens/submittedReports' as any)}
          >
            <Ionicons name="list-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.seeReportsBtnText}>See Submitted Reports</Text>
            {unsyncedCount > 0 && (
              <View style={styles.unsyncedBadge}>
                <Text style={styles.unsyncedBadgeText}>{unsyncedCount}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color="#fff" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        {/* See Draft Reports button */}
        <View style={{ marginHorizontal: 16, marginTop: 12 }}>
          <TouchableOpacity
            style={styles.seeDraftsBtn}
            activeOpacity={0.85}
            onPress={() => {
              router.push('/screens/draftReports' as any);
            }}
          >
            <Ionicons name="document-outline" size={20} color="#1f3a8a" style={{ marginRight: 8 }} />
            <Text style={styles.seeDraftsBtnText}>See Draft Reports</Text>
            <Ionicons name="chevron-forward" size={18} color="#1f3a8a" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
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

        {/* Recent Activity */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recent Activity</Text>

        {recentReports.length === 0 && !isLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyStateText}>No recent reports</Text>
            <Text style={styles.emptyStateSubtext}>Your submitted reports will appear here</Text>
          </View>
        ) : (
          recentReports.map((report, index) => {
            const reportDate = new Date(report.dtReported);
            const formattedDate = reportDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            });
            const formattedTime = reportDate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit'
            });

            // Determine status - Synced or Not Synced based on refNo
            const isSynced = report.refNo && report.refNo.trim() !== '';
            const statusColor = isSynced ? '#10b981' : '#6b7280';
            const statusIcon = isSynced ? 'checkmark-circle' : 'cloud-upload-outline';
            const statusText = isSynced ? 'Synced' : 'Not Synced';

            // Get leak type label
            const leakTypeLabels: { [key: number]: string } = {
              38: 'Serviceline',
              39: 'Mainline',
              40: 'Others',
              61: 'Valve',
              64: 'Blow-off',
              65: 'Fire Hydrant',
              66: 'Air Release'
            };
            const leakTypeLabel = leakTypeLabels[report.leakTypeId] || 'Unknown';

            return (
              <View key={report.id} style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <View style={[styles.activityIcon, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
                    <Ionicons name={statusIcon} size={20} color={statusColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityTitle}>{leakTypeLabel} Leak</Text>
                    <Text style={styles.activitySubtitle}>{report.reportedLocation}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
                  </View>
                </View>
                
                <View style={styles.activityDetails}>
                  <View style={styles.activityDetailRow}>
                    <Ionicons name="location-outline" size={14} color="#6b7280" />
                    <Text style={styles.activityDetailText} numberOfLines={1}>
                      {report.reportedLandmark || 'No landmark'}
                    </Text>
                  </View>
                  <View style={styles.activityDetailRow}>
                    <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                    <Text style={styles.activityDetailText}>
                      {formattedDate} at {formattedTime}
                    </Text>
                  </View>
                  {report.refNo && (
                    <View style={styles.activityDetailRow}>
                      <Ionicons name="document-text-outline" size={14} color="#6b7280" />
                      <Text style={styles.activityDetailText}>Ref: {report.refNo}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}

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
  
  // New summary card styles for side-by-side layout
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    gap: 12,
  },
  summaryCardSmall: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    alignItems: 'center',
  },
  summaryIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryValueSmall: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  summaryLabelSmall: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  subStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  subStat: {
    flex: 1,
    alignItems: 'center',
  },
  subStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  subStatLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  subStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  draftSubtext: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },

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
  seeDraftsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#1f3a8a',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  seeDraftsBtnText: { color: '#1f3a8a', fontWeight: '700', fontSize: 15 },
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

  // Empty state styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },

  // Activity card styles
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.5,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activityDetails: {
    gap: 6,
  },
  activityDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityDetailText: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
});