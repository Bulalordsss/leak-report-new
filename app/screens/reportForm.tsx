import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import Upload from '@/components/ui/upload';
import { useReportForm } from '@/utils/reportFormStore';
import { useLeakReport, createLeakReportPayload } from '@/hooks/mobileReportLeak';
import { useAuthStore } from '@/utils/authStore';
import { useDraftReportsStore } from '@/utils/draftReportsStore';

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ 
    id?: string; 
    address?: string; 
    account?: string; 
    dma?: string; 
    coords?: string;
    draftId?: string; // Add draftId to know if we're editing
  }>();
  const { user } = useAuthStore();
  const [showLeakTypeDropdown, setShowLeakTypeDropdown] = useState(false);

  const {
    leakType, setLeakType,
    
    location, setLocation,
    contactNumber, setContactNumber,
    landmark, setLandmark,
    leakPhotos, setLeakPhotos,
    landmarkPhotos, setLandmarkPhotos,
    reset,
  } = useReportForm();

  const { submitReport, isSubmitting, isOnline, pendingCount } = useLeakReport();
  const { saveDraft: saveDraftToStore, updateDraft: updateDraftInStore, deleteDraft } = useDraftReportsStore();

  // Check if we're editing an existing draft
  const isEditingDraft = !!params.draftId;

  // Leak type options with user-friendly display names (IDs are hidden from users)
