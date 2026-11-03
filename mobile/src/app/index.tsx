import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Onboarding from "@/components/gosugbo/onboarding";

export default function WelcomeScreen() {
  return (
    <View style={styles.screen}>
      <Onboarding
        onGetStarted={() => router.push("/signup")}
        onLogin={() => router.push("/login")}
      />
      <Pressable
        onPress={() => router.push("/rider-signup")}
        accessibilityRole="button"
        style={styles.riderLink}>
        <Text style={styles.riderText}>
          Want to drive?{" "}
          <Text style={styles.riderBold}>Become a GoSugbo rider</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  riderLink: {
    minHeight: 48,
    paddingHorizontal: 24,
    paddingBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  riderText: {
    color: "#88766E",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  riderBold: {
    color: "#4C1C24",
    fontWeight: "700",
  },
});
