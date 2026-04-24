import {
  Inter_100Thin,
  Inter_100Thin_Italic,
  Inter_200ExtraLight,
  Inter_200ExtraLight_Italic,
  Inter_300Light,
  Inter_300Light_Italic,
  Inter_400Regular,
  Inter_400Regular_Italic,
  Inter_500Medium,
  Inter_500Medium_Italic,
  Inter_600SemiBold,
  Inter_600SemiBold_Italic,
  Inter_700Bold,
  Inter_700Bold_Italic,
  Inter_800ExtraBold,
  Inter_800ExtraBold_Italic,
  Inter_900Black,
  Inter_900Black_Italic,
  useFonts,
} from '@expo-google-fonts/inter';
import { StatusBar, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import SplashScreen from "./Screens/SplashScreen";
function Main() {
  const insets = useSafeAreaInsets();
const [fontsLoaded] = useFonts({
  Inter_100Thin,
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,

  Inter_100Thin_Italic,
  Inter_200ExtraLight_Italic,
  Inter_300Light_Italic,
  Inter_400Regular_Italic,
  Inter_500Medium_Italic,
  Inter_600SemiBold_Italic,
  Inter_700Bold_Italic,
  Inter_800ExtraBold_Italic,
  Inter_900Black_Italic,
});
   if (!fontsLoaded) return null;
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