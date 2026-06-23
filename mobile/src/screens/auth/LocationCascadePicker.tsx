import React, { useEffect, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Location, LocationType } from '@easysociety/shared';
import { apiClient } from '../../api/client';

interface Props {
  label: string;
  parentId: string | null;
  /** Disabled until the picker above it (e.g. state before district) has a value. */
  disabled?: boolean;
  value: Location | null;
  onChange: (location: Location) => void;
}

// One level of the state -> district -> city/village -> mandal -> area
// cascade. Each level fetches its children fresh whenever the parent
// changes, so picking a different state correctly resets everything below it
// (the parent components clear child state on change).
export default function LocationCascadePicker({ label, parentId, disabled, value, onChange }: Props) {
  const [options, setOptions] = useState<Location[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (disabled) return;
    setLoading(true);
    apiClient
      .get('/locations/children', { params: parentId ? { parent_id: parentId } : {} })
      .then(({ data }) => setOptions(data.locations))
      .finally(() => setLoading(false));
  }, [parentId, disabled]);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.selector, disabled && styles.selectorDisabled]}
        disabled={disabled}
        onPress={() => setModalVisible(true)}
      >
        <Text style={value ? styles.selectorText : styles.selectorPlaceholder}>
          {value?.name ?? (loading ? 'Loading…' : 'Select')}
        </Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <FlatList
          data={options}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                onChange(item);
                setModalVisible(false);
              }}
            >
              <Text style={styles.optionText}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </Modal>
    </View>
  );
}

export type { LocationType };

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 14, color: '#555', marginBottom: 4 },
  selector: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  selectorDisabled: { backgroundColor: '#f2f2f2' },
  selectorText: { fontSize: 16 },
  selectorPlaceholder: { fontSize: 16, color: '#999' },
  option: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  optionText: { fontSize: 16 },
});