const leakTypeOptions = [
  { value: 'Air Release', label: 'Air Release' },
  { value: 'Blow-off', label: 'Blow-off' },
  { value: 'Fire Hydrant', label: 'Fire Hydrant' },
  { value: 'Mainline', label: 'Mainline' },
  { value: 'Others', label: 'Others' },
  { value: 'Serviceline', label: 'Serviceline' },
  { value: 'Valve', label: 'Valve' },
];

  // Auto-populate contact person from logged-in user (use full name)
  const contactPerson = useMemo(() => {
    if (!user) return 'Unknown User';
    const fullName = `${user.fName || ''} ${user.mName || ''} ${user.lName || ''}`.trim();
    return fullName || user.username || user.empId || 'Unknown User';
  }, [user]);

  const selectedMeter = useMemo(() => ({
    id: params.id ?? '—',
    account: params.account ?? '—',
    address: params.address ?? '—',
    dma: params.dma ?? '—',
    coords: params.coords ?? '—',
  }), [params]);

  const submit = async () => {
    // Validate required fields
    if (!leakType) {
      Alert.alert('Missing Information', 'Please select a leak type.');
      return;
    }
    if (!location) {
      Alert.alert('Missing Information', 'Please select a location type.');
      return;
    }
    if (!contactNumber) {
      Alert.alert('Missing Information', 'Please enter a contact number.');
      return;
    }
    if (!landmark) {
      Alert.alert('Missing Information', 'Please enter a landmark.');
      return;
    }
    if (!leakPhotos || leakPhotos.length === 0) {
      Alert.alert('Missing Information', 'Please add at least one leak photo.');
      return;
    }
    if (!landmarkPhotos || landmarkPhotos.length === 0) {
      Alert.alert('Missing Information', 'Please add a landmark photo.');
      return;
    }

    console.log('[ReportForm] User object:', user);
    console.log('[ReportForm] Creating payload...');

    const payload = createLeakReportPayload({
      meterNumber: selectedMeter.id,
      accountNumber: selectedMeter.account,
      address: selectedMeter.address,
      dma: selectedMeter.dma,
      coordinates: selectedMeter.coords,
      leakType: leakType,
      location: location,
      contactPerson: contactPerson,
      contactNumber: contactNumber,
      landmark: landmark,
      leakPhotos: leakPhotos,
      landmarkPhotos: landmarkPhotos,
      empId: user?.empId || '',
    });

    console.log('[ReportForm] Payload created successfully');

    const result = await submitReport(payload);

    if (result.success) {
      // If we're editing a draft and successfully submitted, delete the draft
      if (isEditingDraft && params.draftId) {
        try {
          await deleteDraft(params.draftId);
        } catch (error) {
          console.error('Failed to delete draft after submission:', error);
        }
      }
      
      Alert.alert(
        result.cached ? 'Saved Offline' : 'Submitted',
        result.message,
        [{ text: 'OK', onPress: () => { reset(); router.back(); } }]
      );
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const saveDraft = async () => {
    try {
      const draftData = {
        meterNumber: selectedMeter.id,
        accountNumber: selectedMeter.account,
        address: selectedMeter.address,
        dma: selectedMeter.dma,
        coordinates: selectedMeter.coords,
        leakType: leakType,
        location: location,
        contactPerson: contactPerson,
        contactNumber: contactNumber,
        landmark: landmark,
        leakPhotos: leakPhotos,
        landmarkPhotos: landmarkPhotos,
        empId: user?.empId || '',
      };

      // If editing existing draft, update it. Otherwise, create new draft.
      if (isEditingDraft && params.draftId) {
        await updateDraftInStore(params.draftId, draftData);
        Alert.alert('Draft Updated', 'Your draft has been updated successfully.', [
          { text: 'OK', onPress: () => { reset(); router.back(); } }
        ]);
      } else {
        await saveDraftToStore(draftData);
        Alert.alert('Draft Saved', 'Your report has been saved as a draft.', [
          { text: 'OK', onPress: () => { reset(); router.back(); } }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save draft. Please try again.');
    }
  };

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}> 
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color="#000" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Leak Report Form</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Selected Meter - Compact View */}
        <View style={styles.sheet}>
          <View style={styles.compactMeterRow}>
            <View style={styles.meterInfoLeft}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="speedometer-outline" size={16} color="#6b7280" style={{ marginRight: 4 }} />
                <Text style={styles.compactLabel}>Meter:</Text>
              </View>
              <Text style={styles.compactValue}>{selectedMeter.id}</Text>
            </View>
            
            <View style={styles.meterInfoRight}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="location-outline" size={16} color="#6b7280" style={{ marginRight: 4 }} />
                <Text style={styles.compactLabel}>Address:</Text>
              </View>
              <Text style={styles.compactValue} numberOfLines={2}>{selectedMeter.address}</Text>
            </View>
          </View>
        </View>

        {/* Info note */}
        <View style={[styles.inlineInfo, { marginHorizontal: 16, marginTop: 12 }]}> 
          <Ionicons name="information-circle-outline" size={18} color="#2563eb" />
          <Text style={styles.inlineInfoText}>Please provide details about the leak</Text>
        </View>

        {/* Leak Type */}
        <View style={styles.sheet}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Leak Type</Text>
            <Text style={styles.asterisk}> *</Text>
          </View>
          
          {/* Dropdown for Leak Type */}
          <TouchableOpacity 
            style={styles.dropdownButton} 
            onPress={() => setShowLeakTypeDropdown(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="water-outline" size={18} color="#1f3a8a" />
            <Text style={[styles.dropdownText, !leakType && styles.dropdownPlaceholder]}>
              {leakType 
                ? leakTypeOptions.find(opt => opt.value === leakType)?.label || leakType
                : 'Select leak type'
              }
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6b7280" />
          </TouchableOpacity>

          {/* Location */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <Text style={styles.sectionTitle}>Location (Leak Indicator)</Text>
            <Text style={styles.asterisk}> *</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {(['Surface','Non-Surface'] as const).map((t) => {
              const isSelected = location === t;
              return (
                <TouchableOpacity key={t} style={[styles.choiceBtn, { flex: 1 }, isSelected && styles.choiceBtnActive]} onPress={() => setLocation(t)} activeOpacity={0.85}>
                  <Text style={[styles.choiceLabel, isSelected && styles.choiceLabelActive]}>{t}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginLeft: 6 }} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Contact Person - Auto-populated from logged-in user */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <Text style={styles.sectionTitle}>Contact Person (Reported By)</Text>
            <Text style={styles.asterisk}> *</Text>
          </View>
          <View style={[styles.inputRow, { backgroundColor: '#f3f4f6' }]}>
            <Ionicons name="person-outline" size={18} color="#1f3a8a" />
            <Text style={[styles.input, { color: '#374151' }]}>{contactPerson}</Text>
          </View>

          {/* Contact Number */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <Text style={styles.sectionTitle}>Contact Number</Text>
            <Text style={styles.asterisk}> *</Text>
          </View>
          <View style={styles.inputRow}>
            <Ionicons name="call-outline" size={18} color="#1f3a8a" />
            <TextInput
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              style={styles.input}
              value={contactNumber}
              onChangeText={setContactNumber}
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Reported Landmark */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <Text style={styles.sectionTitle}>Reported Landmark</Text>
            <Text style={styles.asterisk}> *</Text>
          </View>
          <View style={styles.inputRow}>
            <Ionicons name="location" size={18} color="#1f3a8a" />
            <TextInput
              placeholder="Enter landmark"
              style={styles.input}
              value={landmark}
              onChangeText={setLandmark}
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Photo helper */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <Ionicons name="camera-outline" size={18} color="#1f3a8a" />
            <Text style={{ marginLeft: 8, color: '#374151' }}>Add photos to help identify the leak</Text>
          </View>

          {/* Leak Photos */}
          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: '#111827', fontWeight: '600', fontSize: 14 }}>Leak Photos (Atleast 1 Image)</Text>
              <Text style={styles.asterisk}> *</Text>
            </View>
            <Upload title="" max={2} value={leakPhotos} onChange={setLeakPhotos} />
          </View>

          {/* Landmark Photo */}
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: '#111827', fontWeight: '600', fontSize: 14 }}>Landmark Photo (Required 1 Image)</Text>
              <Text style={styles.asterisk}> *</Text>
            </View>
            <Upload title="" max={1} value={landmarkPhotos} onChange={setLandmarkPhotos} />
          </View>
        </View>
        {/* Footer note + submit */}
        <View style={{ marginHorizontal: 16, marginTop: 12 }}>
          {/* Network status indicator */}
          <View style={[styles.inlineInfo, { marginBottom: 8 }]}>
            <Ionicons 
              name={isOnline ? "wifi" : "cloud-offline"} 
              size={18} 
              color={isOnline ? "#10b981" : "#f59e0b"} 
            />
            <Text style={[styles.inlineInfoText, { color: isOnline ? '#10b981' : '#f59e0b', marginLeft: 8 }]}>
              {isOnline ? 'Online' : 'Offline - Report will be saved locally'}
            </Text>
          </View>

          {pendingCount > 0 && (
            <View style={[styles.inlineInfo, { marginBottom: 8 }]}>
              <Ionicons name="time-outline" size={18} color="#6b7280" />
              <Text style={[styles.inlineInfoText, { color: '#6b7280', marginLeft: 8 }]}>
                {pendingCount} pending report{pendingCount > 1 ? 's' : ''} waiting to sync
              </Text>
            </View>
          )}

          <View style={styles.inlineInfo}>
            <Ionicons name="send-outline" size={18} color="#1f3a8a" />
            <Text style={[styles.inlineInfoText, { color: '#374151', marginLeft: 8 }]}>Report will be sent to our team</Text>
          </View>
          <TouchableOpacity 
            style={[styles.reportBtn, isSubmitting && styles.reportBtnDisabled]} 
            activeOpacity={0.9} 
            onPress={submit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.reportBtnText}>Send Report</Text>
            )}
          </TouchableOpacity>
          
          {/* Save/Update Draft button */}
          <TouchableOpacity 
            style={styles.draftBtn} 
            activeOpacity={0.9} 
            onPress={saveDraft}
            disabled={isSubmitting}
          >
            <Ionicons name="save-outline" size={18} color="#1f3a8a" style={{ marginRight: 8 }} />
            <Text style={styles.draftBtnText}>
              {isEditingDraft ? 'Update Draft' : 'Save Draft'}
            </Text>
          </TouchableOpacity>

          {/* Clear form button */}
          <TouchableOpacity style={styles.clearBtn} activeOpacity={0.9} onPress={reset} disabled={isSubmitting}>
            <Text style={styles.clearBtnText}>Clear Form</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Leak Type Dropdown Modal */}
      <Modal
        visible={showLeakTypeDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLeakTypeDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowLeakTypeDropdown(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Leak Type</Text>
              <TouchableOpacity onPress={() => setShowLeakTypeDropdown(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {leakTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalItem,
                    leakType === option.value && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    setLeakType(option.value as any);
                    setShowLeakTypeDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.modalItemText,
                    leakType === option.value && styles.modalItemTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {leakType === option.value && (
                    <Ionicons name="checkmark" size={20} color="#1f3a8a" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },

  // Compact meter display
  compactMeterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  meterInfoLeft: {
    flex: 1,
  },
  meterInfoRight: {
    flex: 2,
  },
  compactLabel: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '500',
  },
  compactValue: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },

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

  inlineInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineInfoText: { color: '#2563eb' },

  sectionTitle: { color: '#111827', fontWeight: '700', marginTop: 12 },

  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    flexBasis: '48%',
  },
  choiceBtnActive: { backgroundColor: '#1f3a8a', borderColor: '#1f3a8a' },
  choiceLabel: { color: '#111827', fontWeight: '600' },
  choiceLabelActive: { color: '#ffffff' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
    gap: 10,
  },
  input: { flex: 1, color: '#111827', paddingVertical: 4 },

  photoRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  photoWrap: {
    width: 140,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    position: 'relative',
  },
  photo: { width: '100%', height: '100%' },
  photoAdd: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  photoClose: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },

  reportBtn: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f3a8a',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#1f3a8a',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  reportBtnDisabled: {
    opacity: 0.6,
  },
  reportBtnText: { color: '#fff', fontWeight: '700' },
  draftBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#1f3a8a',
  },
  draftBtnText: { color: '#1f3a8a', fontWeight: '700' },
  clearBtn: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  clearBtnText: { color: '#111827', fontWeight: '700' },
  
  // Red asterisk for required fields
  asterisk: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 2,
  },
  
  // Dropdown button styles
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  dropdownText: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownPlaceholder: {
    color: '#9ca3af',
    fontWeight: '400',
  },
  
  // Modal styles for dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalList: {
    padding: 10,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginVertical: 4,
    backgroundColor: '#f9fafb',
  },
  modalItemSelected: {
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#1f3a8a',
  },
  modalItemText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  modalItemTextSelected: {
    color: '#1f3a8a',
    fontWeight: '700',
  },
});
