import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Category } from '../types';

interface CategoryPickerProps {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}

const CategoryPicker: React.FC<CategoryPickerProps> = ({
  categories,
  selected,
  onSelect,
  loading = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedCategory = categories.find((c) => c.category_id === selected);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Inspection Category *</Text>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setModalVisible(true)}
        disabled={loading}
        accessibilityLabel="Select inspection category"
      >
        <Text style={selectedCategory ? styles.selectedText : styles.placeholderText}>
          {loading
            ? 'Loading categories…'
            : selectedCategory
            ? selectedCategory.name
            : 'Select a category…'}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <SafeAreaView style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.category_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.category_id === selected && styles.optionSelected,
                  ]}
                  onPress={() => {
                    onSelect(item.category_id);
                    setModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.category_id === selected && styles.optionTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {item.category_id === selected && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  trigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  selectedText: { fontSize: 15, color: '#111', flex: 1 },
  placeholderText: { fontSize: 15, color: '#999', flex: 1 },
  arrow: { fontSize: 12, color: '#888' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  cancel: { fontSize: 15, color: '#2196F3' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  optionSelected: { backgroundColor: '#e3f2fd' },
  optionText: { flex: 1, fontSize: 15, color: '#222' },
  optionTextSelected: { color: '#1565c0', fontWeight: '600' },
  checkmark: { fontSize: 16, color: '#1565c0' },
  separator: { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 20 },
});

export default CategoryPicker;
