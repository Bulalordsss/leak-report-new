import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import Upload from '@/components/ui/upload';
import { useReportForm } from '@/utils/reportFormStore';

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; address?: string; account?: string; dma?: string; coords?: string }>();

  const {
    leakType, setLeakType,
    location, setLocation,
    contactPerson, setContactPerson,
    contactNumber, setContactNumber,
    landmark, setLandmark,
    leakPhotos, setLeakPhotos,
    landmarkPhotos, setLandmarkPhotos,
    reset,
  } = useReportForm();

  const selectedMeter = useMemo(() => ({
    id: params.id ?? '—',
    account: params.account ?? '—',
    address: params.address ?? '—',
    dma: params.dma ?? '—',
    coords: params.coords ?? '—',
  }), [params]);

  const submit = () => {
    Alert.alert('Submitted', 'Your leak report has been queued for sending.');
    reset();
    router.back();
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
        {/* Selected Meter */}
        <View style={styles.sheet}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="disc-outline" size={16} color="#1f3a8a" style={{ marginRight: 6 }} />
            <Text style={styles.sheetTitle}>Selected Meter</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}><Ionicons name="speedometer-outline" size={18} color="#1f3a8a" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Meter Number</Text>
              <Text style={styles.detailValue}>{selectedMeter.id}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}><Ionicons name="location-outline" size={18} color="#1f3a8a" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{selectedMeter.address}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}><Ionicons name="pin-outline" size={18} color="#1f3a8a" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Coordinates</Text>
              <Text style={styles.detailValue}>{selectedMeter.coords}</Text>
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
          <Text style={styles.sectionTitle}>Leak Type</Text>
          <View style={styles.grid2}>
            {(['Unidentified','Serviceline','Mainline','Others'] as const).map((t) => {
              const isSelected = leakType === t;
              return (
                <TouchableOpacity key={t} style={[styles.choiceBtn, isSelected && styles.choiceBtnActive]} onPress={() => setLeakType(t)} activeOpacity={0.85}>
                  <Text style={[styles.choiceLabel, isSelected && styles.choiceLabelActive]}>{t}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginLeft: 6 }} />}
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Location */}
          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Location</Text>
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

          {/* Contact Person */}
          <Text style={styles.sectionTitle}>Contact Person</Text>
          <View style={styles.inputRow}>
            <Ionicons name="business-outline" size={18} color="#1f3a8a" />
            <TextInput
              placeholder="Enter name"
              style={styles.input}
              value={contactPerson}
              onChangeText={setContactPerson}
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Contact Number */}
          <Text style={styles.sectionTitle}>Contact Number</Text>
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
          <Text style={styles.sectionTitle}>Reported Landmark</Text>
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
            <Upload title="Leak Photos (2 only)" max={2} value={leakPhotos} onChange={setLeakPhotos} />
          </View>

          {/* Landmark Photo */}
          <View style={{ marginTop: 12 }}>
            <Upload title="Landmark Photo" max={1} value={landmarkPhotos} onChange={setLandmarkPhotos} />
          </View>
        </View>
        {/* Footer note + submit */}
        <View style={{ marginHorizontal: 16, marginTop: 12 }}>
          <View style={styles.inlineInfo}>
            <Ionicons name="send-outline" size={18} color="#1f3a8a" />
            <Text style={[styles.inlineInfoText, { color: '#374151', marginLeft: 8 }]}>Report will be sent to our team</Text>
          </View>
          <TouchableOpacity style={styles.reportBtn} activeOpacity={0.9} onPress={submit}>
            <Text style={styles.reportBtnText}>Send Report</Text>
          </TouchableOpacity>
          {/* Clear form button */}
          <TouchableOpacity style={styles.clearBtn} activeOpacity={0.9} onPress={reset}>
            <Text style={styles.clearBtnText}>Clear Form</Text>
          </TouchableOpacity>
        </View>
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
  reportBtnText: { color: '#fff', fontWeight: '700' },
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
});
