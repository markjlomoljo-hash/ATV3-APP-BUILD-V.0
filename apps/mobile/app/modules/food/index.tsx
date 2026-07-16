import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  deleteFoodEvent,
  expectedMealSlots,
  fetchDailyFoodLog,
  fetchFoodHistory,
  FOOD_CATEGORIES,
  markDailyFoodLogComplete,
  MEAL_TYPES,
  newMealEvent,
  newSnackEvent,
  saveMealEvent,
  saveSnackEvent,
  type DailyFoodLog,
  type DailyMealEvent,
  type DailySnackEvent,
  type FoodItem,
} from "../../../src/lib/food-service";
import { Colors, Spacing } from "../../../src/components/ui/theme";

function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function slotKey(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "_");
}

const COMPLETION_LABELS: Record<DailyFoodLog["completionState"], string> = {
  not_started: "Not started",
  partially_logged: "Partially logged",
  meals_complete_no_snacks_logged: "Expected meals complete · no snacks logged",
  meals_complete_with_snacks_logged: "Expected meals complete · snacks logged",
  user_marked_complete: "Marked complete by you",
  incomplete_but_saved: "Saved · completion not confirmed",
  backfilled: "Backfilled",
  unknown_day: "Unknown day",
  skipped_with_reason: "Skipped with reason",
  offline_queued: "Waiting to sync",
};

