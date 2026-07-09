import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Location } from '@easysociety/shared';
import { apiClient } from '../api/client';
import { useLocationStore } from '../store/locationStore';
import { colors, radii } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface StackEntry {
  id: string;
  name: string;
}

export default function LocationPickerModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { setActiveLocation } = useLocationStore();

  const [stack, setStack] = useState<StackEntry[]>([]);
  const [children, setChildren] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);

  const currentParentId = stack.length > 0 ? stack[stack.length - 1].id : null;

  const loadChildren = useCallback(async (parentId: string | null) => {
    setLoading(true);
    setChildren([]);
    try {
      const params = parentId ? { parent_id: parentId } : {};
      const { data } = await apiClient.get('/locations/children', { params });
      setChildren(data.locations ?? []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setStack([]);
      setSearch('');
      setSearchResults([]);
      loadChildren(null);
    }
  }, [visible, loadChildren]);

  useEffect(() => {
    if (!visible) return;
    if (search.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await apiClient.get('/locations/search', {
          params: { q: search.trim(), type: 'area' },
        });
        setSearchResults(data.locations ?? []);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [search, visible]);

  function handleSelect(loc: Location) {
    if (loc.type === 'area') {
      setActiveLocation(loc.id, loc.name);
      onClose();
      return;
    }
    const newStack = [...stack, { id: loc.id, name: loc.name }];
    setStack(newStack);
    setSearch('');
    setSearchResults([]);
    loadChildren(loc.id);
  }

  function handleBack() {
    const newStack = stack.slice(0, -1);
    setStack(newStack);
    setSearch('');
    setSearchResults([]);
    loadChildren(newStack.length > 0 ? newStack[newStack.length - 1].id : null);
  }

  const displayList = search.trim().length >= 2 ? searchResults : children;
  const breadcrumb = stack.map((s) => s.name).join(' › ');
  const levelHint = stack.length === 0 ? 'Select State'
    : stack.length === 1 ? 'Select District'
    : stack.length === 2 ? 'Select City / Village'
    : 'Select Area';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[S.container, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={S.header}>
          {stack.length > 0 ? (
            <TouchableOpacity onPress={handleBack} hitSlop={8} style={S.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={S.backBtn} />
          )}
          <View style={S.headerCenter}>
            <Text style={S.headerTitle}>Browse Location</Text>
            {breadcrumb ? (
              <Text style={S.breadcrumb} numberOfLines={1}>{breadcrumb}</Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={8} style={S.closeBtn}>
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={S.searchWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={S.searchInput}
            placeholder="Search areas…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setSearchResults([]); }} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Level hint */}
        {search.trim().length < 2 && (
          <Text style={S.levelHint}>{levelHint}</Text>
        )}

        {/* List */}
        {loading ? (
          <ActivityIndicator style={S.loader} color={colors.primary} />
        ) : (
          <FlatList
            data={displayList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={S.list}
            ListEmptyComponent={
              <Text style={S.empty}>
                {search.trim().length >= 2 ? 'No areas found.' : 'Nothing here yet.'}
              </Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={S.row} onPress={() => handleSelect(item)} activeOpacity={0.75}>
                <Ionicons
                  name={item.type === 'area' ? 'location' : 'chevron-forward-outline'}
                  size={18}
                  color={item.type === 'area' ? colors.primary : colors.textSecondary}
                  style={S.rowIcon}
                />
                <Text style={S.rowName}>{item.name}</Text>
                {item.type !== 'area' && (
                  <Ionicons name="chevron-forward" size={16} color={colors.border} />
                )}
                {item.type === 'area' && (
                  <View style={S.selectPill}>
                    <Text style={S.selectPillText}>Select</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  backBtn: { width: 34, alignItems: 'flex-start' },
  closeBtn: { width: 34, alignItems: 'flex-end' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  breadcrumb: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginTop: 10, marginBottom: 4,
    backgroundColor: colors.card, borderRadius: radii.input,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.textPrimary, padding: 0 },

  levelHint: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 2,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  loader: { marginTop: 40 },

  list: { paddingBottom: 40 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  rowIcon: { marginRight: 10 },
  rowName: { flex: 1, fontSize: 15, color: colors.textPrimary, fontWeight: '500' },

  selectPill: {
    backgroundColor: colors.primary, borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  selectPillText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  empty: { paddingTop: 40, textAlign: 'center', color: colors.textSecondary, fontSize: 14 },
});
