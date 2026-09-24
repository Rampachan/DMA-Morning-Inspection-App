import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Submission } from '../types';
import { getMySubmissions } from '../services/submissionService';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

const HistoryScreen: React.FC<Props> = ({ navigation }) => {
  const today = toDateString(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async (date: string, isRefresh = false): Promise<void> => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getMySubmissions(date);
      setSubmissions(data);
    } catch {
      setError('Could not load submissions. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchSubmissions(selectedDate);
  }, [selectedDate, fetchSubmissions]);

  const shiftDate = (delta: number): void => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    const newDate = toDateString(d);
    if (newDate <= today) setSelectedDate(newDate);
  };

  const renderItem = ({ item }: { item: Submission }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.cardLeft}>
          <Text style={styles.categoryName}>
            {(item as any).category?.name ?? item.category_name ?? `Category ${item.category_id}`}
          </Text>
          <Text style={styles.timeText}>📍 {fmtTime(item.device_timestamp)}</Text>
          <Text style={styles.photoCount}>
            🖼 {item.photos?.length ?? 0} photo{item.photos?.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.status === 'on_time' ? styles.badgeOnTime : styles.badgeLate,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.status === 'on_time' ? styles.statusTextOnTime : styles.statusTextLate,
            ]}
          >
            {item.status === 'on_time' ? '✓ On Time' : '⚠ Late'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submission History</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => shiftDate(-1)} style={styles.dateNavBtn}>
          <Text style={styles.dateNavBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dateLabel}>
          {selectedDate === today ? `Today (${selectedDate})` : selectedDate}
        </Text>
        <TouchableOpacity
          onPress={() => shiftDate(1)}
          style={[styles.dateNavBtn, selectedDate === today && styles.dateNavBtnDisabled]}
          disabled={selectedDate === today}
        >
          <Text
            style={[
              styles.dateNavBtnText,
              selectedDate === today && styles.dateNavBtnTextDisabled,
            ]}
          >
            ›
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1565c0" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => void fetchSubmissions(selectedDate)}
            style={styles.retryBtn}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={(item) => item.submission_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void fetchSubmissions(selectedDate, true)}
              colors={['#1565c0']}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No submissions for this date.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1565c0',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { width: 60 },
  backText: { color: '#fff', fontSize: 15 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateNavBtn: { paddingHorizontal: 16, paddingVertical: 4 },
  dateNavBtnDisabled: { opacity: 0.3 },
  dateNavBtnText: { fontSize: 28, color: '#1565c0', lineHeight: 32 },
  dateNavBtnTextDisabled: { color: '#aaa' },
  dateLabel: { fontSize: 15, fontWeight: '600', color: '#222' },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardLeft: { flex: 1 },
  categoryName: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 4 },
  timeText: { fontSize: 13, color: '#555', marginBottom: 2 },
  photoCount: { fontSize: 12, color: '#888' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginLeft: 12 },
  badgeOnTime: { backgroundColor: '#e8f5e9' },
  badgeLate: { backgroundColor: '#fdecea' },
  statusText: { fontSize: 12, fontWeight: '700' },
  statusTextOnTime: { color: '#2e7d32' },
  statusTextLate: { color: '#c62828' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { color: '#c62828', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  retryBtn: {
    backgroundColor: '#1565c0',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  emptyText: { color: '#999', fontSize: 14, textAlign: 'center' },
});

export default HistoryScreen;
