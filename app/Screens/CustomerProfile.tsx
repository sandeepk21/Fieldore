import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import {
    ChevronLeft,
    Mail,
    MapPin,
    MoreVertical,
    Phone,
    Plus,
    StickyNote,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomerResponse } from '@/src/api/generated';
import {
    formatCustomerAddress,
    getBillingCustomerAddress,
    getCustomerByIdApi,
    getCustomerDisplayName,
    getCustomerInitials,
    getPrimaryCustomerAddress,
} from '@/src/services/customerService';

type TabType = 'Jobs' | 'Invoices' | 'Estimates' | 'Notes';

const AVATAR_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#4f46e5', '#ef4444', '#06b6d4'];

const getAvatarColor = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = seed.charCodeAt(index) + ((hash << 5) - hash);
  }

  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const openEditScreen = (customerId: string) => {
  if (!customerId) {
    return;
  }

  router.push({
    pathname: '../Screens/UpdateCustomerProfileScreen',
    params: { customerId },
  });
};

const EmptyTabCard = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <View style={styles.emptyCard}>
    <Text style={styles.emptyCardTitle}>{title}</Text>
    <Text style={styles.emptyCardText}>{subtitle}</Text>
  </View>
);

const SkeletonBlock = ({
  height,
  width,
  style,
}: {
  height: number;
  width: number | `${number}%`;
  style?: object;
}) => <View style={[styles.skeletonBlock, { height, width }, style]} />;

const CustomerProfileSkeleton = () => (
  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
    <View style={styles.profileSection}>
      <View style={styles.skeletonAvatar} />
      <SkeletonBlock height={24} width="48%" style={{ marginBottom: 18 }} />
      <View style={styles.metaInfo}>
        <SkeletonBlock height={14} width="72%" />
        <SkeletonBlock height={14} width="80%" />
        <SkeletonBlock height={14} width="60%" />
      </View>
    </View>

    <View style={styles.actionGrid}>
      {[0, 1, 2].map(item => (
        <View key={item} style={styles.actionBtn}>
          <SkeletonBlock height={20} width={20} style={{ borderRadius: 10 }} />
          <SkeletonBlock height={10} width="42%" />
        </View>
      ))}
    </View>

    <View style={styles.tabBar}>
      {[0, 1, 2, 3].map(item => (
        <View key={item} style={styles.tabItem}>
          <SkeletonBlock height={12} width={58} />
        </View>
      ))}
    </View>

    <View style={styles.contentArea}>
      <View style={styles.emptyCard}>
        <SkeletonBlock height={18} width="36%" />
        <SkeletonBlock height={12} width="100%" style={{ marginTop: 12 }} />
        <SkeletonBlock height={12} width="88%" style={{ marginTop: 8 }} />
      </View>
    </View>
  </ScrollView>
);

