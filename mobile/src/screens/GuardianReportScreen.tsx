/**
 * Guardian Report Screen - Full Guardian report with violations,
 * confidence gauge, and recommendations.
 */

import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, Card, Title, Paragraph, Chip, Divider, Button, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface GuardianViolation {
  severity: 'critical' | 'warning' | 'minor';
  code: string;
  message: string;
  recommendation?: string;
}

interface GuardianReport {
  confidence_score: number;
  overall_status: string;
  test_requested: string;
  test_executed: string;
  violations: GuardianViolation[];
  assumptions_checked: Array<{
    name: string;
    passed: boolean;
    details?: string;
  }>;
  recommendations: string[];
}

interface GuardianReportScreenProps {
  route: {
    params: {
      report: GuardianReport;
    };
  };
  navigation: any;
}

const SEVERITY_CONFIG = {
  critical: { color: '#f44336', icon: 'alert-circle', label: 'Critical' },
  warning: { color: '#ff9800', icon: 'alert', label: 'Warning' },
  minor: { color: '#2196f3', icon: 'information', label: 'Minor' },
};

export default function GuardianReportScreen({ route, navigation }: GuardianReportScreenProps) {
  const theme = useTheme();
  const { report } = route.params;
  const score = report.confidence_score;
  const scorePercent = Math.round(score * 100);

  const getScoreColor = () => {
    if (score > 0.8) return '#4caf50';
    if (score > 0.5) return '#ff9800';
    return '#f44336';
  };

  const getScoreLabel = () => {
    if (score > 0.8) return 'High Confidence';
    if (score > 0.5) return 'Moderate Confidence';
    return 'Low Confidence';
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Confidence Gauge */}
      <Card style={styles.gaugeCard} elevation={2}>
        <Card.Content style={styles.gaugeContent}>
          <View style={[styles.gaugeCircle, { borderColor: getScoreColor() }]}>
            <Text style={[styles.gaugeScore, { color: getScoreColor() }]}>
              {scorePercent}%
            </Text>
            <Text style={styles.gaugeLabel}>{getScoreLabel()}</Text>
          </View>

          <View style={styles.testInfo}>
            <View style={styles.testInfoRow}>
              <Text style={styles.testInfoLabel}>Requested:</Text>
              <Chip compact>{report.test_requested.replace(/_/g, ' ')}</Chip>
            </View>
            <View style={styles.testInfoRow}>
              <Text style={styles.testInfoLabel}>Executed:</Text>
              <Chip compact icon={
                report.test_requested !== report.test_executed ? 'swap-horizontal' : 'check'
              }>
                {report.test_executed.replace(/_/g, ' ')}
              </Chip>
            </View>
          </View>

          {report.test_requested !== report.test_executed && (
            <Paragraph style={styles.fallbackNote}>
              Guardian detected assumption violations and automatically switched
              to a more appropriate test.
            </Paragraph>
          )}
        </Card.Content>
      </Card>

      {/* Assumption Checks */}
      <Title style={styles.sectionTitle}>Assumption Checks</Title>
      <Card style={styles.card} elevation={1}>
        <Card.Content>
          {report.assumptions_checked.map((check, i) => (
            <View key={i}>
              <View style={styles.checkRow}>
                <Icon
                  name={check.passed ? 'check-circle' : 'close-circle'}
                  size={20}
                  color={check.passed ? '#4caf50' : '#f44336'}
                />
                <View style={styles.checkInfo}>
                  <Text style={styles.checkName}>{check.name}</Text>
                  {check.details && (
                    <Text style={styles.checkDetails}>{check.details}</Text>
                  )}
                </View>
              </View>
              {i < report.assumptions_checked.length - 1 && (
                <Divider style={styles.divider} />
              )}
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Violations */}
      {report.violations.length > 0 && (
        <>
          <Title style={styles.sectionTitle}>
            Violations ({report.violations.length})
          </Title>
          {report.violations.map((v, i) => {
            const config = SEVERITY_CONFIG[v.severity] || SEVERITY_CONFIG.minor;
            return (
              <Card key={i} style={[styles.violationCard, { borderLeftColor: config.color }]} elevation={1}>
                <Card.Content>
                  <View style={styles.violationHeader}>
                    <Icon name={config.icon} size={18} color={config.color} />
                    <Chip
                      compact
                      textStyle={{ color: config.color, fontSize: 10 }}
                      style={styles.severityChip}
                    >
                      {config.label}
                    </Chip>
                    <Text style={styles.violationCode}>{v.code}</Text>
                  </View>
                  <Paragraph style={styles.violationMessage}>{v.message}</Paragraph>
                  {v.recommendation && (
                    <View style={styles.recommendationInline}>
                      <Icon name="lightbulb-outline" size={14} color="#666" />
                      <Text style={styles.recommendationInlineText}>
                        {v.recommendation}
                      </Text>
                    </View>
                  )}
                </Card.Content>
              </Card>
            );
          })}
        </>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <>
          <Title style={styles.sectionTitle}>Recommendations</Title>
          <Card style={styles.card} elevation={1}>
            <Card.Content>
              {report.recommendations.map((rec, i) => (
                <View key={i} style={styles.recRow}>
                  <Icon name="lightbulb-on-outline" size={18} color="#ff9800" />
                  <Text style={styles.recText}>{rec}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        </>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.actionButton}
          icon="arrow-left"
        >
          Back to Results
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('QuickAnalysis')}
          style={styles.actionButton}
          icon="refresh"
        >
          New Analysis
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  gaugeCard: { borderRadius: 12, marginBottom: 16 },
  gaugeContent: { alignItems: 'center', padding: 8 },
  gaugeCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  gaugeScore: { fontSize: 32, fontWeight: 'bold' },
  gaugeLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  testInfo: { width: '100%', marginTop: 8 },
  testInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  testInfoLabel: { fontSize: 13, color: '#666', fontWeight: '500' },
  fallbackNote: {
    fontSize: 12,
    color: '#ff9800',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  sectionTitle: { fontSize: 16, marginBottom: 8, marginTop: 8 },
  card: { borderRadius: 12, marginBottom: 16 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, gap: 10 },
  checkInfo: { flex: 1 },
  checkName: { fontSize: 14, fontWeight: '500', color: '#333' },
  checkDetails: { fontSize: 12, color: '#666', marginTop: 2 },
  divider: { marginVertical: 2 },
  violationCard: { borderRadius: 12, marginBottom: 8, borderLeftWidth: 4 },
  violationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  severityChip: { height: 24 },
  violationCode: { fontSize: 11, color: '#999', fontFamily: 'monospace' },
  violationMessage: { fontSize: 13, color: '#555', lineHeight: 20 },
  recommendationInline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#fff8e1',
    padding: 8,
    borderRadius: 6,
  },
  recommendationInlineText: { fontSize: 12, color: '#666', flex: 1 },
  recRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  recText: { fontSize: 13, color: '#555', flex: 1, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 12, marginVertical: 16 },
  actionButton: { flex: 1, borderRadius: 8 },
});
