import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { VisibilityLevel } from '@easysociety/shared';
import { QaStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import VisitorTag from '../../components/VisitorTag';
import VisibilityFilterBar from '../../components/VisibilityFilterBar';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import { colors, radii, spacing } from '../../theme';

interface QuestionRow {
  id: string;
  title: string;
  body: string | null;
  author_name?: string;
  vote_score: string;
  recommendation_count: string;
  answer_count: string;
  is_visitor?: boolean;
  visitor_location_label?: string | null;
}

type Props = NativeStackScreenProps<QaStackParamList, 'QuestionFeed'>;

export default function QuestionFeedScreen({ navigation }: Props) {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [visibility, setVisibility] = useState<VisibilityLevel>(VisibilityLevel.AREA);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (level: VisibilityLevel) => {
    const { data } = await apiClient.get('/qa/questions', { params: { visibility: level } });
    setQuestions(data.questions);
  }, []);

  useFocusEffect(useCallback(() => {
    load(visibility);
  }, [load, visibility]));

  return (
    <View style={styles.flex}>
      <VisibilityFilterBar value={visibility} onChange={setVisibility} />
      <FlatList
        data={questions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(visibility); setRefreshing(false); }} />}
        ListHeaderComponent={
          <View style={styles.banner}>
            <Text style={styles.bannerText}>Got a question for the neighbors? Join the conversation.</Text>
            <TouchableOpacity style={styles.bannerButton} onPress={() => navigation.navigate('AskQuestion')}>
              <Text style={styles.bannerButtonText}>+ Ask a Question</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('QuestionDetail', { questionId: item.id })}>
            <Card style={styles.card}>
              <View style={styles.cardTop}>
                <Avatar name={item.author_name ?? '?'} />
                <View style={styles.cardTopInfo}>
                  <Text style={styles.author}>{item.author_name}</Text>
                </View>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              {item.body ? <Text style={styles.preview} numberOfLines={1}>{item.body}</Text> : null}
              <VisitorTag isVisitor={item.is_visitor} visitorLocationLabel={item.visitor_location_label} />
              <View style={styles.cardBottom}>
                <Text style={styles.meta}>{item.answer_count} answers</Text>
                <Badge label={`Helpful (${item.recommendation_count})`} />
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AskQuestion')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingBottom: spacing.xl },
  banner: { margin: spacing.lg, backgroundColor: colors.primary, borderRadius: radii.card, padding: spacing.lg },
  bannerText: { color: colors.card, fontSize: 13.5, fontWeight: '600', lineHeight: 19, marginBottom: spacing.md },
  bannerButton: { backgroundColor: colors.card, borderRadius: radii.button, paddingVertical: 9, paddingHorizontal: 16, alignSelf: 'flex-start' },
  bannerButtonText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md + 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  cardTopInfo: { marginLeft: spacing.sm },
  author: { fontSize: 12.5, fontWeight: '700', color: colors.textPrimary },
  title: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 4, lineHeight: 19 },
  preview: { fontSize: 12.5, color: colors.textSecondary, marginBottom: spacing.sm },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  meta: { fontSize: 12, color: colors.textMuted },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: colors.primary, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  fabText: { color: colors.card, fontSize: 28, lineHeight: 28 },
});
