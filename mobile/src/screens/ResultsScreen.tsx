/**
 * Results Screen - Displays analysis results with Guardian badge
 */

import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
} from 'react-native';

interface ResultsScreenProps {
  route: {
    params: {
      results: {
        test_type: string;
        p_value: number;
        test_statistic: number;
        effect_size?: number;
        interpretation: string;
        guardian?: {
          confidence: number;
          violations: Array<{ severity: string; message: string }>;
        };
        suggestions?: Array<{ text: string; priority: string }>;
      };
    };
  };
  navigation: any;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ route, navigation }) => {
  const { results } = route.params;
  const isSignificant = results.p_value < 0.05;
  const guardianScore = results.guardian?.confidence ?? 1.0;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `StickForStats Analysis: ${results.test_type}\np-value: ${results.p_value.toFixed(4)}\n${results.interpretation}`,
      });
    } catch (_error) {
      // Share cancelled
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Guardian Badge */}
      <View style={[styles.guardianBadge, {
        backgroundColor: guardianScore > 0.8 ? '#4caf50' : guardianScore > 0.5 ? '#ff9800' : '#f44336'
      }]}>
        <Text style={styles.guardianText}>
          Guardian Score: {(guardianScore * 100).toFixed(0)}%
        </Text>
      </View>

      {/* Main Result */}
      <View style={styles.resultCard}>
        <Text style={styles.testType}>{results.test_type.replace(/_/g, ' ').toUpperCase()}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>p-value</Text>
            <Text style={[styles.statValue, { color: isSignificant ? '#4caf50' : '#f44336' }]}>
              {results.p_value < 0.001 ? '< 0.001' : results.p_value.toFixed(4)}
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Test Statistic</Text>
            <Text style={styles.statValue}>
              {results.test_statistic.toFixed(4)}
            </Text>
          </View>

          {results.effect_size !== undefined && (
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Effect Size</Text>
              <Text style={styles.statValue}>
                {results.effect_size.toFixed(4)}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.interpretation}>{results.interpretation}</Text>
      </View>

      {/* Guardian Violations */}
      {(results.guardian?.violations?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guardian Warnings</Text>
          {results.guardian!.violations.map((v, i) => (
            <View key={i} style={[styles.violationCard, {
              borderLeftColor: v.severity === 'critical' ? '#f44336' : v.severity === 'warning' ? '#ff9800' : '#2196f3'
            }]}>
              <Text style={styles.violationSeverity}>{v.severity.toUpperCase()}</Text>
              <Text style={styles.violationMessage}>{v.message}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Suggestions */}
      {(results.suggestions?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Steps</Text>
          {results.suggestions!.map((s, i) => (
            <TouchableOpacity key={i} style={styles.suggestionCard}>
              <Text style={styles.suggestionText}>{s.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>Share Results</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.newAnalysisButton}
          onPress={() => navigation.navigate('QuickAnalysis')}
        >
          <Text style={styles.newAnalysisText}>New Analysis</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  guardianBadge: { margin: 16, padding: 12, borderRadius: 8, alignItems: 'center' },
  guardianText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resultCard: { margin: 16, marginTop: 0, padding: 16, backgroundColor: '#fff', borderRadius: 12, elevation: 2 },
  testType: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16, textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  statBox: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  interpretation: { fontSize: 14, color: '#555', lineHeight: 22, marginTop: 8, padding: 12, backgroundColor: '#f9f9f9', borderRadius: 8 },
  section: { margin: 16, marginTop: 0 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  violationCard: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4, elevation: 1 },
  violationSeverity: { fontSize: 10, fontWeight: 'bold', color: '#999', marginBottom: 4 },
  violationMessage: { fontSize: 13, color: '#555', lineHeight: 18 },
  suggestionCard: { backgroundColor: '#e3f2fd', padding: 12, borderRadius: 8, marginBottom: 8 },
  suggestionText: { fontSize: 13, color: '#1565c0' },
  actions: { flexDirection: 'row', margin: 16, gap: 12 },
  shareButton: { flex: 1, backgroundColor: '#1976d2', padding: 14, borderRadius: 8, alignItems: 'center' },
  shareButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  newAnalysisButton: { flex: 1, backgroundColor: '#fff', padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#1976d2' },
  newAnalysisText: { color: '#1976d2', fontWeight: 'bold', fontSize: 14 },
});

export default ResultsScreen;
