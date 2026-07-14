import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const modules = ["Daily logs", "FaceAtlas", "SleepDerm", "DermDiet", "Skin Twin", "CutisAI", "Treatments", "Reports"];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>PRIVATE SKIN INTELLIGENCE</Text>
        <Text style={styles.title}>AcneTrex V3</Text>
        <Text style={styles.copy}>Your records remain yours. Insights show uncertainty and never replace professional care.</Text>
        <Link href="/readiness" style={styles.link}>Open readiness console</Link>
        <View style={styles.grid}>{modules.map((module) => <View key={module} style={styles.card}><Text style={styles.cardText}>{module}</Text><Text style={styles.state}>Integration readiness required</Text></View>)}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#f5faf8" }, content: { padding: 20, gap: 12 }, eyebrow: { color: "#047857", fontWeight: "700", fontSize: 12 }, title: { color: "#17211d", fontSize: 34, fontWeight: "800" }, copy: { color: "#475569", lineHeight: 22 }, link: { color: "#047857", fontWeight: "700", paddingVertical: 10 }, grid: { gap: 10 }, card: { backgroundColor: "white", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#dbe7e2" }, cardText: { color: "#17211d", fontSize: 17, fontWeight: "700" }, state: { color: "#64748b", marginTop: 5 } });
