import {
  CustomerResponse,
  GetCustomersRequest,
  getFieldoreAPI,
} from '@/src/api/generated';
import { router } from 'expo-router';
import {
  Calendar,
  ChevronRight,
  MapPin,
  MoreHorizontal,
  Phone,
  Search,
  SlidersHorizontal,
  UserPlus,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import SideFilterSheet from '@/src/components/SideFilterSheet';

type StatusFilter = 'All' | 'Active' | 'Inactive';
type TypeFilter = 'All' | 'Residential' | 'Commercial';

type CustomerCardModel = {
  id: string;
  name: string;
  phone: string;
  createdLabel: string;
  location: string;
  initials: string;
  color: string;
  status: 'Active' | 'Idle';
  raw: CustomerResponse;
};

const api = getFieldoreAPI();
const PAGE_SIZE = 10;
const STATUS_FILTERS: StatusFilter[] = ['All', 'Active', 'Inactive'];
const TYPE_FILTERS: TypeFilter[] = ['All', 'Residential', 'Commercial'];
const AVATAR_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#4f46e5', '#ef4444', '#06b6d4'];

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

const getInitials = (first?: string | null, last?: string | null, display?: string | null) => {
  const source = display?.trim() || `${first || ''} ${last || ''}`.trim();
  if (!source) return 'CU';
  const parts = source.split(/\s+/).slice(0, 2);
  return parts.map(part => part[0]?.toUpperCase() || '').join('') || 'CU';
};

const getAvatarColor = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = seed.charCodeAt(index) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const mapCustomerToCard = (customer: CustomerResponse): CustomerCardModel => {
  const primaryAddress =
    customer.addresses?.find(address => address?.isPrimary) ||
    customer.addresses?.find(Boolean);

  const displayName =
    customer.displayName?.trim() ||
    [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() ||
    customer.companyName?.trim() ||
    'Unnamed Customer';

  const locationParts = [
    primaryAddress?.city?.trim(),
    primaryAddress?.stateOrProvince?.trim(),
  ].filter(Boolean);

  return {
    id: customer.id || displayName,
    name: displayName,
    phone: customer.mobilePhone?.trim() || customer.alternatePhone?.trim() || 'No phone',
    createdLabel: formatDate(customer.createdAt),
    location: locationParts.length > 0 ? locationParts.join(', ') : 'No address',
    initials: getInitials(customer.firstName, customer.lastName, displayName),
    color: getAvatarColor(customer.id || displayName),
    status: customer.isActive ? 'Active' : 'Idle',
    raw: customer,
  };
};

const CustomerCard: React.FC<{ customer: CustomerCardModel }> = ({ customer }) => (
  <TouchableOpacity
    style={styles.card}
    activeOpacity={0.7}
    onPress={() => {
      router.push({
        pathname: '../Screens/CustomerProfile',
        params: { customerId: customer.id, customerName: customer.name },
      });
    }}
  >
    <View style={styles.cardHeader}>
      <View style={[styles.avatar, { backgroundColor: customer.color }]}>
        <Text style={styles.avatarText}>{customer.initials}</Text>
      </View>
      <View style={styles.headerInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.customerName} numberOfLines={1}>{customer.name}</Text>
          <View
            style={[
              styles.statusBadge,
              customer.status === 'Active' ? styles.badgeActive : styles.badgeIdle,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                customer.status === 'Active' ? styles.textActive : styles.textIdle,
              ]}
            >
              {customer.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.phoneRow}>
          <Phone size={14} color="#64748b" />
          <Text style={styles.phoneText}>{customer.phone}</Text>
        </View>
      </View>
      <ChevronRight size={18} color="#cbd5e1" />
    </View>

    <View style={styles.divider} />

    <View style={styles.metadataGrid}>
      <View style={styles.metaItem}>
        <View style={styles.metaIconBox}>
          <Calendar size={16} color="#64748b" />
        </View>
        <View>
          <Text style={styles.metaLabel}>CREATED</Text>
          <Text style={styles.metaValue}>{customer.createdLabel}</Text>
        </View>
      </View>
      <View style={styles.metaItem}>
        <View style={styles.metaIconBox}>
          <MapPin size={16} color="#64748b" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.metaLabel}>LOCATION</Text>
          <Text style={styles.metaValue} numberOfLines={1}>{customer.location}</Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
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

const CustomerCardSkeleton = () => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <SkeletonBlock height={56} width={56} style={{ borderRadius: 20 }} />
      <View style={styles.headerInfo}>
        <View style={styles.nameRow}>
          <SkeletonBlock height={20} width="60%" />
          <SkeletonBlock height={22} width={50} style={styles.skeletonBadge} />
        </View>
        <View style={styles.phoneRow}>
          <SkeletonBlock height={14} width="40%" />
        </View>
      </View>
    </View>

    <View style={styles.divider} />

    <View style={styles.metadataGrid}>
      <View style={styles.metaItem}>
        <SkeletonBlock height={36} width={36} style={{ borderRadius: 12 }} />
        <View style={styles.skeletonMetaText}>
          <SkeletonBlock height={10} width={52} style={{ marginBottom: 6 }} />
          <SkeletonBlock height={14} width={82} />
        </View>
      </View>
      <View style={styles.metaItem}>
        <SkeletonBlock height={36} width={36} style={{ borderRadius: 12 }} />
        <View style={styles.skeletonMetaText}>
          <SkeletonBlock height={10} width={58} style={{ marginBottom: 6 }} />
          <SkeletonBlock height={14} width={96} />
        </View>
      </View>
    </View>
  </View>
);

const CustomersSkeleton = () => (
  <View style={styles.scrollContent}>
    {[0, 1, 2].map(item => (
      <CustomerCardSkeleton key={item} />
    ))}
  </View>
);

const EmptyState = ({ loading }: { loading: boolean }) => (
  <View style={styles.emptyState}>
    {!loading ? (
      <>
        <View style={styles.emptyIconBox}>
          <UserPlus size={40} color="#2563eb" strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>No customers found</Text>
        <Text style={styles.emptyText}>We couldn't find any clients matching your criteria. Try adjusting the filters or add a new one.</Text>
      </>
    ) : null}
  </View>
);

const Customers: React.FC = () => {
  const isFetchingRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
  const [cityFilter, setCityFilter] = useState('');
  const [debouncedCityFilter, setDebouncedCityFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [customers, setCustomers] = useState<CustomerCardModel[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCityFilter(cityFilter.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [cityFilter]);

  const requestFilters = useMemo<GetCustomersRequest>(
    () => ({
      pageSize: PAGE_SIZE,
      search: debouncedSearch || null,
      type: typeFilter === 'All' ? null : typeFilter,
      isActive:
        statusFilter === 'All'
          ? null
          : statusFilter === 'Active',
      city: debouncedCityFilter || null,
      state: null,
    }),
    [debouncedSearch, typeFilter, statusFilter, debouncedCityFilter]
  );

  const fetchCustomers = useCallback(async (
    nextPage: number,
    mode: 'initial' | 'refresh' | 'loadMore' = 'initial'
  ) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (mode === 'initial') setIsLoading(true);
    if (mode === 'refresh') setIsRefreshing(true);
    if (mode === 'loadMore') setIsLoadingMore(true);

    try {
      const request: GetCustomersRequest = {
        ...requestFilters,
        pageNumber: nextPage,
      };

      const response = await api.postApiCustomersGetAllCustomers(request);
      const result = response.data;

      if (!result.success) {
        throw new Error(result.message || 'Failed to load customers');
      }

      const items = (result.data?.data || []).map(mapCustomerToCard);
      const total = result.data?.totalRecords || 0;
      const currentPage = result.data?.pageNumber || nextPage;
      const pageSize = result.data?.pageSize || PAGE_SIZE;
      const loadedCount = (currentPage - 1) * pageSize + items.length;

      setCustomers(prev => (nextPage === 1 ? items : [...prev, ...items]));
      setTotalRecords(total);
      setPageNumber(currentPage);
      setHasMore(loadedCount < total && items.length > 0);
      setError('');
    } catch (fetchError: any) {
      setError(fetchError?.response?.data?.message || fetchError?.message || 'Failed to load customers.');
      if (nextPage === 1) {
        setCustomers([]);
        setHasMore(false);
        setTotalRecords(0);
      }
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [requestFilters]);

  useEffect(() => {
    setPageNumber(1);
    setHasMore(true);
    setCustomers([]);
    fetchCustomers(1, 'initial');
  }, [fetchCustomers]);

  const handleRefresh = () => {
    fetchCustomers(1, 'refresh');
  };

  const handleLoadMore = () => {
    if (!isLoading && !isRefreshing && !isLoadingMore && hasMore) {
      fetchCustomers(pageNumber + 1, 'loadMore');
    }
  };

  const clearFilters = () => {
    setStatusFilter('All');
    setTypeFilter('All');
    setCityFilter('');
    setDebouncedCityFilter('');
  };

  const activeFilterCount = [
    statusFilter !== 'All',
    typeFilter !== 'All',
    cityFilter.trim().length > 0,
  ].filter(Boolean).length;

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.titleText}>Customers</Text>
            <Text style={styles.countText}>{totalRecords} TOTAL CLIENTS</Text>
          </View>
          <TouchableOpacity style={styles.moreBtn}>
            <MoreHorizontal size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchWrapper}>
            <Search size={18} color="#cbd5e1" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name or phone..."
              placeholderTextColor="#cbd5e1"
              value={searchInput}
              onChangeText={setSearchInput}
            />
            {!!searchInput && (
              <TouchableOpacity onPress={() => setSearchInput('')}>
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
            onPress={() => setShowFilters(true)}
          >
            <SlidersHorizontal size={20} color={activeFilterCount > 0 ? '#2563eb' : '#64748b'} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {isLoading && customers.length === 0 ? (
        <CustomersSkeleton />
      ) : (
        <FlatList
          ref={flatListRef}
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CustomerCard customer={item} />}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.35}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#2563eb" />
          }
          ListEmptyComponent={<EmptyState loading={isLoading} />}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <SkeletonBlock height={28} width={28} style={styles.footerSkeleton} />
              </View>
            ) : customers.length > 0 && !hasMore ? (
              <Text style={styles.endText}>You have reached the end of the list.</Text>
            ) : null
          }
        />
      )}

      <SideFilterSheet
        visible={showFilters}
        title="Filters"
        subtitle="Filter customers by type, status, or city."
        badgeCount={activeFilterCount}
        onClose={() => setShowFilters(false)}
        onClear={activeFilterCount > 0 ? clearFilters : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Type</Text>
            <View style={styles.chipsRow}>
              {TYPE_FILTERS.map(filter => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.chip, typeFilter === filter && styles.chipActive]}
                  onPress={() => setTypeFilter(filter)}
                >
                  <Text style={[styles.chipText, typeFilter === filter && styles.chipTextActive]}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.chipsRow}>
              {STATUS_FILTERS.map(filter => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.chip, statusFilter === filter && styles.chipActive]}
                  onPress={() => setStatusFilter(filter)}
                >
                  <Text style={[styles.chipText, statusFilter === filter && styles.chipTextActive]}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>City</Text>
            <View style={styles.filterInputWrapper}>
              <MapPin size={16} color="#cbd5e1" style={styles.filterInputIcon} />
              <TextInput
                style={styles.filterInput}
                placeholder="Filter by city"
                placeholderTextColor="#cbd5e1"
                value={cityFilter}
                onChangeText={setCityFilter}
              />
            </View>
          </View>
        </ScrollView>
      </SideFilterSheet>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={() => {
          router.push('../Screens/AddClientScreen');
        }}
      >
        <UserPlus size={24} color="white" strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: '#ffffff' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  titleText: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  countText: { fontSize: 14, fontWeight: '600', color: '#64748b', marginTop: 4 },
  moreBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  searchWrapper: {
    flex: 1,
    height: 52,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, height: '100%', fontSize: 15, fontWeight: '500', color: '#0f172a' },
  filterBtn: {
    width: 52,
    height: 52,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  filterBtnActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  errorBox: {
    marginTop: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 160, gap: 16, flexGrow: 1, paddingTop: 10 },
  skeletonBlock: {
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
  },
  card: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#64748b',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  skeletonAvatar: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#e2e8f0' },
  avatar: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '900', color: 'white', letterSpacing: 0.5 },
  headerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  skeletonBadge: { borderRadius: 8 },
  customerName: { flex: 1, fontSize: 17, fontWeight: '800', color: '#0f172a', lineHeight: 22 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  badgeActive: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  badgeIdle: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  textActive: { color: '#059669' },
  textIdle: { color: '#64748b' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  phoneText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  metadataGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  skeletonMetaText: { flex: 1 },
  metaIconBox: {
    width: 36,
    height: 36,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 13, fontWeight: '700', color: '#475569' },
  emptyState: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  emptyIconBox: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 10, textAlign: 'center' },
  emptyText: { fontSize: 15, fontWeight: '500', color: '#64748b', textAlign: 'center', lineHeight: 22 },
  footerLoader: { paddingVertical: 18 },
  footerSkeleton: { borderRadius: 999, alignSelf: 'center' },
  endText: { textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#94a3b8', paddingVertical: 18 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 100,
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  // Filter sheet content styles
  filterContent: { paddingBottom: 24 },
  filterSection: { marginBottom: 22 },
  filterLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  chipTextActive: { color: '#2563eb' },
  filterInputWrapper: {
    height: 56,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterInputIcon: { marginLeft: 2 },
  filterInput: { flex: 1, height: '100%', fontSize: 15, fontWeight: '500', color: '#0f172a' },
});

export default Customers;
