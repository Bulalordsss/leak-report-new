import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDraftReportsStore } from '@/utils/draftReportsStore';
import { useLeakReport, createLeakReportPayload } from '@/hooks/mobileReportLeak';
import { useReportForm } from '@/utils/reportFormStore';

export default function DraftReportsScreen() {
  const insets = useSafeAreaInsets();
  const { drafts, isLoading, loadDrafts, deleteDraft } = useDraftReportsStore();
  const { submitReport } = useLeakReport();
  const { setLeakType, setLocation, setContactNumber, setLandmark, setLeakPhotos, setLandmarkPhotos } = useReportForm();

  useEffect(() => {
    loadDrafts();
  }, []);

  const handleDeleteDraft = (id: string) => {
    Alert.alert(
      'Delete Draft',
      'Are you sure you want to delete this draft?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDraft(id);
              Alert.alert('Deleted', 'Draft has been deleted.');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete draft.');
            }
          },
        },
      ]
    );
  };

  const handleSendDraft = async (draft: any) => {
    Alert.alert(
      'Send Report',
      'Are you sure you want to submit this draft report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              const payload = createLeakReportPayload({
                meterNumber: draft.meterNumber,
                accountNumber: draft.accountNumber,
                address: draft.address,
                dma: draft.dma,
                wss: draft.wss ?? 0,
                coordinates: draft.coordinates,
                leakType: draft.leakType,
                location: draft.location,
                contactPerson: draft.contactPerson,
                contactNumber: draft.contactNumber,
                landmark: draft.landmark,
                leakPhotos: draft.leakPhotos,
                landmarkPhotos: draft.landmarkPhotos,
                empId: draft.empId,
                reportedAt: draft.savedAt, // Use the time the draft was saved, not now
              });

              const result = await submitReport(payload);

              if (result.success) {
                await deleteDraft(draft.id);
                Alert.alert(
                  result.cached ? 'Saved Offline' : 'Submitted',
                  'Draft report has been submitted successfully.'
                );
              } else {
                Alert.alert('Error', result.message);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to submit draft report.');
            }
          },
        },
      ]
    );
  };

  const handleEditDraft = (draft: any) => {
    // Load draft data into form store
    setLeakType(draft.leakType);
    setLocation(draft.location);
    setContactNumber(draft.contactNumber);
    setLandmark(draft.landmark);
    setLeakPhotos(draft.leakPhotos);
    setLandmarkPhotos(draft.landmarkPhotos);

    // Navigate to report form with the draft data AND draft ID for updating
    router.push({
      pathname: '/screens/reportForm',
      params: {
        id: draft.meterNumber,
        address: draft.address,
        account: draft.accountNumber,
        dma: draft.dma,
        wss: draft.wss ?? 0,
        coords: draft.coordinates,
        draftId: draft.id, // Pass the draft ID so form knows it's an edit
      }
    });
  };

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}> 
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Draft Reports</Text>
          <Text style={styles.headerSubtitle}>{drafts.length} draft{drafts.length !== 1 ? 's' : ''} saved</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1f3a8a" />
            <Text style={styles.loadingText}>Loading drafts...</Text>
          </View>
        ) : drafts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyStateTitle}>No Drafts</Text>
            <Text style={styles.emptyStateText}>You haven't saved any draft reports yet.</Text>
            <TouchableOpacity 
              style={styles.emptyStateBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.emptyStateBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          drafts.map((draft) => {
            const savedDate = new Date(draft.savedAt);
            const formattedDate = savedDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            });
            const formattedTime = savedDate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit'
            });

            return (
              <View key={draft.id} style={styles.draftCard}>
                <View style={styles.draftHeader}>
                  <View style={styles.draftIcon}>
                    <Ionicons name="document-text" size={20} color="#1f3a8a" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.draftTitle}>
                      {draft.leakType || 'No Leak Type'} Leak
                    </Text>
                    <Text style={styles.draftSubtitle}>
                      {draft.location || 'No Location'} • {formattedDate} at {formattedTime}
                    </Text>
                  </View>
                </View>

                <View style={styles.draftDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="speedometer-outline" size={14} color="#6b7280" />
                    <Text style={styles.detailText}>Meter: {draft.meterNumber}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={14} color="#6b7280" />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {draft.address}
                    </Text>
                  </View>
                  {draft.landmark && (
                    <View style={styles.detailRow}>
                      <Ionicons name="pin" size={14} color="#6b7280" />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {draft.landmark}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    activeOpacity={0.85}
                    onPress={() => handleEditDraft(draft)}
                  >
                    <Ionicons name="create-outline" size={18} color="#1f3a8a" />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sendBtn}
                    activeOpacity={0.85}
                    onPress={() => handleSendDraft(draft)}
                  >
                    <Ionicons name="send-outline" size={18} color="#fff" />
                    <Text style={styles.sendBtnText}>Send</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    activeOpacity={0.85}
                    onPress={() => handleDeleteDraft(draft.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
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
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { color: '#000000ff', fontWeight: '700', fontSize: 18 },
  headerSubtitle: { color: '#6b7280', fontSize: 13 },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    marginHorizontal: 16,
    marginTop: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyStateBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1f3a8a',
    borderRadius: 12,
  },
  emptyStateBtnText: {
    color: '#fff',
    fontWeight: '600',
  },

  draftCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  draftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  draftIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  draftTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  draftSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },

  draftDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#1f3a8a',
  },
  editBtnText: {
    color: '#1f3a8a',
    fontWeight: '600',
    fontSize: 14,
  },
  sendBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1f3a8a',
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteBtn: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
  },
});
