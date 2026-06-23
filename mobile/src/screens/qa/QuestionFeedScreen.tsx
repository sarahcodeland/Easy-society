import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { VisibilityLevel } from '@easysociety/shared';
import { QaStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import VisitorTag from '../../components/VisitorTag';
import VisibilityFilterBar from '../../components/VisibilityFilterBar';

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

  useEffect(() => {
    load(visibility);
  }, [load, visibility]);

  return (
    <View style={styles.flex}>
      <VisibilityFilterBar value={visibility} onChange={setVisibility} />
      <FlatList
        data={questions}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(visibility); setRefreshing(false); }} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('QuestionDetail', { questionId: item.id })}>
            <Text style={styles.title}>{item.title}</Text>
            <VisitorTag isVisitor={item.is_visitor} visitorLocationLabel={item.visitor_location_label} />
            <Text style={styles.meta}>
              {item.author_name} · {item.answer_count} answers · ▲{item.vote_score} · ★{item.recommendation_count} recommended
            </Text>
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
  flex: { flex: 1 },
  card: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 12, color: '#777', marginTop: 4 },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#2E7D32', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 28 },
});
