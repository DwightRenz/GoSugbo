import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

export default function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome, {user?.firstName} 👋</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        <Text style={styles.meta}>Role: {user?.role}</Text>

        <Pressable
          onPress={() => void logout()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
          <Text style={styles.buttonText}>Log out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F3EB" },
  content: { flex: 1, padding: 24, justifyContent: "center" },
  title: { color: "#4C1C24", fontSize: 24, fontWeight: "800" },
  meta: { color: "#88766E", fontSize: 14, marginTop: 6 },
  button: {
    marginTop: 28,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#4C1C24",
  },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
