/**
 * Profile Screen - User profile, recent analyses, and logout.
 */

import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Avatar,
  Button,
  Divider,
  Chip,
  useTheme,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient from '../api/client';

interface UserProfile {
  name: string;
  email: string;
  organization?: string;
  role?: string;
  joined?: string;
}

interface RecentAnalysis {
  id: string;
  test_type: string;
  created_at: string;
  p_value?: number;
  guardian_score?: number;
}

export default function ProfileScreen({ navigation }: any) {
  const theme = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      // Try to load from local storage first
      const cached = await AsyncStorage.getItem('user_profile');
      if (cached) {
        setProfile(JSON.parse(cached));
      }

      const cachedAnalyses = await AsyncStorage.getItem('recent_analyses');
      if (cachedAnalyses) {
        setRecentAnalyses(JSON.parse(cachedAnalyses));
      }
    } catch (_error) {
      // Proceed with empty state
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.logout();
              await AsyncStorage.removeItem('user_profile');
              await AsyncStorage.removeItem('recent_analyses');
              navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
            } catch (_error) {
              Alert.alert('Error', 'Failed to log out');
            }
          },
        },
      ],
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (_e) {
      return dateStr;
    }
  };

  const getGuardianColor = (score?: number) => {
    if (score === undefined) return '#999';
    if (score > 0.8) return '#4caf50';
    if (score > 0.5) return '#ff9800';
    return '#f44336';
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Profile Header */}
      <Card style={styles.profileCard} elevation={2}>
        <Card.Content style={styles.profileContent}>
          {profile ? (
            <>
              <Avatar.Text
                size={72}
                label={getInitials(profile.name)}
                style={{ backgroundColor: theme.colors.primary }}
              />
              <Title style={styles.profileName}>{profile.name}</Title>
              <Paragraph style={styles.profileEmail}>{profile.email}</Paragraph>
              {profile.organization && (
                <View style={styles.orgRow}>
                  <Icon name="domain" size={16} color="#666" />
                  <Text style={styles.orgText}>{profile.organization}</Text>
                </View>
              )}
              {profile.role && (
                <Chip compact style={styles.roleChip} icon="account-badge">
                  {profile.role}
                </Chip>
              )}
              {profile.joined && (
                <Text style={styles.joinedText}>
                  Member since {formatDate(profile.joined)}
                </Text>
              )}
            </>
          ) : (
            <>
              <Avatar.Icon
                size={72}
                icon="account-outline"
                style={{ backgroundColor: '#e0e0e0' }}
              />
              <Title style={styles.profileName}>Not Logged In</Title>
              <Paragraph style={styles.profileEmail}>
                Log in to save analyses and sync across devices
              </Paragraph>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Home')}
                style={styles.loginButton}
                icon="login"
              >
                Log In
              </Button>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Stats Summary */}
      <Card style={styles.card} elevation={1}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Analysis Summary</Title>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{recentAnalyses.length}</Text>
              <Text style={styles.statLabel}>Total Analyses</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {recentAnalyses.filter(a => a.p_value !== undefined && a.p_value < 0.05).length}
              </Text>
              <Text style={styles.statLabel}>Significant</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {recentAnalyses.filter(a => (a.guardian_score ?? 0) > 0.8).length}
              </Text>
              <Text style={styles.statLabel}>High Guardian</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Recent Analyses */}
      <Card style={styles.card} elevation={1}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Recent Analyses</Title>
          {recentAnalyses.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="chart-line" size={40} color="#ccc" />
              <Paragraph style={styles.emptyText}>
                No analyses yet. Run your first analysis to see it here.
              </Paragraph>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('Analyze')}
                style={styles.startButton}
                compact
              >
                Start Analyzing
              </Button>
            </View>
          ) : (
            recentAnalyses.slice(0, 10).map((analysis, i) => (
              <View key={analysis.id}>
                <View style={styles.analysisRow}>
                  <View style={styles.analysisInfo}>
                    <Text style={styles.analysisType}>
                      {analysis.test_type.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.analysisDate}>
                      {formatDate(analysis.created_at)}
                    </Text>
                  </View>
                  <View style={styles.analysisStats}>
                    {analysis.p_value !== undefined && (
                      <Chip
                        compact
                        textStyle={{
                          fontSize: 10,
                          color: analysis.p_value < 0.05 ? '#4caf50' : '#f44336',
                        }}
                      >
                        p={analysis.p_value < 0.001 ? '<.001' : analysis.p_value.toFixed(3)}
                      </Chip>
                    )}
                    {analysis.guardian_score !== undefined && (
                      <Icon
                        name="shield-check"
                        size={18}
                        color={getGuardianColor(analysis.guardian_score)}
                      />
                    )}
                  </View>
                </View>
                {i < Math.min(recentAnalyses.length, 10) - 1 && (
                  <Divider style={styles.divider} />
                )}
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      {/* Logout */}
      {profile && (
        <Button
          mode="outlined"
          onPress={handleLogout}
          textColor="#f44336"
          style={styles.logoutButton}
          icon="logout"
        >
          Log Out
        </Button>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileCard: { borderRadius: 12, marginBottom: 16 },
  profileContent: { alignItems: 'center', padding: 16 },
  profileName: { fontSize: 20, fontWeight: 'bold', marginTop: 12 },
  profileEmail: { fontSize: 14, color: '#666', marginTop: 2 },
  orgRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  orgText: { fontSize: 13, color: '#666' },
  roleChip: { marginTop: 8 },
  joinedText: { fontSize: 12, color: '#999', marginTop: 8 },
  loginButton: { marginTop: 16, borderRadius: 8 },
  card: { borderRadius: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 15, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 8 },
  startButton: { marginTop: 12, borderRadius: 8 },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  analysisInfo: { flex: 1 },
  analysisType: { fontSize: 14, fontWeight: '500', textTransform: 'capitalize' },
  analysisDate: { fontSize: 11, color: '#999', marginTop: 2 },
  analysisStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { marginVertical: 2 },
  logoutButton: { borderColor: '#f44336', borderRadius: 8, marginBottom: 16 },
  bottomPadding: { height: 16 },
});