export default function FoodScreen() {
  const [activeDate, setActiveDate] = useState(localDate());
  const [dailyLog, setDailyLog] = useState<DailyFoodLog | null>(null);
  const [history, setHistory] = useState<DailyFoodLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [entryKind, setEntryKind] = useState<"meal" | "snack">("meal");
  const [editingMeal, setEditingMeal] = useState<DailyMealEvent | null>(null);
  const [editingSnack, setEditingSnack] = useState<DailySnackEvent | null>(null);
  const [mealType, setMealType] = useState("meal_1");
  const [items, setItems] = useState<FoodItem[]>([{ name: "", portion: null }]);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [snackDescription, setSnackDescription] = useState("");
  const [snackPortion, setSnackPortion] = useState("");
  const [snackConfidence, setSnackConfidence] = useState<"certain" | "unsure" | "unknown">("certain");

  const load = useCallback(async (date: string) => {
    const log = await fetchDailyFoodLog(date);
    setDailyLog(log);
  }, []);

  useEffect(() => {
    setLoading(true);
    void load(activeDate)
      .catch(() => Alert.alert("Unable to load", "Your food log could not be loaded. Please retry."))
      .finally(() => setLoading(false));
  }, [activeDate, load]);

  const slots = useMemo(
    () => expectedMealSlots(dailyLog?.mealFrequencyBaseline ?? null),
    [dailyLog?.mealFrequencyBaseline],
  );

  const resetForm = () => {
    setEditingMeal(null);
    setEditingSnack(null);
    setMealType("meal_1");
    setItems([{ name: "", portion: null }]);
    setTags([]);
    setNotes("");
    setSnackDescription("");
    setSnackPortion("");
    setSnackConfidence("certain");
  };

  const openMeal = (event?: DailyMealEvent, suggestedType?: string) => {
    resetForm();
    setEntryKind("meal");
    if (event) {
      setEditingMeal(event);
      setMealType(event.type);
      setItems(event.items);
      setTags(event.tags);
      setNotes(event.notes ?? "");
    } else if (suggestedType) {
      setMealType(suggestedType);
    }
    setModalVisible(true);
  };

  const openSnack = (event?: DailySnackEvent) => {
    resetForm();
    setEntryKind("snack");
    if (event) {
      setEditingSnack(event);
      setSnackDescription(event.description);
      setSnackPortion(event.portionEstimate ?? "");
      setTags(event.tags);
      setSnackConfidence(event.confidenceLevel);
      setNotes(event.notes ?? "");
    }
    setModalVisible(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (entryKind === "meal") {
        const validItems = items
          .map((item) => ({ ...item, name: item.name.trim(), portion: item.portion?.trim() || null }))
          .filter((item) => item.name.length > 0);
        if (validItems.length === 0) {
          Alert.alert("Meal details required", "Add at least one food item.");
          return;
        }
        const event = editingMeal
          ? { ...editingMeal, type: mealType, items: validItems, tags, notes: notes.trim() || null }
          : newMealEvent({
              type: mealType,
              time: new Date().toISOString(),
              items: validItems,
              tags,
              notes: notes.trim() || null,
            });
        setDailyLog(await saveMealEvent(activeDate, event));
      } else {
        if (!snackDescription.trim()) {
          Alert.alert("Snack details required", "Describe the snack you had.");
          return;
        }
        const event = editingSnack
          ? {
              ...editingSnack,
              description: snackDescription.trim(),
              portionEstimate: snackPortion.trim() || null,
              tags,
              confidenceLevel: snackConfidence,
              notes: notes.trim() || null,
            }
          : newSnackEvent({
              time: new Date().toISOString(),
              description: snackDescription.trim(),
              photoStorageRef: null,
              portionEstimate: snackPortion.trim() || null,
              tags,
              confidenceLevel: snackConfidence,
              notes: notes.trim() || null,
            });
        setDailyLog(await saveSnackEvent(activeDate, event));
      }
      setModalVisible(false);
    } catch {
      Alert.alert("Save failed", "Nothing was discarded. Please check your connection and retry.");
    } finally {
      setSaving(false);
    }
  };

  const removeEvent = (kind: "meal" | "snack", id: string) => {
    Alert.alert("Delete entry?", "This removes only this event from the daily log.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteFoodEvent(activeDate, kind, id)
            .then(setDailyLog)
            .catch(() => Alert.alert("Delete failed", "Please retry."));
        },
      },
    ]);
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load(activeDate);
      if (showHistory) setHistory(await fetchFoodHistory());
    } finally {
      setRefreshing(false);
    }
  };

  if (loading || !dailyLog) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const expectedKeys = new Set(slots.map(slotKey));
  const extraMeals = dailyLog.mealEvents.filter((event) => !expectedKeys.has(event.type));

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.link}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>DermDiet</Text>
        <TouchableOpacity
          onPress={() => {
            if (!showHistory) void fetchFoodHistory().then(setHistory);
            setShowHistory((current) => !current);
          }}
        >
          <Text style={styles.link}>{showHistory ? "Today" : "History"}</Text>
        </TouchableOpacity>
      </View>

      {showHistory ? (
        <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
          <Text style={styles.disclaimer}>Recorded exposure events only. No food-to-acne causation is assumed.</Text>
          {history.length === 0 && <Text style={styles.empty}>No food logs yet.</Text>}
          {history.map((log) => (
            <View key={log.logDate} style={styles.card}>
              <Text style={styles.cardTitle}>{log.logDate}</Text>
              <Text style={styles.meta}>{COMPLETION_LABELS[log.completionState]}</Text>
              <Text style={styles.meta}>{log.mealEvents.length} meals · {log.snackEvents.length} snacks</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
          <View style={styles.dateRow}>
            <TouchableOpacity onPress={() => { const d = new Date(`${activeDate}T12:00:00`); d.setDate(d.getDate() - 1); setActiveDate(localDate(d)); }}><Text style={styles.arrow}>‹</Text></TouchableOpacity>
            <Text style={styles.date}>{activeDate === localDate() ? "Today" : activeDate}</Text>
            <TouchableOpacity disabled={activeDate >= localDate()} onPress={() => { const d = new Date(`${activeDate}T12:00:00`); d.setDate(d.getDate() + 1); setActiveDate(localDate(d)); }}><Text style={[styles.arrow, activeDate >= localDate() && styles.muted]}>›</Text></TouchableOpacity>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>{COMPLETION_LABELS[dailyLog.completionState]}</Text>
            <Text style={styles.meta}>
              {dailyLog.expectedMealCount
                ? `${dailyLog.mealEvents.length} of ${dailyLog.expectedMealCount} expected meals logged`
                : "Flexible baseline · mark complete when your day is finished"}
            </Text>
          </View>

          {slots.map((label) => {
            const key = slotKey(label);
            const event = dailyLog.mealEvents.find((candidate) => candidate.type === key);
            return (
              <View key={key} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View><Text style={styles.cardTitle}>{label}</Text><Text style={styles.meta}>{event ? "Logged" : "Not logged"}</Text></View>
                  <TouchableOpacity onPress={() => openMeal(event, key)}><Text style={styles.link}>{event ? "Edit" : "Add"}</Text></TouchableOpacity>
                </View>
                {event && <Text style={styles.body}>{event.items.map((item) => item.name).join(", ")}</Text>}
              </View>
            );
          })}

          {slots.length === 0 && (
            <Text style={styles.disclaimer}>Your baseline is flexible or undisclosed. Add meals as they occur; missing meals are never treated as fasting.</Text>
          )}

          {extraMeals.map((event) => (
            <View key={event.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View><Text style={styles.cardTitle}>{MEAL_TYPES.find((type) => type.key === event.type)?.label ?? "Meal"}</Text><Text style={styles.body}>{event.items.map((item) => item.name).join(", ")}</Text></View>
                <View style={styles.actions}><TouchableOpacity onPress={() => openMeal(event)}><Text style={styles.link}>Edit</Text></TouchableOpacity><TouchableOpacity onPress={() => removeEvent("meal", event.id)}><Text style={styles.delete}>Delete</Text></TouchableOpacity></View>
              </View>
            </View>
          ))}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.outlineButton} onPress={() => openMeal()}><Text style={styles.outlineText}>+ Add meal</Text></TouchableOpacity>
            <TouchableOpacity style={styles.outlineButton} onPress={() => openSnack()}><Text style={styles.outlineText}>+ Add snack</Text></TouchableOpacity>
          </View>

          <Text style={styles.sectionHeading}>Snacks</Text>
          {dailyLog.snackEvents.length === 0 && <Text style={styles.disclaimer}>Snacks are optional exposure events, never missed requirements.</Text>}
          {dailyLog.snackEvents.map((event) => (
            <View key={event.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View><Text style={styles.cardTitle}>{event.description}</Text><Text style={styles.meta}>{new Date(event.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{event.portionEstimate ? ` · ${event.portionEstimate}` : ""}</Text></View>
                <View style={styles.actions}><TouchableOpacity onPress={() => openSnack(event)}><Text style={styles.link}>Edit</Text></TouchableOpacity><TouchableOpacity onPress={() => removeEvent("snack", event.id)}><Text style={styles.delete}>Delete</Text></TouchableOpacity></View>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => void markDailyFoodLogComplete(activeDate, !dailyLog.userMarkedComplete).then(setDailyLog)}
          >
            <Text style={styles.completeText}>{dailyLog.userMarkedComplete ? "Reopen today’s log" : "Mark today’s food log complete"}</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal} edges={["top", "bottom"]}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.link}>Cancel</Text></TouchableOpacity>
              <Text style={styles.headerTitle}>{entryKind === "meal" ? "Meal event" : "Snack event"}</Text>
              <TouchableOpacity onPress={save} disabled={saving}>{saving ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.link}>Save</Text>}</TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {!editingMeal && !editingSnack && (
                <View style={styles.section}>
                  <Text style={styles.cardTitle}>Event type</Text>
                  <View style={styles.chips}>{(["meal", "snack"] as const).map((kind) => <Pressable key={kind} onPress={() => setEntryKind(kind)} style={[styles.chip, entryKind === kind && styles.chipActive]}><Text style={[styles.chipText, entryKind === kind && styles.chipTextActive]}>{kind === "meal" ? "Meal" : "Snack"}</Text></Pressable>)}</View>
                </View>
              )}

              {entryKind === "meal" ? (
                <>
                  <View style={styles.section}><Text style={styles.cardTitle}>Meal slot</Text><View style={styles.chips}>{MEAL_TYPES.map((type) => <Pressable key={type.key} onPress={() => setMealType(type.key)} style={[styles.chip, mealType === type.key && styles.chipActive]}><Text style={[styles.chipText, mealType === type.key && styles.chipTextActive]}>{type.label}</Text></Pressable>)}</View></View>
                  <View style={styles.section}><Text style={styles.cardTitle}>Food items</Text>{items.map((item, index) => <View key={index} style={styles.itemRow}><TextInput style={[styles.input, { flex: 1 }]} value={item.name} onChangeText={(value) => setItems((current) => current.map((candidate, i) => i === index ? { ...candidate, name: value } : candidate))} placeholder={`Item ${index + 1}`} /><TextInput style={[styles.input, { width: 100 }]} value={item.portion ?? ""} onChangeText={(value) => setItems((current) => current.map((candidate, i) => i === index ? { ...candidate, portion: value } : candidate))} placeholder="Portion" /></View>)}<TouchableOpacity onPress={() => setItems((current) => [...current, { name: "", portion: null }])}><Text style={styles.link}>+ Add item</Text></TouchableOpacity></View>
                </>
              ) : (
                <View style={styles.section}>
                  <Text style={styles.cardTitle}>Snack details</Text>
                  <TextInput style={styles.input} value={snackDescription} onChangeText={setSnackDescription} placeholder="Snack name or description" />
                  <TextInput style={styles.input} value={snackPortion} onChangeText={setSnackPortion} placeholder="Portion estimate (optional)" />
                  <Text style={styles.fieldLabel}>Confidence</Text>
                  <View style={styles.chips}>{(["certain", "unsure", "unknown"] as const).map((confidence) => <Pressable key={confidence} onPress={() => setSnackConfidence(confidence)} style={[styles.chip, snackConfidence === confidence && styles.chipActive]}><Text style={[styles.chipText, snackConfidence === confidence && styles.chipTextActive]}>{confidence}</Text></Pressable>)}</View>
                </View>
              )}

              <View style={styles.section}><Text style={styles.cardTitle}>Exposure tags</Text><View style={styles.chips}>{FOOD_CATEGORIES.map((category) => { const selected = tags.includes(category.id); return <Pressable key={category.id} onPress={() => setTags((current) => selected ? current.filter((tag) => tag !== category.id) : [...current, category.id])} style={[styles.chip, selected && styles.chipActive]}><Text style={[styles.chipText, selected && styles.chipTextActive]}>{category.label}</Text></Pressable>; })}</View></View>
              <View style={styles.section}><Text style={styles.cardTitle}>Notes</Text><TextInput style={[styles.input, styles.notes]} value={notes} onChangeText={setNotes} multiline placeholder="Optional notes" /></View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  modal: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  link: { color: Colors.primary, fontWeight: "600" },
  delete: { color: "#C62828", fontWeight: "600" },
  scroll: { flex: 1 },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.lg, paddingVertical: Spacing.sm },
  arrow: { fontSize: 30, color: Colors.primary, paddingHorizontal: Spacing.md },
  muted: { color: Colors.textMuted },
  date: { fontSize: 16, fontWeight: "700", color: Colors.text },
  statusCard: { margin: Spacing.md, marginBottom: Spacing.sm, padding: Spacing.md, borderRadius: 14, backgroundColor: Colors.primary + "12", borderWidth: 1, borderColor: Colors.primary + "40" },
  statusLabel: { fontSize: 15, fontWeight: "700", color: Colors.primary },
  card: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, padding: Spacing.md, borderRadius: 12, backgroundColor: Colors.surface },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm },
  cardTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 4 },
  body: { fontSize: 14, color: Colors.textSecondary },
  meta: { fontSize: 12, color: Colors.textMuted },
  actions: { flexDirection: "row", gap: Spacing.sm },
  buttonRow: { flexDirection: "row", marginHorizontal: Spacing.md, gap: Spacing.sm, marginTop: Spacing.sm },
  outlineButton: { flex: 1, padding: Spacing.md, alignItems: "center", borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary },
  outlineText: { color: Colors.primary, fontWeight: "700" },
  sectionHeading: { marginHorizontal: Spacing.md, marginTop: Spacing.lg, marginBottom: Spacing.sm, fontSize: 17, fontWeight: "700", color: Colors.text },
  disclaimer: { marginHorizontal: Spacing.md, marginVertical: Spacing.sm, fontSize: 12, lineHeight: 18, color: Colors.textMuted },
  empty: { textAlign: "center", color: Colors.textMuted, marginTop: 50 },
  completeButton: { margin: Spacing.md, padding: Spacing.md, alignItems: "center", borderRadius: 12, backgroundColor: Colors.primary },
  completeText: { color: "#fff", fontWeight: "700" },
  section: { margin: Spacing.md, marginBottom: 0, padding: Spacing.md, borderRadius: 12, backgroundColor: Colors.surface },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textSecondary, textTransform: "capitalize" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  input: { minHeight: 46, marginTop: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, color: Colors.text, backgroundColor: Colors.background },
  notes: { minHeight: 90, paddingVertical: 10, textAlignVertical: "top" },
  itemRow: { flexDirection: "row", gap: 8 },
  fieldLabel: { marginTop: Spacing.md, color: Colors.textSecondary, fontWeight: "600" },
});
