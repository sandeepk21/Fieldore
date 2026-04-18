import { Tabs } from "expo-router";
import {
    Calendar,
    FileText,
    LayoutDashboard,
    Settings,
    Users
} from "lucide-react-native";
import { Platform, StyleSheet, Text } from "react-native";
export default function TabLayout() {
    return (
        <Tabs
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: true,
                tabBarActiveTintColor: "#2563eb",
                tabBarInactiveTintColor: "#cbd5e1",
                tabBarStyle: styles.tabBar,

                tabBarIcon: ({ color }) => {
                    let IconComponent;

                    if (route.name === "Dashboard") IconComponent = LayoutDashboard;
                    else if (route.name === "Customers") IconComponent = Users;
                    else if (route.name === "JobList") IconComponent = Calendar;
                    else if (route.name === "Invoices") IconComponent = FileText;
                    else if (route.name === "InvoicesListScreen") IconComponent = FileText;
                    else if (route.name === "Settings") IconComponent = Settings;

                    return IconComponent ? <IconComponent size={22} color={color} /> : null;
                },

                tabBarLabel: ({ focused }) => {
                    const labelColor = focused ? "#2563eb" : "#94A3B8";

                    return (
                        <Text style={[styles.tabBarLabel, { color: labelColor }]}>
                            {route.name.toUpperCase()}
                        </Text>
                    );
                },
            })}
        >
            <Tabs.Screen name="Dashboard" options={{ title: "Dashboard" }} />
            <Tabs.Screen name="Customers" options={{ title: "Customers" }} />
            <Tabs.Screen name="JobList" options={{ title: "JobList" }} />
            <Tabs.Screen name="Invoices" options={{ title: "Invoices" }} />
            <Tabs.Screen name="InvoicesListScreen" options={{ title: "InvoicesListScreen" }} />
            <Tabs.Screen name="Settings" options={{ title: "Settings" }} />
        </Tabs>

    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: Platform.OS === "ios" ? 90 : 70,
        backgroundColor: "rgba(255,255,255,0.96)",
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
        paddingTop: 12,
        paddingBottom: Platform.OS === "ios" ? 30 : 12,
    },

    tabBarLabel: {
        fontSize: 9,
        fontWeight: "700",
        letterSpacing: -0.2,
        marginTop: 4,
    },
});