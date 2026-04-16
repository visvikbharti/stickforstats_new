/**
 * Settings Screen - Server URL, theme, language, cache, version info.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Card,
  Title,
  TextInput,
  Button,
  Switch,
  Divider,
  List,
  useTheme,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Espanol' },
  { code: 'fr', label: 'Francais' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ko', label: 'Korean' },
  { code: 'pt', label: 'Portugues' },
  { code: 'ru', label: 'Russian' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
  { code: 'tr', label: 'Turkish' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'th', label: 'Thai' },
  { code: 'id', label: 'Indonesian' },
  { code: 'pl', label: 'Polish' },
];

const STORAGE_KEYS = {
  SERVER_URL: 'settings_server_url',
  DARK_MODE: 'settings_dark_mode',
  LANGUAGE: 'settings_language',
  EXPERT_MODE: 'settings_expert_mode',
};

export default function SettingsScreen() {
  const theme = useTheme();
  const [serverUrl, setServerUrl] = useState('http://localhost:8000/api/v1');
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [expertMode, setExpertMode] = useState(false);
  const [languageExpanded, setLanguageExpanded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const url = await AsyncStorage.getItem(STORAGE_KEYS.SERVER_URL);
      const dark = await AsyncStorage.getItem(STORAGE_KEYS.DARK_MODE);
      const lang = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
      const expert = await AsyncStorage.getItem(STORAGE_KEYS.EXPERT_MODE);

      if (url) setServerUrl(url);
      if (dark) setDarkMode(dark === 'true');
      if (lang) setLanguage(lang);
      if (expert) setExpertMode(expert === 'true');
    } catch (_error) {
      // Use defaults
    }
  };

  const saveSetting = useCallback(async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (_error) {
      Alert.alert('Error', 'Failed to save setting');
    }
  }, []);

  const handleServerUrlSave = () => {
    saveSetting(STORAGE_KEYS.SERVER_URL, serverUrl);
    Alert.alert('Saved', 'Server URL updated');
  };

  const handleDarkModeToggle = (value: boolean) => {
    setDarkMode(value);
    saveSetting(STORAGE_KEYS.DARK_MODE, String(value));
  };

  const handleExpertModeToggle = (value: boolean) => {
    setExpertMode(value);
    saveSetting(STORAGE_KEYS.EXPERT_MODE, String(value));
  };

  const handleLanguageSelect = (code: string) => {
    setLanguage(code);
    saveSetting(STORAGE_KEYS.LANGUAGE, code);
    setLanguageExpanded(false);
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached analysis results. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const keys = await AsyncStorage.getAllKeys();
              const cacheKeys = keys.filter(k => k.startsWith('cache_'));
              await AsyncStorage.multiRemove(cacheKeys);
              Alert.alert('Done', `Cleared ${cacheKeys.length} cached items`);
            } catch (_error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ],
    );
  };

  const selectedLanguage = LANGUAGES.find(l => l.code === language);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Title style={styles.pageTitle}>Settings</Title>

      {/* Server Configuration */}
      <Card style={styles.card} elevation={1}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Server Configuration</Title>
          <TextInput
            label="Server URL"
            value={serverUrl}
            onChangeText={setServerUrl}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            right={<TextInput.Icon icon="server" />}
          />
          <Button
            mode="contained"
            onPress={handleServerUrlSave}
            style={styles.saveButton}
            icon="content-save"
            compact
          >
            Save URL
          </Button>
        </Card.Content>
      </Card>

      {/* Appearance */}
      <Card style={styles.card} elevation={1}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Appearance</Title>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Icon name="brightness-6" size={20} color={theme.colors.primary} />
              <Text style={styles.settingLabel}>Dark Mode</Text>
            </View>
            <Switch value={darkMode} onValueChange={handleDarkModeToggle} />
          </View>

          <Divider style={styles.divider} />

          <List.Accordion
            title={`Language: ${selectedLanguage?.label || 'English'}`}
            left={props => <List.Icon {...props} icon="translate" />}
            expanded={languageExpanded}
            onPress={() => setLanguageExpanded(!languageExpanded)}
          >
            {LANGUAGES.map(lang => (
              <List.Item
                key={lang.code}
                title={lang.label}
                onPress={() => handleLanguageSelect(lang.code)}
                right={() =>
                  language === lang.code ? (
                    <Icon name="check" size={20} color={theme.colors.primary} />
                  ) : null
                }
              />
            ))}
          </List.Accordion>
        </Card.Content>
      </Card>

      {/* Analysis Settings */}
      <Card style={styles.card} elevation={1}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Analysis</Title>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Icon name="shield-off" size={20} color={theme.colors.primary} />
              <View>
                <Text style={styles.settingLabel}>Expert Mode</Text>
                <Text style={styles.settingHint}>
                  Bypass Guardian warnings for advanced users
                </Text>
              </View>
            </View>
            <Switch value={expertMode} onValueChange={handleExpertModeToggle} />
          </View>
        </Card.Content>
      </Card>

      {/* Cache Management */}
      <Card style={styles.card} elevation={1}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Storage</Title>
          <Button
            mode="outlined"
            onPress={handleClearCache}
            icon="delete-sweep"
            textColor="#f44336"
            style={styles.clearButton}
          >
            Clear Analysis Cache
          </Button>
        </Card.Content>
      </Card>

      {/* About */}
      <Card style={[styles.card, styles.lastCard]} elevation={1}>
        <Card.Content>
          <Title style={styles.sectionTitle}>About</Title>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>App Version</Text>
            <Text style={styles.aboutValue}>2.0.0</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Platform</Text>
            <Text style={styles.aboutValue}>StickForStats</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Guardian</Text>
            <Text style={styles.aboutValue}>v2.0 (8 validators)</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>API Endpoints</Text>
            <Text style={styles.aboutValue}>195</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Languages</Text>
            <Text style={styles.aboutValue}>16</Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  pageTitle: { fontSize: 22, marginBottom: 16 },
  card: { borderRadius: 12, marginBottom: 16 },
  lastCard: { marginBottom: 32 },
  sectionTitle: { fontSize: 15, marginBottom: 12 },
  input: { marginBottom: 8 },
  saveButton: { borderRadius: 8, alignSelf: 'flex-end' },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '500' },
  settingHint: { fontSize: 11, color: '#999', marginTop: 2 },
  divider: { marginVertical: 8 },
  clearButton: { borderColor: '#f44336', borderRadius: 8 },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  aboutLabel: { fontSize: 13, color: '#666' },
  aboutValue: { fontSize: 13, fontWeight: '500' },
});
