import { LoaderProvider } from "@/src/context/LoaderContext";
import { Stack } from "expo-router";


export default function Layout() {
  
  return (<LoaderProvider><Stack screenOptions={{ headerShown:false }} /></LoaderProvider>);
}