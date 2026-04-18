import {
  CustomerResponse,
  GetCustomersRequest,
  getFieldoreAPI,
} from '@/src/api/generated';
import { useFocusEffect } from '@react-navigation/native';
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
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    activeOpacity={0.9}
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
          <Text style={styles.customerName}>{customer.name}</Text>
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
          <Phone size={12} color="#94a3b8" />
          <Text style={styles.phoneText}>{customer.phone}</Text>
        </View>
      </View>
      <ChevronRight size={18} color="#cbd5e1" />
    </View>

    <View style={styles.divider} />

    <View style={styles.metadataGrid}>
      <View style={styles.metaItem}>
        <View style={styles.metaIconBox}>
          <Calendar size={14} color="#94a3b8" />
        </View>
        <View>
          <Text style={styles.metaLabel}>CREATED</Text>
          <Text style={styles.metaValue}>{customer.createdLabel}</Text>
        </View>
      </View>
      <View style={styles.metaItem}>
        <View style={styles.metaIconBox}>
          <MapPin size={14} color="#94a3b8" />
        </View>
        <View>
          <Text style={styles.metaLabel}>LOCATION</Text>
          <Text style={styles.metaValue}>{customer.location}</Text>
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
      <View style={styles.skeletonAvatar} />
      <View style={styles.headerInfo}>
        <View style={styles.nameRow}>
          <SkeletonBlock height={18} width="55%" />
          <SkeletonBlock height={18} width={60} style={styles.skeletonBadge} />
        </View>
        <View style={styles.phoneRow}>
          <SkeletonBlock height={12} width="45%" />
        </View>
      </View>
    </View>

    <View style={styles.divider} />

    <View style={styles.metadataGrid}>
      <View style={styles.metaItem}>
        <View style={styles.metaIconBox}>
          <SkeletonBlock height={14} width={14} />
        </View>
        <View style={styles.skeletonMetaText}>
          <SkeletonBlock height={8} width={52} style={{ marginBottom: 6 }} />
          <SkeletonBlock height={12} width={82} />
        </View>
      </View>
      <View style={styles.metaItem}>
        <View style={styles.metaIconBox}>
          <SkeletonBlock height={14} width={14} />
        </View>
        <View style={styles.skeletonMetaText}>
          <SkeletonBlock height={8} width={58} style={{ marginBottom: 6 }} />
          <SkeletonBlock height={12} width={96} />
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
        <Text style={styles.emptyTitle}>No customers found</Text>
        <Text style={styles.emptyText}>Try a different search or adjust the filters.</Text>
      </>
    ) : null}
  </View>
);

const Customers: React.FC = () => {
  const isFetchingRef = useRef(false);
  const hasFocusedOnceRef = useRef(false);
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
    if (isFetchingRef.current) {
      return;
    }

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

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      flatListRef.current?.scrollToIndex({ index: 0, animated: false });
      fetchCustomers(1, 'refresh');
    }, [fetchCustomers])
  );

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
      <StatusBar barStyle="dark-content" />

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
            onPress={() => setShowFilters(current => !current)}
          >
            <SlidersHorizontal size={20} color={activeFilterCount > 0 ? '#2563eb' : '#64748b'} />
            {activeFilterCount > 0 && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtersPanel}>
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

            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
              <Text style={styles.clearBtnText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        )}

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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 15, paddingTop: 15, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  titleText: { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  countText: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginTop: 4 },
  moreBtn: {
    width: 44,
    height: 44,
    backgroundColor: 'white',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  searchRow: { flexDirection: 'row', gap: 12 },
  searchWrapper: {
    flex: 1,
    height: 56,
    backgroundColor: 'white',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, height: '100%', fontSize: 14, fontWeight: '700', color: '#0f172a' },
  filterBtn: {
    width: 56,
    height: 56,
    backgroundColor: 'white',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    position: 'relative',
  },
  filterBtnActive: { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' },
  filterDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  filtersPanel: {
    marginTop: 16,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 16,
  },
  filterSection: { gap: 10 },
  filterLabel: { fontSize: 11, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  chipText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  chipTextActive: { color: '#2563eb' },
  filterInputWrapper: {
    minHeight: 56,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterInputIcon: { marginLeft: 2 },
  filterInput: {
    flex: 1,
    minHeight: 56,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  clearBtn: {
    minHeight: 48,
    alignSelf: 'stretch',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  errorBox: {
    marginTop: 12,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 16,
    padding: 12,
  },
  errorText: { color: '#b91c1c', fontSize: 12, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 15, paddingBottom: 160, gap: 16, flexGrow: 1 },
  skeletonBlock: {
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  skeletonAvatar: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#e2e8f0' },
  avatar: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '900', color: 'white' },
  headerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  skeletonBadge: { borderRadius: 999 },
  customerName: { flex: 1, fontSize: 16, fontWeight: '800', color: '#0f172a' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: '#ecfdf5' },
  badgeIdle: { backgroundColor: '#f8fafc' },
  statusText: { fontSize: 9, fontWeight: '900' },
  textActive: { color: '#10b981' },
  textIdle: { color: '#94a3b8' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  phoneText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  divider: { height: 1, backgroundColor: '#f8fafc', marginVertical: 16 },
  metadataGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  skeletonMetaText: { flex: 1 },
  metaIconBox: {
    width: 32,
    height: 32,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: { fontSize: 9, fontWeight: '900', color: '#cbd5e1', marginBottom: 2 },
  metaValue: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  emptyState: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  emptyText: { fontSize: 13, fontWeight: '600', color: '#94a3b8', textAlign: 'center', marginTop: 8 },
  footerLoader: { paddingVertical: 18 },
  footerSkeleton: { borderRadius: 999, alignSelf: 'center' },
  endText: { textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#94a3b8', paddingVertical: 18 },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    height: 64,
    paddingHorizontal: 24,
    backgroundColor: '#2563eb',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 8,
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  fabText: { color: 'white', fontSize: 14, fontWeight: '900' },
});

export default Customers;
