import { StatusBar, View } from "react-native";
import Constants from "expo-constants";
import Onboarding from "./Onboarding";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  return (
    <View style={{ flex: 1 , backgroundColor: "#ffffff" }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
      <Onboarding />
      </SafeAreaView>

    </View>
  );
}