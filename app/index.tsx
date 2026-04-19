import { StatusBar, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import SplashScreen from "./Screens/SplashScreen";

function Main() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content" // or dark-content depending UI
      />

      {/* Full screen content */}
      <View style={{ flex: 1 }}>
        <SplashScreen />
      </View>

      {/* Optional: overlay safe padding only where needed */}
      {/* Example: header */}
      {/* <View style={{ position: "absolute", top: insets.top }} /> */}

    </View>
  );
}

export default function Index() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}