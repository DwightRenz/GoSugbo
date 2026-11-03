import { View, StyleSheet } from "react-native";
import HomeScreen from "@/components/gosugbo/home-screen";
import LogoutButton from "@/components/gosugbo/logout-button";

export default function Home() {
  return (
    <View style={styles.wrap}>
      <HomeScreen />
      <LogoutButton />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
