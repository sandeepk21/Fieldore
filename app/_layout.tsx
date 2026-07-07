import { LoaderProvider } from "@/src/context/LoaderContext";
import { SubscriptionProvider } from "@/src/context/SubscriptionContext";
import { Stack } from "expo-router";


export default function Layout() {

  return (
    <LoaderProvider>
      <SubscriptionProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SubscriptionProvider>
    </LoaderProvider>
  );
}