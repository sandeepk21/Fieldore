import { StatusBar, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Onboarding from "./Auth/Onboarding";

export default function Index() {
  const isLoggedIn = false; // replace with auth logic
  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
       <Onboarding />
      </SafeAreaView>

    </View>
  );
}