import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  ToastAndroid,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Category, PhotoItem, QueuedSubmissionPayload } from '../types';
import CountdownTimer from '../components/CountdownTimer';
import CategoryPicker from '../components/CategoryPicker';
import PhotoCapture from '../components/PhotoCapture';
import UploadProgress from '../components/UploadProgress';
import { getCategories } from '../services/categoryService';
import { submit } from '../services/submissionService';
import { enqueue, init as initQueue } from '../services/offlineQueue';
import { logout } from '../services/authService';
import { getUser } from '../utils/secureStorage';
import { useNetwork } from '../hooks/useNetwork';
import { User } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Inspection'>;

function showToast(msg: string): void {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.LONG);
  } else {
    Alert.alert('Info', msg);
  }
}

const InspectionScreen: React.FC<Props> = ({ navigation }) => {
  const { isConnected } = useNetwork();

  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const deviceTimestampRef = useRef<string | null>(null);

  useEffect(() => {
    void initQueue();
    void getUser().then(setUser);
    void loadCategories();
  }, []);

  const loadCategories = useCallback(async (): Promise<void> => {
    setCategoriesLoading(true);
    setCategoryError(null);
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch {
      setCategoryError('Failed to load categories. Tap to retry.');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const handleAddPhoto = (photo: PhotoItem): void => {
    setPhotos((prev) => [...prev, photo]);
    setSuccessMessage(null);
    setUploadError(null);
  };

  const handleRemovePhoto = (index: number): void => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!selectedCategory) {
      Alert.alert('Validation', 'Please select an inspection category.');
      return;
    }
    if (photos.length === 0) {
      Alert.alert('Validation', 'Please add at least one photo.');
      return;
    }

    deviceTimestampRef.current = new Date().toISOString();
    const deviceTimestamp = deviceTimestampRef.current;

    if (!isConnected) {
      const payload: QueuedSubmissionPayload = {
        categoryId: selectedCategory,
        deviceTimestamp,
        photos,
      };
      try {
        await enqueue(payload);
        resetForm();
        showToast('📤 Queued for later upload — will send when online.');
      } catch {
        Alert.alert('Error', 'Failed to save to offline queue.');
      }
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setUploadError(null);
    setSuccessMessage(null);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 15, 85));
      }, 400);

      await submit({
        categoryId: selectedCategory,
        deviceTimestamp,
        photos,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const timeStr = new Date().toLocaleTimeString();
      setSuccessMessage(`✅ Submission recorded at ${timeStr}`);
      resetForm();
    } catch (err: unknown) {
      const raw = err as { response?: { status: number } } & Error;
      if (raw?.response?.status === 401) {
        setUploadError('Session expired. Please log in again.');
      } else if (raw?.response?.status !== undefined) {
        setUploadError(`Server error (${raw.response.status}). Please try again.`);
      } else {
        setUploadError(raw?.message ?? 'Upload failed. Please retry.');
      }
    } finally {
      setUploading(false);
    }
  };

  const resetForm = (): void => {
    setSelectedCategory(null);
    setPhotos([]);
    setUploadProgress(0);
    setUploadError(null);
  };

  const handleLogout = (): void => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.replace('Login');
        },
      },
    ]);
  };

  const canSubmit = !!selectedCategory && photos.length > 0 && !uploading;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>MCRS Inspection</Text>
          {user && (
            <Text style={styles.headerSub}>
              {user.name} · {user.ulb_name ?? `ULB ${user.ulb_id}`}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>📵 Offline — submissions will be queued</Text>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <CountdownTimer />

        {categoryError && (
          <TouchableOpacity onPress={loadCategories} style={styles.retryBox}>
            <Text style={styles.retryText}>{categoryError} Tap to retry.</Text>
          </TouchableOpacity>
        )}

        <CategoryPicker
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          loading={categoriesLoading}
        />

        <PhotoCapture
          photos={photos}
          onAdd={handleAddPhoto}
          onRemove={handleRemovePhoto}
        />

        <UploadProgress
          uploading={uploading}
          progress={uploadProgress}
          error={uploadError}
        />

        {successMessage && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityLabel="Submit Inspection"
        >
          <Text style={styles.submitBtnText}>
            {uploading ? 'Uploading…' : '📋 Submit Inspection'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => navigation.navigate('History')}
        >
          <Text style={styles.historyBtnText}>📅 View History</Text>
        </TouchableOpacity>
      </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: '#bbdefb', marginTop: 2 },
  logoutBtn: { borderWidth: 1, borderColor: '#90caf9', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  logoutText: { color: '#fff', fontSize: 13 },
  offlineBanner: { backgroundColor: '#f57f17', paddingVertical: 8, alignItems: 'center' },
  offlineBannerText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  retryBox: { backgroundColor: '#fff3e0', borderRadius: 8, padding: 12, marginBottom: 12 },
  retryText: { color: '#e65100', fontSize: 13 },
  successBox: { backgroundColor: '#e8f5e9', borderRadius: 8, padding: 14, marginBottom: 12, alignItems: 'center' },
  successText: { color: '#2e7d32', fontSize: 15, fontWeight: '600' },
  submitBtn: { backgroundColor: '#1565c0', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  submitBtnDisabled: { backgroundColor: '#bdbdbd' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  historyBtn: { borderWidth: 1.5, borderColor: '#1565c0', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  historyBtnText: { color: '#1565c0', fontSize: 15, fontWeight: '600' },
});

export default InspectionScreen;
