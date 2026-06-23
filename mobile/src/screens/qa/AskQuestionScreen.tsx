import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { VisibilityLevel } from '@easysociety/shared';
import { QaStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import VisibilityFilterBar from '../../components/VisibilityFilterBar';

type Props = NativeStackScreenProps<QaStackParamList, 'AskQuestion'>;

export default function AskQuestionScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<VisibilityLevel>(VisibilityLevel.AREA);

  async function submit() {
    if (title.trim().length < 3) {
      Alert.alert('Title too short', 'Add a bit more detail to your question title');
      return;
    }
    await apiClient.post('/qa/questions', { title: title.trim(), body: body.trim() || null, visibility_level: visibility });
    navigation.goBack();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="What do you want to ask?" />
      <Text style={styles.label}>Details (optional)</Text>
      <TextInput style={[styles.input, styles.multiline]} value={body} onChangeText={setBody} multiline placeholder="Add more context…" />
      <Text style={styles.label}>Visible to</Text>
      <VisibilityFilterBar value={visibility} onChange={setVisibility} />
      <TouchableOpacity style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>Post question</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  label: { fontSize: 13, color: '#555', marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  button: { backgroundColor: '#2E7D32', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
