import { Pressable, StyleSheet, Text } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { authColors } from "./auth-parts";

export default function LogoutButton() {
  const { logout } = useAuth();

  return (
    <Pressable
      onPress={() => void logout()}
      accessibilityRole="button"
      accessibilityLabel="Log out"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.text}>Log out</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: authColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
  text: {
    color: authColors.dark,
    fontSize: 12,
    fontWeight: "700",
  },
});
