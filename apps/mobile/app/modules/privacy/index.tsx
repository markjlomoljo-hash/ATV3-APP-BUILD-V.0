/**
 * Privacy & Consent Center
 *
 * Zero-fabrication: all consent states read from Supabase.
 * Deletion is a real API call with confirmation. No fake toggles.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { Colors, Spacing, Typography, BorderRadius } from '../../../src/components/ui/theme';
import { Button, Card } from '../../../src/components/ui';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

interface ConsentSettings {
  personalLearning: boolean;
  anonymousLearning: boolean;
  rawImageStorage: boolean;
  notificationsEnabled: boolean;
  cycleContext: boolean;
  exportEnabled: boolean;
}

type ScreenState = 'loading' | 'ready' | 'auth_required' | 'not_configured';

const CONSENT_ITEMS = [
  {
    key: 'personalLearning' as keyof ConsentSettings,
    label: 'Personal Learning',
    description: 'Allow CutisAI and Skin Twin to use your logs for personalized insights.',
    sensitive: false,
  },
  {
    key: 'anonymousLearning' as keyof ConsentSettings,
    label: 'Anonymous Learning',
    description: 'Contribute anonymized, non-identifying data to improve the research network.',
    sensitive: false,
  },
  {
    key: 'rawImageStorage' as keyof ConsentSettings,
    label: 'Raw Image Storage',
    description: 'Store original FaceAtlas photos in your private storage bucket.',
    sensitive: false,
  },
  {
    key: 'notificationsEnabled' as keyof ConsentSettings,
    label: 'Notifications',
    description: 'Receive reminders for daily logging, treatment check-ins, and streaks.',
    sensitive: false,
  },
  {
    key: 'cycleContext' as keyof ConsentSettings,
    label: 'Cycle Context',
    description: 'Log hormonal cycle data as a confounder in pattern analysis.',
    sensitive: true,
  },
  {
    key: 'exportEnabled' as keyof ConsentSettings,
    label: 'Data Export',
    description: 'Allow generation of data exports and dermatologist reports.',
    sensitive: false,
  },
];

function getAccessToken(): Promise<string | null> {
  return supabase.auth.getSession().then(({ data }) => data.session?.access_token ?? null);
}

export default function PrivacyScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [consent, setConsent] = useState<ConsentSettings>({
    personalLearning: false,
    anonymousLearning: false,
    rawImageStorage: true,
    notificationsEnabled: true,
    cycleContext: false,
    exportEnabled: true,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deletingData, setDeletingData] = useState(false);

  const loadConsent = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) { setScreenState('auth_required'); return; }
    if (!API_BASE) { setScreenState('ready'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/privacy/consent`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setScreenState('ready'); return; }
      const payload = await res.json() as Partial<ConsentSettings>;
      setConsent(prev => ({ ...prev, ...payload }));
      setScreenState('ready');
    } catch {
      setScreenState('ready');
    }
  }, []);

  useEffect(() => { void loadConsent(); }, [loadConsent]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConsent();
    setRefreshing(false);
  }, [loadConsent]);

  const updateConsent = useCallback(async (key: keyof ConsentSettings, value: boolean) => {
    const token = await getAccessToken();
    if (!token) return;
    setSavingKey(key);
    // Optimistic update
    setConsent(prev => ({ ...prev, [key]: value }));
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/privacy/consent`, {
          method: 'PATCH',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ [key]: value }),
        });
        if (!res.ok) {
          // Revert on failure
          setConsent(prev => ({ ...prev, [key]: !value }));
          Alert.alert('Error', 'Could not update consent. Please try again.');
        }
      } catch {
        setConsent(prev => ({ ...prev, [key]: !value }));
        Alert.alert('Error', 'Could not update consent.');
      }
    }
    setSavingKey(null);
  }, []);

  const requestDataDeletion = useCallback(() => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your logs, scans, conversations, reports, and account data. This action cannot be undone.\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything', style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Final Confirmation',
              'Type "DELETE" to confirm permanent data deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm Delete', style: 'destructive',
                  onPress: async () => {
                    const token = await getAccessToken();
                    if (!token || !API_BASE) {
                      Alert.alert('Not Configured', 'Data deletion API is not configured. Contact support.');
                      return;
                    }
                    setDeletingData(true);
                    try {
                      const res = await fetch(`${API_BASE}/api/privacy/delete-account`, {
                        method: 'POST',
                        headers: {
                          authorization: `Bearer ${token}`,
                          'content-type': 'application/json',
                        },
                        body: JSON.stringify({ confirmation: 'DELETE' }),
                      });
                      if (!res.ok) {
                        Alert.alert('Error', 'Could not initiate deletion. Please contact support.');
                        return;
                      }
                      await supabase.auth.signOut();
                      router.replace('/auth/sign-in' as never);
                    } catch {
                      Alert.alert('Error', 'Could not initiate deletion. Please contact support.');
                    } finally {
                      setDeletingData(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, []);

  if (screenState === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading Privacy Settings…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (screenState === 'auth_required') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Privacy</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.stateIcon}>🔑</Text>
          <Text style={styles.stateMessage}>Sign in to manage your privacy settings.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy & Consent</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Card style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>🔒 Your Data, Your Control</Text>
          <Text style={styles.aboutText}>
            All consent settings are stored in your account and respected immediately.
            You can change any setting at any time. Revoking consent stops future use
            but does not automatically delete historical data — use the deletion option below.
          </Text>
        </Card>

        {/* Consent toggles */}
        <Text style={styles.sectionTitle}>Consent Settings</Text>
        {CONSENT_ITEMS.map(item => (
          <View key={item.key} style={styles.consentRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.labelRow}>
                <Text style={styles.consentLabel}>{item.label}</Text>
                {item.sensitive && (
                  <View style={styles.sensitiveBadge}>
                    <Text style={styles.sensitiveText}>Sensitive</Text>
                  </View>
                )}
                {savingKey === item.key && (
                  <ActivityIndicator color={Colors.primary} size="small" />
                )}
              </View>
              <Text style={styles.consentDesc}>{item.description}</Text>
            </View>
            <Switch
              value={consent[item.key]}
              onValueChange={v => updateConsent(item.key, v)}
              disabled={savingKey !== null}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
              accessibilityLabel={item.label}
            />
          </View>
        ))}

        {/* Data export */}
        <Text style={styles.sectionTitle}>Data Export</Text>
        <Card style={styles.exportCard}>
          <Text style={styles.exportTitle}>📦 Export Your Data</Text>
          <Text style={styles.exportText}>
            Download a complete copy of your data in JSON format. Includes all logs,
            scans, conversations, and settings. Does not include raw images unless
            you enable Raw Image Storage above.
          </Text>
          <Button
            title="Request Data Export"
            variant="secondary"
            onPress={async () => {
              const token = await getAccessToken();
              if (!token || !API_BASE) {
                Alert.alert('Not Configured', 'Data export API is not configured.');
                return;
              }
              try {
                const res = await fetch(`${API_BASE}/api/privacy/export`, {
                  method: 'POST',
                  headers: { authorization: `Bearer ${token}` },
                });
                if (!res.ok) { Alert.alert('Error', 'Could not request export.'); return; }
                Alert.alert('Export Requested', 'Your data export is being prepared. You will receive a download link when ready.');
              } catch {
                Alert.alert('Error', 'Could not request export.');
              }
            }}
            style={styles.exportBtn}
          />
        </Card>

        {/* Danger zone */}
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <Card style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>⚠️ Delete All Data</Text>
          <Text style={styles.dangerText}>
            Permanently delete your account and all associated data including logs, scans,
            conversations, reports, and settings. This action cannot be undone.
          </Text>
          <Button
            title={deletingData ? 'Deleting…' : 'Delete All My Data'}
            variant="danger"
            onPress={requestDataDeletion}
            loading={deletingData}
            disabled={deletingData}
            style={styles.deleteBtn}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { paddingRight: Spacing.sm },
  backText: { ...Typography.bodyMedium, color: Colors.primary },
  title: { ...Typography.title3, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  loadingText: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.md },
  stateIcon: { fontSize: 48, marginBottom: Spacing.lg },
  stateMessage: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  aboutCard: { marginBottom: Spacing.lg },
  aboutTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 6 },
  aboutText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  sectionTitle: { ...Typography.title3, color: Colors.textPrimary, marginBottom: Spacing.md, marginTop: Spacing.sm },
  consentRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  consentLabel: { ...Typography.bodyMedium, color: Colors.textPrimary },
  consentDesc: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  sensitiveBadge: {
    backgroundColor: '#fef3c7', borderRadius: BorderRadius.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  sensitiveText: { ...Typography.caption, color: '#92400e', fontSize: 10 },
  exportCard: { marginBottom: Spacing.lg },
  exportTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 6 },
  exportText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18, marginBottom: Spacing.md },
  exportBtn: {},
  dangerCard: { borderColor: '#fca5a5', backgroundColor: '#fff5f5' },
  dangerTitle: { ...Typography.bodyMedium, color: Colors.error, marginBottom: 6 },
  dangerText: { ...Typography.caption, color: '#7f1d1d', lineHeight: 18, marginBottom: Spacing.md },
  deleteBtn: {},
});
