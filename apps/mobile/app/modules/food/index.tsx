/**
 * DermDiet — Food Logging Screen
 * Baseline-adaptive meal tracking; no dietary claims
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
  fetchFoodLogsForDate, createFoodLog, updateFoodLog, deleteFoodLog,
  fetchFoodHistory, MEAL_TYPES, FOOD_CATEGORIES, FoodLog, FoodItem,
} from '../../../src/lib/food-service';
import { Colors, Spacing } from '../../../src/components/ui/theme';

function getLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function FoodScreen() {
  const [activeDate, setActiveDate] = useState(getLocalDate());
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<{ date: string; logs: FoodLog[] }[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);

  // Modal form state
  const [mealType, setMealType] = useState<FoodLog['meal_type']>('breakfast');
  const [items, setItems] = useState<FoodItem[]>([{ name: '' }]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isBaseline, setIsBaseline] = useState(false);
  const [completed, setCompleted] = useState(true);
  const [mealNotes, setMealNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadLogs = useCallback(async (date: string) => {
    try {
      const data = await fetchFoodLogsForDate(date);
      setLogs(data);
    } catch (e) {
      console.error('Failed to load food logs:', e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadLogs(activeDate);
      setLoading(false);
    })();
  }, [activeDate, loadLogs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLogs(activeDate);
    if (showHistory) {
      const h = await fetchFoodHistory(14, 0);
      setHistory(h);
    }
    setRefreshing(false);
  };

  const openAddModal = (existing?: FoodLog) => {
    if (existing) {
      setEditingLog(existing);
      setMealType(existing.meal_type);
      setItems(existing.items.length > 0 ? existing.items : [{ name: '' }]);
      setCategories(existing.categories ?? []);
      setIsBaseline(existing.is_baseline);
      setCompleted(existing.completed);
      setMealNotes(existing.notes ?? '');
    } else {
      setEditingLog(null);
      setMealType('breakfast');
      setItems([{ name: '' }]);
      setCategories([]);
      setIsBaseline(false);
      setCompleted(true);
      setMealNotes('');
    }
    setShowAddModal(true);
  };

  const handleSave = async () => {
    const validItems = items.filter(i => i.name.trim() !== '');
    if (validItems.length === 0 && categories.length === 0) {
      Alert.alert('Required', 'Please add at least one food item or category.');
      return;
    }
    setSaving(true);
    try {
      if (editingLog) {
        await updateFoodLog(editingLog.id, {
          meal_type: mealType,
          items: validItems,
          categories,
          is_baseline: isBaseline,
          completed,
          notes: mealNotes || null,
        });
      } else {
        await createFoodLog(activeDate, {
          meal_type: mealType,
          items: validItems,
          categories,
          is_baseline: isBaseline,
          completed,
          notes: mealNotes || null,
        });
      }
      await loadLogs(activeDate);
      setShowAddModal(false);
    } catch (e) {
      console.error('Save failed:', e);
      Alert.alert('Error', 'Failed to save meal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Meal', 'Are you sure you want to delete this meal entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteFoodLog(id);
            await loadLogs(activeDate);
          } catch (e) {
            Alert.alert('Error', 'Failed to delete meal.');
          }
        },
      },
    ]);
  };

  const addItem = () => setItems(prev => [...prev, { name: '' }]);
  const updateItem = (index: number, field: keyof FoodItem, value: string) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };
  const removeItem = (index: number) => {
    if (items.length > 1) setItems(prev => prev.filter((_, i) => i !== index));
  };
  const toggleCategory = (catId: string) => {
    setCategories(prev => prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]);
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
        <Text style={styles.headerTitle}>DermDiet</Text>
        <TouchableOpacity onPress={async () => {
          if (!showHistory) {
            const h = await fetchFoodHistory(14, 0);
            setHistory(h);
          }
          setShowHistory(!showHistory);
        }}>
          <Text style={styles.historyToggle}>{showHistory ? 'Log' : 'History'}</Text>
        </TouchableOpacity>
      </View>

      {showHistory ? (
        <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <Text style={styles.sectionTitle}>Food History</Text>
          <Text style={styles.disclaimer}>Recorded meals only. No dietary claims or correlations are made.</Text>
          {history.length === 0 && <Text style={styles.emptyText}>No food logs yet.</Text>}
          {history.map(({ date, logs: dayLogs }) => (
            <View key={date} style={styles.historyDayCard}>
              <Text style={styles.historyDate}>{date}</Text>
              {dayLogs.map(log => (
                <Text key={log.id} style={styles.historyMeal}>
                  {MEAL_TYPES.find(m => m.key === log.meal_type)?.label}: {log.items.map(i => i.name).join(', ') || log.categories.join(', ') || '(no items)'}
                  {log.is_baseline ? ' ★' : ''}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
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

          {/* Meals list */}
          {logs.length === 0 && (
            <Text style={styles.emptyText}>No meals logged for this day.</Text>
          )}
          {logs.map(log => (
            <View key={log.id} style={styles.mealCard}>
              <View style={styles.mealCardHeader}>
                <Text style={styles.mealType}>
                  {MEAL_TYPES.find(m => m.key === log.meal_type)?.label}
                  {log.is_baseline ? ' ★ Baseline' : ''}
                </Text>
                <View style={styles.mealActions}>
                  <TouchableOpacity onPress={() => openAddModal(log)} style={styles.editButton}>
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(log.id)} style={styles.deleteButton}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {log.items.length > 0 && (
                <Text style={styles.mealItems}>{log.items.map(i => i.name).join(', ')}</Text>
              )}
              {log.categories.length > 0 && (
                <View style={styles.categoryTags}>
                  {log.categories.map(cat => (
                    <View key={cat} style={styles.categoryTag}>
                      <Text style={styles.categoryTagText}>
                        {FOOD_CATEGORIES.find(c => c.id === cat)?.label ?? cat}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {log.notes && <Text style={styles.mealNotes}>{log.notes}</Text>}
            </View>
          ))}

          {/* Add meal button */}
          <TouchableOpacity style={styles.addButton} onPress={() => openAddModal()}>
            <Text style={styles.addButtonText}>+ Add Meal</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingLog ? 'Edit Meal' : 'Add Meal'}</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.modalSave}>Save</Text>}
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {/* Meal type */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Meal Type</Text>
                <View style={styles.optionRow}>
                  {MEAL_TYPES.map(({ key, label }) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.optionChip, mealType === key && styles.optionChipActive]}
                      onPress={() => setMealType(key)}
                    >
                      <Text style={[styles.optionChipText, mealType === key && styles.optionChipTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Food items */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Food Items</Text>
                {items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <TextInput
                      style={[styles.itemInput, { flex: 1 }]}
                      value={item.name}
                      onChangeText={v => updateItem(index, 'name', v)}
                      placeholder={`Item ${index + 1}`}
                      accessibilityLabel={`Food item ${index + 1}`}
                    />
                    <TextInput
                      style={[styles.itemInput, { width: 80 }]}
                      value={item.portion ?? ''}
                      onChangeText={v => updateItem(index, 'portion', v)}
                      placeholder="Portion"
                      accessibilityLabel={`Portion for item ${index + 1}`}
                    />
                    {items.length > 1 && (
                      <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeItemButton}>
                        <Text style={styles.removeItemText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity onPress={addItem} style={styles.addItemButton}>
                  <Text style={styles.addItemText}>+ Add Item</Text>
                </TouchableOpacity>
              </View>

              {/* Categories */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Categories (Optional)</Text>
                <View style={styles.optionRow}>
                  {FOOD_CATEGORIES.map(({ id, label }) => (
                    <TouchableOpacity
                      key={id}
                      style={[styles.optionChip, categories.includes(id) && styles.optionChipActive]}
                      onPress={() => toggleCategory(id)}
                    >
                      <Text style={[styles.optionChipText, categories.includes(id) && styles.optionChipTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Baseline */}
              <View style={styles.section}>
                <View style={styles.checkRow}>
                  <Switch value={isBaseline} onValueChange={setIsBaseline} trackColor={{ true: Colors.primary }} />
                  <Text style={styles.checkLabel}>Mark as baseline meal (for comparison)</Text>
                </View>
                <View style={styles.checkRow}>
                  <Switch value={completed} onValueChange={setCompleted} trackColor={{ true: Colors.primary }} />
                  <Text style={styles.checkLabel}>Meal completed</Text>
                </View>
              </View>

              {/* Notes */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  value={mealNotes}
                  onChangeText={setMealNotes}
                  placeholder="Any notes about this meal..."
                  multiline
                  numberOfLines={2}
                  accessibilityLabel="Meal notes"
                />
              </View>

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
  historyToggle: { fontSize: 14, color: Colors.primary },
  scroll: { flex: 1 },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.sm, gap: Spacing.lg,
  },
  dateArrow: { fontSize: 28, color: Colors.primary, paddingHorizontal: Spacing.md },
  dateArrowDisabled: { color: Colors.textMuted },
  dateText: { fontSize: 16, fontWeight: '600', color: Colors.text },
  section: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  disclaimer: { fontSize: 12, color: Colors.textMuted, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  mealCard: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md,
  },
  mealCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  mealType: { fontSize: 14, fontWeight: '700', color: Colors.text },
  mealActions: { flexDirection: 'row', gap: 8 },
  editButton: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: Colors.primary + '20' },
  editButtonText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  deleteButton: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#FFE4E4' },
  deleteButtonText: { fontSize: 12, color: '#D32F2F', fontWeight: '600' },
  mealItems: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  categoryTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: Colors.primary + '15' },
  categoryTagText: { fontSize: 11, color: Colors.primary },
  mealNotes: { fontSize: 12, color: Colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  addButton: {
    marginHorizontal: Spacing.md, marginTop: Spacing.sm,
    borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed',
    borderRadius: 12, paddingVertical: 16, alignItems: 'center',
  },
  addButtonText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginTop: 40, fontSize: 15 },
  historyDayCard: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md,
  },
  historyDate: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  historyMeal: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  // Modal styles
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
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  optionChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionChipText: { fontSize: 13, color: Colors.text },
  optionChipTextActive: { color: '#fff', fontWeight: '600' },
  itemRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  itemInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    padding: Spacing.sm, fontSize: 14, color: Colors.text, backgroundColor: Colors.background,
  },
  removeItemButton: { padding: 8 },
  removeItemText: { fontSize: 16, color: '#D32F2F' },
  addItemButton: { paddingVertical: 8 },
  addItemText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  checkLabel: { fontSize: 14, color: Colors.text, marginLeft: Spacing.sm, flex: 1 },
  notesInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    padding: Spacing.sm, fontSize: 14, color: Colors.text,
    backgroundColor: Colors.background, textAlignVertical: 'top',
  },
});
