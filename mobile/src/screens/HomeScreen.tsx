import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Paragraph, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const FEATURES = [
  { id: 'quick-analysis', icon: 'chart-bar', title: 'Quick Analysis', description: 'Run t-tests, ANOVA, correlation in seconds', screen: 'QuickAnalysis' },
  { id: 'smart-analysis', icon: 'brain', title: 'Smart Analysis', description: 'Upload data, ask in plain English', screen: 'SmartAnalysis' },
  { id: 'paper-check', icon: 'file-document-check', title: 'Paper Quality Check', description: 'SQS scoring for your manuscript', screen: 'PaperCheck' },
  { id: 'guardian', icon: 'shield-check', title: 'Guardian Check', description: 'Validate statistical assumptions', screen: 'GuardianCheck' },
  { id: 'certification', icon: 'certificate', title: 'Certification', description: 'Earn your analyst credential', screen: 'Certification' },
  { id: 'learn', icon: 'school', title: 'Learn Statistics', description: 'Interactive lessons and quizzes', screen: 'Learn' },
];

export default function HomeScreen({ navigation }: any) {
  const theme = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Icon name="chart-scatter-plot" size={40} color={theme.colors.primary} />
        <Title style={styles.title}>StickForStats</Title>
        <Paragraph style={styles.subtitle}>Statistical Analysis Platform</Paragraph>
      </View>

      <View style={styles.grid}>
        {FEATURES.map((feature) => (
          <TouchableOpacity
            key={feature.id}
            style={styles.cardWrapper}
            onPress={() => navigation.navigate(feature.screen)}
          >
            <Card style={styles.card} elevation={2}>
              <Card.Content style={styles.cardContent}>
                <Icon name={feature.icon} size={32} color={theme.colors.primary} />
                <Title style={styles.cardTitle}>{feature.title}</Title>
                <Paragraph style={styles.cardDesc}>{feature.description}</Paragraph>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </View>

      <Card style={styles.statusCard} elevation={1}>
        <Card.Content>
          <Title style={styles.statusTitle}>Platform Status</Title>
          <View style={styles.statusRow}>
            <Text>Guardian Protection</Text>
            <Icon name="check-circle" size={20} color="#4CAF50" />
          </View>
          <View style={styles.statusRow}>
            <Text>188 API Endpoints</Text>
            <Icon name="check-circle" size={20} color="#4CAF50" />
          </View>
          <View style={styles.statusRow}>
            <Text>10 Languages</Text>
            <Icon name="check-circle" size={20} color="#4CAF50" />
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { alignItems: 'center', marginBottom: 24, marginTop: 16 },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 8 },
  subtitle: { fontSize: 14, opacity: 0.7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardWrapper: { width: '48%', marginBottom: 12 },
  card: { borderRadius: 12 },
  cardContent: { alignItems: 'center', paddingVertical: 16 },
  cardTitle: { fontSize: 14, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  cardDesc: { fontSize: 11, textAlign: 'center', opacity: 0.7 },
  statusCard: { marginTop: 12, marginBottom: 32, borderRadius: 12 },
  statusTitle: { fontSize: 16, marginBottom: 8 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
});