const CustomerProfile: React.FC = () => {
  const params = useLocalSearchParams<{ customerId?: string; customerName?: string }>();
  const customerId = typeof params.customerId === 'string' ? params.customerId : '';
  const [activeTab, setActiveTab] = useState<TabType>('Jobs');
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCustomer = useCallback(async () => {
    if (!customerId) {
      setError('Customer id is missing.');
      setCustomer(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await getCustomerByIdApi(customerId);
      setCustomer(response);
    } catch (loadError: any) {
      setCustomer(null);
      setError(loadError?.message || 'Failed to load customer profile.');
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useFocusEffect(
    useCallback(() => {
      loadCustomer();
    }, [loadCustomer])
  );

  const primaryAddress = getPrimaryCustomerAddress(customer);
  const billingAddress = getBillingCustomerAddress(customer);
  const displayName = customer ? getCustomerDisplayName(customer) : params.customerName || 'Customer';
  const initials = getCustomerInitials(customer);
  const avatarColor = getAvatarColor(customer?.id || displayName);
  const email = customer?.email?.trim() || 'No email added';
  const serviceAddress = formatCustomerAddress(primaryAddress);
  const billingAddressText = customer?.billingSameAsService
    ? 'Same as service address'
    : formatCustomerAddress(billingAddress);
  const phoneNumber = customer?.mobilePhone?.trim() || customer?.alternatePhone?.trim() || '';
  const notes = customer?.internalNotes?.trim() || 'No internal notes added yet.';
  const tabs: TabType[] = ['Jobs', 'Invoices', 'Estimates', 'Notes'];

  const handleCall = async () => {
    if (!phoneNumber) {
      return;
    }

    const url = `tel:${phoneNumber}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  const handleEmail = async () => {
    if (!customer?.email) {
      return;
    }

    const url = `mailto:${customer.email}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      

      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>PROFILE</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => openEditScreen(customerId)}>
          <MoreVertical size={22} color="#475569" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <CustomerProfileSkeleton />
      ) : error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Unable to load profile</Text>
          <Text style={styles.stateError}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadCustomer}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
          <View style={styles.profileSection}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.customerName}>{displayName}</Text>

            <View style={styles.metaInfo}>
              <View style={styles.metaItem}>
                <Mail size={14} color="#cbd5e1" />
                <Text style={styles.metaText}>{email}</Text>
              </View>
              <View style={styles.metaItem}>
                <MapPin size={14} color="#cbd5e1" />
                <Text style={styles.metaText}>{serviceAddress}</Text>
              </View>
              <View style={styles.metaItem}>
                <Phone size={14} color="#cbd5e1" />
                <Text style={styles.metaText}>{phoneNumber || 'No phone number added'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionGrid}>
            <TouchableOpacity style={[styles.actionBtn, !phoneNumber && styles.actionBtnDisabled]} onPress={handleCall} disabled={!phoneNumber}>
              <Phone size={20} color="#2563eb" strokeWidth={2.5} />
              <Text style={styles.actionBtnText}>CALL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, !customer?.email && styles.actionBtnDisabled]}
              onPress={handleEmail}
              disabled={!customer?.email}
            >
              <Mail size={20} color="#2563eb" strokeWidth={2.5} />
              <Text style={styles.actionBtnText}>EMAIL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => openEditScreen(customerId)}>
              <Plus size={20} color="white" strokeWidth={3} />
              <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>EDIT</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabBar}>
            {tabs.map(tab => (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                {activeTab === tab && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.contentArea}>
            {activeTab === 'Jobs' && (
              <View style={styles.listGap}>
                <EmptyTabCard
                  title="No jobs yet"
                  subtitle="This customer profile is connected and ready. Job history can be shown here when that data is available."
                />
              </View>
            )}

            {activeTab === 'Invoices' && (
              <View style={styles.listGap}>
                <EmptyTabCard
                  title="No invoices yet"
                  subtitle="Invoice history for this customer can be added here once the invoice detail API is connected."
                />
              </View>
            )}

            {activeTab === 'Estimates' && (
              <View style={styles.listGap}>
                <EmptyTabCard
                  title="No estimates yet"
                  subtitle="Estimate records are not wired on this page yet, but the section is ready for integration."
                />
              </View>
            )}

            {activeTab === 'Notes' && (
              <View style={styles.noteCard}>
                <View style={styles.noteIconGhost}>
                  <StickyNote size={40} color="#0f172a" opacity={0.05} />
                </View>
                <Text style={styles.noteText}>{notes}</Text>
                <View style={styles.noteFooter}>
                  <Text style={styles.noteDate}>{billingAddressText}</Text>
                  <TouchableOpacity onPress={() => openEditScreen(customerId)}>
                    <Text style={styles.editBtn}>Edit Profile</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  scrollPadding: { paddingBottom: 40 },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 2,
  },
  skeletonBlock: { backgroundColor: '#e2e8f0', borderRadius: 12 },
  skeletonAvatar: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: '#e2e8f0',
    marginBottom: 16,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  stateTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  stateText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  stateError: { fontSize: 13, fontWeight: '600', color: '#b91c1c', textAlign: 'center' },
  retryBtn: {
    marginTop: 4,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryBtnText: { fontSize: 13, fontWeight: '800', color: 'white' },
  profileSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 16,
  },
  avatarText: { fontSize: 32, fontWeight: '900', color: 'white' },
  customerName: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  metaInfo: { marginTop: 16, gap: 8, alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24 },
  metaText: { fontSize: 13, color: '#64748b', fontWeight: '500', textAlign: 'center' },
  actionGrid: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 80,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnPrimary: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  actionBtnDisabled: { opacity: 0.55 },
  actionBtnText: { fontSize: 10, fontWeight: '900', color: '#2563eb', letterSpacing: 0.5 },
  actionBtnTextPrimary: { color: 'white' },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 24,
  },
  tabItem: { paddingBottom: 16 },
  tabText: { fontSize: 14, fontWeight: '900', color: '#cbd5e1' },
  tabTextActive: { color: '#0f172a' },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#2563eb',
    borderRadius: 3,
  },
  contentArea: { padding: 24 },
  listGap: { gap: 16 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cardIconBox: {
    width: 48,
    height: 48,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  cardSubText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeBlue: { backgroundColor: '#eff6ff' },
  badgeGreen: { backgroundColor: '#ecfdf5' },
  badgeText: { fontSize: 9, fontWeight: '900' },
  badgeTextBlue: { color: '#2563eb' },
  badgeTextGreen: { color: '#10b981' },
  cardRight: { alignItems: 'flex-end' },
  cardPrice: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  statusMini: { fontSize: 9, fontWeight: '900', marginTop: 4 },
  emptyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 20,
  },
  emptyCardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptyCardText: { fontSize: 13, fontWeight: '500', color: '#64748b', marginTop: 8, lineHeight: 20 },
  noteCard: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  noteIconGhost: { position: 'absolute', top: 10, right: 10 },
  noteText: { fontSize: 14, fontWeight: '500', color: '#475569', lineHeight: 22 },
  noteFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  noteDate: { flex: 1, fontSize: 10, fontWeight: '900', color: '#cbd5e1' },
  editBtn: { fontSize: 10, fontWeight: '700', color: '#2563eb' },
});

export default CustomerProfile;
