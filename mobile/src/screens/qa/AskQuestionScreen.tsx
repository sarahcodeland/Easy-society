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
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Tips card */}
        <View style={styles.tipsCard}>
          <Ionicons name="bulb-outline" size={18} color={colors.success} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tipsTitle}>Tips for a good post</Text>
            {['Be specific and clear', 'Check for duplicate questions', 'Keep it respectful and helpful'].map((t) => (
              <Text key={t} style={styles.tipItem}>• {t}</Text>
            ))}
          </View>
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

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  backBtn: { marginRight: spacing.sm },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginRight: 32,
  },

  /* Body */
  body: { padding: spacing.lg, paddingBottom: 40 },

  /* Tips */
  tipsCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.successBg,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  tipItem: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  /* Fields */
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.input,
    padding: 13,
    fontSize: 14,
    color: colors.textPrimary,
  },
  multiline: { minHeight: 110, textAlignVertical: 'top' },

  /* Location */
  locationRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  currentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: colors.success,
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  currentBtnActive: { backgroundColor: colors.success, borderColor: colors.success },
  currentBtnText: { fontSize: 13, fontWeight: '600', color: colors.success },
  currentBtnTextActive: { color: '#fff' },
  locationInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  locationTextInput: { flex: 1, fontSize: 13, color: colors.textPrimary, padding: 0 },

  /* Media */
  mediaRow: { flexDirection: 'row', marginTop: 4 },
  mediaAdd: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    backgroundColor: colors.card,
    gap: 4,
  },
  mediaAddText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  mediaThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  mediaImage: { width: '100%', height: '100%' },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  mediaRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Categories */
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 100,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#fff' },

  /* Priority */
  priorityRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  priorityBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 100,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  priorityBtnNormal: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  priorityBtnUrgent: { backgroundColor: colors.warningBg, borderColor: colors.warningText },
  priorityText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  priorityTextActive: { color: '#fff' },
  priorityTextUrgent: { color: colors.warningText },

  /* Anonymous */
  anonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  anonLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  anonTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  anonSub: { fontSize: 11.5, color: colors.textSecondary, marginTop: 1 },

  /* Submit */
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
