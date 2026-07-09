import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Location, LocationType } from '@easysociety/shared';
import { apiClient } from '../../api/client';
import { colors } from '../../theme';

interface Props {
  label: string;
  parentId: string | null;
  disabled?: boolean;
  value: Location | null;
  onChange: (location: Location) => void;
}

export default function LocationCascadePicker({ label, parentId, disabled, value, onChange }: Props) {
  const [options, setOptions] = useState<Location[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (disabled) { setOptions([]); return; }
    setLoading(true);
    setError(false);
    apiClient
      .get('/locations/children', { params: parentId ? { parent_id: parentId } : {} })
      .then(({ data }) => setOptions(data.locations ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [parentId, disabled]);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.selector, disabled && styles.selectorDisabled]}
        disabled={disabled}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={value ? styles.selectorText : styles.selectorPlaceholder}>
          {value?.name ?? (loading ? 'Loading…' : 'Select')}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modal}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={12} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>Could not load locations.</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  setError(false);
                  setLoading(true);
                  apiClient
                    .get('/locations/children', { params: parentId ? { parent_id: parentId } : {} })
                    .then(({ data }) => setOptions(data.locations ?? []))
                    .catch(() => setError(true))
                    .finally(() => setLoading(false));
                }}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : options.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>No options available.</Text>
            </View>
          ) : (
            <FlatList
              data={options}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  activeOpacity={0.7}
                  onPress={() => {
                    onChange(item);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.optionText}>{item.name}</Text>
                  <Text style={styles.optionChevron}>›</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

export type { LocationType };

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 4 },
  selector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#fff',
  },
  selectorDisabled: { backgroundColor: '#f5f5f5', borderColor: '#e0e0e0' },
  selectorText: { fontSize: 15, color: '#1A1A1A' },
  selectorPlaceholder: { fontSize: 15, color: '#aaa' },
  chevron: { fontSize: 20, color: '#bbb', lineHeight: 22 },

  modal: { flex: 1, backgroundColor: '#fff' },

  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 18, color: '#888', fontWeight: '600' },

  loader: { marginTop: 60 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorText: { fontSize: 14, color: '#888', marginBottom: 12, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.primary, borderRadius: 100,
    paddingHorizontal: 28, paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyText: { fontSize: 14, color: '#aaa', textAlign: 'center' },

  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#f0f0f0' },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  optionText: { fontSize: 16, color: '#1A1A1A' },
  optionChevron: { fontSize: 20, color: '#ccc', lineHeight: 22 },
});
