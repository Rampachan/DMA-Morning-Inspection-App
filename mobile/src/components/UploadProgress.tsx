import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface UploadProgressProps {
  uploading: boolean;
  progress: number; // 0–100
  error: string | null;
}

const UploadProgress: React.FC<UploadProgressProps> = ({ uploading, progress, error }) => {
  if (!uploading && !error) {
    return null;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ActivityIndicator size="small" color="#1565c0" />
        <Text style={styles.label}>Uploading… {clamped}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { marginLeft: 8, fontSize: 14, color: '#1565c0', fontWeight: '500' },
  track: {
    height: 6,
    backgroundColor: '#bbdefb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: '#1565c0', borderRadius: 3 },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 12,
    padding: 12,
    backgroundColor: '#fdecea',
    borderRadius: 8,
  },
  errorIcon: { fontSize: 16, marginRight: 8 },
  errorText: { flex: 1, color: '#c62828', fontSize: 14, lineHeight: 20 },
});

export default UploadProgress;
