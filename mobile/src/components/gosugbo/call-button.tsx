import { Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";

type Props = {
  rideId: number;
  title?: string;
  label?: string;
};

/** Opens the call screen as the caller (mode=outgoing). */
export default function CallButton({
  rideId,
  title = "Call",
  label = "Call",
}: Props) {
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/call",
          params: { rideId: String(rideId), title, mode: "outgoing" },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3CFB9",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.75 },
  text: { color: "#4C1C24", fontSize: 13, fontWeight: "700" },
});
