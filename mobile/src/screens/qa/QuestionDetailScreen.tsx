import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { QaStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';

interface AnswerRow {
  id: string;
  body: string;
  author_name?: string;
  vote_score: string;
  recommendation_count: string;
}

type Props = NativeStackScreenProps<QaStackParamList, 'QuestionDetail'>;

export default function QuestionDetailScreen({ route }: Props) {
  const { questionId } = route.params;
  const [question, setQuestion] = useState<any>(null);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    const { data } = await apiClient.get(`/qa/questions/${questionId}`);
    setQuestion(data.question);
    setAnswers(data.answers);
  }, [questionId]);

  useEffect(() => { load(); }, [load]);

  async function submitAnswer() {
    if (!draft.trim()) return;
    await apiClient.post(`/qa/questions/${questionId}/answers`, { body: draft.trim() });
    setDraft('');
    load();
  }

  async function vote(targetId: string, targetType: 'question' | 'answer', voteType: 'upvote' | 'downvote') {
    await apiClient.post('/qa/votes', { target_id: targetId, target_type: targetType, vote_type: voteType });
    load();
  }

  async function recommend(targetId: string, targetType: 'question' | 'answer') {
    await apiClient.post('/qa/recommendations', { target_id: targetId, target_type: targetType });
    Alert.alert('Recommended', 'This adds to its credibility score — separate from up/down votes.');
    load();
  }

  if (!question) return null;

  return (
    <FlatList
      data={answers}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.questionBlock}>
          <Text style={styles.title}>{question.title}</Text>
          {question.body && <Text style={styles.body}>{question.body}</Text>}
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => vote(question.id, 'question', 'upvote')}><Text>▲</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => vote(question.id, 'question', 'downvote')}><Text>▼</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => recommend(question.id, 'question')}><Text>★ Recommend</Text></TouchableOpacity>
          </View>
          <Text style={styles.sectionLabel}>Most recommended answers first</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.answerBlock}>
          <Text style={styles.answerAuthor}>{item.author_name}</Text>
          <Text style={styles.body}>{item.body}</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => vote(item.id, 'answer', 'upvote')}><Text>▲ {item.vote_score}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => vote(item.id, 'answer', 'downvote')}><Text>▼</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => recommend(item.id, 'answer')}><Text>★ {item.recommendation_count} Recommend</Text></TouchableOpacity>
          </View>
        </View>
      )}
      ListFooterComponent={
        <View style={styles.composer}>
          <TextInput style={styles.input} placeholder="Write an answer…" value={draft} onChangeText={setDraft} multiline />
          <TouchableOpacity style={styles.submitButton} onPress={submitAnswer}>
            <Text style={styles.submitButtonText}>Post answer</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  questionBlock: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 15, marginTop: 6, color: '#333' },
  actionsRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  sectionLabel: { marginTop: 16, fontSize: 12, color: '#777', textTransform: 'uppercase' },
  answerBlock: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f3f3' },
  answerAuthor: { fontWeight: '600' },
  composer: { padding: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, minHeight: 60 },
  submitButton: { backgroundColor: '#2E7D32', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: '#fff', fontWeight: '600' },
});
