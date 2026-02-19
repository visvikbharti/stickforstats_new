import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, Card, Title, SegmentedButtons, useTheme, Chip, Divider } from 'react-native-paper';
import apiClient from '../api/client';

const TEST_TYPES = [
  { value: 'ttest', label: 'T-Test' },
  { value: 'anova', label: 'ANOVA' },
  { value: 'correlation', label: 'Correlation' },
  { value: 'descriptive', label: 'Descriptive' },
];

export default function QuickAnalysisScreen() {
  const theme = useTheme();
  const [testType, setTestType] = useState('ttest');
  const [group1, setGroup1] = useState('');
  const [group2, setGroup2] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const parseNumbers = (text: string): number[] => {
    return text.split(/[,\s\n]+/).map(Number).filter(n => !isNaN(n));
  };

  const runAnalysis = async () => {
    const g1 = parseNumbers(group1);
    if (g1.length < 2) {
      Alert.alert('Error', 'Please enter at least 2 values for Group 1');
      return;
    }

    setLoading(true);
    try {
      let data;
      switch (testType) {
        case 'ttest':
          const g2 = parseNumbers(group2);
          if (g2.length < 2) {
            Alert.alert('Error', 'Please enter at least 2 values for Group 2');
            setLoading(false);
            return;
          }
          data = await apiClient.runTTest({ group1: g1, group2: g2 });
          break;
        case 'correlation':
          const y = parseNumbers(group2);
          data = await apiClient.runCorrelation({ x: g1, y });
          break;
        case 'descriptive':
          data = await apiClient.runDescriptive({ values: g1 });
          break;
        default:
          data = await apiClient.runTTest({ group1: g1, group2: parseNumbers(group2) });
      }
      setResult(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Title style={styles.title}>Quick Analysis</Title>

      <SegmentedButtons
        value={testType}
        onValueChange={setTestType}
        buttons={TEST_TYPES}
        style={styles.segments}
      />

      <Card style={styles.inputCard} elevation={1}>
        <Card.Content>
          <TextInput
            label="Group 1 / X Values"
            placeholder="Enter numbers separated by commas"
            value={group1}
            onChangeText={setGroup1}
            multiline
            numberOfLines={3}
            mode="outlined"
            style={styles.input}
          />
          {testType !== 'descriptive' && (
            <TextInput
              label="Group 2 / Y Values"
              placeholder="Enter numbers separated by commas"
              value={group2}
              onChangeText={setGroup2}
              multiline
              numberOfLines={3}
              mode="outlined"
              style={styles.input}
            />
          )}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={runAnalysis}
        loading={loading}
        disabled={loading}
        style={styles.button}
        icon="play"
      >
        Run {TEST_TYPES.find(t => t.value === testType)?.label}
      </Button>

      {result && (
        <Card style={styles.resultCard} elevation={2}>
          <Card.Content>
            <Title>Results</Title>
            <Divider style={{ marginVertical: 8 }} />
            {result.test_statistic !== undefined && (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Test Statistic</Text>
                <Chip>{Number(result.test_statistic).toFixed(4)}</Chip>
              </View>
            )}
            {result.p_value !== undefined && (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>P-Value</Text>
                <Chip textStyle={{ color: result.p_value < 0.05 ? '#d32f2f' : '#388e3c' }}>
                  {Number(result.p_value).toFixed(6)}
                </Chip>
              </View>
            )}
            {result.effect_size !== undefined && (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Effect Size</Text>
                <Chip>{Number(result.effect_size).toFixed(4)}</Chip>
              </View>
            )}
            {result.confidence_interval && (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>95% CI</Text>
                <Chip>[{result.confidence_interval.map((v: number) => v.toFixed(3)).join(', ')}]</Chip>
              </View>
            )}
            {result.guardian_report && (
              <>
                <Divider style={{ marginVertical: 8 }} />
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Guardian Score</Text>
                  <Chip icon="shield-check">
                    {(result.guardian_report.confidence_score * 100).toFixed(0)}%
                  </Chip>
                </View>
              </>
            )}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, marginBottom: 16 },
  segments: { marginBottom: 16 },
  inputCard: { marginBottom: 16, borderRadius: 12 },
  input: { marginBottom: 12 },
  button: { marginBottom: 16, borderRadius: 8, paddingVertical: 4 },
  resultCard: { borderRadius: 12, marginBottom: 32 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  resultLabel: { fontSize: 14, fontWeight: '500' },
});
