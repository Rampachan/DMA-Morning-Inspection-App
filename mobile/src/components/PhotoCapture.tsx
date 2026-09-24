import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import { getCurrentLocation } from '../services/geoService';
import { PhotoItem } from '../types';
import { MAX_PHOTOS } from '../config';

interface PhotoCaptureProps {
  photos: PhotoItem[];
  onAdd: (photo: PhotoItem) => void;
  onRemove: (index: number) => void;
  maxPhotos?: number;
}

const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  photos,
  onAdd,
  onRemove,
  maxPhotos = MAX_PHOTOS,
}) => {
  const canAdd = photos.length < maxPhotos;

  const handleResponse = async (
    response: ImagePickerResponse,
    source: 'camera' | 'gallery',
  ): Promise<void> => {
    if (response.didCancel || response.errorCode) {
      if (response.errorMessage) {
        Alert.alert('Error', response.errorMessage);
      }
      return;
    }

    const asset = response.assets?.[0];
    if (!asset?.uri) {
      return;
    }

    try {
      const geo = await getCurrentLocation();
      const photo: PhotoItem = {
        uri: asset.uri,
        type: asset.type ?? 'image/jpeg',
        fileName: asset.fileName ?? `photo_${Date.now()}.jpg`,
        latitude: geo.latitude,
        longitude: geo.longitude,
        capturedAt: geo.capturedAt,
        source,
      };
      onAdd(photo);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Location Error', message);
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'MCRS needs camera access to take inspection photos.',
          buttonPositive: 'Allow',
          buttonNegative: 'Cancel',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  const openCamera = async (): Promise<void> => {
    const hasPerm = await requestCameraPermission();
    if (!hasPerm) {
      Alert.alert('Permission Denied', 'Camera permission is required to capture photos.');
      return;
    }
    const options: CameraOptions = {
      mediaType: 'photo',
      quality: 0.85,
      saveToPhotos: false,
      includeBase64: false,
    };
    launchCamera(options, (resp) => { void handleResponse(resp, 'camera'); });
  };

  const openGallery = (): void => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 0.85,
      includeBase64: false,
      selectionLimit: 1,
    };
    launchImageLibrary(options, (resp) => { void handleResponse(resp, 'gallery'); });
  };

  const showActionSheet = (): void => {
    if (!canAdd) return;
    Alert.alert(
      'Add Photo',
      'Choose a source',
      [
        { text: 'Take Photo', onPress: openCamera },
        { text: 'Choose from Gallery', onPress: openGallery },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.label}>Photos *</Text>
        <Text style={styles.counter}>
          {photos.length} / {maxPhotos} photos
        </Text>
      </View>

      <FlatList
        data={photos}
        keyExtractor={(_, index) => index.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.grid}
        renderItem={({ item, index }) => (
          <View style={styles.thumbContainer}>
            <Image source={{ uri: item.uri }} style={styles.thumb} resizeMode="cover" />
            {item.source === 'gallery' && (
              <View style={styles.galleryBadge}>
                <Text style={styles.galleryBadgeText}>📁</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => onRemove(index)}
              accessibilityLabel={`Remove photo ${index + 1}`}
            >
              <Text style={styles.removeBtnText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.geoOverlay}>
              <Text style={styles.geoText} numberOfLines={1}>
                {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No photos added yet</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
        onPress={showActionSheet}
        disabled={!canAdd}
        accessibilityLabel="Add photo"
      >
        <Text style={[styles.addBtnText, !canAdd && styles.addBtnTextDisabled]}>
          {canAdd ? '＋ Add Photo' : 'Max photos reached'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const THUMB_SIZE = 100;

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#444' },
  counter: { fontSize: 12, color: '#888' },
  grid: { paddingBottom: 8 },
  thumbContainer: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
    position: 'relative',
  },
  thumb: { width: '100%', height: '100%' },
  galleryBadge: {
    position: 'absolute',
    bottom: 22,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  galleryBadgeText: { fontSize: 10 },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  geoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  geoText: { fontSize: 8, color: '#fff' },
  emptyBox: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  emptyText: { fontSize: 11, color: '#bbb', textAlign: 'center' },
  addBtn: {
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#1565c0',
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnDisabled: { backgroundColor: '#bdbdbd' },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  addBtnTextDisabled: { color: '#f5f5f5' },
});

export default PhotoCapture;
