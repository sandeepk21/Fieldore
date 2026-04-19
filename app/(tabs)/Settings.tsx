import { router } from 'expo-router';
import {
    Bell,
    Briefcase,
    ChevronRight,
    CreditCard,
    LogOut,
    LucideIcon,
    Settings as SettingsIcon,
    ShieldCheck,
    Users,
    Zap
} from 'lucide-react-native';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Interfaces ---
interface SettingsItem {
  id: string;
  icon: LucideIcon;
  label: string;
  desc: string;
}

interface SettingsGroup {
  label: string;
  items: SettingsItem[];
}

const Settings: React.FC = () => {
  const settingsGroups: SettingsGroup[] = [
    {
      label: "BUSINESS & TEAM",
      items: [
        { id: 'users', icon: Users, label: "Users & Team", desc: "Manage permissions and staff" },
        { id: 'services', icon: Briefcase, label: "Services", desc: "Your trade categories and rates" },
      ]
    },
    {
      label: "PREFERENCES",
      items: [
        { id: 'notifications', icon: Bell, label: "Notifications", desc: "Push, email, and SMS alerts" },
        { id: 'subscription', icon: CreditCard, label: "Subscription", desc: "Plan: Pro Annual (Renewing)" },
      ]
    },
    {
      label: "ACCOUNT & SAFETY",
      items: [
        { id: 'security', icon: ShieldCheck, label: "Security", desc: "Password and 2FA settings" },
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.titleText}>Settings</Text>
        <View style={styles.headerIconBox}>
          <SettingsIcon size={20} color="#2563eb" />
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Profile Summary Card */}
        <TouchableOpacity style={styles.profileCard} activeOpacity={0.9} onPress={()=>{router.push("../Screens/BusinessUpdateScreen")}}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AT</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>Alex Torres</Text>
            <Text style={styles.userRole}>Admin · torres.hvac@pro.com</Text>
          </View>
          <ChevronRight size={18} color="#cbd5e1" />
        </TouchableOpacity>

        {/* Settings Groups */}
        {settingsGroups.map((group, groupIdx) => (
          <View key={groupIdx} style={styles.groupContainer}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            <View style={styles.groupCard}>
              {group.items.map((item, itemIdx) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity 
                    key={item.id} 
                    activeOpacity={0.7}
                    style={[
                      styles.menuItem,
                      itemIdx !== group.items.length - 1 && styles.menuItemBorder
                    ]}
                  >
                    <View style={styles.itemIconBox}>
                      <Icon size={20} color="#94a3b8" />
                    </View>
                    <View style={styles.itemTextContainer}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      <Text style={styles.itemDesc}>{item.desc}</Text>
                    </View>
                    <ChevronRight size={18} color="#e2e8f0" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Logout Action */}
        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8}>
          <View style={styles.logoutIconBox}>
            <LogOut size={20} color="#f43f5e" />
          </View>
          <View style={styles.itemTextContainer}>
            <Text style={styles.logoutTitle}>Sign Out</Text>
            <Text style={styles.versionText}>Version 2.4.0 (Stable)</Text>
          </View>
        </TouchableOpacity>

        {/* Footer Links */}
        <View style={styles.footer}>
          <View style={styles.footerLinks}>
            <TouchableOpacity><Text style={styles.footerLinkText}>PRIVACY</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLinkText}>TERMS</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLinkText}>SUPPORT</Text></TouchableOpacity>
          </View>
          <View style={styles.poweredBadge}>
            <Zap size={10} color="#2563eb" fill="#2563eb" />
            <Text style={styles.poweredText}>POWERED BY PROSAAS</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  profileCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  avatar: {
    width: 64,
    height: 64,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: 'white',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  userRole: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 2,
  },
  groupContainer: {
    marginBottom: 32,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#cbd5e1',
    letterSpacing: 1.5,
    marginLeft: 4,
    marginBottom: 12,
  },
  groupCard: {
    backgroundColor: 'white',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  itemIconBox: {
    width: 44,
    height: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemDesc: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff1f2',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#ffe4e6',
    gap: 16,
    marginBottom: 32,
  },
  logoutIconBox: {
    width: 44,
    height: 44,
    backgroundColor: '#ffe4e6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#f43f5e',
  },
  versionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fb7185',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 24,
  },
  footerLinkText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#cbd5e1',
    letterSpacing: 1,
  },
  poweredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  poweredText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#2563eb',
    letterSpacing: 1,
  },
});

export default Settings;