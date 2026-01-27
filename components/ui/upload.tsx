import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

export type UploadProps = {
  title?: string;
  max?: number; // max number of photos allowed
  value: string[]; // current URIs
  onChange: (uris: string[]) => void;
};

async function askLibraryPermission() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Please allow access to your photos to attach images.');
    return false;
  }
  return true;
}

async function askCameraPermission() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Please allow camera access to take photos.');
    return false;
  }
  return true;
}

export function Upload({ title, max = 1, value, onChange }: UploadProps) {
  const addPhoto = () => {
    if (value.length >= max) return;
    Alert.alert(title ?? 'Add Photo', 'Choose a source', [
      { text: 'Camera', onPress: async () => {
          if (!(await askCameraPermission())) return;
          const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!res.canceled && res.assets?.length) {
            onChange([...value, res.assets[0].uri].slice(0, max));
          }
        }
      },
      { text: 'Gallery', onPress: async () => {
          if (!(await askLibraryPermission())) return;
          const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
          if (!res.canceled && res.assets?.length) {
            onChange([...value, res.assets[0].uri].slice(0, max));
          }
        }
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const removePhoto = (uri: string) => onChange(value.filter(v => v !== uri));

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title ?? 'Photos'}</Text>
        <Text style={styles.count}>{value.length}/{max}</Text>
      </View>
      <View style={styles.row}>
        {value.map((uri) => (
          <View key={uri} style={styles.photoWrap}>
            <Image source={{ uri }} style={styles.photo} contentFit="cover" />
            <TouchableOpacity style={styles.photoClose} onPress={() => removePhoto(uri)}>
              <Ionicons name="close" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
        {value.length < max && (
          <TouchableOpacity style={[styles.photoWrap, styles.photoAdd]} onPress={addPhoto} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color="#1f3a8a" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#111827', fontWeight: '700' },
  count: { color: '#6b7280' },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
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
});

export default Upload;
