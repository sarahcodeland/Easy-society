import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { colors, spacing, radii } from '../../theme';

type Props = NativeStackScreenProps<StatusStackParamList, 'CreateStatus'>;

type Visibility = 'all_neighbors' | 'close_only';

const QUICK_CAPTIONS = ['Village Fest! 🎉', 'Community First 💪', 'Neighbors Unite 🤝', 'Stay Safe 🙏'];

export default function CreateStatusScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaMime, setMediaMime] = useState('image/jpeg');
  const [isVideo, setIsVideo] = useState(false);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('all_neighbors');
  const [posting, setPosting] = useState(false);

  // ── Media ─────────────────────────────────────────────────────────────────

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow access to your media library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.88,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMediaUri(asset.uri);
      setIsVideo(asset.type === 'video');
      setMediaMime(asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'));
    }
  }

  async function openCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.88,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMediaUri(asset.uri);
      setIsVideo(asset.type === 'video');
      setMediaMime(asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'));
    }
  }

  // ── Post ──────────────────────────────────────────────────────────────────

  async function post() {
    if (!mediaUri && !caption.trim()) {
      Alert.alert('Add something', 'Take a photo or write something to share.');
      return;
    }
    setPosting(true);
    try {
      let contentUrl: string | null = null;
      let mediaType: 'text' | 'photo' | 'video' = 'text';

      if (mediaUri) {
        mediaType = isVideo ? 'video' : 'photo';
        const { data: presigned } = await apiClient.post('/storage/presigned-upload', {
          prefix: 'status',
          content_type: mediaMime,
        });
        const fileRes = await fetch(mediaUri);
        const blob = await fileRes.blob();
        await fetch(presigned.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': mediaMime },
          body: blob,
        });
        contentUrl = presigned.publicUrl;
      }

      await apiClient.post('/statuses', {
        media_type: mediaType,
        content_url: contentUrl,
        text_content: caption.trim() || null,
        visibility,
      });

      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Could not post', err.response?.data?.error ?? 'Please try again.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[S.flex, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={S.headerTitle}>
          <Text style={S.headerTitleText}>Share your village story</Text>
          <Text style={S.headerSub}>Updating everyone is a simple way to stay connected.</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={S.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Step 1: Capture or Upload ── */}
        <View style={S.stepRow}>
          <View style={S.stepBadge}><Text style={S.stepNum}>1</Text></View>
          <Text style={S.stepLabel}>Capture or Upload</Text>
        </View>

        {/* Preview area */}
        <View style={S.previewBox}>
          {mediaUri ? (
            <>
              <Image source={{ uri: mediaUri }} style={S.previewImage} resizeMode="cover" />
              {isVideo && (
                <View style={S.videoOverlay}>
                  <Ionicons name="play-circle" size={52} color="rgba(255,255,255,0.88)" />
                </View>
              )}
              {/* Text overlay on image */}
              {caption.length > 0 && (
                <View style={S.captionOverlay} pointerEvents="none">
                  <Text style={S.captionOverlayText}>{caption}</Text>
                </View>
              )}
              <TouchableOpacity style={S.clearMedia} onPress={() => setMediaUri(null)} hitSlop={4}>
                <Ionicons name="close-circle" size={26} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={S.previewPlaceholder}>
              <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.35)" />
              <Text style={S.previewHint}>No photo selected yet</Text>
            </View>
          )}

          {/* Camera / Upload buttons always visible at bottom of preview */}
          <View style={S.captureRow}>
            <TouchableOpacity style={S.captureBtn} onPress={openCamera} activeOpacity={0.85}>
              <Ionicons name="camera" size={22} color="#fff" />
              <Text style={S.captureBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.captureBtn, S.uploadBtn]} onPress={pickFromGallery} activeOpacity={0.85}>
              <Ionicons name="images-outline" size={22} color={colors.textPrimary} />
              <Text style={[S.captureBtnText, { color: colors.textPrimary }]}>Upload</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Step 2: Add Context ── */}
        <View style={[S.stepRow, { marginTop: spacing.xl }]}>
          <View style={S.stepBadge}><Text style={S.stepNum}>2</Text></View>
          <Text style={S.stepLabel}>Add Context</Text>
        </View>

        <View style={S.contextCard}>
          <Text style={S.contextHint}>Personalise your update. Use it to share an event or add a caption that captures the mood.</Text>

          <TextInput
            style={S.captionInput}
            placeholder="What's happening in the community?"
            placeholderTextColor={colors.textMuted}
            value={caption}
            onChangeText={setCaption}
            multiline
            textAlignVertical="top"
            maxLength={280}
          />

          {/* Quick caption chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.chipsScroll}>
            {QUICK_CAPTIONS.map((qc) => (
              <TouchableOpacity
                key={qc}
                style={[S.chip, caption === qc && S.chipActive]}
                onPress={() => setCaption((prev) => (prev === qc ? '' : qc))}
                activeOpacity={0.8}
              >
                <Text style={[S.chipText, caption === qc && S.chipTextActive]}>{qc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Step 3: Set Visibility & Post ── */}
        <View style={[S.stepRow, { marginTop: spacing.xl }]}>
          <View style={S.stepBadge}><Text style={S.stepNum}>3</Text></View>
          <Text style={S.stepLabel}>Set Visibility & Post</Text>
        </View>

        <View style={S.visibilityCard}>
          <Text style={S.visibilityHint}>Control who sees your post. All posts automatically expire after 48 hours to keep the board fresh.</Text>

          <Pressable
            style={[S.visOption, visibility === 'all_neighbors' && S.visOptionActive]}
            onPress={() => setVisibility('all_neighbors')}
          >
            <View style={[S.radio, visibility === 'all_neighbors' && S.radioActive]}>
              {visibility === 'all_neighbors' && <View style={S.radioDot} />}
            </View>
            <Ionicons name="people-outline" size={18} color={visibility === 'all_neighbors' ? colors.primary : colors.textSecondary} />
            <Text style={[S.visLabel, visibility === 'all_neighbors' && S.visLabelActive]}>All Neighbors</Text>
          </Pressable>

          <Pressable
            style={[S.visOption, visibility === 'close_only' && S.visOptionActive]}
            onPress={() => setVisibility('close_only')}
          >
            <View style={[S.radio, visibility === 'close_only' && S.radioActive]}>
              {visibility === 'close_only' && <View style={S.radioDot} />}
            </View>
            <Ionicons name="lock-closed-outline" size={18} color={visibility === 'close_only' ? colors.primary : colors.textSecondary} />
            <Text style={[S.visLabel, visibility === 'close_only' && S.visLabelActive]}>Close/Private Only</Text>
          </Pressable>

          <TouchableOpacity
            style={[S.postBtn, posting && S.postBtnDisabled]}
            onPress={post}
            disabled={posting}
            activeOpacity={0.85}
          >
            <Text style={S.postBtnText}>{posting ? 'Posting…' : 'Post Update  →'}</Text>
          </TouchableOpacity>

          <View style={S.footer}>
            <Text style={S.footerBadge}>NEIGHBORS FIRST</Text>
            <Text style={S.footerText}>Your story automatically expires in 48 hours. Keeping the board fresh.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: { flex: 1 },
  headerTitleText: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },

  body: { padding: spacing.lg, paddingBottom: 48 },

  // Step row
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { fontSize: 12, fontWeight: '800', color: '#fff' },
  stepLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },

  // Preview box
  previewBox: {
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#2A1E1A',
    justifyContent: 'flex-end',
  },
  previewImage: { ...StyleSheet.absoluteFillObject },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  captionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  captionOverlayText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  previewPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  previewHint: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
  captureRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  captureBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 11,
  },
  uploadBtn: { backgroundColor: '#fff' },
  captureBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  clearMedia: { position: 'absolute', top: 10, right: 10 },

  // Context card
  contextCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contextHint: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.md },
  captionInput: {
    minHeight: 90,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.input,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  chipsScroll: { marginHorizontal: -spacing.sm },
  chip: {
    marginLeft: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#fff' },

  // Visibility card
  visibilityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  visibilityHint: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.md },
  visOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 13,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  visOptionActive: { borderColor: colors.primary, backgroundColor: '#FBF2EB' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  visLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, flex: 1 },
  visLabelActive: { color: colors.primary },

  postBtn: {
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  postBtnDisabled: { opacity: 0.55 },
  postBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  footer: { alignItems: 'center', paddingTop: spacing.sm, gap: 4 },
  footerBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
  },
  footerText: {
    fontSize: 11.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
});
