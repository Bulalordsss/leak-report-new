import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMobileReportStore } from '@/utils/mobileReportStore';
import { CachedLeakReport } from '@/services/mobileReport';

type FilterTab = 'all' | 'pending' | 'synced' | 'failed';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#f59e0b', bg: '#fef3c7', icon: 'time-outline' as const },
  syncing: { label: 'Syncing', color: '#3b82f6', bg: '#dbeafe', icon: 'sync-outline' as const },
  synced: { label: 'Synced', color: '#10b981', bg: '#d1fae5', icon: 'checkmark-circle-outline' as const },
  failed: { label: 'Failed', color: '#ef4444', bg: '#fee2e2', icon: 'close-circle-outline' as const },
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function SubmittedReportsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);

  const {
    cachedReports,
    isLoading,
    isSyncing,
    loadCachedReports,
    syncAllPending,
    syncReport,
    removeReport,
    clearSyncedReports,
    getPendingCount,
    getSyncedCount,
    getFailedCount,
  } = useMobileReportStore();

  useEffect(() => {
    loadCachedReports();
  }, []);

  const pendingCount = getPendingCount();
  const failedCount = getFailedCount();
  const syncedCount = getSyncedCount();
  const unsyncedCount = pendingCount + failedCount;

  const filteredReports = cachedReports
    .filter((r) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'pending') return r.syncStatus === 'pending' || r.syncStatus === 'syncing';
      if (activeTab === 'synced') return r.syncStatus === 'synced';
      if (activeTab === 'failed') return r.syncStatus === 'failed';
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCachedReports();
    setRefreshing(false);
  };

  const handleSyncAll = async () => {
    if (unsyncedCount === 0) {
      Alert.alert('All Synced', 'There are no unsynced reports to submit.');
      return;
    }

    Alert.alert(
      'Sync All Reports',
      `Submit ${unsyncedCount} unsynced report${unsyncedCount > 1 ? 's' : ''} to the server?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync All',
          onPress: async () => {
            const result = await syncAllPending();
            Alert.alert(
              'Sync Complete',
              `${result.success} synced successfully${result.failed > 0 ? `, ${result.failed} failed` : ''}.`,
            );
          },
        },
      ],
    );
  };

  const handleSyncOne = async (id: string) => {
    const success = await syncReport(id);
    if (success) {
      Alert.alert('Success', 'Report synced successfully.');
    } else {
      Alert.alert('Failed', 'Could not sync report. Please try again.');
    }
  };

  const handleDelete = (report: CachedLeakReport) => {
    Alert.alert(
      'Delete Report',
      `Delete this ${report.syncStatus === 'synced' ? 'synced' : 'unsynced'} report?\n\nMeter: ${report.meterNumber}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeReport(report.id),
        },
      ],
    );
  };

  const handleClearSynced = () => {
    if (syncedCount === 0) {
      Alert.alert('Nothing to Clear', 'No synced reports to clear.');
      return;
    }
    Alert.alert(
      'Clear Synced Reports',
      `Remove ${syncedCount} synced report${syncedCount > 1 ? 's' : ''} from local storage? They are already submitted to the server.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearSyncedReports(),
        },
      ],
    );
  };

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: cachedReports.length },
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'synced', label: 'Synced', count: syncedCount },
    { key: 'failed', label: 'Failed', count: failedCount },
  ];

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Submitted Reports</Text>
          <Text style={styles.headerSubtitle}>{cachedReports.length} total reports</Text>
        </View>
        {syncedCount > 0 && (
          <TouchableOpacity onPress={handleClearSynced} style={styles.headerAction}>
            <Ionicons name="trash-outline" size={18} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Sync banner */}
      {unsyncedCount > 0 && (
        <TouchableOpacity
          style={styles.syncBanner}
          activeOpacity={0.85}
          onPress={handleSyncAll}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.syncBannerText}>Syncing reports...</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              <Text style={styles.syncBannerText}>
                Sync {unsyncedCount} unsynced report{unsyncedCount > 1 ? 's' : ''}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" style={{ marginLeft: 'auto' }} />
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Filter tabs */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Reports list */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#1f3a8a']} />}
      >
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#1f3a8a" />
            <Text style={styles.emptyText}>Loading reports...</Text>
          </View>
        ) : filteredReports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>
              {activeTab === 'all' ? 'No Reports Yet' : `No ${activeTab} reports`}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'all'
                ? 'Reports you submit will appear here.'
                : `You don't have any ${activeTab} reports.`}
            </Text>
          </View>
        ) : (
          filteredReports.map((report) => {
            const status = STATUS_CONFIG[report.syncStatus] || STATUS_CONFIG.pending;
            return (
              <View key={report.id} style={styles.reportCard}>
                {/* Status badge + date */}
                <View style={styles.cardHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Ionicons name={status.icon} size={14} color={status.color} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(report.createdAt)}</Text>
                </View>

                {/* Meter info */}
                <View style={styles.cardBody}>
                  <View style={styles.infoRow}>
                    <Ionicons name="speedometer-outline" size={16} color="#6b7280" style={{ marginRight: 8 }} />
                    <Text style={styles.infoLabel}>Meter:</Text>
                    <Text style={styles.infoValue}>{report.meterNumber || '—'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color="#6b7280" style={{ marginRight: 8 }} />
                    <Text style={styles.infoLabel}>Address:</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>{report.address || '—'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="water-outline" size={16} color="#6b7280" style={{ marginRight: 8 }} />
                    <Text style={styles.infoLabel}>Type:</Text>
                    <Text style={styles.infoValue}>{report.leakType || '—'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={16} color="#6b7280" style={{ marginRight: 8 }} />
                    <Text style={styles.infoLabel}>Contact:</Text>
                    <Text style={styles.infoValue}>{report.contactPerson || '—'}</Text>
                  </View>
                  {report.serverReferenceNumber && (
                    <View style={styles.infoRow}>
                      <Ionicons name="document-text-outline" size={16} color="#10b981" style={{ marginRight: 8 }} />
                      <Text style={styles.infoLabel}>Ref #:</Text>
                      <Text style={[styles.infoValue, { color: '#10b981', fontWeight: '700' }]}>
                        {report.serverReferenceNumber}
                      </Text>
                    </View>
                  )}
                  {report.syncError && (
                    <View style={styles.errorRow}>
                      <Ionicons name="warning-outline" size={14} color="#ef4444" style={{ marginRight: 6 }} />
                      <Text style={styles.errorText} numberOfLines={2}>{report.syncError}</Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.cardActions}>
                  {(report.syncStatus === 'pending' || report.syncStatus === 'failed') && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleSyncOne(report.id)}
                      disabled={isSyncing}
                    >
                      <Ionicons name="cloud-upload-outline" size={16} color="#1f3a8a" />
                      <Text style={styles.actionBtnText}>Sync</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(report)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
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
  headerTitle: { color: '#000', fontWeight: '700', fontSize: 18 },
  headerSubtitle: { color: '#6b7280', fontSize: 13 },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f3a8a',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#1f3a8a',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  syncBannerText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#fff',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#1f3a8a',
  },
  tabText: { color: '#6b7280', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  tabBadge: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText: { color: '#6b7280', fontSize: 11, fontWeight: '700' },
  tabBadgeTextActive: { color: '#fff' },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
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
    paddingHorizontal: 32,
  },

  reportCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  dateText: { color: '#9ca3af', fontSize: 12 },

  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: { color: '#6b7280', fontSize: 13, marginRight: 4 },
  infoValue: { color: '#111827', fontSize: 13, fontWeight: '600', flex: 1 },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  errorText: { color: '#ef4444', fontSize: 12, flex: 1 },

  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  deleteBtn: {
    borderLeftWidth: 1,
    borderLeftColor: '#f3f4f6',
  },
  actionBtnText: { color: '#1f3a8a', fontWeight: '600', fontSize: 13 },
});
