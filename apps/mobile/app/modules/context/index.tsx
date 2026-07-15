/**
 * Context Logs — Stress, Activity, Hydration, Routine, Contact, Cycle
 * All data from real user input; no AI inference
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
  TextInput, Platform, KeyboardAvoidingView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  fetchStressLogsForDate, upsertStressLog, deleteStressLog,
  fetchActivityLogsForDate, createActivityLog, deleteActivityLog,
  fetchHydrationLogsForDate, createHydrationLog, deleteHydrationLog,
  fetchContactEventsForDate, createContactEvent, deleteContactEvent,
  fetchRoutineLogsForDate, upsertRoutineLog,
  fetchCycleLogForDate, upsertCycleLog,
  generateEventId,
  ACTIVITY_TYPES, CONTACT_TYPES, CYCLE_PHASES, ACTIVES,
  StressLog, ActivityLog, HydrationLog, ContactEvent, RoutineLog, CycleLog,
} from '../../../src/lib/context-service';
import { Colors, Spacing } from '../../../src/components/ui/theme';

function getLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

type Tab = 'stress' | 'activity' | 'hydration' | 'routine' | 'contact' | 'cycle';

export default function ContextScreen() {
  const [activeDate, setActiveDate] = useState(getLocalDate());
  const [activeTab, setActiveTab] = useState<Tab>('stress');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data state
  const [stressLogs, setStressLogs] = useState<StressLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [hydrationLogs, setHydrationLogs] = useState<HydrationLog[]>([]);
  const [contactEvents, setContactEvents] = useState<ContactEvent[]>([]);
  const [routineLogs, setRoutineLogs] = useState<RoutineLog[]>([]);
  const [cycleLog, setCycleLog] = useState<CycleLog | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<Tab>('stress');

  // Stress form
  const [stressIntensity, setStressIntensity] = useState(5);
  const [stressDuration, setStressDuration] = useState('');
  const [stressCategory, setStressCategory] = useState('');
  const [stressNotes, setStressNotes] = useState('');

  // Activity form
  const [activityType, setActivityType] = useState('cardio');
  const [activityDuration, setActivityDuration] = useState('');
  const [activityIntensity, setActivityIntensity] = useState<'low' | 'moderate' | 'high' | 'unknown'>('moderate');
  const [sweatAmount, setSweatAmount] = useState<'none' | 'light' | 'moderate' | 'heavy' | 'unknown'>('moderate');
  const [postCleanse, setPostCleanse] = useState(false);
  const [activityNotes, setActivityNotes] = useState('');

  // Hydration form
  const [hydrationQual, setHydrationQual] = useState<HydrationLog['quantity_qualitative']>('moderate');
  const [hydrationMl, setHydrationMl] = useState('');
  const [beverageType, setBeverageType] = useState('water');

  // Contact form
  const [contactType, setContactType] = useState('pillowcase');
  const [contactFrequency, setContactFrequency] = useState<ContactEvent['frequency']>('once');
  const [contactNotes, setContactNotes] = useState('');

  // Routine form
  const [routineSlot, setRoutineSlot] = useState<'morning' | 'evening'>('morning');
  const [adherence, setAdherence] = useState<RoutineLog['adherence_status']>('completed');
  const [cleansed, setCleansed] = useState(false);
  const [moisturized, setMoisturized] = useState(false);
  const [sunscreen, setSunscreen] = useState(false);
  const [activesUsed, setActivesUsed] = useState<string[]>([]);
  const [irritationNoted, setIrritationNoted] = useState(false);
  const [routineNotes, setRoutineNotes] = useState('');

  // Cycle form
  const [cyclePhase, setCyclePhase] = useState<CycleLog['phase']>('unknown');
  const [cycleSkinChange, setCycleSkinChange] = useState(false);
  const [cycleNotes, setCycleNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async (date: string) => {
    try {
      const [stress, activity, hydration, contact, routine, cycle] = await Promise.all([
        fetchStressLogsForDate(date),
        fetchActivityLogsForDate(date),
        fetchHydrationLogsForDate(date),
        fetchContactEventsForDate(date),
        fetchRoutineLogsForDate(date),
        fetchCycleLogForDate(date),
      ]);
      setStressLogs(stress);
      setActivityLogs(activity);
      setHydrationLogs(hydration);
      setContactEvents(contact);
      setRoutineLogs(routine);
      setCycleLog(cycle);
    } catch (e) {
      console.error('Failed to load context logs:', e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadAll(activeDate);
      setLoading(false);
    })();
  }, [activeDate, loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll(activeDate);
    setRefreshing(false);
  };

  const openModal = (type: Tab) => {
    setModalType(type);
    // Pre-fill cycle from existing
    if (type === 'cycle' && cycleLog) {
      setCyclePhase(cycleLog.phase);
      setCycleSkinChange(cycleLog.skin_change_noted ?? false);
      setCycleNotes(cycleLog.notes ?? '');
    }
    // Pre-fill routine from existing
    if (type === 'routine') {
      const existing = routineLogs.find(r => r.routine_slot === routineSlot);
      if (existing) {
        setAdherence(existing.adherence_status);
        setCleansed(existing.cleansed ?? false);
        setMoisturized(existing.moisturized ?? false);
        setSunscreen(existing.sunscreen_applied ?? false);
        setActivesUsed(existing.actives_used ?? []);
        setIrritationNoted(existing.irritation_noted ?? false);
        setRoutineNotes(existing.notes ?? '');
      }
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const eventId = await generateEventId();
      switch (modalType) {
        case 'stress':
          await upsertStressLog(activeDate, {
            event_id: eventId,
            intensity: stressIntensity,
            intensity_label: stressIntensity <= 2 ? 'low' : stressIntensity <= 5 ? 'moderate' : stressIntensity <= 8 ? 'high' : 'very_high',
            duration_minutes: stressDuration ? parseInt(stressDuration) : null,
            context_category: stressCategory || null,
            coping_context: null,
            notes: stressNotes || null,
          });
          break;
        case 'activity':
          await createActivityLog(activeDate, {
            event_id: eventId,
            activity_type: activityType,
            start_time: null,
            duration_minutes: activityDuration ? parseInt(activityDuration) : null,
            intensity: activityIntensity,
            sweat_amount: sweatAmount,
            sweat_context: null,
            occlusion_gear: null,
            post_workout_cleanse: postCleanse,
            post_workout_change: null,
            source: 'manual',
            notes: activityNotes || null,
          });
          break;
        case 'hydration':
          await createHydrationLog(activeDate, {
            event_id: eventId,
            quantity_ml: hydrationMl ? parseInt(hydrationMl) : null,
            quantity_qualitative: hydrationQual,
            beverage_type: beverageType || null,
            notes: null,
          });
          break;
        case 'contact':
          await createContactEvent(activeDate, {
            event_id: eventId,
            contact_type: contactType,
            frequency: contactFrequency,
            zones_affected: null,
            notes: contactNotes || null,
          });
          break;
        case 'routine':
          await upsertRoutineLog(activeDate, routineSlot, {
            adherence_status: adherence,
            cleansed,
            moisturized,
            sunscreen_applied: sunscreen,
            actives_used: activesUsed.length > 0 ? activesUsed : null,
            irritation_noted: irritationNoted,
            notes: routineNotes || null,
          });
          break;
        case 'cycle':
          await upsertCycleLog(activeDate, {
            phase: cyclePhase,
            skin_change_noted: cycleSkinChange,
            notes: cycleNotes || null,
            confidence: 'medium',
            consent_version: 'v1',
          });
          break;
      }
      await loadAll(activeDate);
      setShowModal(false);
    } catch (e) {
      console.error('Save failed:', e);
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const TABS: { key: Tab; label: string; emoji: string }[] = [
    { key: 'stress', label: 'Stress', emoji: '😰' },
    { key: 'activity', label: 'Activity', emoji: '🏃' },
    { key: 'hydration', label: 'Water', emoji: '💧' },
    { key: 'routine', label: 'Routine', emoji: '🧴' },
    { key: 'contact', label: 'Contact', emoji: '📱' },
    { key: 'cycle', label: 'Cycle', emoji: '🌙' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'stress':
        return (
          <View>
            {stressLogs.length === 0 && <Text style={styles.emptyText}>No stress events logged today.</Text>}
            {stressLogs.map(log => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logCardHeader}>
                  <Text style={styles.logCardTitle}>Stress Level: {log.intensity}/10</Text>
                  <TouchableOpacity onPress={() => Alert.alert('Delete', 'Delete this stress log?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteStressLog(log.id); await loadAll(activeDate); } },
                  ])}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
                {log.context_category && <Text style={styles.logDetail}>Category: {log.context_category}</Text>}
                {log.notes && <Text style={styles.logDetail}>{log.notes}</Text>}
              </View>
            ))}
          </View>
        );
      case 'activity':
        return (
          <View>
            {activityLogs.length === 0 && <Text style={styles.emptyText}>No activity logged today.</Text>}
            {activityLogs.map(log => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logCardHeader}>
                  <Text style={styles.logCardTitle}>{ACTIVITY_TYPES.find(a => a.id === log.activity_type)?.label ?? log.activity_type}</Text>
                  <TouchableOpacity onPress={() => Alert.alert('Delete', 'Delete this activity?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteActivityLog(log.id); await loadAll(activeDate); } },
                  ])}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.logDetail}>
                  {log.duration_minutes ? `${log.duration_minutes} min · ` : ''}{log.intensity} · Sweat: {log.sweat_amount}
                </Text>
                {log.post_workout_cleanse && <Text style={styles.logDetail}>✓ Post-workout cleanse</Text>}
              </View>
            ))}
          </View>
        );
      case 'hydration':
        return (
          <View>
            {hydrationLogs.length === 0 && <Text style={styles.emptyText}>No hydration logged today.</Text>}
            {hydrationLogs.map(log => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logCardHeader}>
                  <Text style={styles.logCardTitle}>
                    {log.beverage_type ?? 'Water'}: {log.quantity_ml ? `${log.quantity_ml}ml` : log.quantity_qualitative}
                  </Text>
                  <TouchableOpacity onPress={() => Alert.alert('Delete', 'Delete this entry?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteHydrationLog(log.id); await loadAll(activeDate); } },
                  ])}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        );
      case 'routine':
        return (
          <View>
            {routineLogs.length === 0 && <Text style={styles.emptyText}>No routine logged today.</Text>}
            {routineLogs.map(log => (
              <View key={log.id} style={styles.logCard}>
                <Text style={styles.logCardTitle}>{log.routine_slot === 'morning' ? '☀️ Morning' : '🌙 Evening'} — {log.adherence_status}</Text>
                <Text style={styles.logDetail}>
                  {[log.cleansed && 'Cleansed', log.moisturized && 'Moisturized', log.sunscreen_applied && 'SPF'].filter(Boolean).join(' · ') || 'No steps recorded'}
                </Text>
                {log.actives_used && log.actives_used.length > 0 && (
                  <Text style={styles.logDetail}>Actives: {log.actives_used.join(', ')}</Text>
                )}
                {log.irritation_noted && <Text style={styles.logDetailWarning}>⚠ Irritation noted</Text>}
              </View>
            ))}
          </View>
        );
      case 'contact':
        return (
          <View>
            {contactEvents.length === 0 && <Text style={styles.emptyText}>No contact events logged today.</Text>}
            {contactEvents.map(event => (
              <View key={event.id} style={styles.logCard}>
                <View style={styles.logCardHeader}>
                  <Text style={styles.logCardTitle}>{CONTACT_TYPES.find(c => c.id === event.contact_type)?.label ?? event.contact_type}</Text>
                  <TouchableOpacity onPress={() => Alert.alert('Delete', 'Delete this event?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteContactEvent(event.id); await loadAll(activeDate); } },
                  ])}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
                {event.frequency && <Text style={styles.logDetail}>Frequency: {event.frequency}</Text>}
                {event.notes && <Text style={styles.logDetail}>{event.notes}</Text>}
              </View>
            ))}
          </View>
        );
      case 'cycle':
        return (
          <View>
            {!cycleLog && <Text style={styles.emptyText}>No cycle data logged today.</Text>}
            {cycleLog && (
              <View style={styles.logCard}>
                <Text style={styles.logCardTitle}>Phase: {CYCLE_PHASES.find(p => p.id === cycleLog.phase)?.label ?? cycleLog.phase}</Text>
                {cycleLog.skin_change_noted && <Text style={styles.logDetail}>Skin change noted</Text>}
                {cycleLog.notes && <Text style={styles.logDetail}>{cycleLog.notes}</Text>}
              </View>
            )}
            <Text style={styles.cycleDisclaimer}>
              Cycle data is stored locally and used only for your personal context. No hormonal claims are made.
            </Text>
          </View>
        );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Context Logs</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Date nav */}
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => { const d = new Date(activeDate); d.setDate(d.getDate() - 1); setActiveDate(d.toISOString().split('T')[0]); }}>
          <Text style={styles.dateArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>{activeDate === getLocalDate() ? 'Today' : activeDate}</Text>
        <TouchableOpacity
          onPress={() => { if (activeDate < getLocalDate()) { const d = new Date(activeDate); d.setDate(d.getDate() + 1); setActiveDate(d.toISOString().split('T')[0]); } }}
          disabled={activeDate >= getLocalDate()}
        >
          <Text style={[styles.dateArrow, activeDate >= getLocalDate() && styles.dateArrowDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabEmoji}>{tab.emoji}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>

        {/* Add button */}
        <TouchableOpacity style={styles.addButton} onPress={() => openModal(activeTab)}>
          <Text style={styles.addButtonText}>+ Log {TABS.find(t => t.key === activeTab)?.label}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Log {TABS.find(t => t.key === modalType)?.label}</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.modalSave}>Save</Text>}
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {/* Stress form */}
              {modalType === 'stress' && (
                <View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Stress Intensity: {stressIntensity}/10</Text>
                    <View style={styles.scaleRow}>
                      {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                        <TouchableOpacity key={n} style={[styles.scaleButton, stressIntensity === n && styles.scaleButtonActive]} onPress={() => setStressIntensity(n)}>
                          <Text style={[styles.scaleButtonText, stressIntensity === n && styles.scaleButtonTextActive]}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Category</Text>
                    <View style={styles.optionRow}>
                      {['work','relationships','health','financial','academic','other'].map(cat => (
                        <TouchableOpacity key={cat} style={[styles.optionChip, stressCategory === cat && styles.optionChipActive]} onPress={() => setStressCategory(cat)}>
                          <Text style={[styles.optionChipText, stressCategory === cat && styles.optionChipTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Duration (minutes, optional)</Text>
                    <TextInput style={styles.inputField} value={stressDuration} onChangeText={setStressDuration} keyboardType="number-pad" placeholder="e.g. 30" />
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notes</Text>
                    <TextInput style={styles.notesInput} value={stressNotes} onChangeText={setStressNotes} multiline numberOfLines={2} placeholder="Optional context..." />
                  </View>
                </View>
              )}

              {/* Activity form */}
              {modalType === 'activity' && (
                <View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Activity Type</Text>
                    <View style={styles.optionRow}>
                      {ACTIVITY_TYPES.map(({ id, label }) => (
                        <TouchableOpacity key={id} style={[styles.optionChip, activityType === id && styles.optionChipActive]} onPress={() => setActivityType(id)}>
                          <Text style={[styles.optionChipText, activityType === id && styles.optionChipTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Duration (minutes)</Text>
                    <TextInput style={styles.inputField} value={activityDuration} onChangeText={setActivityDuration} keyboardType="number-pad" placeholder="e.g. 45" />
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Intensity</Text>
                    <View style={styles.optionRow}>
                      {['low','moderate','high','unknown'].map(i => (
                        <TouchableOpacity key={i} style={[styles.optionChip, activityIntensity === i && styles.optionChipActive]} onPress={() => setActivityIntensity(i as typeof activityIntensity)}>
                          <Text style={[styles.optionChipText, activityIntensity === i && styles.optionChipTextActive]}>{i}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Sweat Amount</Text>
                    <View style={styles.optionRow}>
                      {['none','light','moderate','heavy','unknown'].map(s => (
                        <TouchableOpacity key={s} style={[styles.optionChip, sweatAmount === s && styles.optionChipActive]} onPress={() => setSweatAmount(s as typeof sweatAmount)}>
                          <Text style={[styles.optionChipText, sweatAmount === s && styles.optionChipTextActive]}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.section}>
                    <View style={styles.checkRow}>
                      <Switch value={postCleanse} onValueChange={setPostCleanse} trackColor={{ true: Colors.primary }} />
                      <Text style={styles.checkLabel}>Post-workout cleanse</Text>
                    </View>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notes</Text>
                    <TextInput style={styles.notesInput} value={activityNotes} onChangeText={setActivityNotes} multiline numberOfLines={2} placeholder="Optional..." />
                  </View>
                </View>
              )}

              {/* Hydration form */}
              {modalType === 'hydration' && (
                <View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Amount</Text>
                    <View style={styles.optionRow}>
                      {(['very_low','low','moderate','high','very_high'] as const).map(q => (
                        <TouchableOpacity key={q} style={[styles.optionChip, hydrationQual === q && styles.optionChipActive]} onPress={() => setHydrationQual(q)}>
                          <Text style={[styles.optionChipText, hydrationQual === q && styles.optionChipTextActive]}>{q.replace('_', ' ')}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput style={[styles.inputField, { marginTop: Spacing.sm }]} value={hydrationMl} onChangeText={setHydrationMl} keyboardType="number-pad" placeholder="Or enter ml (optional)" />
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Beverage</Text>
                    <View style={styles.optionRow}>
                      {['water','tea','coffee','juice','other'].map(b => (
                        <TouchableOpacity key={b} style={[styles.optionChip, beverageType === b && styles.optionChipActive]} onPress={() => setBeverageType(b)}>
                          <Text style={[styles.optionChipText, beverageType === b && styles.optionChipTextActive]}>{b}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Routine form */}
              {modalType === 'routine' && (
                <View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Slot</Text>
                    <View style={styles.optionRow}>
                      {(['morning','evening'] as const).map(s => (
                        <TouchableOpacity key={s} style={[styles.optionChip, routineSlot === s && styles.optionChipActive]} onPress={() => setRoutineSlot(s)}>
                          <Text style={[styles.optionChipText, routineSlot === s && styles.optionChipTextActive]}>{s === 'morning' ? '☀️ Morning' : '🌙 Evening'}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Adherence</Text>
                    <View style={styles.optionRow}>
                      {(['completed','partial','skipped'] as const).map(a => (
                        <TouchableOpacity key={a} style={[styles.optionChip, adherence === a && styles.optionChipActive]} onPress={() => setAdherence(a)}>
                          <Text style={[styles.optionChipText, adherence === a && styles.optionChipTextActive]}>{a}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Steps</Text>
                    <View style={styles.checkRow}><Switch value={cleansed} onValueChange={setCleansed} trackColor={{ true: Colors.primary }} /><Text style={styles.checkLabel}>Cleansed</Text></View>
                    <View style={styles.checkRow}><Switch value={moisturized} onValueChange={setMoisturized} trackColor={{ true: Colors.primary }} /><Text style={styles.checkLabel}>Moisturized</Text></View>
                    <View style={styles.checkRow}><Switch value={sunscreen} onValueChange={setSunscreen} trackColor={{ true: Colors.primary }} /><Text style={styles.checkLabel}>Sunscreen</Text></View>
                    <View style={styles.checkRow}><Switch value={irritationNoted} onValueChange={setIrritationNoted} trackColor={{ true: Colors.primary }} /><Text style={styles.checkLabel}>Irritation noted</Text></View>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Actives Used</Text>
                    <View style={styles.optionRow}>
                      {ACTIVES.map(({ id, label }) => (
                        <TouchableOpacity key={id} style={[styles.optionChip, activesUsed.includes(id) && styles.optionChipActive]} onPress={() => setActivesUsed(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])}>
                          <Text style={[styles.optionChipText, activesUsed.includes(id) && styles.optionChipTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notes</Text>
                    <TextInput style={styles.notesInput} value={routineNotes} onChangeText={setRoutineNotes} multiline numberOfLines={2} placeholder="Optional..." />
                  </View>
                </View>
              )}

              {/* Contact form */}
              {modalType === 'contact' && (
                <View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact Type</Text>
                    <View style={styles.optionRow}>
                      {CONTACT_TYPES.map(({ id, label }) => (
                        <TouchableOpacity key={id} style={[styles.optionChip, contactType === id && styles.optionChipActive]} onPress={() => setContactType(id)}>
                          <Text style={[styles.optionChipText, contactType === id && styles.optionChipTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Frequency</Text>
                    <View style={styles.optionRow}>
                      {(['once','multiple','continuous','unknown'] as const).map(f => (
                        <TouchableOpacity key={f} style={[styles.optionChip, contactFrequency === f && styles.optionChipActive]} onPress={() => setContactFrequency(f)}>
                          <Text style={[styles.optionChipText, contactFrequency === f && styles.optionChipTextActive]}>{f}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notes</Text>
                    <TextInput style={styles.notesInput} value={contactNotes} onChangeText={setContactNotes} multiline numberOfLines={2} placeholder="Optional..." />
                  </View>
                </View>
              )}

              {/* Cycle form */}
              {modalType === 'cycle' && (
                <View>
                  <View style={styles.cautionBox}>
                    <Text style={styles.cautionText}>Cycle data is stored only for your personal context. No hormonal or causal claims are made.</Text>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cycle Phase</Text>
                    <View style={styles.optionRow}>
                      {CYCLE_PHASES.map(({ id, label }) => (
                        <TouchableOpacity key={id} style={[styles.optionChip, cyclePhase === id && styles.optionChipActive]} onPress={() => setCyclePhase(id as CycleLog['phase'])}>
                          <Text style={[styles.optionChipText, cyclePhase === id && styles.optionChipTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.section}>
                    <View style={styles.checkRow}>
                      <Switch value={cycleSkinChange} onValueChange={setCycleSkinChange} trackColor={{ true: Colors.primary }} />
                      <Text style={styles.checkLabel}>Skin change noted today</Text>
                    </View>
                  </View>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notes</Text>
                    <TextInput style={styles.notesInput} value={cycleNotes} onChangeText={setCycleNotes} multiline numberOfLines={2} placeholder="Optional..." />
                  </View>
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backButton: { fontSize: 16, color: Colors.primary },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  scroll: { flex: 1 },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.xs, gap: Spacing.lg,
  },
  dateArrow: { fontSize: 28, color: Colors.primary, paddingHorizontal: Spacing.md },
  dateArrowDisabled: { color: Colors.textMuted },
  dateText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  tabBar: { maxHeight: 60, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBarContent: { paddingHorizontal: Spacing.sm, gap: 4, alignItems: 'center' },
  tab: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, minWidth: 60,
  },
  tabActive: { backgroundColor: Colors.primary + '15' },
  tabEmoji: { fontSize: 16 },
  tabLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  tabLabelActive: { color: Colors.primary, fontWeight: '700' },
  tabContent: { padding: Spacing.md },
  logCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  logCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logCardTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  logDetail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  logDetailWarning: { fontSize: 13, color: '#D32F2F', marginTop: 2 },
  deleteText: { fontSize: 12, color: '#D32F2F', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginTop: 20, fontSize: 14 },
  cycleDisclaimer: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', marginTop: Spacing.sm, textAlign: 'center' },
  addButton: {
    marginHorizontal: Spacing.md, marginTop: Spacing.sm,
    borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  addButtonText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalCancel: { fontSize: 16, color: Colors.textSecondary },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  modalSave: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
  modalScroll: { flex: 1 },
  section: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  optionChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionChipText: { fontSize: 13, color: Colors.text },
  optionChipTextActive: { color: '#fff', fontWeight: '600' },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scaleButton: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  scaleButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  scaleButtonText: { fontSize: 13, color: Colors.text },
  scaleButtonTextActive: { color: '#fff', fontWeight: '700' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  checkLabel: { fontSize: 14, color: Colors.text, marginLeft: Spacing.sm, flex: 1 },
  inputField: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    padding: Spacing.sm, fontSize: 16, color: Colors.text, backgroundColor: Colors.background,
  },
  notesInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    padding: Spacing.sm, fontSize: 14, color: Colors.text,
    backgroundColor: Colors.background, textAlignVertical: 'top',
  },
  cautionBox: {
    margin: Spacing.md, padding: Spacing.sm,
    backgroundColor: '#EEF2FF', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  cautionText: { fontSize: 13, color: Colors.text, lineHeight: 18 },
});
