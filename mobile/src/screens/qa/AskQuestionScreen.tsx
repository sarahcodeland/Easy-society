import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VisibilityLevel } from '@easysociety/shared';
import { QaStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import Avatar from '../../components/Avatar';
import { colors, radii, spacing } from '../../theme';

type Props = NativeStackScreenProps<QaStackParamList, 'AskQuestion'>;

const CATEGORIES = ['Utilities', 'Safety', 'Local Events', 'Infrastructure', 'Health'];

interface MediaAsset {
  uri: string;
  mimeType: string;
  isVideo: boolean;
}

export default function AskQuestionScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<VisibilityLevel>(VisibilityLevel.AREA);
  const [locationTag, setLocationTag] = useState('');
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Media picker ─────────────────────────────────────────────────────────

  async function pickMedia() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow access to your media library to attach files.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 5 - media.length,
    });
    if (!result.canceled && result.assets.length > 0) {
      const picked: MediaAsset[] = result.assets.map((a) => ({
        uri: a.uri,
        mimeType: a.mimeType ?? (a.type === 'video' ? 'video/mp4' : 'image/jpeg'),
        isVideo: a.type === 'video',
      }));
      setMedia((prev) => [...prev, ...picked].slice(0, 5));
    }
  }

  function removeMedia(index: number) {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function submit() {
    if (title.trim().length < 3) {
      Alert.alert('Title too short', 'Add a bit more detail to your question title.');
      return;
    }
    setLoading(true);
    try {
      const mediaUrls: string[] = [];
      for (const asset of media) {
        const { data: presigned } = await apiClient.post('/storage/presigned-upload', {
          prefix: 'qa',
          content_type: asset.mimeType,
        });
        // Fetch local file as blob then PUT raw bytes to the signed URL
        const fileRes = await fetch(asset.uri);
        const blob = await fileRes.blob();
        await fetch(presigned.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': asset.mimeType },
          body: blob,
        });
        mediaUrls.push(presigned.publicUrl);
      }

      await apiClient.post('/qa/questions', {
        title: title.trim(),
        body: body.trim() || null,
        visibility_level: visibility,
        location_tag: locationTag.trim() || null,
        media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
        categories: categories.length > 0 ? categories : undefined,
        priority,
        is_anonymous: anonymous,
      });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Could not post', err.response?.data?.error ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ask the Community</Text>
        <Avatar name={user?.name ?? '?'} size={32} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 94 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Tips card */}
        <View style={styles.tipsCard}>
          <Ionicons name="bulb-outline" size={14} color={colors.success} />
          <Text style={styles.tipItem}>Be specific · No duplicates · Stay respectful</Text>
        </View>

        {/* Question title */}
        <Text style={styles.label}>Question Title</Text>
        <TextInput
          style={styles.input}
          placeholder="What is your question?"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          returnKeyType="next"
        />

        {/* Details */}
        <Text style={styles.label}>Details (Optional)</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Add more context or details here..."
          placeholderTextColor={colors.textMuted}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
        />

        {/* Tag Location */}
        <Text style={styles.label}>Tag Location</Text>
        <View style={styles.locationRow}>
          <TouchableOpacity
            style={[styles.currentBtn, locationTag === '' && styles.currentBtnActive]}
            onPress={() => setLocationTag('')}
          >
            <Ionicons name="location" size={14} color={locationTag === '' ? '#fff' : colors.success} />
            <Text style={[styles.currentBtnText, locationTag === '' && styles.currentBtnTextActive]}>
              Current
            </Text>
          </TouchableOpacity>
          <View style={styles.locationInput}>
            <TextInput
              style={styles.locationTextInput}
              placeholder="e.g., Near the Main Gate"
              placeholderTextColor={colors.textMuted}
              value={locationTag}
              onChangeText={setLocationTag}
            />
            <Ionicons name="location-outline" size={16} color={colors.textMuted} />
          </View>
        </View>

        {/* Add Media */}
        <Text style={styles.label}>Add Media</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
          {/* Add button */}
          {media.length < 5 && (
            <TouchableOpacity style={styles.mediaAdd} onPress={pickMedia}>
              <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
              <Text style={styles.mediaAddText}>Add</Text>
            </TouchableOpacity>
          )}
          {/* Thumbnails */}
          {media.map((asset, index) => (
            <View key={index} style={styles.mediaThumbnail}>
              <Image source={{ uri: asset.uri }} style={styles.mediaImage} />
              {asset.isVideo && (
                <View style={styles.videoOverlay}>
                  <Ionicons name="play-circle" size={28} color="rgba(255,255,255,0.9)" />
                </View>
              )}
              <TouchableOpacity
                style={styles.mediaRemove}
                onPress={() => removeMedia(index)}
                hitSlop={4}
              >
                <Ionicons name="close" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {/* Select Category */}
        <Text style={styles.label}>Select Category</Text>
        <View style={styles.chipsRow}>
          {CATEGORIES.map((cat) => {
            const active = categories.includes(cat);
            return (
              <Pressable
                key={cat}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleCategory(cat)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Priority */}
        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityRow}>
          <TouchableOpacity
            style={[styles.priorityBtn, priority === 'normal' && styles.priorityBtnNormal]}
            onPress={() => setPriority('normal')}
          >
            <Text style={[styles.priorityText, priority === 'normal' && styles.priorityTextActive]}>
              Normal
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.priorityBtn, priority === 'urgent' && styles.priorityBtnUrgent]}
            onPress={() => setPriority('urgent')}
          >
            <Text style={[styles.priorityText, priority === 'urgent' && styles.priorityTextUrgent]}>
              Urgent
            </Text>
          </TouchableOpacity>
        </View>

        {/* Post as Anonymous */}
        <View style={styles.anonRow}>
          <View style={styles.anonLeft}>
            <Ionicons name="eye-off-outline" size={20} color={colors.textSecondary} />
            <View>
              <Text style={styles.anonTitle}>Post as Anonymous</Text>
              <Text style={styles.anonSub}>Hide your identity from others</Text>
            </View>
          </View>
          <Switch
            value={anonymous}
            onValueChange={setAnonymous}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={submit}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.submitText}>
            {loading ? 'Posting…' : 'Post Question  →'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  backBtn: { marginRight: 6 },
  headerTitle: {
    flex: 1, fontSize: 14, fontWeight: '700', color: colors.textPrimary,
    textAlign: 'center', marginRight: 28,
  },

  body: { padding: 10, paddingBottom: 32 },

  tipsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.successBg, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7, marginBottom: 8,
  },
  tipItem: { fontSize: 11, color: colors.textSecondary, flex: 1 },

  label: {
    fontSize: 11, fontWeight: '700', color: colors.textPrimary,
    marginBottom: 4, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radii.input, paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, color: colors.textPrimary,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },

  locationRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  currentBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: colors.success, borderRadius: 100,
    paddingVertical: 6, paddingHorizontal: 10,
  },
  currentBtnActive: { backgroundColor: colors.success, borderColor: colors.success },
  currentBtnText: { fontSize: 12, fontWeight: '600', color: colors.success },
  currentBtnTextActive: { color: '#fff' },
  locationInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radii.input, paddingHorizontal: 10, paddingVertical: 7, gap: 5,
  },
  locationTextInput: { flex: 1, fontSize: 12, color: colors.textPrimary, padding: 0 },

  mediaRow: { flexDirection: 'row', marginTop: 2 },
  mediaAdd: {
    width: 64, height: 64, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 6, backgroundColor: colors.card, gap: 2,
  },
  mediaAddText: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
  mediaThumbnail: { width: 64, height: 64, borderRadius: 10, overflow: 'hidden', marginRight: 6 },
  mediaImage: { width: '100%', height: '100%' },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  mediaRemove: {
    position: 'absolute', top: 3, right: 3,
    width: 17, height: 17, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  chip: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 100,
    paddingVertical: 5, paddingHorizontal: 10, backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#fff' },

  priorityRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  priorityBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 100,
    alignItems: 'center', borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: '#fff',
  },
  priorityBtnNormal: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  priorityBtnUrgent: { backgroundColor: colors.warningBg, borderColor: colors.warningText },
  priorityText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  priorityTextActive: { color: '#fff' },
  priorityTextUrgent: { color: colors.warningText },

  anonRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, borderRadius: radii.card,
    paddingHorizontal: 10, paddingVertical: 9, marginTop: 8,
  },
  anonLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  anonTitle: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  anonSub: { fontSize: 10.5, color: colors.textSecondary, marginTop: 1 },

  submitBtn: {
    backgroundColor: colors.primary, borderRadius: 100,
    paddingVertical: 11, alignItems: 'center', marginTop: 12,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
